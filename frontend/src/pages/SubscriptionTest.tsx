import React, { useState, useEffect } from 'react';
import { useAccount } from '@starknet-react/core';
import { SubscriptionService } from '../services/subscription';
import { ERC20Service } from '../services/erc20';

interface SubscriptionRequirements {
  hasBalance: boolean;
  balance: string;
  required: string;
  tokenAddress: string;
}

const SubscriptionTest: React.FC = () => {
  const { account, address } = useAccount();
  const [subscriptionAddress, setSubscriptionAddress] = useState('');
  const [requirements, setRequirements] = useState<SubscriptionRequirements | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tokenMetadata, setTokenMetadata] = useState<any>(null);

  const checkRequirements = async () => {
    if (!subscriptionAddress || !address || !account) {
      setMessage('Please connect wallet and enter subscription address');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const subscriptionService = SubscriptionService.createWithAddress(subscriptionAddress);
      await subscriptionService.connectAccount(account as any);

      const reqs = await subscriptionService.checkSubscriptionRequirements(address);
      setRequirements(reqs);

      // Get token metadata
      const erc20Service = new ERC20Service();
      const metadata = await erc20Service.getTokenMetadata(reqs.tokenAddress);
      setTokenMetadata(metadata);

      setMessage('Requirements checked successfully');
    } catch (error) {
      console.error('Error checking requirements:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };



  const subscribe = async () => {
    if (!subscriptionAddress || !address || !account) {
      setMessage('Please connect wallet and enter subscription address');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const subscriptionService = SubscriptionService.createWithAddress(subscriptionAddress);
      await subscriptionService.connectAccount(account as any);

      const result = await subscriptionService.subscribe(address);
      
      if (result.success) {
        setMessage(`Subscription successful! Transaction: ${result.transactionHash}`);
      } else {
        setMessage(`Subscription failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: string, decimals: number = 18) => {
    const value = BigInt(amount);
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fraction = value % divisor;
    return `${whole}.${fraction.toString().padStart(decimals, '0').slice(0, 6)}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Subscription Test</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Connection Status</h2>
        <p><strong>Account:</strong> {address || 'Not connected'}</p>
        <p><strong>Connected:</strong> {account ? 'Yes' : 'No'}</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Subscription Contract</h2>
        <div className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Enter subscription contract address"
            value={subscriptionAddress}
            onChange={(e) => setSubscriptionAddress(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={checkRequirements}
            disabled={loading || !address}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Requirements'}
          </button>
        </div>
      </div>

      {requirements && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Requirements Status</h2>
          
          {tokenMetadata && (
            <div className="mb-4 p-4 bg-gray-50 rounded-md">
              <h3 className="font-semibold mb-2">Token Information</h3>
              <p><strong>Name:</strong> {tokenMetadata.name}</p>
              <p><strong>Symbol:</strong> {tokenMetadata.symbol}</p>
              <p><strong>Decimals:</strong> {tokenMetadata.decimals}</p>
              <p><strong>Address:</strong> {requirements.tokenAddress}</p>
            </div>
          )}

          <div className="mb-4">
            <div className={`p-4 rounded-md ${requirements.hasBalance ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className="font-semibold mb-2">Balance Check</h3>
              <p><strong>Status:</strong> {requirements.hasBalance ? '✅ Sufficient' : '❌ Insufficient'}</p>
              <p><strong>Required:</strong> {formatAmount(requirements.required, tokenMetadata?.decimals)} {tokenMetadata?.symbol}</p>
              <p><strong>Available:</strong> {formatAmount(requirements.balance, tokenMetadata?.decimals)} {tokenMetadata?.symbol}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              💡 Token approval will be handled automatically during subscription using multicall.
            </p>
            
            <button
              onClick={subscribe}
              disabled={loading || !requirements.hasBalance}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Subscribing...' : 'Subscribe (Auto-approve + Subscribe)'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-md mb-6 ${
          message.includes('successful') || message.includes('✅') 
            ? 'bg-green-50 border border-green-200 text-green-800'
            : message.includes('Error') || message.includes('failed')
            ? 'bg-red-50 border border-red-200 text-red-800'
            : 'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionTest;