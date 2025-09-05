use starknet::ContractAddress;

use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address};

use subra::{ISubscriptionFactoryDispatcher, ISubscriptionFactoryDispatcherTrait};

#[test]
fn test_create_plan() {
    let factory_address = deploy_factory_contract();
    let dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
    let owner: ContractAddress = 0x123.try_into().unwrap();
    
    let recipient: ContractAddress = 0x789.try_into().unwrap();
    let token_address: ContractAddress = 0xabc.try_into().unwrap();
    let price = 1000_u256;
    let period_length = 86400_u64; // 1 day
    
    start_cheat_caller_address(factory_address, owner);
    let plan_name: ByteArray = "Test Plan";
    let plan_id = dispatcher.create_plan(plan_name, recipient, token_address, price, period_length);
    stop_cheat_caller_address(factory_address);
    
    // Verify plan was created
    let total_plans = dispatcher.get_total_plans();
    assert(total_plans == 1, 'Plan should be created');
}

fn deploy_factory_contract() -> ContractAddress {
    let factory_contract = declare("SubscriptionFactory").unwrap().contract_class();
    let subscription_contract = declare("Subscription").unwrap().contract_class();
    
    let owner: ContractAddress = 0x123.try_into().unwrap();
    let subscription_class_hash = subscription_contract.class_hash;
    let developer_fee_rate = 100_u256; // 1% = 100 basis points
    let developer_fee_recipient: ContractAddress = 0x456.try_into().unwrap();
    
    let mut constructor_calldata = ArrayTrait::new();
    owner.serialize(ref constructor_calldata);
    subscription_class_hash.serialize(ref constructor_calldata);
    developer_fee_rate.serialize(ref constructor_calldata);
    developer_fee_recipient.serialize(ref constructor_calldata);
    
    let (contract_address, _) = factory_contract.deploy(@constructor_calldata).unwrap();
    contract_address
}

#[test]
fn test_subscription_factory_deployment() {
    // This is a basic test to ensure the factory can be deployed
    // More comprehensive tests would require mock ERC20 tokens
    let factory_address = deploy_factory_contract();
    
    let dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
    
    // Test that the factory is deployed and has initial state
    let total_plans = dispatcher.get_total_plans();
    assert(total_plans == 0, 'Initial plans should be 0');
}

#[test]
fn test_developer_fee_initialization() {
    let factory_address = deploy_factory_contract();
    let dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
    
    // Test initial developer fee rate
    let fee_rate = dispatcher.get_fee_rate();
    assert(fee_rate == 100_u256, 'Initial fee rate should be 1%');
    
    // Test initial developer fee recipient
    let fee_recipient = dispatcher.get_fee_recipient();
    let expected_recipient: ContractAddress = 0x456.try_into().unwrap();
    assert(fee_recipient == expected_recipient, 'Wrong fee recipient');
}

#[test]
fn test_set_fee_rate() {
    let factory_address = deploy_factory_contract();
    let dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
    let owner: ContractAddress = 0x123.try_into().unwrap();
    
    // Test setting new fee rate as owner
    start_cheat_caller_address(factory_address, owner);
    dispatcher.set_fee_rate(200_u256); // 2%
    stop_cheat_caller_address(factory_address);
    
    // Verify the fee rate was updated
    let new_fee_rate = dispatcher.get_fee_rate();
    assert(new_fee_rate == 200_u256, 'Fee rate not updated');
}

#[test]
fn test_set_fee_recipient() {
    let factory_address = deploy_factory_contract();
    let dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
    let owner: ContractAddress = 0x123.try_into().unwrap();
    let new_recipient: ContractAddress = 0x789.try_into().unwrap();
    
    // Test setting new fee recipient as owner
    start_cheat_caller_address(factory_address, owner);
    dispatcher.set_fee_recipient(new_recipient);
    stop_cheat_caller_address(factory_address);
    
    // Verify the fee recipient was updated
    let updated_recipient = dispatcher.get_fee_recipient();
    assert(updated_recipient == new_recipient, 'Fee recipient not updated');
}

#[test]
#[should_panic(expected: ('Fee rate too high',))]
fn test_set_invalid_fee_rate() {
    let factory_address = deploy_factory_contract();
    let dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
    let owner: ContractAddress = 0x123.try_into().unwrap();
    
    // Test setting invalid fee rate (over 10%)
    start_cheat_caller_address(factory_address, owner);
    dispatcher.set_fee_rate(1001_u256); // 10.01%
    stop_cheat_caller_address(factory_address);
}
