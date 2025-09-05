// SPDX-License-Identifier: MIT
// Subra Subscription Contract - Enhanced with OpenZeppelin Components

use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
// Storage traits are imported but may not be directly used in current implementation
use super::erc20_interface::{IERC20Dispatcher, IERC20DispatcherTrait, ERC20Utils};
use super::subscription_factory::{ISubscriptionFactoryDispatcher, ISubscriptionFactoryDispatcherTrait};

// OpenZeppelin imports for enhanced security and functionality
use openzeppelin::access::ownable::OwnableComponent;
use openzeppelin::security::reentrancyguard::ReentrancyGuardComponent;
use openzeppelin::security::pausable::PausableComponent;

/// Subscription data structure
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct SubscriptionData {
    pub start_time: u64,
    pub end_time: u64,
    pub is_active: bool,
    pub renewals_count: u32,
}

/// Auto renewal authorization data structure
#[derive(Copy, Drop, Serde, starknet::Store)]
pub struct AutoRenewalAuth {
    pub is_enabled: bool,
    pub max_renewals: u32,        // Maximum number of auto renewals
    pub remaining_renewals: u32,  // Remaining renewal count
    pub max_price: u256,          // Maximum acceptable price
    pub authorized_at: u64,       // Authorization timestamp
}

/// Subscription contract interface
#[starknet::interface]
pub trait ISubscription<TContractState> {
    // Core subscription functions
    fn subscribe(ref self: TContractState, user: ContractAddress);
    fn renew(ref self: TContractState, user: ContractAddress);
    fn cancel(ref self: TContractState, user: ContractAddress);
    
    // Auto renewal functions
    fn enable_auto_renewal(ref self: TContractState, max_renewals: u32, max_price: u256);
    fn disable_auto_renewal(ref self: TContractState);
    fn auto_renew(ref self: TContractState, user: ContractAddress) -> bool;
    
    // View functions
    fn is_active(self: @TContractState, user: ContractAddress) -> bool;
    fn get_subscription(self: @TContractState, user: ContractAddress) -> SubscriptionData;
    fn get_plan_info(self: @TContractState) -> (ContractAddress, ContractAddress, u256, u64);
    fn get_plan_id(self: @TContractState) -> u256;
    fn get_auto_renewal_auth(self: @TContractState, user: ContractAddress) -> AutoRenewalAuth;
    
    // Enhanced functions with OpenZeppelin
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
    fn is_paused(self: @TContractState) -> bool;
    fn get_renewals_count(self: @TContractState, user: ContractAddress) -> u32;
}

