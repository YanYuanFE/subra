import { Account, Contract, RpcProvider, selector, num } from "starknet";
import * as dotenv from "dotenv";
import { NETWORKS } from "./config/networks";
import { subscriptionFactoryAbi, subscriptionAbi } from "./abis";

dotenv.config();

const network = "mainnet";

// --- ENV CONFIG ---
const RPC_URL = NETWORKS[network].rpcUrl;
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const KEEPER_ADDRESS = process.env.ACCOUNT_ADDRESS || "";
const POLL_INTERVAL = Number(60_000); // 1分钟一次

console.log(KEEPER_ADDRESS, "keeper");
// let lastScannedBlock = 1888403;
let lastScannedBlock = 2128618;
const FACTORY_ADDRESS = NETWORKS[network].contracts.subscriptionFactory;

// --- INIT ---
const provider = new RpcProvider({
  nodeUrl: RPC_URL,
});
const account = new Account(provider, KEEPER_ADDRESS, PRIVATE_KEY);

// factory contract
const factory = new Contract(
  subscriptionFactoryAbi.abi,
  FACTORY_ADDRESS,
  provider
);
factory.connect(account);

// --- STATE: auto-renew users ---
interface AutoRenewUser {
  user: string;
  planId: string;
  subscriptionAddr: string;
  remainingRenewals?: number;
}
const autoRenewUsers: Map<string, AutoRenewUser> = new Map();

// --- HELPER FUNCTIONS ---

// 获取所有活跃 plan
async function getActivePlans(): Promise<string[]> {
  const res = await factory.call("get_active_plans", []);
  return res as string[];
}

// 获取 subscription 合约地址
async function getSubscriptionContract(planId: string): Promise<string> {
  const addr = await factory.call("get_subscription_contract", [planId]);
  return num.toHex(addr as bigint) as string;
}

// 获取用户列表（需要自己缓存或外部服务支持，这里简单示例）
async function getUserSubscriptions(user: string): Promise<string[]> {
  const subs = await factory.call("get_user_subscriptions", [user]);
  return subs as string[];
}

// --- EVENT SCANNING ---
// 增量扫描事件，更新 autoRenewUsers
async function scanSubscriptionEvents(
  subscriptionAddr: string,
  fromBlock: number,
  toBlock: number
) {
  const getEventSelector = (eventName: string) => {
    return `0x${selector.starknetKeccak(eventName).toString(16)}`;
  };

  const enabledKey = getEventSelector("AutoRenewalEnabled");
  const disabledKey = getEventSelector("AutoRenewalDisabled");
  const executedKey = getEventSelector("AutoRenewalExecuted");

  const filter = {
    from_block: { block_number: fromBlock },
    to_block: { block_number: toBlock },
    address: subscriptionAddr,
    keys: [[enabledKey, disabledKey, executedKey]],
    chunk_size: 100,
  };

  const res = await provider.getEvents(filter);

  for (const e of res.events) {
    if (e.keys[0] === enabledKey) {
      // 直接解析 e.data 数组
      // AutoRenewalEnabled 事件数据格式: [user, plan_id, max_renewals, max_price, authorized_at]
      const user = e.data[0];
      const plan_id = e.data[1];
      autoRenewUsers.set(user, {
        user,
        planId: plan_id.toString(),
        subscriptionAddr,
      });
      console.log(`✅ Enabled auto-renew for ${user} (plan ${plan_id})`);
    }
    if (e.keys[0] === disabledKey) {
      // AutoRenewalDisabled 事件数据格式: [user, plan_id, disabled_at]
      const user = e.data[0];
      const plan_id = e.data[1];
      autoRenewUsers.delete(user);
      console.log(`❌ Disabled auto-renew for ${user} (plan ${plan_id})`);
    }
    if (e.keys[0] === executedKey) {
      // AutoRenewalExecuted 事件数据格式: [user, plan_id, new_end_time, amount_paid, remaining_renewals]
      const user = e.data[0];
      const plan_id = e.data[1];
      const remaining_renewals = parseInt(e.data[4], 16); // 转换为数字
      const entry = autoRenewUsers.get(user);
      if (entry) {
        entry.remainingRenewals = remaining_renewals;
        if (remaining_renewals === 0) {
          autoRenewUsers.delete(user);
          console.log(`⚠️ Auto-renew finished for ${user} (plan ${plan_id})`);
        } else {
          autoRenewUsers.set(user, entry);
          console.log(
            `🔄 Auto-renew executed for ${user}, remaining ${remaining_renewals}`
          );
        }
      }
    }
  }
}

// 检查并续费
async function tryRenew(userEntry: AutoRenewUser) {
  const subscription = new Contract(
    subscriptionAbi.abi,
    userEntry.subscriptionAddr,
    provider
  );
  subscription.connect(account);

  try {
    const subData: any = await subscription.call("get_subscription", [
      userEntry.user,
    ]);
    const auth: any = await subscription.call("get_auto_renewal_auth", [
      userEntry.user,
    ]);

    const now = Math.floor(Date.now() / 1000);
    const endTime = Number(subData.end_time || 0);
    const isActive = Boolean(subData.is_active);
    const autoEnabled = Boolean(auth.is_enabled);
    const remainingRenewals = Number(auth.remaining_renewals || 0);

    // 检查订阅是否已过期且启用了自动续费且还有剩余续费次数
    if (isActive && autoEnabled && now > endTime && remainingRenewals > 0) {
      console.log(
        `⏳ Auto renewing for user ${userEntry.user} at subscription ${userEntry.subscriptionAddr}, remaining: ${remainingRenewals}`
      );
      const tx = await subscription.invoke("auto_renew", [userEntry.user]);
      console.log(`✅ Renew success, tx hash: ${tx.transaction_hash}`);
    } else {
      console.log(
        `ℹ️ Skip user ${userEntry.user}: active=${isActive}, auto=${autoEnabled}, end_time=${endTime}, remaining=${remainingRenewals}, now=${now}`
      );
    }
  } catch (err) {
    console.error(`❌ Error renewing for user ${userEntry.user}:`, err);
  }
}

async function keeperService() {
  console.log("🚀 Keeper service started...");
  const latest = await provider.getBlock("latest");
  if (!lastScannedBlock) lastScannedBlock = latest.block_number - 100; // 初始回溯100块，或用部署block

  setInterval(async () => {
    try {
      const latest = await provider.getBlock("latest");
      const latestNum = latest.block_number;

      // 遍历所有计划的 Subscription
      const plans = await getActivePlans();
      for (const planId of plans) {
        const subscriptionAddr = await getSubscriptionContract(planId);

        await scanSubscriptionEvents(
          subscriptionAddr,
          lastScannedBlock,
          latestNum
        );
      }

      lastScannedBlock = latestNum;

      // 尝试为所有用户执行续费
      for (const userEntry of autoRenewUsers.values()) {
        await tryRenew(userEntry);
      }
    } catch (err) {
      console.error("⚠️ Keeper loop error:", err);
    }
  }, POLL_INTERVAL);
}

// Entry
if (require.main === module) {
  keeperService().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
