// SPDX-License-Identifier: MIT
// Revenue Tracking Tests for Subra Subscription Platform

use core::result::ResultTrait;
use core::traits::TryInto;
use starknet::ContractAddress;
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_timestamp};

use subra::subscription_factory::{ISubscriptionFactoryDispatcher, ISubscriptionFactoryDispatcherTrait};
use subra::subscription::{ISubscriptionDispatcher, ISubscriptionDispatcherTrait};
use subra::mock_erc20::{IMockERC20Dispatcher, IMockERC20DispatcherTrait};

// Test constants
const INITIAL_SUPPLY: u256 = 1000000000000000000000; // 1000 tokens with 18 decimals
const PLAN_PRICE: u256 = 100000000000000000000; // 100 tokens
const PERIOD_LENGTH: u64 = 2592000; // 30 days in seconds
const DEVELOPER_FEE_RATE: u256 = 100; // 1% (100 basis points)

// Helper function to deploy contracts
fn deploy_contracts() -> (ISubscriptionFactoryDispatcher, IMockERC20Dispatcher, ContractAddress, ContractAddress) {
    // Deploy Mock ERC20
    let erc20_class = declare("MockERC20").unwrap().contract_class();
    let token_name: ByteArray = "Test Token";
    let token_symbol: ByteArray = "TEST";
    let zero_address: ContractAddress = 0x0.try_into().unwrap();
    
    let mut erc20_constructor_calldata = array![];
    token_name.serialize(ref erc20_constructor_calldata);
    token_symbol.serialize(ref erc20_constructor_calldata);
    18_u8.serialize(ref erc20_constructor_calldata);
    INITIAL_SUPPLY.serialize(ref erc20_constructor_calldata);
    zero_address.serialize(ref erc20_constructor_calldata); // Initial recipient
    
    let (erc20_address, _) = erc20_class.deploy(@erc20_constructor_calldata).unwrap();
    let token = IMockERC20Dispatcher { contract_address: erc20_address };
    
    // Deploy Subscription contract class
    let subscription_class = declare("Subscription").unwrap().contract_class();
    let subscription_class_hash = subscription_class.class_hash;
    
    // Deploy SubscriptionFactory
    let factory_class = declare("SubscriptionFactory").unwrap().contract_class();
    let owner: ContractAddress = 0x123.try_into().unwrap();
    let fee_recipient: ContractAddress = 0x456.try_into().unwrap();
    
    let mut factory_constructor_calldata = array![];
    owner.serialize(ref factory_constructor_calldata);
    subscription_class_hash.serialize(ref factory_constructor_calldata);
    DEVELOPER_FEE_RATE.serialize(ref factory_constructor_calldata);
    fee_recipient.serialize(ref factory_constructor_calldata);
    
    let (factory_address, _) = factory_class.deploy(@factory_constructor_calldata).unwrap();
    let factory = ISubscriptionFactoryDispatcher { contract_address: factory_address };
    
    (factory, token, owner, fee_recipient)
}

