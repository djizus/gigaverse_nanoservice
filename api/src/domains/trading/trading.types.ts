export interface MarketSnapshot {
  symbol: string;
  timeframe: string;
  asOf: string;
  ohlcv: Array<{ t: string; o: number; h: number; l: number; c: number; v?: number }>;
  fundingRate?: number;
  openInterest?: number;
  notes?: string;
}

export interface TradingSignal {
  direction: 'LONG' | 'SHORT' | 'NONE';
  asset?: string;
  entry?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  sl?: number;
  reason?: string;
  raw?: string;
}
