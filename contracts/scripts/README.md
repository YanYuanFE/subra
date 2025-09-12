# Subra 部署脚本

本目录包含了 Subra 订阅平台智能合约的部署脚本和配置文件。

## 文件说明

### 部署脚本

- **`deploy.sh`** - 完整的 Bash 部署脚本
- **`deploy.py`** - Python 版本的部署脚本，支持更多配置选项
- **`deploy_example.sh`** - 交互式部署示例脚本，适合初次使用

### 配置文件

- **`config.example.json`** - 配置文件模板
- **`README.md`** - 本说明文件

## 快速开始

### 1. 准备环境

确保已安装必要工具：

```bash
# 检查工具版本
scarb --version
sncast --version
```

### 2. 创建账户

```bash
# 创建部署账户
sncast account create --name my-deployer

# 为账户充值（测试网）
# 访问: https://starknet-faucet.vercel.app/
```

### 3. 配置参数

```bash
# 设置必需的环境变量
export INITIAL_OWNER="0x你的地址"
export FEE_RECIPIENT="0x费用接收者地址"
export ACCOUNT_NAME="my-deployer"

# 设置必需的环境变量
export INITIAL_OWNER="0x05c755ba1828c70314349ec4c4ddaf310e648d5773f9bb6c4eb6ce2369288569"
export FEE_RECIPIENT="0x05c755ba1828c70314349ec4c4ddaf310e648d5773f9bb6c4eb6ce2369288569"
export ACCOUNT_NAME="mainnet_deployer"
export NETWORK="mainnet" 

# 运行部署脚本
./scripts/deploy.sh
```

### 4. 部署合约

选择以下任一方式：

#### 方式 1: 使用交互式脚本（推荐新手）

```bash
./deploy_example.sh
```

#### 方式 2: 使用 Bash 脚本

```bash
./deploy.sh
```

#### 方式 3: 使用 Python 脚本

```bash
python3 deploy.py --network sepolia --owner 0x... --fee-recipient 0x...
```

#### 方式 4: 使用 Makefile（在项目根目录）

```bash
cd ..
make deploy-sepolia
```

## 脚本详细说明

### deploy.sh

功能完整的 Bash 部署脚本，包含：

- 自动依赖检查
- 合约编译和测试
- 账户验证
- 合约声明和部署
- 部署结果验证
- 部署信息保存

**环境变量：**

| 变量 | 描述 | 默认值 |
|------|------|--------|
| `NETWORK` | 网络名称 | `sepolia` |
| `RPC_URL` | RPC 端点 | Sepolia RPC |
| `ACCOUNT_NAME` | 账户名称 | `default` |
| `INITIAL_OWNER` | 初始所有者 | **必需** |
| `FEE_RATE` | 费用率（基点） | `100` |
| `FEE_RECIPIENT` | 费用接收者 | **必需** |

**使用示例：**

```bash
INITIAL_OWNER=0x123... FEE_RECIPIENT=0x456... ./deploy.sh
```

### deploy.py

Python 版本的部署脚本，提供更灵活的配置：

**命令行参数：**

```bash
python3 deploy.py [选项]

选项:
  --network NETWORK         网络名称
  --rpc-url URL            RPC 端点 URL
  --account ACCOUNT        账户名称
  --owner ADDRESS          初始所有者地址
  --fee-rate RATE          费用率（基点）
  --fee-recipient ADDRESS  费用接收者地址
  --config FILE            配置文件路径
```

**使用示例：**

```bash
# 基本用法
python3 deploy.py --owner 0x123... --fee-recipient 0x456...

# 指定网络
python3 deploy.py --network mainnet --owner 0x123... --fee-recipient 0x456...

# 使用配置文件
cp config.example.json config.json
# 编辑 config.json
python3 deploy.py --config config.json
```

### deploy_example.sh

交互式部署脚本，适合初次使用：

- 引导式配置
- 参数验证
- 多种部署方式选择
- 详细的说明和提示

**使用方法：**

```bash
./deploy_example.sh
```

脚本会引导您完成整个部署过程。

## 配置文件

### config.example.json

配置文件模板，包含：

- 网络配置（Sepolia、主网、开发网）
- 部署参数
- 验证选项

**使用方法：**

```bash
# 复制模板
cp config.example.json config.json

# 编辑配置
vim config.json

# 使用配置文件部署
python3 deploy.py --config config.json
```

## 部署结果

部署成功后，会在项目根目录的 `deployments/` 目录下生成部署记录：

```
deployments/
├── sepolia_deployment.json
├── mainnet_deployment.json
└── devnet_deployment.json
```

部署记录包含：

- 网络信息
- 合约地址和类哈希
- 构造函数参数
- 部署时间戳

## 验证部署

### 基本验证

```bash
# 设置合约地址（从部署记录中获取）
export CONTRACT_ADDRESS="0x你的合约地址"
export RPC_URL="https://starknet-sepolia.public.blastapi.io/rpc/v0_8"

# 验证合约功能
sncast call --contract-address $CONTRACT_ADDRESS --function get_total_plans --url $RPC_URL
sncast call --contract-address $CONTRACT_ADDRESS --function get_fee_rate --url $RPC_URL
```

### 使用 Makefile 验证

```bash
cd ..
export CONTRACT_ADDRESS="0x你的合约地址"
make get-plans
make get-fee-info
```

## 故障排除

### 常见问题

1. **工具未安装**
   ```bash
   # 安装 Scarb
   curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
   
   # 安装 Starknet Foundry
   curl -L https://raw.githubusercontent.com/foundry-rs/starknet-foundry/master/scripts/install.sh | sh
   ```

2. **账户不存在**
   ```bash
   sncast account create --name my-deployer
   ```

3. **余额不足**
   - 访问 [Starknet 水龙头](https://starknet-faucet.vercel.app/) 获取测试代币

4. **编译失败**
   ```bash
   cd ..
   scarb clean
   scarb build
   ```

5. **网络连接问题**
   - 检查 RPC URL 是否正确
   - 尝试其他 RPC 端点

### 调试模式

```bash
# Bash 脚本调试
bash -x deploy.sh

# Python 脚本详细输出
python3 deploy.py --help
```

## 安全提醒

1. **私钥安全**
   - 不要在脚本中硬编码私钥
   - 使用安全的密钥管理方式

2. **地址验证**
   - 仔细检查 `INITIAL_OWNER` 和 `FEE_RECIPIENT` 地址
   - 确保地址格式正确且可控制

3. **网络确认**
   - 部署前确认目标网络
   - 主网部署需要特别谨慎

4. **参数检查**
   - 验证费用率在合理范围内
   - 确保所有参数符合预期

## 支持

如需帮助，请：

1. 查看 [部署指南](../DEPLOYMENT.md)
2. 检查项目 GitHub Issues
3. 参考 Starknet 官方文档
4. 联系开发团队

---

**注意**: 请在测试网充分测试后再部署到主网。