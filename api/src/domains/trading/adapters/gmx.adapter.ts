import { TradingDataAdapter } from './data-adapter.interface';
import { MarketSnapshot } from '../trading.types';

export class GmxTradingDataAdapter implements TradingDataAdapter {
  id = 'gmx';

  async fetchMarketSnapshot(symbol: string, timeframe: string = '1h', lookback: number = 50): Promise<MarketSnapshot> {
    // Use GMX ORACLE candles endpoint (Arbitrum infra) — hardcoded per requirements
    const oracleUrl = 'https://arbitrum-api.gmxinfra.io';
    try {
      return await this.fetchFromOracle(oracleUrl, symbol, timeframe, lookback);
    } catch (e) {
      throw new Error(`GMX oracle fetch failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async fetchFromOracle(oracleUrl: string, symbol: string, timeframe: string, lookback: number): Promise<MarketSnapshot> {
    const base = oracleUrl.replace(/\/$/, '');
    const tokenSymbol = String(symbol).split(/[-/:]/)[0].toUpperCase();
    const url = `${base}/prices/candles?tokenSymbol=${encodeURIComponent(tokenSymbol)}&period=${encodeURIComponent(timeframe)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: any = await res.json();
    const rowsRaw: any[] = Array.isArray(data)
      ? data
      : (Array.isArray(data?.candles)
          ? data.candles
          : (Array.isArray(data?.data)
              ? data.data
              : (Array.isArray(data?.result) ? data.result : [])));
    if (!rowsRaw.length) throw new Error('Empty candles');
    const rows = rowsRaw.slice(-lookback);

    const num = (v: any): number | undefined => {
      const n = typeof v === 'string' ? parseFloat(v) : (typeof v === 'number' ? v : undefined);
      return Number.isFinite(n as number) ? (n as number) : undefined;
    };
    const toIso = (v: any): string => {
      let n: number | undefined;
      if (typeof v === 'string') {
        const parsed = parseFloat(v);
        n = Number.isFinite(parsed) ? parsed : undefined;
      } else if (typeof v === 'number') {
        n = v;
      }
      if (!Number.isFinite(n as number)) return new Date().toISOString();
      // If epoch seconds, convert to ms
      const ms = (n as number) < 1e12 ? (n as number) * 1000 : (n as number);
      return new Date(ms).toISOString();
    };

    const ohlcv = rows.map((d: any) => {
      // Array row shape: [t,o,h,l,c,(v?)]
      if (Array.isArray(d)) {
        const t = d[0];
        const o = num(d[1]);
        const h = num(d[2]);
        const l = num(d[3]);
        const c = num(d[4]);
        const v = num(d[5]);
        const close = c ?? o ?? h ?? l;
        return {
          t: toIso(t),
          o: (o ?? close) as number,
          h: (h ?? close) as number,
          l: (l ?? close) as number,
          c: (close as number),
          v: v,
        };
      }
      // Object row shape with various possible keys
      const t = d.t ?? d.time ?? d.timestamp ?? d.ts ?? d.startTime ?? d.date;
      const close = num(d.c ?? d.close ?? d.priceClose ?? d.closePrice ?? d.price);
      const open = num(d.o ?? d.open ?? d.priceOpen ?? d.openPrice) ?? close;
      const high = num(d.h ?? d.high ?? d.priceHigh ?? d.highPrice) ?? close;
      const low = num(d.l ?? d.low ?? d.priceLow ?? d.lowPrice) ?? close;
      const v = num(d.v ?? d.volume);
      return {
        t: toIso(t),
        o: open as number,
        h: high as number,
        l: low as number,
        c: (close as number),
        v,
      };
    }).filter((c: any) => Number.isFinite(c.c));
    if (!ohlcv.length) throw new Error('No valid candle rows');
    return {
      symbol,
      timeframe,
      asOf: new Date().toISOString(),
      ohlcv,
      notes: 'Live GMX OHLCV via GMX oracle',
    };
  }

  // No other fallbacks; subsquid / other endpoints intentionally not used
}
