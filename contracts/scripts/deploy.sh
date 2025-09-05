#!/bin/bash

# Subra 合约部署脚本
# 使用 Starknet Foundry (sncast) 部署合约

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_dependencies() {
    print_info "检查依赖工具..."
    
    if ! command -v scarb &> /dev/null; then
        print_error "scarb 未安装，请先安装 Scarb"
        exit 1
    fi
    
    if ! command -v sncast &> /dev/null; then
        print_error "sncast 未安装，请先安装 Starknet Foundry"
        exit 1
    fi
    
    print_success "依赖检查完成"
}

# 编译合约
compile_contracts() {
    print_info "编译合约..."
    
    if ! scarb build; then
        print_error "合约编译失败"
        exit 1
    fi
    
    print_success "合约编译完成"
}

# 配置参数
setup_config() {
    print_info "设置部署配置..."
    
    # 部署参数
    INITIAL_OWNER=${INITIAL_OWNER:-"0x0"}
    FEE_RECIPIENT=${FEE_RECIPIENT:-"0x0"}
    FEE_RATE=${FEE_RATE:-"100"}  # 默认1% (100基点)
    
    print_info "初始所有者: $INITIAL_OWNER"
    print_info "费用接收者: $FEE_RECIPIENT"
    print_info "费用率: $FEE_RATE 基点"
    echo
}

# 验证账户
verify_account() {
    print_info "验证账户配置..."
    
    # 检查 snfoundry.toml 中配置的账户是否存在
    local configured_account=$(grep '^account = ' snfoundry.toml | cut -d'"' -f2)
    
    if [ -z "$configured_account" ]; then
        print_error "snfoundry.toml 中未配置账户"
        exit 1
    fi
    
    if ! sncast account list | grep -q "$configured_account:"; then
        print_error "配置的账户 '$configured_account' 不存在"
        print_info "请使用以下命令创建账户:"
        print_info "sncast account create --name $configured_account"
        exit 1
    fi
    
    print_success "账户验证完成: $configured_account"
}

# 部署 Subscription 合约并获取类哈希
deploy_subscription_class() {
    print_info "声明 Subscription 合约类..."
    
    local sierra_file="target/dev/subra_Subscription.contract_class.json"
    
    if [ ! -f "$sierra_file" ]; then
        print_error "找不到编译后的 Subscription 合约文件: $sierra_file"
        exit 1
    fi
    
    # 声明合约类
    local declare_result=$(sncast declare --contract-name "Subscription" 2>&1)
    
    if echo "$declare_result" | grep -q "error"; then
        if echo "$declare_result" | grep -q "already declared"; then
            print_warning "Subscription 合约类已存在"
            # 从错误消息中提取类哈希
            SUBSCRIPTION_CLASS_HASH=$(echo "$declare_result" | grep -o '0x[0-9a-fA-F]\+' | head -1)
        else
            print_error "声明 Subscription 合约失败: $declare_result"
            exit 1
        fi
    else
        # 从成功消息中提取类哈希
        SUBSCRIPTION_CLASS_HASH=$(echo "$declare_result" | grep -o '0x[0-9a-fA-F]\+' | head -1)
        print_success "Subscription 合约类声明成功"
        # 等待声明交易确认
        sleep 5
    fi
    
    print_info "Subscription 类哈希: $SUBSCRIPTION_CLASS_HASH"
}

# 部署 SubscriptionFactory 合约
deploy_factory() {
    print_info "部署 SubscriptionFactory 合约..."
    
    if [ -z "$SUBSCRIPTION_CLASS_HASH" ]; then
        print_error "Subscription 类哈希未设置"
        exit 1
    fi
    
    if [ "$INITIAL_OWNER" = "0x0" ]; then
        print_error "请设置 INITIAL_OWNER 环境变量"
        exit 1
    fi
    
    if [ "$FEE_RECIPIENT" = "0x0" ]; then
        print_error "请设置 FEE_RECIPIENT 环境变量"
        exit 1
    fi
    
    # 构造函数参数 (owner, subscription_class_hash, developer_fee_rate, developer_fee_recipient)
    # u256类型需要序列化为两个felt252值：低位和高位
    local constructor_calldata="$INITIAL_OWNER $SUBSCRIPTION_CLASS_HASH $FEE_RATE 0 $FEE_RECIPIENT"
    
    print_info "构造函数参数: $constructor_calldata"
    
    # 部署合约 (需要先获取 SubscriptionFactory 的类哈希)
    # 首先声明 SubscriptionFactory 合约
    local factory_declare_result=$(sncast declare --contract-name "SubscriptionFactory" 2>&1)
    
    if echo "$factory_declare_result" | grep -q "error"; then
        if echo "$factory_declare_result" | grep -q "already declared"; then
            print_warning "SubscriptionFactory 合约类已存在"
            FACTORY_CLASS_HASH=$(echo "$factory_declare_result" | grep -o '0x[0-9a-fA-F]\+' | head -1)
        else
            print_error "声明 SubscriptionFactory 合约失败: $factory_declare_result"
            exit 1
        fi
    else
        FACTORY_CLASS_HASH=$(echo "$factory_declare_result" | grep -o '0x[0-9a-fA-F]\+' | head -1)
        print_success "SubscriptionFactory 合约类声明成功"
        # 等待声明交易确认
        sleep 5
    fi
    
    print_info "SubscriptionFactory 类哈希: $FACTORY_CLASS_HASH"
    
    # 部署合约
    local deploy_result=$(sncast deploy --class-hash "$FACTORY_CLASS_HASH" --constructor-calldata "$constructor_calldata" 2>&1)
    
    if echo "$deploy_result" | grep -q "error"; then
        print_error "部署 SubscriptionFactory 合约失败: $deploy_result"
        exit 1
    fi
    
    # 提取合约地址
    FACTORY_ADDRESS=$(echo "$deploy_result" | grep -o '0x[0-9a-fA-F]\+' | head -1)
    
    print_success "SubscriptionFactory 合约部署成功"
    print_info "合约地址: $FACTORY_ADDRESS"
    
    print_info "等待部署确认..."
    sleep 10
}

