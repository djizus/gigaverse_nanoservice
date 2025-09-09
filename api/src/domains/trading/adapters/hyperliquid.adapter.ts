import { TradingDataAdapter } from './data-adapter.interface';
import { MarketSnapshot } from '../trading.types';

function parseIntervalMs(tf: string): number {
  const m = String(tf || '1h').match(/^(\d+)([smhdw])$/i);
  if (!m) return 60 * 60 * 1000;
  const n = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  switch (u) {
    case 's': return n * 1000;
    case 'm': return n * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'd': return n * 24 * 60 * 60 * 1000;
    case 'w': return n * 7 * 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
}

export class HyperliquidTradingDataAdapter implements TradingDataAdapter {
  id = 'hyperliquid';

  async fetchMarketSnapshot(symbol: string, timeframe: string = '1h', lookback: number = 50): Promise<MarketSnapshot> {
    // Dynamic import to avoid compile-time dependency on external module scope
    // Path relative to api/src/domains/trading/adapters -> repo root old/hyperliquid/mod.ts
    let hl: any;
    try {
      hl = await import('@nktkas/hyperliquid');
    } catch (e) {
      throw new Error('Hyperliquid SDK package "@nktkas/hyperliquid" not installed or unavailable');
    }
    const transport = new hl.HttpTransport();
    const info = new hl.InfoClient({ transport });
    // Hyperliquid uses coin tickers like 'ETH', 'BTC'
    const coin = String(symbol).split(/[-/:]/)[0].toUpperCase();
    const interval = timeframe; // e.g., '1h'
    const now = Date.now();
    const startTime = now - parseIntervalMs(timeframe) * lookback;
    const candles: any[] = await info.candleSnapshot({ coin, interval, startTime });
    const ohlcv = (candles || []).map((c: any) => ({
      t: new Date(c.t || c.time || now).toISOString(),
      o: Number(c.o ?? c.open),
      h: Number(c.h ?? c.high),
      l: Number(c.l ?? c.low),
      c: Number(c.c ?? c.close),
      v: c.v != null ? Number(c.v) : undefined,
    }));
    if (!ohlcv.length) throw new Error('Hyperliquid returned empty candles');
    return {
      symbol,
      timeframe,
      asOf: new Date().toISOString(),
      ohlcv,
      notes: 'Live Hyperliquid candles via SDK',
    };
  }
}