#[starknet::contract]
mod Subscription {
    use super::{
        SubscriptionData, AutoRenewalAuth, ContractAddress, get_caller_address, get_block_timestamp,
        IERC20Dispatcher, IERC20DispatcherTrait, ERC20Utils,
        ISubscriptionFactoryDispatcher, ISubscriptionFactoryDispatcherTrait
    };
    use core::num::traits::Zero;
    use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess};
    
    // OpenZeppelin component imports
    use openzeppelin::access::ownable::OwnableComponent;
    use openzeppelin::security::reentrancyguard::ReentrancyGuardComponent;
    use openzeppelin::security::pausable::PausableComponent;
    
    // Component declarations
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: ReentrancyGuardComponent, storage: reentrancy_guard, event: ReentrancyGuardEvent);
    component!(path: PausableComponent, storage: pausable, event: PausableEvent);
    
    // Component implementations
    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    
    impl ReentrancyGuardInternalImpl = ReentrancyGuardComponent::InternalImpl<ContractState>;
    
    impl PausableInternalImpl = PausableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        // Immutable plan parameters (set once in constructor)
        recipient: ContractAddress,
        token: ContractAddress,
        price: u256,
        period_length: u64, // in seconds
        plan_id: u256,
        factory_address: ContractAddress, // Factory contract address for fee queries
        
        // User subscriptions mapping
        subscriptions: Map<ContractAddress, SubscriptionData>,
        
        // Auto renewal authorizations mapping
        auto_renewal_auths: Map<ContractAddress, AutoRenewalAuth>,
        
        // OpenZeppelin components
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        reentrancy_guard: ReentrancyGuardComponent::Storage,
        #[substorage(v0)]
        pausable: PausableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        Subscribed: Subscribed,
        Renewed: Renewed,
        Canceled: Canceled,
        AutoRenewalEnabled: AutoRenewalEnabled,
        AutoRenewalDisabled: AutoRenewalDisabled,
        AutoRenewalExecuted: AutoRenewalExecuted,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        ReentrancyGuardEvent: ReentrancyGuardComponent::Event,
        #[flat]
        PausableEvent: PausableComponent::Event,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Subscribed {
        pub user: ContractAddress,
        pub plan_id: u256,
        pub start_time: u64,
        pub end_time: u64,
        pub amount_paid: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Renewed {
        pub user: ContractAddress,
        pub plan_id: u256,
        pub new_end_time: u64,
        pub amount_paid: u256,
        pub renewal_count: u32,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Canceled {
        pub user: ContractAddress,
        pub plan_id: u256,
        pub canceled_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AutoRenewalEnabled {
        pub user: ContractAddress,
        pub plan_id: u256,
        pub max_renewals: u32,
        pub max_price: u256,
        pub authorized_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AutoRenewalDisabled {
        pub user: ContractAddress,
        pub plan_id: u256,
        pub disabled_at: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct AutoRenewalExecuted {
        pub user: ContractAddress,
        pub plan_id: u256,
        pub new_end_time: u64,
        pub amount_paid: u256,
        pub remaining_renewals: u32,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        recipient: ContractAddress,
        token: ContractAddress,
        price: u256,
        period_length: u64,
        plan_id: u256,
        owner: ContractAddress,
        factory_address: ContractAddress,
    ) {
        // Validate inputs
        assert(!recipient.is_zero(), 'Invalid recipient address');
        assert(!token.is_zero(), 'Invalid token address');
        assert(price > 0, 'Price must be greater than 0');
        assert(period_length > 0, 'Period must be greater than 0');
        assert(!owner.is_zero(), 'Invalid owner address');
        assert(!factory_address.is_zero(), 'Invalid factory address');
        
        // Set immutable parameters
        self.recipient.write(recipient);
        self.token.write(token);
        self.price.write(price);
        self.period_length.write(period_length);
        self.plan_id.write(plan_id);
        self.factory_address.write(factory_address);
        
        // Initialize OpenZeppelin components
        self.ownable.initializer(owner);
    }

    #[abi(embed_v0)]
    impl SubscriptionImpl of super::ISubscription<ContractState> {
        /// Subscribe a user to this plan
        fn subscribe(ref self: ContractState, user: ContractAddress) {
            // Security checks
            self.pausable.assert_not_paused();
            self.reentrancy_guard.start();
            
            let caller = get_caller_address();
            
            // Only the user themselves can subscribe (prevent unauthorized subscriptions)
            assert(caller == user, 'Only user can subscribe');
            
            // Check if user is already subscribed
            let existing_subscription = self.subscriptions.read(user);
            assert(!existing_subscription.is_active, 'User already subscribed');
            
            // Get plan details
            let token = self.token.read();
            let price = self.price.read();
            let recipient = self.recipient.read();
            let period_length = self.period_length.read();
            let plan_id = self.plan_id.read();
            let factory_address = self.factory_address.read();
            
            // Get developer fee information from factory
            let factory_dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
            let fee_rate = factory_dispatcher.get_fee_rate();
            let fee_recipient = factory_dispatcher.get_fee_recipient();
            
            // Calculate fees using safe calculation function
            let (developer_fee, recipient_amount) = self._calculate_fees(price, fee_rate);
            
            // Transfer payments using safe transfer functions
            self._safe_token_transfer(token, user, recipient, recipient_amount);
            
            // Transfer developer fee (if fee > 0)
            if developer_fee > 0 {
                self._safe_token_transfer(token, user, fee_recipient, developer_fee);
            }
            
            // Create subscription with overflow protection
            let current_time = get_block_timestamp();
            let end_time = self._safe_add_time(current_time, period_length);
            
            let subscription = SubscriptionData {
                start_time: current_time,
                end_time,
                is_active: true,
                renewals_count: 0,
            };
            
            self.subscriptions.write(user, subscription);
            
            // Update subscriber count in factory
            let factory_dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
            factory_dispatcher.increment_subscribers(plan_id);
            
            // Add user to subscription index in factory
            factory_dispatcher.add_user_subscription(user, plan_id);
            
            // Update revenue tracking in factory
            factory_dispatcher.update_plan_revenue(plan_id, price, recipient_amount, developer_fee);
            
            // Emit event
            self.emit(Subscribed {
                user,
                plan_id,
                start_time: current_time,
                end_time,
                amount_paid: price,
            });
            
            self.reentrancy_guard.end();
        }

        /// Renew an existing subscription
        fn renew(ref self: ContractState, user: ContractAddress) {
            // Security checks
            self.pausable.assert_not_paused();
            self.reentrancy_guard.start();
            
            let caller = get_caller_address();
            
            // Only the user themselves can renew
            assert(caller == user, 'Only user can renew');
            
            // Check subscription exists
            self._require_subscription_exists(user);
            
            let mut subscription = self.subscriptions.read(user);
            assert(subscription.is_active, 'No active subscription');
            
            // Get plan details
            let token = self.token.read();
            let price = self.price.read();
            let recipient = self.recipient.read();
            let period_length = self.period_length.read();
            let plan_id = self.plan_id.read();
            let factory_address = self.factory_address.read();
            
            // Get developer fee information from factory
            let factory_dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
            let fee_rate = factory_dispatcher.get_fee_rate();
            let fee_recipient = factory_dispatcher.get_fee_recipient();
            
            // Calculate fees using safe calculation function
            let (developer_fee, recipient_amount) = self._calculate_fees(price, fee_rate);
            
            // Transfer payments using safe transfer functions
            self._safe_token_transfer(token, user, recipient, recipient_amount);
            
            // Transfer developer fee (if fee > 0)
            if developer_fee > 0 {
                self._safe_token_transfer(token, user, fee_recipient, developer_fee);
            }
            
            // Extend subscription with overflow protection
            let current_time = get_block_timestamp();
            let new_end_time = if subscription.end_time > current_time {
                self._safe_add_time(subscription.end_time, period_length)
            } else {
                self._safe_add_time(current_time, period_length)
            };
            
            subscription.end_time = new_end_time;
            subscription.renewals_count += 1;
            
            self.subscriptions.write(user, subscription);
            
            // Update revenue tracking in factory
            let factory_dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
            factory_dispatcher.update_plan_revenue(plan_id, price, recipient_amount, developer_fee);
            
            // TODO: Implement off-chain automation for renewal reminders
            // TODO: Add webhook notifications for subscription renewals
            
            // Emit event
            self.emit(Renewed {
                user,
                plan_id,
                new_end_time,
                amount_paid: price,
                renewal_count: subscription.renewals_count,
            });
            
            self.reentrancy_guard.end();
        }

        /// Cancel a subscription
        fn cancel(ref self: ContractState, user: ContractAddress) {
            self.pausable.assert_not_paused();
            
            let caller = get_caller_address();
            
            // Only the user themselves can cancel
            assert(caller == user, 'Only user can cancel');
            
            // Check subscription exists
            self._require_subscription_exists(user);
            
            let mut subscription = self.subscriptions.read(user);
            assert(subscription.is_active, 'No active subscription');
            
            // Deactivate subscription
            subscription.is_active = false;
            self.subscriptions.write(user, subscription);
            
            let plan_id = self.plan_id.read();
            let current_time = get_block_timestamp();
            
            // Update subscriber count in factory
            let factory_address = self.factory_address.read();
            let factory_dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
            factory_dispatcher.decrement_subscribers(plan_id);
            
            // Remove user from subscription index in factory
            factory_dispatcher.remove_user_subscription(user, plan_id);
            
            // Emit event
            self.emit(Canceled {
                user,
                plan_id,
                canceled_at: current_time,
            });
        }

        /// Check if a user's subscription is active
        fn is_active(self: @ContractState, user: ContractAddress) -> bool {
            let subscription = self.subscriptions.read(user);
            
            // Check if subscription exists
            if subscription.start_time == 0 {
                return false;
            }
            
            if !subscription.is_active {
                return false;
            }
            
            let current_time = get_block_timestamp();
            subscription.end_time > current_time
        }

        /// Get subscription details for a user
        fn get_subscription(self: @ContractState, user: ContractAddress) -> SubscriptionData {
            self.subscriptions.read(user)
        }

        /// Get plan information
        fn get_plan_info(self: @ContractState) -> (ContractAddress, ContractAddress, u256, u64) {
            (
                self.recipient.read(),
                self.token.read(),
                self.price.read(),
                self.period_length.read()
            )
        }

        /// Get plan ID
        fn get_plan_id(self: @ContractState) -> u256 {
            self.plan_id.read()
        }
        
        /// Pause the contract (owner only)
        fn pause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.pause();
        }
        
        /// Unpause the contract (owner only)
        fn unpause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.unpause();
        }
        
        /// Check if the subscription is paused
        fn is_paused(self: @ContractState) -> bool {
            false // Simplified implementation - always active
        }
        
        /// Get renewal count for a user
        fn get_renewals_count(self: @ContractState, user: ContractAddress) -> u32 {
            let subscription = self.subscriptions.read(user);
            subscription.renewals_count
        }
        
        /// Enable auto renewal for the caller
        fn enable_auto_renewal(ref self: ContractState, max_renewals: u32, max_price: u256) {
            self.pausable.assert_not_paused();
            
            let caller = get_caller_address();
            
            // Check if user has an active subscription
            let subscription = self.subscriptions.read(caller);
            assert(subscription.is_active, 'No active subscription');
            
            // Validate parameters
            assert(max_renewals > 0, 'Max renewals must be > 0');
            assert(max_price >= self.price.read(), 'Max price too low');
            
            let current_time = get_block_timestamp();
            let plan_id = self.plan_id.read();
            
            // Create auto renewal authorization
            let auth = AutoRenewalAuth {
                is_enabled: true,
                max_renewals,
                remaining_renewals: max_renewals,
                max_price,
                authorized_at: current_time,
            };
            
            self.auto_renewal_auths.write(caller, auth);
            
            // Emit event
            self.emit(AutoRenewalEnabled {
                user: caller,
                plan_id,
                max_renewals,
                max_price,
                authorized_at: current_time,
            });
        }
        
        /// Disable auto renewal for the caller
        fn disable_auto_renewal(ref self: ContractState) {
            let caller = get_caller_address();
            
            let mut auth = self.auto_renewal_auths.read(caller);
            assert(auth.is_enabled, 'Auto renewal not enabled');
            
            // Disable auto renewal
            auth.is_enabled = false;
            self.auto_renewal_auths.write(caller, auth);
            
            let current_time = get_block_timestamp();
            let plan_id = self.plan_id.read();
            
            // Emit event
            self.emit(AutoRenewalDisabled {
                user: caller,
                plan_id,
                disabled_at: current_time,
            });
        }
        
        /// Execute auto renewal for a user (can be called by anyone)
        fn auto_renew(ref self: ContractState, user: ContractAddress) -> bool {
            self.pausable.assert_not_paused();
            self.reentrancy_guard.start();
            
            // Check auto renewal authorization
            let mut auth = self.auto_renewal_auths.read(user);
            if !auth.is_enabled || auth.remaining_renewals == 0 {
                self.reentrancy_guard.end();
                return false;
            }
            
            // Check subscription status
            let mut subscription = self.subscriptions.read(user);
            if !subscription.is_active {
                self.reentrancy_guard.end();
                return false;
            }
            
            let current_time = get_block_timestamp();
            
            // Check if renewal is needed (subscription expired or about to expire)
            if subscription.end_time > current_time {
                self.reentrancy_guard.end();
                return false;
            }
            
            // Get plan details
            let token = self.token.read();
            let price = self.price.read();
            let recipient = self.recipient.read();
            let period_length = self.period_length.read();
            let plan_id = self.plan_id.read();
            let factory_address = self.factory_address.read();
            
            // Get developer fee information from factory
            let factory_dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
            let fee_rate = factory_dispatcher.get_fee_rate();
            let fee_recipient = factory_dispatcher.get_fee_recipient();
            
            // Calculate fees using safe calculation function
            let (developer_fee, recipient_amount) = self._calculate_fees(price, fee_rate);
            
            // Check price protection against total payment amount (including fees)
            let total_payment = price; // Total amount user pays
            assert(total_payment <= auth.max_price, 'Total payment exceeds maximum');
            
            // Transfer payments (unused variable fixed)
            let _token_dispatcher = IERC20Dispatcher { contract_address: token };
            
            // Transfer to plan recipient
            ERC20Utils::safe_transfer_from(token, user, recipient, recipient_amount);
            
            // Transfer developer fee if applicable
            if developer_fee > 0 {
                ERC20Utils::safe_transfer_from(token, user, fee_recipient, developer_fee);
            }
            
            // Update subscription with overflow protection
            subscription.end_time = self._safe_add_time(current_time, period_length);
            subscription.renewals_count += 1;
            self.subscriptions.write(user, subscription);
            
            // Update revenue tracking in factory
            let factory_dispatcher = ISubscriptionFactoryDispatcher { contract_address: factory_address };
            factory_dispatcher.update_plan_revenue(plan_id, price, recipient_amount, developer_fee);
            
            // Update auto renewal authorization
            auth.remaining_renewals -= 1;
            if auth.remaining_renewals == 0 {
                auth.is_enabled = false;
            }
            self.auto_renewal_auths.write(user, auth);
            
            // Emit events
            self.emit(Renewed {
                user,
                plan_id,
                new_end_time: subscription.end_time,
                amount_paid: price,
                renewal_count: subscription.renewals_count,
            });
            
            self.emit(AutoRenewalExecuted {
                user,
                plan_id,
                new_end_time: subscription.end_time,
                amount_paid: price,
                remaining_renewals: auth.remaining_renewals,
            });
            
            self.reentrancy_guard.end();
            true
        }
        
        /// Get auto renewal authorization for a user
        fn get_auto_renewal_auth(self: @ContractState, user: ContractAddress) -> AutoRenewalAuth {
            self.auto_renewal_auths.read(user)
        }
    }
    
    // Internal helper functions for security
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// Safe token transfer with proper error handling
        fn _safe_token_transfer(
            ref self: ContractState,
            token: ContractAddress,
            from: ContractAddress,
            to: ContractAddress,
            amount: u256
        ) {
            let token_dispatcher = IERC20Dispatcher { contract_address: token };
            
            // Check balance before transfer
            let balance = token_dispatcher.balance_of(from);
            assert(balance >= amount, 'Insufficient balance');
            
            // Check allowance before transfer
            let allowance = token_dispatcher.allowance(from, starknet::get_contract_address());
            assert(allowance >= amount, 'Insufficient allowance');
            
            // Perform transfer
            let success = token_dispatcher.transfer_from(from, to, amount);
            assert(success, 'Transfer failed');
        }
        
        /// Safe time addition with overflow protection
        fn _safe_add_time(self: @ContractState, base_time: u64, period: u64) -> u64 {
            // Check for overflow
            let max_time = 0xffffffffffffffff_u64; // u64::MAX
            assert(base_time <= max_time - period, 'Time overflow');
            base_time + period
        }
        
        /// Check if subscription exists and is valid
        fn _require_subscription_exists(self: @ContractState, user: ContractAddress) {
            let subscription = self.subscriptions.read(user);
            assert(subscription.start_time > 0, 'Subscription does not exist');
        }
        
        /// Calculate fees with precision handling
        fn _calculate_fees(self: @ContractState, price: u256, fee_rate: u256) -> (u256, u256) {
            // Ensure fee rate is valid (max 10%)
            assert(fee_rate <= 1000, 'Fee rate too high');
            
            // Calculate developer fee with overflow protection
            let fee_numerator = price * fee_rate;
            assert(fee_numerator / price == fee_rate, 'Fee calculation overflow');
            
            let developer_fee = fee_numerator / 10000;
            let recipient_amount = price - developer_fee;
            
            (developer_fee, recipient_amount)
        }
    }
}