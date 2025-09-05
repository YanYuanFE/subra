/// Subra - Decentralized Subscription Platform
/// 
/// This library contains the core contracts for the Subra subscription platform:
/// - ERC20 interface for token interactions
/// - Subscription contract for individual subscription plans
/// - SubscriptionFactory contract for creating and managing subscription plans
/// 
/// The platform supports recurring payments using ERC20 tokens (STRK, ETH, USDC)
/// with automated renewal capabilities through off-chain keepers.

// Export ERC20 interface for token interactions
pub mod erc20_interface;

// Export Subscription contract
pub mod subscription;

// Export SubscriptionFactory contract
pub mod subscription_factory;

// Export Mock ERC20 for testing
pub mod mock_erc20;

// Re-export main interfaces for easier access
pub use erc20_interface::{IERC20, IERC20Dispatcher, IERC20DispatcherTrait};
pub use subscription::{ISubscription, ISubscriptionDispatcher, ISubscriptionDispatcherTrait, SubscriptionData};
pub use subscription_factory::{ISubscriptionFactory, ISubscriptionFactoryDispatcher, ISubscriptionFactoryDispatcherTrait, SubscriptionPlan};
pub use mock_erc20::{IMockERC20, IMockERC20Dispatcher, IMockERC20DispatcherTrait};
