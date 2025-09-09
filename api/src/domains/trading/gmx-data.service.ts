import { MarketSnapshot } from './trading.types';

export class GmxDataService {
  async fetchMarketSnapshot(symbol: string, timeframe: string = '1h', lookback: number = 50): Promise<MarketSnapshot> {
    // NOTE: In restricted environments, return a stub snapshot.
    // Integrate real GMX queries here using old/agent-gmx logic (gmx-queries.ts) in production.
    const now = new Date();
    const ohlcv = Array.from({ length: lookback }).map((_, i) => {
      const t = new Date(now.getTime() - (lookback - i) * 3600_000);
      const base = 100 + Math.sin(i / 5) * 2 + Math.random();
      const o = base + Math.random();
      const h = o + Math.random() * 1.5;
      const l = o - Math.random() * 1.5;
      const c = l + Math.random() * (h - l);
      return { t: t.toISOString(), o: +o.toFixed(2), h: +h.toFixed(2), l: +l.toFixed(2), c: +c.toFixed(2) };
    });
    return {
      symbol,
      timeframe,
      asOf: now.toISOString(),
      ohlcv,
      fundingRate: 0.0001,
      openInterest: 1_000_000,
      notes: 'Stub snapshot. Replace with live GMX data in production.',
    };
  }
}

