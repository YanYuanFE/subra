// SPDX-License-Identifier: MIT
// Mock ERC20 Contract for Testing Purposes

use starknet::ContractAddress;

#[starknet::interface]
pub trait IMockERC20<TContractState> {
    // Standard ERC20 functions
    fn name(self: @TContractState) -> ByteArray;
    fn symbol(self: @TContractState) -> ByteArray;
    fn decimals(self: @TContractState) -> u8;
    fn total_supply(self: @TContractState) -> u256;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
    fn allowance(self: @TContractState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TContractState, to: ContractAddress, amount: u256) -> bool;
    fn transfer_from(ref self: TContractState, from: ContractAddress, to: ContractAddress, amount: u256) -> bool;
    fn approve(ref self: TContractState, spender: ContractAddress, amount: u256) -> bool;
    
    // Mock-specific functions for testing
    fn mint(ref self: TContractState, to: ContractAddress, amount: u256);
    fn burn(ref self: TContractState, from: ContractAddress, amount: u256);
    fn set_balance(ref self: TContractState, account: ContractAddress, amount: u256);
}

#[starknet::contract]
mod MockERC20 {
    use super::ContractAddress;
    use starknet::get_caller_address;
    use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess, StorageMapReadAccess, StorageMapWriteAccess};
    use core::num::traits::Zero;

    #[storage]
    struct Storage {
        name: ByteArray,
        symbol: ByteArray,
        decimals: u8,
        total_supply: u256,
        balances: Map<ContractAddress, u256>,
        allowances: Map<(ContractAddress, ContractAddress), u256>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        Transfer: Transfer,
        Approval: Approval,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Transfer {
        pub from: ContractAddress,
        pub to: ContractAddress,
        pub value: u256,
    }

    #[derive(Drop, starknet::Event)]
    pub struct Approval {
        pub owner: ContractAddress,
        pub spender: ContractAddress,
        pub value: u256,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: ByteArray,
        symbol: ByteArray,
        decimals: u8,
        initial_supply: u256,
        recipient: ContractAddress
    ) {
        self.name.write(name);
        self.symbol.write(symbol);
        self.decimals.write(decimals);
        self.total_supply.write(initial_supply);
        self.balances.write(recipient, initial_supply);
        
        self.emit(Transfer {
            from: Zero::zero(),
            to: recipient,
            value: initial_supply,
        });
    }

    #[abi(embed_v0)]
    impl MockERC20Impl of super::IMockERC20<ContractState> {
        fn name(self: @ContractState) -> ByteArray {
            self.name.read()
        }

        fn symbol(self: @ContractState) -> ByteArray {
            self.symbol.read()
        }

        fn decimals(self: @ContractState) -> u8 {
            self.decimals.read()
        }

        fn total_supply(self: @ContractState) -> u256 {
            self.total_supply.read()
        }

        fn balance_of(self: @ContractState, account: ContractAddress) -> u256 {
            self.balances.read(account)
        }

        fn allowance(self: @ContractState, owner: ContractAddress, spender: ContractAddress) -> u256 {
            self.allowances.read((owner, spender))
        }

        fn transfer(ref self: ContractState, to: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            self._transfer(caller, to, amount);
            true
        }

        fn transfer_from(ref self: ContractState, from: ContractAddress, to: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            
            // Check allowance if caller is not the owner
            if caller != from {
                let current_allowance = self.allowances.read((from, caller));
                assert(current_allowance >= amount, 'Insufficient allowance');
                
                // Update allowance
                self.allowances.write((from, caller), current_allowance - amount);
            }
            
            self._transfer(from, to, amount);
            true
        }

        fn approve(ref self: ContractState, spender: ContractAddress, amount: u256) -> bool {
            let caller = get_caller_address();
            self.allowances.write((caller, spender), amount);
            
            self.emit(Approval {
                owner: caller,
                spender,
                value: amount,
            });
            
            true
        }

        // Mock-specific functions
        fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
            assert(!to.is_zero(), 'Cannot mint to zero address');
            
            let new_total_supply = self.total_supply.read() + amount;
            let new_balance = self.balances.read(to) + amount;
            
            self.total_supply.write(new_total_supply);
            self.balances.write(to, new_balance);
            
            self.emit(Transfer {
                from: Zero::zero(),
                to,
                value: amount,
            });
        }

        fn burn(ref self: ContractState, from: ContractAddress, amount: u256) {
            assert(!from.is_zero(), 'Cannot burn from zero address');
            
            let current_balance = self.balances.read(from);
            assert(current_balance >= amount, 'Insufficient balance to burn');
            
            let new_total_supply = self.total_supply.read() - amount;
            let new_balance = current_balance - amount;
            
            self.total_supply.write(new_total_supply);
            self.balances.write(from, new_balance);
            
            self.emit(Transfer {
                from,
                to: Zero::zero(),
                value: amount,
            });
        }

        fn set_balance(ref self: ContractState, account: ContractAddress, amount: u256) {
            let current_balance = self.balances.read(account);
            let current_total = self.total_supply.read();
            
            if amount > current_balance {
                // Increase balance and total supply
                let diff = amount - current_balance;
                self.total_supply.write(current_total + diff);
                
                self.emit(Transfer {
                    from: Zero::zero(),
                    to: account,
                    value: diff,
                });
            } else if amount < current_balance {
                // Decrease balance and total supply
                let diff = current_balance - amount;
                self.total_supply.write(current_total - diff);
                
                self.emit(Transfer {
                    from: account,
                    to: Zero::zero(),
                    value: diff,
                });
            }
            
            self.balances.write(account, amount);
        }
    }

    // Internal functions
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _transfer(ref self: ContractState, from: ContractAddress, to: ContractAddress, amount: u256) {
            assert(!from.is_zero(), 'Transfer from zero address');
            assert(!to.is_zero(), 'Transfer to zero address');
            
            let from_balance = self.balances.read(from);
            assert(from_balance >= amount, 'Insufficient balance');
            
            let to_balance = self.balances.read(to);
            
            self.balances.write(from, from_balance - amount);
            self.balances.write(to, to_balance + amount);
            
            self.emit(Transfer {
                from,
                to,
                value: amount,
            });
        }
    }
}