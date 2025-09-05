# Subra Contract Services

这个目录包含了与Subra订阅合约交互的前端服务类。

## 文件结构

```
services/
├── base.ts                    # 基础合约服务类
├── config.ts                  # 网络和合约配置
├── types.ts                   # TypeScript类型定义
├── subscriptionFactory.ts     # 订阅工厂合约服务
├── subscription.ts            # 订阅合约服务
├── index.ts                   # 导出文件
└── README.md                  # 说明文档
```

## 主要服务类

### BaseContractService

基础合约服务类，提供通用的Starknet合约交互功能：
- 网络连接管理
- 账户连接/断开
- 交易状态查询
- 错误处理

### SubscriptionFactoryService

订阅工厂合约服务，用于管理订阅计划：
- 创建订阅计划
- 查询计划信息
- 激活/停用计划
- 批量操作

### SubscriptionService

订阅合约服务，用于管理个人订阅：
- 订阅/续费/取消
- 自动续费管理
- 订阅状态查询
- 计划信息获取

## 使用示例

### 1. 初始化服务

```typescript
import { SubscriptionFactoryService, SubscriptionService } from './services';
import { Account } from 'starknet';

// 创建工厂服务
const factoryService = new SubscriptionFactoryService('0x...factory_address');

// 连接账户
const account = new Account(provider, address, privateKey);
await factoryService.connectAccount(account);
```

### 2. 创建订阅计划

```typescript
const result = await factoryService.createPlan(
  '0x...recipient_address',  // 收款地址
  '0x...token_address',      // 代币地址
  '1000000000000000000',     // 价格 (1 ETH in wei)
  2592000                    // 周期长度 (30天)
);

if (result.success) {
  console.log('计划创建成功:', result.transactionHash);
}
```

### 3. 订阅计划

```typescript
// 获取订阅合约地址
const contractAddress = await factoryService.getSubscriptionContract('1');

// 创建订阅服务
const subscriptionService = new SubscriptionService(contractAddress);
await subscriptionService.connectAccount(account);

// 订阅
const result = await subscriptionService.subscribe(userAddress);
```

### 4. 启用自动续费

```typescript
const result = await subscriptionService.enableAutoRenewal(
  12,                        // 最大续费次数
  '1100000000000000000'      // 最大可接受价格
);
```

### 5. 查询订阅状态

```typescript
// 检查是否激活
const isActive = await subscriptionService.isActive(userAddress);

// 获取订阅详情
const subscription = await subscriptionService.getSubscription(userAddress);

// 获取自动续费授权
const autoRenewal = await subscriptionService.getAutoRenewalAuth(userAddress);
```

## 类型定义

### SubscriptionPlan

```typescript
interface SubscriptionPlan {
  id: string;
  creator: string;
  recipient: string;
  token: string;
  price: string;
  setupFee: string;
  periodLength: number;
  contractAddress: string;
  isActive: boolean;
  createdAt: number;
  totalSubscribers: number;
}
```

### SubscriptionData

```typescript
interface SubscriptionData {
  startTime: number;
  endTime: number;
  isActive: boolean;
  renewalsCount: number;
}
```

### AutoRenewalAuth

```typescript
interface AutoRenewalAuth {
  enabled: boolean;
  isEnabled: boolean;
  maxRenewals: number;
  remainingRenewals: number;
  maxPrice: string;
  authorizedAt: number;
}
```

## 错误处理

所有服务方法都包含错误处理，返回统一的结果格式：

```typescript
interface TransactionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  message?: string;
  data?: any;
}
```

## 网络配置

服务支持多网络配置，在`config.ts`中定义：
- Sepolia测试网
- 主网（待部署）

## 注意事项

1. **账户连接**: 使用服务前必须先连接Starknet账户
2. **网络匹配**: 确保账户网络与服务配置的网络一致
3. **权限检查**: 某些操作需要特定权限（如计划管理需要所有者权限）
4. **Gas费用**: 所有写操作都需要支付Gas费用
5. **交易确认**: 建议等待交易确认后再进行后续操作

## 开发建议

1. 使用TypeScript获得更好的类型安全
2. 实现适当的错误处理和用户反馈
3. 添加加载状态和进度指示
4. 缓存查询结果以提高性能
5. 实现交易状态监控

## 依赖项

- `starknet`: Starknet JavaScript SDK
- 其他依赖项请参考`package.json`