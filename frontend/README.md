# Subra - Starknet Subscription Management System Frontend

A decentralized subscription management platform frontend application based on Starknet blockchain.

## Project Overview

Subra is a complete subscription management solution that allows creators to create subscription plans, and users can subscribe and enjoy automatic renewal features. This frontend application provides an intuitive user interface for managing subscription services.

## Key Features

### Creator Features
- 📋 **Plan Management**: Create, activate, and deactivate subscription plans
- 📊 **Data Analytics**: View subscription data and revenue statistics
- 💰 **Revenue Tracking**: Real-time monitoring of subscription revenue
- 🎯 **User Management**: View and manage subscribed users

### User Features
- 🔍 **Browse Plans**: Discover and browse available subscription plans
- 💳 **Subscription Management**: Subscribe, renew, and cancel subscriptions
- 🔄 **Auto Renewal**: Enable/disable automatic renewal functionality
- 📱 **Personal Center**: Manage personal subscription status

## Technical Architecture

### Blockchain Integration
- **Starknet**: Subscription system based on Cairo smart contracts
- **Starknet.js**: JavaScript SDK for blockchain interaction
- **Transaction Confirmation**: All write operations include `waitForTransaction` to ensure transaction reliability

### Frontend Tech Stack
- **React 18**: Modern user interface framework
- **TypeScript**: Type-safe development experience
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: High-quality UI component library
- **React Query**: Powerful data fetching and state management
- **React Router**: Client-side routing management

## Quick Start

### Requirements
- Node.js 18+ 
- npm or pnpm
- Modern browser (Web3 support)

### Installation Steps

```bash
# Clone the project
git clone <YOUR_GIT_URL>
cd subra-frontend

# Install dependencies
npm install
# or use pnpm
pnpm install

# Start development server
npm run dev
# or use pnpm
pnpm dev
```

### Environment Setup

Ensure your browser has a Starknet wallet extension installed (such as ArgentX or Braavos).

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── ui/             # Basic UI components
│   └── ...             # Business components
├── pages/              # Page components
│   ├── CreatorDashboard.tsx    # Creator dashboard
│   ├── UserDashboard.tsx       # User dashboard
│   └── ...                     # Other pages
├── services/           # Blockchain service layer
│   ├── subscriptionFactory.ts  # Subscription factory service
│   └── subscription.ts         # Subscription service
├── hooks/              # Custom React Hooks
├── lib/                # Utility functions and configuration
└── providers/          # React Context providers
```

## Core Services

### SubscriptionFactoryService
Responsible for subscription plan creation and management:
- `createPlan()`: Create new subscription plans
- `deactivatePlan()`: Deactivate subscription plans
- `reactivatePlan()`: Reactivate subscription plans

### SubscriptionService
Handles user subscription-related operations:
- `subscribe()`: Subscribe to plans (supports multicall)
- `renew()`: Renew subscriptions (supports multicall)
- `cancel()`: Cancel subscriptions
- `enableAutoRenewal()`: Enable automatic renewal
- `disableAutoRenewal()`: Disable automatic renewal

## Development Guide

### Available Scripts

```bash
# Development mode
npm run dev

# Build production version
npm run build

# Preview production build
npm run preview

# Code linting
npm run lint

# Type checking
npm run type-check
```

### Code Standards

- Use TypeScript for type-safe development
- Follow ESLint configuration code standards
- Use functional components and Hooks
- Use Tailwind CSS class names for styling

## Deployment

### Build Production Version

```bash
npm run build
```

Build artifacts will be generated in the `dist/` directory and can be deployed to any static file server.

### Recommended Deployment Platforms

- **Vercel**: Zero-configuration deployment with automatic CI/CD
- **Netlify**: Static site hosting with form processing support
- **GitHub Pages**: Free static site hosting
- **IPFS**: Decentralized deployment option

## Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have feature suggestions, please create an [Issue](../../issues).

---

**Note**: This is a Starknet-based DApp. Please ensure you understand the risks and costs associated with blockchain transactions before use.
