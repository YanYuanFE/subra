// 全面的 Subra 合约测试套件
// 展示如何编写完整的智能合约测试

use starknet::ContractAddress;
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, 
    start_cheat_caller_address, stop_cheat_caller_address,
    start_cheat_block_timestamp, stop_cheat_block_timestamp,
    spy_events
};

use subra::{ISubscriptionFactoryDispatcher, ISubscriptionFactoryDispatcherTrait};
use subra::{ISubscriptionDispatcher, ISubscriptionDispatcherTrait};
use subra::{IMockERC20Dispatcher, IMockERC20DispatcherTrait};

// AutoRenewalAuth structure for testing
#[derive(Copy, Drop, Serde, starknet::Store)]
struct AutoRenewalAuth {
    is_enabled: bool,
    max_renewals: u32,
    remaining_renewals: u32,
    max_price: u256,
    authorized_at: u64,
}

// 测试辅助函数
mod test_helpers {
    use super::*;
    
    pub fn deploy_mock_erc20() -> ContractAddress {
        let contract = declare("MockERC20").unwrap().contract_class();
        let mut constructor_calldata = array![];
        
        // Constructor parameters: name, symbol, decimals, initial_supply, recipient
        let name: ByteArray = "Test Token";
        let symbol: ByteArray = "TEST";
        name.serialize(ref constructor_calldata);
        symbol.serialize(ref constructor_calldata);
        18_u8.serialize(ref constructor_calldata);
        1000000000000000000000000_u256.serialize(ref constructor_calldata); // 1M tokens
        let zero_address: ContractAddress = 0x0.try_into().unwrap();
        zero_address.serialize(ref constructor_calldata); // Initial recipient
        
        let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
        contract_address
    }
    
    pub fn deploy_factory() -> (ISubscriptionFactoryDispatcher, ContractAddress) {
        let factory_contract = declare("SubscriptionFactory").unwrap().contract_class();
        let subscription_contract = declare("Subscription").unwrap().contract_class();
        
        let owner: ContractAddress = 0x123.try_into().unwrap();
        let subscription_class_hash = subscription_contract.class_hash;
        let developer_fee_rate = 100_u256; // 1%
        let developer_fee_recipient: ContractAddress = 0x456.try_into().unwrap();
        
        let mut constructor_calldata = array![];
        owner.serialize(ref constructor_calldata);
        subscription_class_hash.serialize(ref constructor_calldata);
        developer_fee_rate.serialize(ref constructor_calldata);
        developer_fee_recipient.serialize(ref constructor_calldata);
        
        let (contract_address, _) = factory_contract.deploy(@constructor_calldata).unwrap();
        (ISubscriptionFactoryDispatcher { contract_address }, contract_address)
    }
    
    pub fn setup_test_environment() -> (ISubscriptionFactoryDispatcher, ContractAddress, ContractAddress) {
        let (factory, factory_address) = deploy_factory();
        let token_address = deploy_mock_erc20();
        (factory, factory_address, token_address)
    }
}

// 基础功能测试
#[test]
fn test_factory_deployment_and_initialization() {
    let (factory, _) = test_helpers::deploy_factory();
    
    // 验证初始状态
    assert(factory.get_total_plans() == 0, 'Initial plans should be 0');
    assert(factory.get_fee_rate() == 100, 'Wrong initial fee rate');
    
    let expected_recipient: ContractAddress = 0x456.try_into().unwrap();
    assert(factory.get_fee_recipient() == expected_recipient, 'Wrong fee recipient');
}

#[test]
fn test_create_subscription_plan() {
    let (factory, factory_address, token_address) = test_helpers::setup_test_environment();
    let creator: ContractAddress = 0x789.try_into().unwrap();
    
    // 设置创建者
    start_cheat_caller_address(factory_address, creator);
    
    // 创建订阅计划
    let recipient: ContractAddress = 0xABC.try_into().unwrap();
    let price = 1000_u256;
    let period_length = 86400_u64; // 1 day
    let plan_name: ByteArray = "Test Subscription Plan";
    
    let plan_id = factory.create_plan(plan_name, recipient, token_address, price, period_length);
    
    // 验证计划创建
    assert(plan_id == 1, 'Wrong plan ID');
    assert(factory.get_total_plans() == 1, 'Wrong total plans');
    
    // 验证计划详情
    let plan = factory.get_plan(plan_id);
    assert(plan.recipient == recipient, 'Wrong recipient');
    assert(plan.token == token_address, 'Wrong token');
    assert(plan.price == price, 'Wrong price');
    assert(plan.period_length == period_length, 'Wrong period');
    assert(plan.is_active == true, 'Plan should be active');
    assert(plan.total_subscribers == 0, 'Wrong initial subscribers');
    
    stop_cheat_caller_address(factory_address);
}

