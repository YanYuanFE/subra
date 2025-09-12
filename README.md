# Subra - Decentralized Subscription Platform

Subra is a comprehensive decentralized subscription platform built on Starknet, featuring Cairo smart contracts, a React frontend, and an automated renewal backend service. It enables creators to set up subscription plans and users to subscribe, renew, and manage their subscriptions using ERC20 tokens.

## 🏗️ Architecture Overview

Subra consists of three main components:

### 1. Smart Contracts (Cairo)
- **SubscriptionFactory**: Creates and manages subscription plans
- **Subscription**: Individual subscription contract instances
- Built with **OpenZeppelin** components for enhanced security

### 2. Frontend Application (React + TypeScript)
- Modern React application with Vite build system
- Starknet wallet integration via `@starknet-react/core`
- Real-time token price integration with CoinGecko API
- Responsive UI built with Radix UI and Tailwind CSS

### 3. Backend Service (Node.js + TypeScript)
- Automated subscription renewal service
- Starknet blockchain integration
- Docker containerization support

## 💰 Developer Fee System

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

## 📋 Smart Contract Details

### SubscriptionFactory Contract

The factory contract is responsible for:
- Creating new subscription plans
- Deploying individual Subscription contracts for each plan
- Managing plan metadata and mappings
- Administrative functions (ownership, class hash updates)
- Developer fee management

**Key Features:**
- Plan creation with customizable parameters (price, token, period, recipient)
- Mapping from contract addresses to plan IDs
- Creator-to-plans mapping for easy querying
- Owner-controlled subscription contract class hash updates
- Configurable developer fee system
- **OpenZeppelin Integration:**
  - `OwnableComponent` for access control
  - Secure deployment using syscalls
  - Standardized event emissions

### Subscription Contract

Each subscription plan has its own contract instance with:
- Immutable plan parameters (price, token, period length, recipient address)
- User subscription management (subscribe, renew, cancel)
- Subscription status tracking
- Automatic expiration handling
- Revenue tracking for analytics

**Key Features:**
- ERC20 token payment integration (STRK, ETH, USDC, etc.)
- Subscription lifecycle management
- Event emission for off-chain indexing
- View functions for subscription status queries
- Total revenue and subscriber count tracking
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

## 🚀 Technical Features

### Smart Contracts (Cairo)
- **OpenZeppelin Integration**: Built with industry-standard OpenZeppelin components
  - `OwnableComponent` for secure access control
  - `ReentrancyGuardComponent` for reentrancy protection
  - Standardized ERC20 interface (`IERC20`)
- **ERC20 Integration**: Seamless integration with any ERC20 token for payments
- **Cairo 2024_07**: Built using the latest Cairo syntax and best practices
- **Modular Design**: Separate factory and subscription contracts for flexibility
- **Event System**: Rich event emissions for off-chain monitoring and indexing

### Frontend Application
- **React 18**: Modern React with TypeScript for type safety
- **Vite**: Fast build tool and development server
- **Starknet React**: Official Starknet wallet integration
- **TanStack Query**: Powerful data fetching and caching
- **Radix UI**: Accessible and customizable UI components
- **Tailwind CSS**: Utility-first CSS framework
- **Real-time Pricing**: CoinGecko API integration for live token prices
- **Responsive Design**: Mobile-first responsive interface

### Backend Service
- **Node.js + TypeScript**: Type-safe server-side JavaScript
- **Express.js**: Fast and minimal web framework
- **Starknet.js**: Official Starknet JavaScript SDK
- **Docker**: Containerized deployment
- **Auto-renewal**: Automated subscription renewal service
- **CORS & Security**: Helmet.js and CORS middleware

### Enhanced Security
- OpenZeppelin's battle-tested security components
- Input validation and access control
- Reentrancy protection
- Safe arithmetic operations
- Ownership management
- Environment variable protection

## Security Features