#[test]
fn test_revenue_tracking_single_subscription() {
    let (factory, token, owner, _fee_recipient) = deploy_contracts();
    
    // Set a non-zero block timestamp for testing
    let test_timestamp: u64 = 1000000;
    start_cheat_block_timestamp(factory.contract_address, test_timestamp);
    
    // Set up test accounts
    let creator: ContractAddress = 0x111.try_into().unwrap();
    let subscriber: ContractAddress = 0x222.try_into().unwrap();
    let recipient: ContractAddress = 0x333.try_into().unwrap();
    
    // Mint tokens to subscriber
    start_cheat_caller_address(token.contract_address, owner);
    token.mint(subscriber, INITIAL_SUPPLY);
    stop_cheat_caller_address(token.contract_address);
    
    // Create a plan
    start_cheat_caller_address(factory.contract_address, creator);
    let plan_name: ByteArray = "Test Plan";
    let plan_id = factory.create_plan(plan_name, recipient, token.contract_address, PLAN_PRICE, PERIOD_LENGTH);
    stop_cheat_caller_address(factory.contract_address);
    
    // Get subscription contract address
    let plan = factory.get_plan(plan_id);
    let subscription = ISubscriptionDispatcher { contract_address: plan.contract_address };
    
    // Check initial revenue (should be zero)
    let (total_revenue, creator_revenue, platform_revenue, last_payment_time) = factory.get_plan_revenue(plan_id);
    assert(total_revenue == 0, 'Initial total revenue 0');
    assert(creator_revenue == 0, 'Initial creator revenue 0');
    assert(platform_revenue == 0, 'Initial platform revenue 0');
    assert(last_payment_time == 0, 'Initial payment time 0');
    
    // Check subscriber balance before subscription
    let subscriber_balance = token.balance_of(subscriber);
    assert(subscriber_balance >= PLAN_PRICE, 'Insufficient balance');
    
    // Approve and subscribe
    start_cheat_caller_address(token.contract_address, subscriber);
    token.approve(subscription.contract_address, PLAN_PRICE);
    stop_cheat_caller_address(token.contract_address);
    
    start_cheat_caller_address(subscription.contract_address, subscriber);
    subscription.subscribe(subscriber);
    stop_cheat_caller_address(subscription.contract_address);
    
    // Calculate expected fees
    let expected_platform_fee = (PLAN_PRICE * DEVELOPER_FEE_RATE) / 10000;
    let expected_creator_amount = PLAN_PRICE - expected_platform_fee;
    
    // Check revenue after subscription
    let (total_revenue, creator_revenue, platform_revenue, last_payment_time) = factory.get_plan_revenue(plan_id);
    
    assert(total_revenue == PLAN_PRICE, 'Total revenue equals price');
    assert(creator_revenue == expected_creator_amount, 'Creator revenue incorrect');
    assert(platform_revenue == expected_platform_fee, 'Platform revenue incorrect');
    assert(last_payment_time > 0, 'Payment time > 0');
    
    // Check global platform revenue
    let total_platform_revenue = factory.get_total_platform_revenue();
    assert(total_platform_revenue == expected_platform_fee, 'Global platform incorrect');
    
    // Check creator total revenue
    let creator_total_revenue = factory.get_creator_total_revenue(creator);
    assert(creator_total_revenue == expected_creator_amount, 'Creator total incorrect');
}

#[test]
fn test_revenue_tracking_multiple_subscriptions() {
    let (factory, token, owner, _fee_recipient) = deploy_contracts();
    
    // Set up test accounts
    let creator: ContractAddress = 0x111.try_into().unwrap();
    let subscriber1: ContractAddress = 0x222.try_into().unwrap();
    let subscriber2: ContractAddress = 0x333.try_into().unwrap();
    let recipient: ContractAddress = 0x444.try_into().unwrap();
    
    // Mint tokens to subscribers
    start_cheat_caller_address(token.contract_address, owner);
    token.mint(subscriber1, INITIAL_SUPPLY);
    token.mint(subscriber2, INITIAL_SUPPLY);
    stop_cheat_caller_address(token.contract_address);
    
    // Create a plan
    start_cheat_caller_address(factory.contract_address, creator);
    let plan_name: ByteArray = "Multi Sub Plan";
    let plan_id = factory.create_plan(plan_name, recipient, token.contract_address, PLAN_PRICE, PERIOD_LENGTH);
    stop_cheat_caller_address(factory.contract_address);
    
    // Get subscription contract
    let plan = factory.get_plan(plan_id);
    let subscription = ISubscriptionDispatcher { contract_address: plan.contract_address };
    
    // First subscription
    start_cheat_caller_address(token.contract_address, subscriber1);
    token.approve(subscription.contract_address, PLAN_PRICE);
    stop_cheat_caller_address(token.contract_address);
    
    start_cheat_caller_address(subscription.contract_address, subscriber1);
    subscription.subscribe(subscriber1);
    stop_cheat_caller_address(subscription.contract_address);
    
    // Second subscription
    start_cheat_caller_address(token.contract_address, subscriber2);
    token.approve(subscription.contract_address, PLAN_PRICE);
    stop_cheat_caller_address(token.contract_address);
    
    start_cheat_caller_address(subscription.contract_address, subscriber2);
    subscription.subscribe(subscriber2);
    stop_cheat_caller_address(subscription.contract_address);
    
    // Calculate expected totals
    let expected_platform_fee_per_sub = (PLAN_PRICE * DEVELOPER_FEE_RATE) / 10000;
    let expected_creator_amount_per_sub = PLAN_PRICE - expected_platform_fee_per_sub;
    let expected_total_revenue = PLAN_PRICE * 2;
    let expected_total_creator_revenue = expected_creator_amount_per_sub * 2;
    let expected_total_platform_revenue = expected_platform_fee_per_sub * 2;
    
    // Check revenue after both subscriptions
    let (total_revenue, creator_revenue, platform_revenue, _) = factory.get_plan_revenue(plan_id);
    assert(total_revenue == expected_total_revenue, 'Total revenue multi subs');
    assert(creator_revenue == expected_total_creator_revenue, 'Creator revenue multi subs');
    assert(platform_revenue == expected_total_platform_revenue, 'Platform revenue multi subs');
    
    // Check global platform revenue
    let total_platform_revenue = factory.get_total_platform_revenue();
    assert(total_platform_revenue == expected_total_platform_revenue, 'Global platform incorrect');
}

