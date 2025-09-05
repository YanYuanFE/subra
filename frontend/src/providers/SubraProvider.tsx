import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAccount } from '@starknet-react/core';
import { Account } from 'starknet';
import { subra, SubraService } from '@/services';

// 创建SubraService的Context
interface SubraContextType {
  subraService: SubraService;
}

const SubraContext = createContext<SubraContextType | undefined>(undefined);

// 创建QueryClient实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟
      gcTime: 10 * 60 * 1000, // 10分钟
      retry: 3,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface SubraProviderProps {
  children: ReactNode;
}

export const SubraProvider: React.FC<SubraProviderProps> = ({ children }) => {
  const { account, address, status } = useAccount();
  
  const contextValue: SubraContextType = {
    subraService: subra,
  };

  // 监听钱包连接状态，自动连接subra服务
  useEffect(() => {
    if (account && address && status === 'connected') {
      console.log('Wallet connected, connecting to Subra service...', address);
      // 将AccountInterface转换为Account类型
      const starknetAccount = account as Account;
      subra.connectAccount(starknetAccount).catch(error => {
        console.error('Failed to connect Subra service:', error);
      });
    } else if (status === 'disconnected') {
      console.log('Wallet disconnected, disconnecting from Subra service...');
      subra.disconnectAccount();
    }
  }, [account, address, status]);

  return (
    <QueryClientProvider client={queryClient}>
      <SubraContext.Provider value={contextValue}>
        {children}
      </SubraContext.Provider>
    </QueryClientProvider>
  );
};

// 自定义hook来使用SubraService
export const useSubra = (): SubraContextType => {
  const context = useContext(SubraContext);
  if (context === undefined) {
    throw new Error('useSubra must be used within a SubraProvider');
  }
  return context;
};

// 导出QueryClient实例供其他地方使用
export { queryClient };