#[test]
fn test_complete_subscription_lifecycle() {
    let (factory, factory_address, token_address) = test_helpers::setup_test_environment();
    let creator: ContractAddress = 0x789.try_into().unwrap();
    let user: ContractAddress = 0xDEF.try_into().unwrap();
    let recipient: ContractAddress = 0xABC.try_into().unwrap();
    
    // 1. 创建订阅计划
    start_cheat_caller_address(factory_address, creator);
    let price = 1000_u256;
    let period_length = 86400_u64;
    let plan_name: ByteArray = "Lifecycle Test Plan";
    let plan_id = factory.create_plan(plan_name, recipient, token_address, price, period_length);
    stop_cheat_caller_address(factory_address);
    
    // 2. 获取订阅合约地址
    let subscription_address = factory.get_subscription_contract(plan_id);
    let subscription = ISubscriptionDispatcher { contract_address: subscription_address };
    
    // 设置用户余额和授权
    let token = IMockERC20Dispatcher { contract_address: token_address };
    token.mint(user, 10000_u256); // 给用户铸造代币
    
    start_cheat_caller_address(token_address, user);
    token.approve(subscription_address, 10000_u256); // 用户授权
    stop_cheat_caller_address(token_address);
    
    // 4. 用户订阅
    start_cheat_caller_address(subscription_address, user);
    start_cheat_block_timestamp(subscription_address, 1000_u64);
    
    subscription.subscribe(user);
    
    // 5. 验证订阅状态
    assert(subscription.is_active(user) == true, 'Subscription should be active');
    
    let sub_data = subscription.get_subscription(user);
    assert(sub_data.is_active == true, 'Wrong subscription status');
    assert(sub_data.start_time == 1000, 'Wrong start time');
    assert(sub_data.end_time == 1000 + 86400, 'Wrong end time');
    assert(sub_data.renewals_count == 0, 'Wrong renewals count');
    
    // 6. 测试续费
    start_cheat_block_timestamp(subscription_address, 50000_u64); // 时间推进
    subscription.renew(user);
    
    let renewed_data = subscription.get_subscription(user);
    assert(renewed_data.renewals_count == 1, 'Wrong renewals count');
    
    // 7. 测试取消订阅
    subscription.cancel(user);
    assert(subscription.is_active(user) == false, 'Subscription should be inactive');
    
    stop_cheat_block_timestamp(subscription_address);
    stop_cheat_caller_address(subscription_address);
}

#[test]
fn test_auto_renewal_functionality() {
    let (factory, factory_address, token_address) = test_helpers::setup_test_environment();
    let creator: ContractAddress = 0x789.try_into().unwrap();
    let user: ContractAddress = 0xDEF.try_into().unwrap();
    let recipient: ContractAddress = 0xABC.try_into().unwrap();
    
    // 创建计划并订阅
    start_cheat_caller_address(factory_address, creator);
    let price = 1000_u256;
    let period_length = 86400_u64;
    let plan_name: ByteArray = "Auto Renewal Plan";
    let plan_id = factory.create_plan(plan_name, recipient, token_address, price, period_length);
    stop_cheat_caller_address(factory_address);
    
    let subscription_address = factory.get_subscription_contract(plan_id);
    let subscription = ISubscriptionDispatcher { contract_address: subscription_address };
    
    // 设置代币
    let token = IMockERC20Dispatcher { contract_address: token_address };
    token.mint(user, 10000_u256);
    
    start_cheat_caller_address(token_address, user);
    token.approve(subscription_address, 10000_u256);
    stop_cheat_caller_address(token_address);
    
    // 用户订阅
    start_cheat_caller_address(subscription_address, user);
    start_cheat_block_timestamp(subscription_address, 1000_u64);
    subscription.subscribe(user);
    
    // 启用自动续费
    let max_renewals = 3_u32;
    let max_price = 1500_u256;
    subscription.enable_auto_renewal(max_renewals, max_price);
    
    // 验证自动续费授权
    let auth = subscription.get_auto_renewal_auth(user);
    assert(auth.is_enabled == true, 'Auto renewal should be enabled');
    assert(auth.max_renewals == max_renewals, 'Wrong max renewals');
    assert(auth.remaining_renewals == max_renewals, 'Wrong remaining renewals');
    assert(auth.max_price == max_price, 'Wrong max price');
    
    stop_cheat_caller_address(subscription_address);
    
    // 测试自动续费执行
    start_cheat_block_timestamp(subscription_address, 1000 + 86400 + 1); // 订阅过期后
    
    // 任何人都可以触发自动续费
    let keeper: ContractAddress = 0x999.try_into().unwrap();
    start_cheat_caller_address(subscription_address, keeper);
    
    let renewed = subscription.auto_renew(user);
    assert(renewed == true, 'Auto renewal should succeed');
    
    // 验证续费后状态
    let updated_auth = subscription.get_auto_renewal_auth(user);
    assert(updated_auth.remaining_renewals == max_renewals - 1, 'Wrong remaining after renewal');
    
    let sub_data = subscription.get_subscription(user);
    assert(sub_data.renewals_count == 1, 'Wrong renewals count');
    
    stop_cheat_caller_address(subscription_address);
    stop_cheat_block_timestamp(subscription_address);
}

#[test]
fn test_fee_calculation_and_distribution() {
    let (factory, factory_address, token_address) = test_helpers::setup_test_environment();
    let creator: ContractAddress = 0x789.try_into().unwrap();
    let user: ContractAddress = 0xDEF.try_into().unwrap();
    let recipient: ContractAddress = 0xABC.try_into().unwrap();
    let fee_recipient: ContractAddress = 0x456.try_into().unwrap();
    
    // 创建计划
    start_cheat_caller_address(factory_address, creator);
    let price = 10000_u256; // 使用较大金额便于计算
    let plan_name: ByteArray = "Fee Test Plan";
    let plan_id = factory.create_plan(plan_name, recipient, token_address, price, 86400_u64);
    stop_cheat_caller_address(factory_address);
    
    let subscription_address = factory.get_subscription_contract(plan_id);
    let subscription = ISubscriptionDispatcher { contract_address: subscription_address };
    
    // 设置代币
    let token = IMockERC20Dispatcher { contract_address: token_address };
    token.mint(user, 10000_u256);
    
    start_cheat_caller_address(token_address, user);
    token.approve(subscription_address, 10000_u256);
    stop_cheat_caller_address(token_address);
    
    // 记录初始余额
    let initial_recipient_balance = token.balance_of(recipient);
    let initial_fee_recipient_balance = token.balance_of(fee_recipient);
    
    // 用户订阅
    start_cheat_caller_address(subscription_address, user);
    subscription.subscribe(user);
    stop_cheat_caller_address(subscription_address);
    
    // 验证费用分配
    let final_recipient_balance = token.balance_of(recipient);
    let final_fee_recipient_balance = token.balance_of(fee_recipient);
    
    // 计算预期费用：1% 的 10000 = 100
    let expected_fee = 100_u256;
    let expected_recipient_amount = 9900_u256;
    
    assert(
        final_recipient_balance - initial_recipient_balance == expected_recipient_amount,
        'Wrong recipient amount'
    );
    assert(
        final_fee_recipient_balance - initial_fee_recipient_balance == expected_fee,
        'Wrong fee amount'
    );
}

#[test]
fn test_plan_management_permissions() {
    let (factory, factory_address, token_address) = test_helpers::setup_test_environment();
    let owner: ContractAddress = 0x123.try_into().unwrap();
    let creator: ContractAddress = 0x789.try_into().unwrap();
    let unauthorized: ContractAddress = 0x999.try_into().unwrap();
    
    // 创建计划
    start_cheat_caller_address(factory_address, creator);
    let recipient: ContractAddress = 0xABC.try_into().unwrap();
    let plan_name: ByteArray = "Permission Test Plan";
    let plan_id = factory.create_plan(plan_name, recipient, token_address, 1000_u256, 86400_u64);
    stop_cheat_caller_address(factory_address);
    
    // 测试创建者可以停用计划
    start_cheat_caller_address(factory_address, creator);
    factory.deactivate_plan(plan_id);
    assert(factory.is_plan_active(plan_id) == false, 'Plan should be deactivated');
    stop_cheat_caller_address(factory_address);
    
    // 测试所有者可以重新激活计划
    start_cheat_caller_address(factory_address, owner);
    factory.reactivate_plan(plan_id);
    assert(factory.is_plan_active(plan_id) == true, 'Plan should be reactivated');
    stop_cheat_caller_address(factory_address);
}

#[test]
#[should_panic(expected: ('Unauthorized to deactivate',))]
fn test_unauthorized_plan_deactivation() {
    let (factory, factory_address, token_address) = test_helpers::setup_test_environment();
    let creator: ContractAddress = 0x789.try_into().unwrap();
    let unauthorized: ContractAddress = 0x999.try_into().unwrap();
    
    // 创建计划
    start_cheat_caller_address(factory_address, creator);
    let recipient: ContractAddress = 0xABC.try_into().unwrap();
    let plan_name: ByteArray = "Unauthorized Test Plan";
    let plan_id = factory.create_plan(plan_name, recipient, token_address, 1000_u256, 86400_u64);
    stop_cheat_caller_address(factory_address);
    
    // 未授权用户尝试停用计划（应该失败）
    start_cheat_caller_address(factory_address, unauthorized);
    factory.deactivate_plan(plan_id);
    stop_cheat_caller_address(factory_address);
}