- **Access Control**: Only plan recipients can manage subscriptions
- **Input Validation**: Comprehensive parameter validation
- **Reentrancy Protection**: Safe external calls to ERC20 contracts
- **Overflow Protection**: Safe arithmetic operations
- **Authorization Checks**: Users can only manage their own subscriptions

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Scarb](https://docs.swmansion.com/scarb/) (Cairo package manager)
- [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/) (for testing)
- [Docker](https://www.docker.com/) (optional, for backend deployment)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/subra.git
cd subra
```

### Smart Contracts

2. Build the contracts:
```bash
cd contracts
scarb build
```

3. Run tests:
```bash
snforge test
```

### Frontend Application

4. Install frontend dependencies:
```bash
cd frontend
npm install
```

5. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Backend Service

6. Install backend dependencies:
```bash
cd backend
npm install
```

7. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

8. Start the backend server:
```bash
npm run dev
```

The backend API will be available at `http://localhost:3001`

### Contract Deployment

9. Set up your environment variables:
```bash
export STARKNET_ACCOUNT=your_account
export STARKNET_RPC=your_rpc_url
```

10. Deploy the SubscriptionFactory:
```bash
cd contracts
starkli deploy target/dev/subra_SubscriptionFactory.contract_class.json
```

## Development Setup

### Dependencies
The project uses the following key dependencies:
- **OpenZeppelin Contracts for Cairo**: Industry-standard smart contract components
  - Version: `0.20.0`
  - Repository: `https://github.com/OpenZeppelin/cairo-contracts`

### Project Structure

```
subra/
├── contracts/                   # Smart Contracts (Cairo)
│   ├── src/
│   │   ├── lib.cairo           # Main library exports
│   │   ├── erc20_interface.cairo # ERC20 interface definition
│   │   ├── subscription.cairo  # Subscription contract
│   │   └── subscription_factory.cairo # Factory contract
│   ├── tests/
│   │   └── test_contract.cairo # Basic deployment tests
│   └── Scarb.toml              # Project configuration
├── frontend/                    # React Frontend Application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Application pages
│   │   ├── providers/          # Context providers
│   │   ├── services/           # API and blockchain services
│   │   └── lib/                # Utility functions
│   ├── public/                 # Static assets
│   ├── package.json            # Frontend dependencies
│   └── vite.config.ts          # Vite configuration
├── backend/                     # Node.js Backend Service
│   ├── src/
│   │   ├── abis/               # Contract ABI files
│   │   ├── config/             # Configuration files
│   │   └── index.ts            # Main server file
│   ├── package.json            # Backend dependencies
│   └── Dockerfile              # Docker configuration
└── README.md                   # Project documentation
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

## 📚 API Documentation

### Smart Contract APIs

#### SubscriptionFactory Contract

**Core Functions**

- `create_plan(price: u256, token: ContractAddress, period_length: u64, recipient: ContractAddress) -> u256`
  - Creates a new subscription plan
  - Returns the plan ID
  - Emits `PlanCreated` event

- `get_plan(plan_id: u256) -> Plan`
  - Retrieves plan details by ID
  - Returns Plan struct with all parameters

- `get_plans_by_creator(creator: ContractAddress) -> Array<u256>`
  - Returns array of plan IDs created by a specific address

- `get_subscription_contract(plan_id: u256) -> ContractAddress`
  - Returns the subscription contract address for a plan

**Administrative Functions**

- `update_subscription_class_hash(new_class_hash: ClassHash)`
  - Updates the class hash for new subscription contracts
  - Only callable by owner

#### Subscription Contract

**Core Functions**

- `subscribe() -> bool`
  - Subscribe to the plan (requires token approval)
  - Returns success status
  - Emits `UserSubscribed` event

- `renew() -> bool`
  - Renew existing subscription
  - Returns success status
  - Emits `SubscriptionRenewed` event

- `cancel() -> bool`
  - Cancel active subscription
  - Returns success status
  - Emits `SubscriptionCancelled` event

- `is_active(user: ContractAddress) -> bool`
  - Check if user has active subscription
  - Returns boolean status

- `get_expiry_time(user: ContractAddress) -> u64`
  - Get subscription expiry timestamp
  - Returns timestamp or 0 if not subscribed

**View Functions**

- `get_plan() -> Plan`
  - Returns the plan details for this subscription contract

- `get_total_subscribers() -> u256`
  - Returns total number of current subscribers

- `get_total_revenue() -> u256`
  - Returns total revenue collected by this plan


### Frontend Integration

#### React Hooks

- `useTotalPlans()` - Get total number of plans
- `useUserPlans(address)` - Get plans created by user
- `useUserSubscriptions(address)` - Get user's active subscriptions
- `useUserPlansRevenue(address)` - Get revenue data with USD conversion
- `useTokenPrices()` - Get real-time token prices from CoinGecko
- `useTokenSymbols()` - Get token symbols for addresses

#### Services

- `SubraService` - Main service for contract interactions
- `TokenPriceService` - Real-time token price fetching
- `WalletService` - Wallet connection and management