#[test]
fn test_revenue_tracking_with_renewals() {
    let (factory, token, owner, _fee_recipient) = deploy_contracts();
    
    // Set a non-zero block timestamp for testing
    let test_timestamp: u64 = 1000000;
    start_cheat_block_timestamp(factory.contract_address, test_timestamp);
    
    // Set up test accounts
    let creator: ContractAddress = 0x111.try_into().unwrap();
    let subscriber: ContractAddress = 0x222.try_into().unwrap();
    let recipient: ContractAddress = 0x333.try_into().unwrap();
    
    // Mint tokens to subscriber
    start_cheat_caller_address(token.contract_address, owner);
    token.mint(subscriber, INITIAL_SUPPLY);
    stop_cheat_caller_address(token.contract_address);
    
    // Create a plan
    start_cheat_caller_address(factory.contract_address, creator);
    let plan_name: ByteArray = "Renewal Plan";
    let plan_id = factory.create_plan(plan_name, recipient, token.contract_address, PLAN_PRICE, PERIOD_LENGTH);
    stop_cheat_caller_address(factory.contract_address);
    
    // Get subscription contract
    let plan = factory.get_plan(plan_id);
    let subscription = ISubscriptionDispatcher { contract_address: plan.contract_address };
    
    // Set timestamp for subscription contract too
    start_cheat_block_timestamp(subscription.contract_address, test_timestamp);
    
    // Initial subscription
    start_cheat_caller_address(token.contract_address, subscriber);
    token.approve(subscription.contract_address, PLAN_PRICE * 3); // Approve for subscription + 2 renewals
    stop_cheat_caller_address(token.contract_address);
    
    start_cheat_caller_address(subscription.contract_address, subscriber);
    subscription.subscribe(subscriber);
    stop_cheat_caller_address(subscription.contract_address);
    
    // First renewal
    start_cheat_caller_address(subscription.contract_address, subscriber);
    subscription.renew(subscriber);
    stop_cheat_caller_address(subscription.contract_address);
    
    // Second renewal
    start_cheat_caller_address(subscription.contract_address, subscriber);
    subscription.renew(subscriber);
    stop_cheat_caller_address(subscription.contract_address);
    
    // Calculate expected totals (subscription + 2 renewals = 3 payments)
    let expected_platform_fee_per_payment = (PLAN_PRICE * DEVELOPER_FEE_RATE) / 10000;
    let expected_creator_amount_per_payment = PLAN_PRICE - expected_platform_fee_per_payment;
    let expected_total_revenue = PLAN_PRICE * 3;
    let expected_total_creator_revenue = expected_creator_amount_per_payment * 3;
    let expected_total_platform_revenue = expected_platform_fee_per_payment * 3;
    
    // Check revenue after renewals
    let (total_revenue, creator_revenue, platform_revenue, _) = factory.get_plan_revenue(plan_id);
    assert(total_revenue == expected_total_revenue, 'Total revenue with renewals');
    assert(creator_revenue == expected_total_creator_revenue, 'Creator revenue renewals');
    assert(platform_revenue == expected_total_platform_revenue, 'Platform revenue renewals');
    
    // Check global platform revenue
    let total_platform_revenue = factory.get_total_platform_revenue();
    assert(total_platform_revenue == expected_total_platform_revenue, 'Global platform renewals');
}

