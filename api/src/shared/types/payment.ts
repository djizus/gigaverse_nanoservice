// Payment-related types
export type Network = "base-sepolia" | "base" | "ethereum" | "sepolia";

export interface PaymentConfig {
  facilitatorUrl: string;
  address: string;
  network: Network;
}

export interface PricingInfo {
  basePrice: number; // Price per run in USD
  totalPrice: number; // Total calculated price
  currency: string;
  runs: number;
}

export interface PaymentMiddlewareConfig {
  price: string; // Format: "$0.05"
  network: Network;
}

export interface DynamicPricingContext {
  parsedBody: any;
  runs: number;
  totalPrice: number;
  priceString: string;
}