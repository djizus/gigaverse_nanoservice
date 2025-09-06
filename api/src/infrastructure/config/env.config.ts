import * as z from "zod";
import { PaymentConfig } from "../../shared/types/payment";

// Environment configuration with validation
const envSchema = z.object({
  // Payment config
  FACILITATOR_URL: z.string().url().default("https://facilitator.x402.rs"),
  ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "ADDRESS must be a valid Ethereum address"),
  NETWORK: z.enum(["base-sepolia", "base", "ethereum", "sepolia"]).default("base-sepolia"),
  
  // Supabase config
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_KEY: z.string().min(1, "SUPABASE_KEY is required"),
  
  // Server config  
  PORT: z.coerce.number().default(4021),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const loadConfig = (): EnvConfig => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Environment validation failed:", error);
    throw new Error("Invalid environment configuration");
  }
};

export const getPaymentConfig = (config: EnvConfig): PaymentConfig => {
  return {
    facilitatorUrl: config.FACILITATOR_URL,
    address: config.ADDRESS,
    network: config.NETWORK,
  };
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const getSupabaseConfig = (config: EnvConfig): SupabaseConfig => {
  return {
    url: config.SUPABASE_URL,
    anonKey: config.SUPABASE_KEY,
  };
};