# 验证部署
verify_deployment() {
    print_info "验证部署结果..."
    
    # 调用 get_total_plans 函数验证合约是否正常工作
    local call_result=$(sncast call --contract-address "$FACTORY_ADDRESS" --function "get_total_plans" 2>&1)
    
    if echo "$call_result" | grep -q "error"; then
        print_error "合约验证失败: $call_result"
        exit 1
    fi
    
    print_success "合约验证成功"
    
    # 验证费用配置
    local fee_rate_result=$(sncast call --contract-address "$FACTORY_ADDRESS" --function "get_fee_rate" 2>&1)
    local fee_recipient_result=$(sncast call --contract-address "$FACTORY_ADDRESS" --function "get_fee_recipient" 2>&1)
    
    print_info "当前费用率: $(echo $fee_rate_result | grep -o '[0-9]\+' | head -1) 基点"
    print_info "费用接收者: $(echo $fee_recipient_result | grep -o '0x[0-9a-fA-F]\+' | head -1)"
}

# 保存部署信息
save_deployment_info() {
    print_info "保存部署信息..."
    
    local deployment_file="deployments/${NETWORK}_deployment.json"
    mkdir -p deployments
    
    cat > "$deployment_file" << EOF
{
  "network": "$NETWORK",
  "rpc_url": "$RPC_URL",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contracts": {
    "Subscription": {
      "class_hash": "$SUBSCRIPTION_CLASS_HASH"
    },
    "SubscriptionFactory": {
      "address": "$FACTORY_ADDRESS",
      "constructor_args": {
        "subscription_class_hash": "$SUBSCRIPTION_CLASS_HASH",
        "initial_owner": "$INITIAL_OWNER",
        "fee_rate": "$FEE_RATE",
        "fee_recipient": "$FEE_RECIPIENT"
      }
    }
  }
}
EOF
    
    print_success "部署信息已保存到: $deployment_file"
}

# 打印部署摘要
print_summary() {
    print_success "=== 部署完成 ==="
    echo
    print_info "网络: $NETWORK"
    print_info "Subscription 类哈希: $SUBSCRIPTION_CLASS_HASH"
    print_info "SubscriptionFactory 地址: $FACTORY_ADDRESS"
    echo
    print_info "您现在可以使用以下地址与合约交互:"
    print_info "Factory 合约: $FACTORY_ADDRESS"
    echo
    print_info "示例调用:"
    print_info "sncast call --contract-address $FACTORY_ADDRESS --function get_total_plans"
    echo
}

# 主函数
main() {
    print_info "开始部署 Subra 合约..."
    echo
    
    check_dependencies
    setup_config
    verify_account
    compile_contracts
    deploy_subscription_class
    deploy_factory
    verify_deployment
    save_deployment_info
    print_summary
    
    print_success "部署流程完成！"
}

# 帮助信息
show_help() {
    echo "Subra 合约部署脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "环境变量:"
    echo "  INITIAL_OWNER    - 初始所有者地址 (必需)"
    echo "  FEE_RATE         - 费用率基点 (默认: 100, 即1%)"
    echo "  FEE_RECIPIENT    - 费用接收者地址 (必需)"
    echo
    echo "选项:"
    echo "  -h, --help       - 显示此帮助信息"
    echo
    echo "注意:"
    echo "  - 网络和账户配置在 snfoundry.toml 文件中设置"
    echo "  - 确保已创建并配置了正确的账户"
    echo
    echo "示例:"
    echo "  INITIAL_OWNER=0x123... FEE_RECIPIENT=0x456... $0"
    echo
}

# 处理命令行参数
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

# 运行主函数
main "$@"