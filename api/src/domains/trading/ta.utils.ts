export interface TaSummary {
  close: number;
  sma20?: number;
  sma50?: number;
  ema20?: number;
  rsi14?: number;
  atr14?: number;
  trend?: 'up' | 'down' | 'sideways';
}

export function computeTaSummary(ohlcv: Array<{ o: number; h: number; l: number; c: number }>): TaSummary {
  const closes = ohlcv.map(d => d.c);
  const highs = ohlcv.map(d => d.h);
  const lows = ohlcv.map(d => d.l);
  const last = closes[closes.length - 1] ?? 0;
  const sma = (n: number) => {
    if (closes.length < n) return undefined;
    const slice = closes.slice(-n);
    return slice.reduce((a, b) => a + b, 0) / n;
    };
  const ema = (n: number) => {
    if (closes.length < n) return undefined;
    const k = 2 / (n + 1);
    let prev = closes[0];
    for (let i = 1; i < closes.length; i++) {
      prev = closes[i] * k + prev * (1 - k);
    }
    return prev;
  };
  const rsi = (n: number) => {
    if (closes.length <= n) return undefined;
    let gains = 0, losses = 0;
    for (let i = closes.length - n; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff; else losses -= diff;
    }
    if (gains + losses === 0) return 50;
    const rs = gains / Math.max(1e-9, losses);
    return 100 - 100 / (1 + rs);
  };
  const atr = (n: number) => {
    if (closes.length <= n) return undefined;
    const trs: number[] = [];
    for (let i = 1; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trs.push(tr);
    }
    if (trs.length < n) return undefined;
    const recent = trs.slice(-n);
    return recent.reduce((a, b) => a + b, 0) / n;
  };

  const sma20 = sma(20);
  const sma50 = sma(50);
  const ema20 = ema(20);
  const rsi14 = rsi(14);
  const atr14 = atr(14);
  let trend: TaSummary['trend'] = 'sideways';
  if (sma20 && sma50) trend = sma20 > sma50 ? 'up' : (sma20 < sma50 ? 'down' : 'sideways');
  return { close: last, sma20, sma50, ema20, rsi14, atr14, trend };
}

