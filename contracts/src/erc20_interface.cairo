// SPDX-License-Identifier: MIT
// OpenZeppelin ERC20 Interface Integration for Subra Platform

use starknet::ContractAddress;

// Re-export OpenZeppelin's ERC20 interface and dispatcher
pub use openzeppelin::token::erc20::interface::{
    IERC20, IERC20Dispatcher, IERC20DispatcherTrait
};

// Additional utility functions for ERC20 operations
#[generate_trait]
pub impl ERC20UtilsImpl of ERC20Utils {
    /// Check if an ERC20 contract has sufficient allowance for a spender
    fn check_allowance(
        token: ContractAddress,
        owner: ContractAddress,
        spender: ContractAddress,
        required_amount: u256
    ) -> bool {
        let dispatcher = IERC20Dispatcher { contract_address: token };
        let allowance = dispatcher.allowance(owner, spender);
        allowance >= required_amount
    }
    
    /// Check if an account has sufficient balance
    fn check_balance(
        token: ContractAddress,
        account: ContractAddress,
        required_amount: u256
    ) -> bool {
        let dispatcher = IERC20Dispatcher { contract_address: token };
        let balance = dispatcher.balance_of(account);
        balance >= required_amount
    }
    
    /// Safe transfer function with balance and allowance checks
    fn safe_transfer_from(
        token: ContractAddress,
        from: ContractAddress,
        to: ContractAddress,
        amount: u256
    ) -> bool {
        let dispatcher = IERC20Dispatcher { contract_address: token };
        
        // Check balance
        assert(dispatcher.balance_of(from) >= amount, 'Insufficient balance');
        
        // Perform transfer
        dispatcher.transfer_from(from, to, amount)
    }
}