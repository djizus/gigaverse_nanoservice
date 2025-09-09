import { MarketSnapshot } from '../trading.types';

export interface TradingDataAdapter {
  id: string; // e.g., 'gmx', 'hyperliquid'
  fetchMarketSnapshot(symbol: string, timeframe?: string, lookback?: number): Promise<MarketSnapshot>;
}