#[test]
#[should_panic(expected: ('Fee rate too high',))]
fn test_invalid_fee_rate_rejection() {
    let (factory, factory_address, _) = test_helpers::setup_test_environment();
    let owner: ContractAddress = 0x123.try_into().unwrap();
    
    // 尝试设置过高的费用率（应该失败）
    start_cheat_caller_address(factory_address, owner);
    factory.set_fee_rate(1001_u256); // 超过 10%
    stop_cheat_caller_address(factory_address);
}

#[test]
fn test_subscription_expiry_handling() {
    let (factory, factory_address, token_address) = test_helpers::setup_test_environment();
    let creator: ContractAddress = 0x789.try_into().unwrap();
    let user: ContractAddress = 0xDEF.try_into().unwrap();
    
    // 创建短期订阅计划
    start_cheat_caller_address(factory_address, creator);
    let recipient: ContractAddress = 0xABC.try_into().unwrap();
    let price = 1000_u256;
    let period_length = 100_u64; // 100 秒
    let plan_name: ByteArray = "Expiry Test Plan";
    let plan_id = factory.create_plan(plan_name, recipient, token_address, price, period_length);
    stop_cheat_caller_address(factory_address);
    
    let subscription_address = factory.get_subscription_contract(plan_id);
    let subscription = ISubscriptionDispatcher { contract_address: subscription_address };
    
    // 设置代币和订阅
    let token = IMockERC20Dispatcher { contract_address: token_address };
    token.mint(user, 10000_u256);
    
    start_cheat_caller_address(token_address, user);
    token.approve(subscription_address, 10000_u256);
    stop_cheat_caller_address(token_address);
    
    start_cheat_caller_address(subscription_address, user);
    start_cheat_block_timestamp(subscription_address, 1000_u64);
    
    subscription.subscribe(user);
    
    // 验证订阅在有效期内是活跃的
    start_cheat_block_timestamp(subscription_address, 1050_u64); // 50 秒后
    assert(subscription.is_active(user) == true, 'Should be active before expiry');
    
    // 验证订阅在过期后是非活跃的
    start_cheat_block_timestamp(subscription_address, 1101_u64); // 101 秒后（过期）
    assert(subscription.is_active(user) == false, 'Should be inactive after expiry');
    
    stop_cheat_block_timestamp(subscription_address);
    stop_cheat_caller_address(subscription_address);
}

#[test]
fn test_event_emissions() {
    let (factory, factory_address, token_address) = test_helpers::setup_test_environment();
    let creator: ContractAddress = 0x789.try_into().unwrap();
    
    // 设置事件监听
    let mut _spy = spy_events();
    
    // 创建计划并验证事件
    start_cheat_caller_address(factory_address, creator);
    let recipient: ContractAddress = 0xABC.try_into().unwrap();
    let price = 1000_u256;
    let period_length = 86400_u64;
    let plan_name: ByteArray = "Event Test Plan";
    
    let _plan_id = factory.create_plan(plan_name, recipient, token_address, price, period_length);
    
    // 验证 PlanCreated 事件
    // 注意：实际的事件验证需要根据具体的事件结构来实现
    // 这里只是展示测试结构
    
    stop_cheat_caller_address(factory_address);
}

// 性能和 Gas 优化测试
#[test]
fn test_batch_operations_efficiency() {
    let (factory, factory_address, token_address) = test_helpers::setup_test_environment();
    let creator: ContractAddress = 0x789.try_into().unwrap();
    
    start_cheat_caller_address(factory_address, creator);
    
    // 创建多个计划测试批量操作
    let recipient: ContractAddress = 0xABC.try_into().unwrap();
    let mut _plan_ids = array![];
    
    let mut i: u32 = 0;
    loop {
        if i >= 5 {
            break;
        }
        let plan_name: ByteArray = "Batch Plan";
        let _plan_id = factory.create_plan(
            plan_name,
            recipient, 
            token_address, 
            1000_u256 + i.into(), 
            86400_u64
        );
        _plan_ids.append(_plan_id);
        i += 1;
    };
    
    // 验证批量查询
    let user_plans = factory.get_user_plans(creator);
    assert(user_plans.len() == 5, 'Wrong number of user plans');
    
    let active_plans = factory.get_active_plans();
    assert(active_plans.len() == 5, 'Wrong number of active plans');
    
    stop_cheat_caller_address(factory_address);
}