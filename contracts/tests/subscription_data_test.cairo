#[cfg(test)]
mod subscription_data_tests {
    use core::result::ResultTrait;
    use core::option::OptionTrait;
    use core::traits::TryInto;
    use core::serde::Serde;
    use starknet::{
        ContractAddress, contract_address_const, ClassHash,
        get_block_timestamp
    };
    use snforge_std::{
        declare, ContractClassTrait, DeclareResultTrait, start_cheat_caller_address,
        stop_cheat_caller_address, start_cheat_block_timestamp, stop_cheat_block_timestamp
    };
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use subra::subscription_factory::{
        ISubscriptionFactoryDispatcher, ISubscriptionFactoryDispatcherTrait
    };
    use subra::subscription::{
        ISubscriptionDispatcher, ISubscriptionDispatcherTrait
    };
    use subra::mock_erc20::{IMockERC20Dispatcher, IMockERC20DispatcherTrait};

    const INITIAL_SUPPLY: u256 = 1000000000000000000000; // 1000 tokens with 18 decimals
    const SUBSCRIPTION_PRICE: u256 = 100000000000000000000; // 100 tokens
    const PERIOD_LENGTH: u64 = 2592000; // 30 days in seconds
    const FEE_RATE: u256 = 100; // 1%

    fn deploy_mock_erc20() -> (IMockERC20Dispatcher, ContractAddress) {
        let contract = declare("MockERC20").unwrap().contract_class();
        let token_name: ByteArray = "Test Token";
        let token_symbol: ByteArray = "TT";
        let zero_address: ContractAddress = 0x0.try_into().unwrap();
        
        let mut constructor_calldata = array![];
        token_name.serialize(ref constructor_calldata);
        token_symbol.serialize(ref constructor_calldata);
        18_u8.serialize(ref constructor_calldata);
        INITIAL_SUPPLY.serialize(ref constructor_calldata);
        zero_address.serialize(ref constructor_calldata);

        let (contract_address, _) = contract.deploy(@constructor_calldata).unwrap();
        (IMockERC20Dispatcher { contract_address }, contract_address)
    }

    fn deploy_factory_and_create_plan() -> (
        ISubscriptionFactoryDispatcher,
        ISubscriptionDispatcher,
        ContractAddress,
        u256
    ) {
        // Deploy mock ERC20
        let (_token, token_address) = deploy_mock_erc20();

        // Deploy SubscriptionFactory
        let factory_contract = declare("SubscriptionFactory").unwrap().contract_class();
        let subscription_class = declare("Subscription").unwrap().contract_class();
        let _subscription_class_hash = subscription_class.class_hash;

        let _owner = contract_address_const::<0x123>();
        let _fee_recipient = contract_address_const::<0x456>();

        let mut factory_constructor_calldata = array![];
        _owner.serialize(ref factory_constructor_calldata);
        _subscription_class_hash.serialize(ref factory_constructor_calldata);
        FEE_RATE.serialize(ref factory_constructor_calldata);
        _fee_recipient.serialize(ref factory_constructor_calldata);

        let (factory_address, _) = factory_contract.deploy(@factory_constructor_calldata).unwrap();
        let factory = ISubscriptionFactoryDispatcher { contract_address: factory_address };

        // Create a subscription plan
        let recipient = contract_address_const::<0x789>();
        start_cheat_caller_address(factory_address, recipient);
        let plan_id = factory.create_plan(
            "Test Plan",
            recipient,
            token_address,
            SUBSCRIPTION_PRICE,
            PERIOD_LENGTH
        );
        stop_cheat_caller_address(factory_address);

        // Get subscription contract address
        let subscription_address = factory.get_subscription_contract(plan_id);
        let subscription = ISubscriptionDispatcher { contract_address: subscription_address };

        (factory, subscription, token_address, plan_id)
    }