#[test]
fn test_revenue_tracking_multiple_plans() {
    let (factory, token, owner, _fee_recipient) = deploy_contracts();
    
    // Set up test accounts
    let creator1: ContractAddress = 0x111.try_into().unwrap();
    let creator2: ContractAddress = 0x222.try_into().unwrap();
    let subscriber: ContractAddress = 0x333.try_into().unwrap();
    let recipient1: ContractAddress = 0x444.try_into().unwrap();
    let recipient2: ContractAddress = 0x555.try_into().unwrap();
    
    // Mint tokens to subscriber
    start_cheat_caller_address(token.contract_address, owner);
    token.mint(subscriber, INITIAL_SUPPLY);
    stop_cheat_caller_address(token.contract_address);
    
    // Create first plan
    start_cheat_caller_address(factory.contract_address, creator1);
    let plan1_name: ByteArray = "Plan 1";
    let plan1_id = factory.create_plan(plan1_name, recipient1, token.contract_address, PLAN_PRICE, PERIOD_LENGTH);
    stop_cheat_caller_address(factory.contract_address);
    
    // Create second plan with different price
    let plan2_price = PLAN_PRICE * 2;
    start_cheat_caller_address(factory.contract_address, creator2);
    let plan2_name: ByteArray = "Plan 2";
    let plan2_id = factory.create_plan(plan2_name, recipient2, token.contract_address, plan2_price, PERIOD_LENGTH);
    stop_cheat_caller_address(factory.contract_address);
    
    // Get subscription contracts
    let plan1 = factory.get_plan(plan1_id);
    let plan2 = factory.get_plan(plan2_id);
    let subscription1 = ISubscriptionDispatcher { contract_address: plan1.contract_address };
    let subscription2 = ISubscriptionDispatcher { contract_address: plan2.contract_address };
    
    // Subscribe to both plans
    start_cheat_caller_address(token.contract_address, subscriber);
    token.approve(subscription1.contract_address, PLAN_PRICE);
    token.approve(subscription2.contract_address, plan2_price);
    stop_cheat_caller_address(token.contract_address);
    
    start_cheat_caller_address(subscription1.contract_address, subscriber);
    subscription1.subscribe(subscriber);
    stop_cheat_caller_address(subscription1.contract_address);
    
    start_cheat_caller_address(subscription2.contract_address, subscriber);
    subscription2.subscribe(subscriber);
    stop_cheat_caller_address(subscription2.contract_address);
    
    // Calculate expected fees for each plan
    let expected_platform_fee1 = (PLAN_PRICE * DEVELOPER_FEE_RATE) / 10000;
    let expected_creator_amount1 = PLAN_PRICE - expected_platform_fee1;
    let expected_platform_fee2 = (plan2_price * DEVELOPER_FEE_RATE) / 10000;
    let expected_creator_amount2 = plan2_price - expected_platform_fee2;
    
    // Check revenue for plan 1
    let (total_revenue1, creator_revenue1, platform_revenue1, _) = factory.get_plan_revenue(plan1_id);
    assert(total_revenue1 == PLAN_PRICE, 'Plan 1 total incorrect');
    assert(creator_revenue1 == expected_creator_amount1, 'Plan 1 creator incorrect');
    assert(platform_revenue1 == expected_platform_fee1, 'Plan 1 platform incorrect');
    
    // Check revenue for plan 2
    let (total_revenue2, creator_revenue2, platform_revenue2, _) = factory.get_plan_revenue(plan2_id);
    assert(total_revenue2 == plan2_price, 'Plan 2 total incorrect');
    assert(creator_revenue2 == expected_creator_amount2, 'Plan 2 creator incorrect');
    assert(platform_revenue2 == expected_platform_fee2, 'Plan 2 platform incorrect');
    
    // Check global platform revenue
    let total_platform_revenue = factory.get_total_platform_revenue();
    let expected_total_platform = expected_platform_fee1 + expected_platform_fee2;
    assert(total_platform_revenue == expected_total_platform, 'Global platform multi plans');
    
    // Check individual creator revenues
    let creator1_total = factory.get_creator_total_revenue(creator1);
    let creator2_total = factory.get_creator_total_revenue(creator2);
    assert(creator1_total == expected_creator_amount1, 'Creator 1 total incorrect');
    assert(creator2_total == expected_creator_amount2, 'Creator 2 total incorrect');
}

