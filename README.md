# Subra - Decentralized Subscription Platform

Subra is a decentralized subscription platform built on Starknet using Cairo smart contracts. It enables creators to set up subscription plans and users to subscribe, renew, and manage their subscriptions using ERC20 tokens.

## Architecture

The platform consists of two main contracts built with **OpenZeppelin** components for enhanced security and standardization:

## Developer Fee System

Subra includes a built-in developer fee mechanism that allows the platform to collect a small percentage from each subscription payment as revenue. This system is designed to be transparent, configurable, and fair to both creators and users.

### Key Features

- **Configurable Fee Rate**: The developer fee rate can be set during factory deployment and modified by the contract owner
- **Maximum Fee Protection**: Fee rate is capped at 10% (1000 basis points) to ensure fairness
- **Flexible Fee Recipient**: The address receiving developer fees can be updated by the contract owner
- **Automatic Fee Calculation**: Fees are automatically calculated and transferred during subscription payments
- **Transparent Operations**: All fee-related operations emit events for transparency

### How It Works

1. **Factory Deployment**: When deploying the SubscriptionFactory, specify:
   - `developer_fee_rate`: Fee percentage in basis points (e.g., 100 = 1%)
   - `developer_fee_recipient`: Address to receive the fees

2. **Payment Processing**: When users subscribe or renew:
   - Total payment is split between the plan recipient and developer fee recipient
   - Developer fee = (payment_amount × fee_rate) / 10000
   - Plan recipient receives = payment_amount - developer_fee

3. **Fee Management**: Contract owner can:
   - Update fee rate (within 0-10% range)
   - Change fee recipient address
   - View current fee settings

### Example

For a 100 STRK subscription with 1% developer fee:
- User pays: 100 STRK
- Developer receives: 1 STRK (1%)
- Plan creator receives: 99 STRK (99%)

### Fee Management Functions

```cairo
// Get current fee settings
fn get_developer_fee_rate(self: @TContractState) -> u256;
fn get_developer_fee_recipient(self: @TContractState) -> ContractAddress;

// Update fee settings (owner only)
fn set_developer_fee_rate(ref self: TContractState, new_rate: u256);
fn set_developer_fee_recipient(ref self: TContractState, new_recipient: ContractAddress);
```

### Events

- `DeveloperFeeRateUpdated`: Emitted when fee rate changes
- `DeveloperFeeRecipientUpdated`: Emitted when fee recipient changes

### 1. SubscriptionFactory Contract

The factory contract is responsible for:
- Creating new subscription plans
- Deploying individual Subscription contracts for each plan
- Managing plan metadata and mappings
- Administrative functions (ownership, class hash updates)

**Key Features:**
- Plan creation with customizable parameters (price, token, period, recipient)
- Mapping from contract addresses to plan IDs
- Creator-to-plans mapping for easy querying
- Owner-controlled subscription contract class hash updates
- **OpenZeppelin Integration:**
  - `OwnableComponent` for access control
  - Secure deployment using syscalls
  - Standardized event emissions

### 2. Subscription Contract

Each subscription plan has its own contract instance with:
- Immutable plan parameters (price, token, period length, recipient address)
- User subscription management (subscribe, renew, cancel)
- Subscription status tracking
- Automatic expiration handling

**Key Features:**
- ERC20 token payment integration (STRK, ETH, USDC, etc.)
- Subscription lifecycle management
- Event emission for off-chain indexing
- View functions for subscription status queries
- **OpenZeppelin Integration:**
  - `OwnableComponent` for ownership management
  - `ReentrancyGuardComponent` for protection against reentrancy attacks
  - Standardized ERC20 interface integration

## Contract Interfaces

### ISubscriptionFactory

```cairo
trait ISubscriptionFactory<TContractState> {
    fn create_subscription_plan(
        ref self: TContractState,
        recipient: ContractAddress,
        token: ContractAddress,
        price: u256,
        period_length: u64,
    ) -> (u256, ContractAddress);
    
    fn get_plan(self: @TContractState, plan_id: u256) -> PlanInfo;
    fn get_total_plans(self: @TContractState) -> u256;
    // ... other view and admin functions
}
```

### ISubscription

```cairo
trait ISubscription<TContractState> {
    fn subscribe(ref self: TContractState, user: ContractAddress);
    fn renew(ref self: TContractState, user: ContractAddress);
    fn cancel(ref self: TContractState, user: ContractAddress);
    
    fn is_active(self: @TContractState, user: ContractAddress) -> bool;
    fn get_subscription(self: @TContractState, user: ContractAddress) -> SubscriptionData;
    // ... other view functions
}
```