    #[test]
    fn test_subscription_data_before_subscription() {
        let (_, subscription, _, _) = deploy_factory_and_create_plan();
        let user = contract_address_const::<0x999>();

        // 测试订阅前的数据 - 应该返回默认值
        let subscription_data = subscription.get_subscription(user);
        
        assert(subscription_data.start_time == 0, 'Start time should be 0');
        assert(subscription_data.end_time == 0, 'End time should be 0');
        assert(subscription_data.is_active == false, 'Should not be active');
        assert(subscription_data.renewals_count == 0, 'Renewals count should be 0');
        
        // 验证订阅状态
        assert(subscription.is_active(user) == false, 'User should not be active');
    }

    #[test]
    fn test_subscription_data_after_subscription() {
        let (_, subscription, token_address, _) = deploy_factory_and_create_plan();
        let user = contract_address_const::<0x999>();

        // 设置时间戳
        let current_time = 1000000;
        start_cheat_block_timestamp(subscription.contract_address, current_time);

        // 给用户分配代币并授权
        let mock_token = IMockERC20Dispatcher { contract_address: token_address };
        start_cheat_caller_address(token_address, contract_address_const::<0x123>());
        mock_token.mint(user, SUBSCRIPTION_PRICE * 2);
        stop_cheat_caller_address(token_address);

        // 授权代币
        start_cheat_caller_address(token_address, user);
        let erc20_token = IERC20Dispatcher { contract_address: token_address };
        IERC20DispatcherTrait::approve(erc20_token, subscription.contract_address, SUBSCRIPTION_PRICE);
        stop_cheat_caller_address(token_address);

        // 用户订阅
        start_cheat_caller_address(subscription.contract_address, user);
        subscription.subscribe(user);
        stop_cheat_caller_address(subscription.contract_address);

        // 测试订阅后的数据
        let subscription_data = subscription.get_subscription(user);
        let expected_end_time = current_time + PERIOD_LENGTH;
        
        assert(subscription_data.start_time == current_time, 'Start time incorrect');
        assert(subscription_data.end_time == expected_end_time, 'End time incorrect');
        assert(subscription_data.is_active == true, 'Should be active');
        assert(subscription_data.renewals_count == 0, 'Initial renewals should be 0');
        
        // 验证订阅状态
        assert(subscription.is_active(user) == true, 'User should be active');
        
        stop_cheat_block_timestamp(subscription.contract_address);
    }

    #[test]
    fn test_subscription_data_after_expiration() {
        let (_, subscription, token_address, _) = deploy_factory_and_create_plan();
        let user = contract_address_const::<0x999>();

        // 设置时间戳
        let current_time = 1000000;
        start_cheat_block_timestamp(subscription.contract_address, current_time);

        // 给用户分配代币并授权
        let mock_token = IMockERC20Dispatcher { contract_address: token_address };
        start_cheat_caller_address(token_address, contract_address_const::<0x123>());
        mock_token.mint(user, SUBSCRIPTION_PRICE);
        stop_cheat_caller_address(token_address);

        // 授权代币
        start_cheat_caller_address(token_address, user);
        let erc20_token = IERC20Dispatcher { contract_address: token_address };
        IERC20DispatcherTrait::approve(erc20_token, subscription.contract_address, SUBSCRIPTION_PRICE);
        stop_cheat_caller_address(token_address);

        // 用户订阅
        start_cheat_caller_address(subscription.contract_address, user);
        subscription.subscribe(user);
        stop_cheat_caller_address(subscription.contract_address);

        // 时间推进到订阅过期后
        let expired_time = current_time + PERIOD_LENGTH + 1;
        start_cheat_block_timestamp(subscription.contract_address, expired_time);

        // 测试过期后的数据
        let subscription_data = subscription.get_subscription(user);
        let expected_end_time = current_time + PERIOD_LENGTH;
        
        // 订阅数据应该保持不变
        assert(subscription_data.start_time == current_time, 'Start time should not change');
        assert(subscription_data.end_time == expected_end_time, 'End time should not change');
        assert(subscription_data.is_active == true, 'Data is_active remain true');
        assert(subscription_data.renewals_count == 0, 'Renewals count remain 0');
        
        // 但is_active()方法应该返回false（因为已过期）
        assert(subscription.is_active(user) == false, 'User not active after expire');
        
        stop_cheat_block_timestamp(subscription.contract_address);
    }
}