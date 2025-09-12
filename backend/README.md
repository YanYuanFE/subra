# Subra Backend - Auto Renewal Keeper Service

This is the backend service for the Subra subscription system, primarily responsible for implementing auto-renewal functionality. The service monitors blockchain events and executes auto-renewal logic to ensure user subscriptions are renewed on time.

## Features

### 🔄 Auto Renewal Service
- **Event Monitoring**: Real-time monitoring of auto-renewal related events from subscription contracts
- **Smart Renewal**: Automatically detects expired subscriptions and executes renewal operations
- **State Management**: Maintains user auto-renewal status and remaining renewal counts

### 📊 Event Handling
- `AutoRenewalEnabled`: Triggered when user enables auto-renewal
- `AutoRenewalDisabled`: Triggered when user disables auto-renewal
- `AutoRenewalExecuted`: Triggered when auto-renewal execution is completed

### 🔍 Blockchain Monitoring
- Incremental scanning of blockchain events
- Concurrent monitoring support for multiple subscription plans
- Automatic recovery and error handling

## Technical Architecture

### Core Components
- **Provider**: Starknet RPC connection
- **Account**: Keeper account for executing renewal transactions
- **Factory Contract**: Subscription factory contract interface
- **Subscription Contracts**: Individual subscription plan contract interfaces

### Data Structure
```typescript
interface AutoRenewUser {
  user: string;              // User address
  planId: string;            // Subscription plan ID
  subscriptionAddr: string;  // Subscription contract address
  remainingRenewals?: number; // Remaining renewal count
}
```

## Environment Configuration

### Required Environment Variables
```bash
# Keeper account private key
PRIVATE_KEY=your_private_key_here

# Keeper account address
ACCOUNT_ADDRESS=your_account_address_here
```

### Network Configuration
- Default Network: Sepolia Testnet
- RPC Node: Configured via `NETWORKS`
- Contract Addresses: Configured in `config/networks.ts`

## Running the Service

### Install Dependencies
```bash
npm install
# or
pnpm install
```

### Start Service
```bash
npm start
# or
node dist/app.js
```

### Development Mode
```bash
npm run dev
```

## Service Workflow

### 1. Initialization Phase
- Connect to Starknet network
- Initialize Keeper account
- Connect to subscription factory contract

### 2. Event Scanning Loop
```
Executed every 60 seconds:
├── Get all active subscription plans
├── Scan subscription contract events for each plan
├── Update auto-renewal user status
└── Attempt to execute renewals for eligible users
```

### 3. Renewal Condition Check
- ✅ Subscription is currently active
- ✅ User has enabled auto-renewal
- ✅ Subscription has expired (current time > end time)
- ✅ Has remaining renewal count

## Log Output

### Event Logs
- `✅ Enabled auto-renew`: User enabled auto-renewal
- `❌ Disabled auto-renew`: User disabled auto-renewal
- `🔄 Auto-renew executed`: Auto-renewal executed successfully
- `⚠️ Auto-renew finished`: Renewal count exhausted

### Renewal Logs
- `⏳ Auto renewing`: Starting renewal execution
- `✅ Renew success`: Renewal successful
- `ℹ️ Skip user`: Skipping ineligible user
- `❌ Error renewing`: Renewal failed

## Configuration Parameters

| Parameter | Default Value | Description |
|-----------|---------------|-------------|
| `POLL_INTERVAL` | 60000ms | Scanning interval time |
| `lastScannedBlock` | 1888403 | Starting scan block |
| `network` | "sepolia" | Target network |

## Error Handling

- **Network Connection Errors**: Automatic retry mechanism
- **Contract Call Failures**: Log errors and continue processing other users
- **Event Parsing Errors**: Skip invalid events
- **Renewal Transaction Failures**: Log detailed error information

## Security Considerations

- Keeper private key must be stored securely
- Recommend using a dedicated Keeper account
- Regularly monitor Keeper account balance
- Implement access control and log auditing

## Monitoring and Maintenance

### Health Checks
- Monitor service running status
- Check Keeper account balance
- Verify event scanning is functioning normally

### Performance Optimization
- Adjust scanning interval time
- Optimize event filtering conditions
- Implement batch processing mechanisms

## Troubleshooting

### Common Issues
1. **Service fails to start**: Check environment variable configuration
2. **Renewal failures**: Check Keeper account balance and permissions
3. **Missing events**: Check block scanning range and network connection
4. **Performance issues**: Adjust scanning interval and batch processing size

### Debug Mode
```bash
DEBUG=true npm start
```

## Version Information

- Node.js: >= 16.0.0
- TypeScript: >= 4.5.0
- Starknet.js: Latest version

---

**Note**: This is a critical infrastructure service. Please ensure thorough testing and monitoring in production environments.