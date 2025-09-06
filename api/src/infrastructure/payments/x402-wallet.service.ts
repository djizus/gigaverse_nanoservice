/**
 * x402 Wallet Service for Dreams Router Authentication
 * 
 * Handles wallet setup for micropayments on Base Sepolia network
 */

import { Wallet } from 'ethers';

export interface WalletAccount {
  address: string;
  privateKey: string;
  network: string;
}

export interface PaymentConfig {
  amount: string; // Amount in USDC (e.g. "100000" = $0.10)
  network: 'base-sepolia' | 'base';
}

export class X402WalletService {
  private wallets: Map<string, WalletAccount> = new Map();
  
  /**
   * Create or get wallet account from environment
   */
  async getOrCreateWallet(walletId: string = 'default'): Promise<WalletAccount> {
    // Check if wallet already exists
    if (this.wallets.has(walletId)) {
      return this.wallets.get(walletId)!;
    }
    
    // Try to load from environment
    const privateKey = process.env.PRIVATE_KEY;
    const address = process.env.ADDRESS;
    const network = process.env.NETWORK || 'base-sepolia';
    
    if (privateKey && address) {
      console.log('[X402WalletService] Using wallet from environment');
      const account: WalletAccount = {
        address,
        privateKey,
        network,
      };
      
      this.wallets.set(walletId, account);
      return account;
    }
    
    // Generate new wallet if no environment config
    console.log('[X402WalletService] Generating new wallet for x402 payments');
    const wallet = Wallet.createRandom();
    
    const account: WalletAccount = {
      address: wallet.address,
      privateKey: wallet.privateKey,
      network,
    };
    
    this.wallets.set(walletId, account);
    
    console.log(`[X402WalletService] Generated wallet: ${account.address}`);
    console.log(`[X402WalletService] ⚠️  Save this private key to .env: PRIVATE_KEY=${account.privateKey}`);
    console.log(`[X402WalletService] ⚠️  Save this address to .env: ADDRESS=${account.address}`);
    console.log(`[X402WalletService] ⚠️  Fund this wallet with USDC on ${network} for payments to work`);
    
    return account;
  }
  
  /**
   * Get payment configuration for Dreams Router
   */
  getPaymentConfig(amountUSDC: string = '100000'): PaymentConfig {
    return {
      amount: amountUSDC, // $0.10 USDC default
      network: (process.env.NETWORK as any) || 'base-sepolia',
    };
  }
  
  /**
   * Validate wallet has sufficient balance (placeholder)
   */
  async validateWallet(account: WalletAccount): Promise<boolean> {
    // TODO: Implement actual balance check
    console.log(`[X402WalletService] Validating wallet ${account.address} on ${account.network}`);
    
    // For now, just check if we have the required fields
    if (!account.address || !account.privateKey) {
      console.error('[X402WalletService] Invalid wallet configuration');
      return false;
    }
    
    console.log('[X402WalletService] Wallet validation passed (balance check not implemented)');
    return true;
  }
  
  /**
   * Get wallet info for debugging
   */
  getWalletInfo(walletId: string = 'default'): any {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return null;
    
    return {
      address: wallet.address,
      network: wallet.network,
      hasPrivateKey: !!wallet.privateKey,
    };
  }
}