## Events

The contracts emit comprehensive events for frontend indexing:

### Factory Events
- `PlanCreated`: When a new subscription plan is created
- `OwnershipTransferred`: When factory ownership changes
- `ClassHashUpdated`: When subscription contract class hash is updated
- `DeveloperFeeRateUpdated`: When developer fee rate is changed
- `DeveloperFeeRecipientUpdated`: When developer fee recipient is changed

### Subscription Events
- `Subscribed`: When a user subscribes to a plan
- `Renewed`: When a subscription is renewed
- `Canceled`: When a subscription is canceled

## Usage Example

### 1. Deploy Factory Contract

```cairo
// Deploy with owner address, subscription contract class hash, and fee settings
let factory = SubscriptionFactory::constructor(
    owner_address,              // Contract owner
    subscription_class_hash,    // Subscription contract class hash
    100_u256,                  // Developer fee rate (1% = 100 basis points)
    developer_fee_recipient     // Address to receive developer fees
);
```

### 2. Create Subscription Plan

```cairo
// Create a monthly plan for 100 STRK tokens
let (plan_id, subscription_address) = factory.create_subscription_plan(
    recipient_address,    // Where payments go
    strk_token_address,  // Payment token
    100_000000000000000000, // 100 STRK (18 decimals)
    2592000,             // 30 days in seconds
);
```

### 3. User Subscription

```cairo
// User subscribes to the plan
let subscription = ISubscriptionDispatcher { contract_address: subscription_address };
subscription.subscribe(user_address);
```

## Technical Features

- **OpenZeppelin Integration**: Built with industry-standard OpenZeppelin components
  - `OwnableComponent` for secure access control
  - `ReentrancyGuardComponent` for reentrancy protection
  - Standardized ERC20 interface (`IERC20`)
- **ERC20 Integration**: Seamless integration with any ERC20 token for payments
- **Cairo 1.0**: Built using the latest Cairo syntax and best practices
- **Modular Design**: Separate factory and subscription contracts for flexibility
- **Comprehensive Documentation**: Well-documented code with clear interfaces
- **Event System**: Rich event emissions for off-chain monitoring and indexing
- **Enhanced Security**: 
  - OpenZeppelin's battle-tested security components
  - Input validation and access control
  - Reentrancy protection
  - Safe arithmetic operations
  - Ownership management

## Security Features

- **Access Control**: Only plan recipients can manage subscriptions
- **Input Validation**: Comprehensive parameter validation
- **Reentrancy Protection**: Safe external calls to ERC20 contracts
- **Overflow Protection**: Safe arithmetic operations
- **Authorization Checks**: Users can only manage their own subscriptions

## Development Setup

### Prerequisites

- [Scarb](https://docs.swmansion.com/scarb/) (Cairo package manager)
- [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/) (Testing framework)

### Dependencies
The project uses the following key dependencies:
- **OpenZeppelin Contracts for Cairo**: Industry-standard smart contract components
  - Version: `0.20.0`
  - Repository: `https://github.com/OpenZeppelin/cairo-contracts`

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd subra/contracts

# Install dependencies (automatically handled by Scarb)
scarb build

# Run tests
scarb test
```

### Project Structure

```
contracts/
├── src/
│   ├── lib.cairo                 # Main library exports
│   ├── erc20_interface.cairo     # ERC20 interface definition
│   ├── subscription.cairo        # Subscription contract
│   └── subscription_factory.cairo # Factory contract
├── tests/
│   └── test_contract.cairo       # Basic deployment tests
├── Scarb.toml                    # Project configuration
└── README.md                     # This file
```

## TODOs for Production

### Off-chain Automation
- Implement subscription renewal reminders
- Set up automatic renewal processing
- Create subscription expiration notifications
- Build analytics dashboard for creators

### Enhanced Features
- Multi-tier subscription plans
- Discount codes and promotions
- Subscription gifting
- Pause/resume functionality
- Refund mechanisms

### Integration
- Frontend SDK development
- Mobile app integration
- Payment gateway bridges
- Cross-chain compatibility

## Testing

The project includes basic deployment tests. For comprehensive testing:

```bash
# Run all tests
scarb test

# Run with verbose output
SNFORGE_BACKTRACE=1 scarb test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

[Add your license here]

## Support

For questions and support, please [create an issue](link-to-issues) or contact the development team.