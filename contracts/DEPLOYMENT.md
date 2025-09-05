# Subra 合约部署指南

本文档详细介绍如何部署 Subra 订阅平台的智能合约。

## 目录

- [前置要求](#前置要求)
- [快速开始](#快速开始)
- [部署脚本](#部署脚本)
- [配置说明](#配置说明)
- [网络配置](#网络配置)
- [部署流程](#部署流程)
- [验证部署](#验证部署)
- [故障排除](#故障排除)
- [最佳实践](#最佳实践)

## 前置要求

### 必需工具

1. **Scarb** - Cairo 包管理器和构建工具
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
   ```

2. **Starknet Foundry** - Starknet 开发工具链
   ```bash
   curl -L https://raw.githubusercontent.com/foundry-rs/starknet-foundry/master/scripts/install.sh | sh
   ```

3. **Python 3.8+** (可选，用于 Python 部署脚本)

### 验证安装

```bash
scarb --version
sncast --version
snforge --version
```

## 快速开始

### 1. 编译合约

```bash
# 使用 Scarb
scarb build

# 或使用 Makefile
make build
```

### 2. 运行测试

```bash
# 使用 Scarb
scarb test

# 或使用 Makefile
make test
```

### 3. 创建部署账户

```bash
# 创建新账户
sncast account create --name my-deployer

# 或使用 Makefile
make create-account
```

### 4. 部署合约

```bash
# 设置环境变量
export INITIAL_OWNER="0x你的地址"
export FEE_RECIPIENT="0x费用接收者地址"
export ACCOUNT_NAME="my-deployer"

# 部署到 Sepolia 测试网
make deploy-sepolia
```

## 部署脚本

项目提供了三种部署方式：

### 1. Bash 脚本 (`scripts/deploy.sh`)

功能完整的 Bash 部署脚本，支持：
- 自动依赖检查
- 合约编译
- 账户验证
- 合约声明和部署
- 部署验证
- 结果保存

```bash
# 直接运行
./scripts/deploy.sh

# 或使用 Makefile
make deploy
```

### 2. Python 脚本 (`scripts/deploy.py`)

更灵活的 Python 部署脚本，支持：
- 命令行参数
- 配置文件
- 详细的错误处理
- JSON 格式的部署记录

```bash
# 基本用法
python3 scripts/deploy.py

# 使用命令行参数
python3 scripts/deploy.py --network sepolia --owner 0x123... --fee-recipient 0x456...

# 或使用 Makefile
make deploy-py
```

### 3. Makefile

提供便捷的命令行接口：

```bash
# 查看所有可用命令
make help

# 部署到不同网络
make deploy-sepolia
make deploy-mainnet
make deploy-devnet

# 开发工作流
make dev  # clean + build + test
make ci   # build + test
```

## 配置说明

### 环境变量

| 变量名 | 描述 | 默认值 | 必需 |
|--------|------|--------|------|
| `NETWORK` | 网络名称 | `sepolia` | 否 |
| `RPC_URL` | RPC 端点 URL | Sepolia RPC | 否 |
| `ACCOUNT_NAME` | 部署账户名称 | `default` | 否 |
| `INITIAL_OWNER` | 初始所有者地址 | - | **是** |
| `FEE_RATE` | 费用率（基点） | `100` (1%) | 否 |
| `FEE_RECIPIENT` | 费用接收者地址 | - | **是** |

### 配置文件示例

复制并修改配置模板：

```bash
cp scripts/config.example.json scripts/config.json
```

编辑 `scripts/config.json`：

```json
{
  "networks": {
    "sepolia": {
      "name": "sepolia",
      "rpc_url": "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
      "account_name": "my-deployer"
    }
  },
  "deployment": {
    "initial_owner": "0x你的地址",
    "fee_rate": 100,
    "fee_recipient": "0x费用接收者地址"
  }
}
```

## 网络配置

### Sepolia 测试网

```bash
export NETWORK="sepolia"
export RPC_URL="https://starknet-sepolia.public.blastapi.io/rpc/v0_8"
```

### 主网

```bash
export NETWORK="mainnet"
export RPC_URL="https://starknet-mainnet.public.blastapi.io/rpc/v0_8"
```

### 本地开发网

```bash
export NETWORK="devnet"
export RPC_URL="http://localhost:5050/rpc"
```

## 部署流程

### 详细步骤

1. **环境检查**
   - 验证必需工具已安装
   - 检查环境变量配置

2. **合约编译**
   - 使用 Scarb 编译合约
   - 生成 Sierra 文件

3. **账户验证**
   - 检查部署账户是否存在
   - 验证账户余额（如需要）

4. **声明 Subscription 合约**
   - 声明 Subscription 合约类
   - 获取类哈希

5. **部署 SubscriptionFactory 合约**
   - 使用 Subscription 类哈希部署 Factory
   - 设置初始参数

6. **验证部署**
   - 调用合约函数验证部署成功
   - 检查费用配置

7. **保存部署信息**
   - 生成部署记录文件
   - 保存合约地址和配置

### 部署记录

部署成功后，会在 `deployments/` 目录下生成部署记录：

```json
{
  "network": "sepolia",
  "rpc_url": "https://starknet-sepolia.public.blastapi.io/rpc/v0_8",
  "deployed_at": "2024-01-15T10:30:00Z",
  "contracts": {
    "Subscription": {
      "class_hash": "0x..."
    },
    "SubscriptionFactory": {
      "address": "0x...",
      "constructor_args": {
        "subscription_class_hash": "0x...",
        "initial_owner": "0x...",
        "fee_rate": 100,
        "fee_recipient": "0x..."
      }
    }
  }
}
```

## 验证部署

### 基本验证

```bash
# 获取计划总数
sncast --url $RPC_URL call --contract-address $FACTORY_ADDRESS --function get_total_plans

# 获取费用配置
sncast --url $RPC_URL call --contract-address $FACTORY_ADDRESS --function get_fee_rate
sncast --url $RPC_URL call --contract-address $FACTORY_ADDRESS --function get_fee_recipient
```

### 使用 Makefile 验证

```bash
# 设置合约地址
export CONTRACT_ADDRESS="0x你的合约地址"

# 验证部署
make get-plans
make get-fee-info
```

### 区块浏览器验证

- **Sepolia**: https://sepolia.starkscan.co
- **主网**: https://starkscan.co

在浏览器中搜索合约地址，验证：
- 合约代码已验证
- 构造函数参数正确
- 合约状态正常

## 故障排除

### 常见问题

#### 1. 编译失败

```bash
# 清理并重新编译
make clean
make build

# 检查依赖
scarb check
```

#### 2. 账户不存在

```bash
# 创建新账户
sncast account create --name my-deployer

# 列出所有账户
sncast account list
```

#### 3. 余额不足

```bash
# 检查账户余额
sncast account list

# 从水龙头获取测试代币（Sepolia）
# 访问: https://starknet-faucet.vercel.app/
```

#### 4. RPC 连接失败

```bash
# 测试 RPC 连接
curl -X POST $RPC_URL -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"starknet_chainId","id":1}'

# 尝试其他 RPC 端点
export RPC_URL="https://starknet-sepolia.public.blastapi.io/rpc/v0_8"
```

#### 5. 合约已声明错误

这通常不是错误，脚本会自动处理已声明的合约类。

### 调试模式

```bash
# Bash 脚本调试
bash -x scripts/deploy.sh

# Python 脚本详细输出
python3 scripts/deploy.py --verbose
```

## 最佳实践

### 部署前检查清单

- [ ] 合约代码已审计
- [ ] 测试覆盖率 > 90%
- [ ] 所有测试通过
- [ ] 环境变量正确设置
- [ ] 账户余额充足
- [ ] 网络配置正确

### 安全建议

1. **私钥管理**
   - 使用硬件钱包或安全的密钥管理系统
   - 不要在代码或配置文件中硬编码私钥
   - 使用环境变量或密钥文件

2. **多重签名**
   - 对于主网部署，考虑使用多重签名钱包
   - 设置适当的签名阈值

3. **权限管理**
   - 仔细设置初始所有者地址
   - 考虑使用时间锁合约
   - 实施权限分离原则

4. **费用配置**
   - 验证费用率在合理范围内（通常 < 5%）
   - 确保费用接收者地址正确
   - 考虑费用治理机制

### 部署后操作

1. **合约验证**
   - 在区块浏览器上验证合约源码
   - 发布合约 ABI

2. **监控设置**
   - 设置合约事件监控
   - 配置异常告警

3. **文档更新**
   - 更新部署文档
   - 发布合约地址和 ABI

4. **备份**
   - 备份部署记录
   - 保存合约源码快照

### 升级策略

虽然当前合约不支持升级，但可以考虑：

1. **代理模式**
   - 使用 OpenZeppelin 的升级代理
   - 实施升级治理

2. **迁移计划**
   - 制定合约迁移策略
   - 准备数据迁移工具

3. **版本管理**
   - 使用语义化版本
   - 维护版本兼容性

## 支持

如果遇到问题，请：

1. 检查本文档的故障排除部分
2. 查看项目的 GitHub Issues
3. 参考 Starknet 官方文档
4. 联系开发团队

---

**注意**: 部署到主网前，请务必在测试网上充分测试所有功能。