#[test]
fn test_revenue_tracking_zero_fee_rate() {
    // Deploy contracts with zero fee rate
    let erc20_class = declare("MockERC20").unwrap().contract_class();
    let token_name: ByteArray = "Test Token";
    let token_symbol: ByteArray = "TEST";
    let zero_address: ContractAddress = 0x0.try_into().unwrap();
    
    let mut erc20_constructor_calldata = array![];
    token_name.serialize(ref erc20_constructor_calldata);
    token_symbol.serialize(ref erc20_constructor_calldata);
    18_u8.serialize(ref erc20_constructor_calldata);
    INITIAL_SUPPLY.serialize(ref erc20_constructor_calldata);
    zero_address.serialize(ref erc20_constructor_calldata); // Initial recipient
    
    let (erc20_address, _) = erc20_class.deploy(@erc20_constructor_calldata).unwrap();
    let token = IMockERC20Dispatcher { contract_address: erc20_address };
    
    let subscription_class = declare("Subscription").unwrap().contract_class();
    let subscription_class_hash = subscription_class.class_hash;
    
    let factory_class = declare("SubscriptionFactory").unwrap().contract_class();
    let owner: ContractAddress = 0x123.try_into().unwrap();
    let fee_recipient: ContractAddress = 0x456.try_into().unwrap();
    
    let mut factory_constructor_calldata = array![];
    owner.serialize(ref factory_constructor_calldata);
    subscription_class_hash.serialize(ref factory_constructor_calldata);
    0_u256.serialize(ref factory_constructor_calldata); // Zero fee rate
    fee_recipient.serialize(ref factory_constructor_calldata);
    
    let (factory_address, _) = factory_class.deploy(@factory_constructor_calldata).unwrap();
    let factory = ISubscriptionFactoryDispatcher { contract_address: factory_address };
    
    // Set up test accounts
    let creator: ContractAddress = 0x111.try_into().unwrap();
    let subscriber: ContractAddress = 0x222.try_into().unwrap();
    let recipient: ContractAddress = 0x333.try_into().unwrap();
    
    // Mint tokens and create plan
    start_cheat_caller_address(token.contract_address, owner);
    token.mint(subscriber, INITIAL_SUPPLY);
    stop_cheat_caller_address(token.contract_address);
    
    start_cheat_caller_address(factory.contract_address, creator);
    let plan_name: ByteArray = "Zero Fee Plan";
    let plan_id = factory.create_plan(plan_name, recipient, token.contract_address, PLAN_PRICE, PERIOD_LENGTH);
    stop_cheat_caller_address(factory.contract_address);
    
    // Subscribe
    let plan = factory.get_plan(plan_id);
    let subscription = ISubscriptionDispatcher { contract_address: plan.contract_address };
    
    start_cheat_caller_address(token.contract_address, subscriber);
    token.approve(subscription.contract_address, PLAN_PRICE);
    stop_cheat_caller_address(token.contract_address);
    
    start_cheat_caller_address(subscription.contract_address, subscriber);
    subscription.subscribe(subscriber);
    stop_cheat_caller_address(subscription.contract_address);
    
    // Check revenue (all should go to creator with zero fee)
    let (total_revenue, creator_revenue, platform_revenue, _) = factory.get_plan_revenue(plan_id);
    assert(total_revenue == PLAN_PRICE, 'Total revenue equals price');
    assert(creator_revenue == PLAN_PRICE, 'Creator gets all with zero fee');
    assert(platform_revenue == 0, 'Platform revenue zero');
    
    // Check global platform revenue
    let total_platform_revenue = factory.get_total_platform_revenue();
    assert(total_platform_revenue == 0, 'Global platform zero');
}