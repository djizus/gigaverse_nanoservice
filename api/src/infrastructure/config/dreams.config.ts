import { config as dotenvConfig } from 'dotenv';
import { DreamsConfig } from '../../shared/types/agent.types';

dotenvConfig();

export const defaultDreamsConfig: DreamsConfig = {
  // Try API key first, then fallback to payment method
  apiKey: process.env.DREAMS_ROUTER_API_KEY,
  
  // x402 micropayment fallback configuration
  payment: process.env.DREAMS_ROUTER_API_KEY ? undefined : {
    amount: process.env.DREAMS_PAYMENT_AMOUNT || "100000", // $0.10 USDC
    network: (process.env.DREAMS_PAYMENT_NETWORK as any) || "base-sepolia",
    privateKey: process.env.PRIVATE_KEY,
    address: process.env.ADDRESS,
  },
  
  // Model settings
  model: process.env.DREAMS_MODEL || 'google-vertex/gemini-1.5-flash',
  timeoutMs: Number(process.env.DREAMS_TIMEOUT_MS || 30000),
  temperature: Number(process.env.DREAMS_TEMPERATURE || 0.2),
};

export const createDreamsConfig = (overrides?: Partial<DreamsConfig>): DreamsConfig => {
  return {
    ...defaultDreamsConfig,
    ...overrides,
  };
};

export const validateDreamsConfig = (config: DreamsConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!config.apiKey && !config.payment) {
    errors.push('Either apiKey or payment configuration is required');
  }
  
  if (config.payment && !config.payment.amount) {
    errors.push('Payment amount is required when using payment method');
  }
  
  if (config.payment && !config.payment.network) {
    errors.push('Payment network is required when using payment method');
  }
  
  if (!config.model) {
    errors.push('Model is required');
  }
  
  if (config.timeoutMs <= 0) {
    errors.push('Timeout must be positive');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};