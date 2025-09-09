import { StateAdapter, DecisionType } from './adapter.interface';
import { TradingSignal } from '../../trading/trading.types';

export class TradingStateAdapter implements StateAdapter {
  id = 'vega-trading';

  buildSystem(decision: DecisionType, userInstructions?: string): string {
    if (decision !== 'signal') throw new Error(`Unsupported decision type for trading: ${decision}`);
    const base = [
      'You are Vega, a disciplined trading assistant.',
      'Use conservative risk management. Only signal when confidence is strong.',
      'If no clear edge, return NONE.',
      'Signal format (single line): LONG|SHORT ASSET IN <price> : TP1:<tp1> TP2:<tp2> TP3:<tp3> SL:<sl>',
      'Append a short justification using "Reason: <short>". Example: ... SL:12345 Reason: sweeped liquidity and strong confluence.',
    ].join(' ');
    return [userInstructions || '', base].filter(Boolean).join('\n');
  }

  composePrompt(decision: DecisionType, ctx: any): string {
    if (decision !== 'signal') throw new Error(`Unsupported decision type for trading: ${decision}`);
    const symbol = ctx?.symbol;
    const multi = Array.isArray(ctx?.multi) ? ctx.multi : null;
    if (multi && multi.length > 0) {
      const header = `Symbol: ${symbol || multi[0]?.snapshot?.symbol || 'UNKNOWN'}`;
      const lines: string[] = [header, 'Timeframes analyzed: 15m, 1h, 4h, 1d'];
      for (const r of multi) {
        const last = r?.snapshot?.ohlcv?.slice(-1)[0]?.c;
        const ta = r?.ta || {};
        lines.push(`- ${r.timeframe}: close=${last} trend=${ta.trend || 'na'} rsi14=${ta.rsi14?.toFixed?.(1) ?? 'na'} sma20=${ta.sma20?.toFixed?.(2) ?? 'na'} sma50=${ta.sma50?.toFixed?.(2) ?? 'na'} atr14=${ta.atr14?.toFixed?.(2) ?? 'na'}`);
      }
      lines.push('Return NONE if uncertain. Otherwise, follow the exact format.');
      return lines.join('\n');
    }
    // Fallback single snapshot path
    const snapshot = ctx?.snapshot || {};
    const summary = {
      symbol: snapshot.symbol,
      timeframe: snapshot.timeframe,
      asOf: snapshot.asOf,
      last: snapshot.ohlcv?.slice(-1)[0]?.c,
      notes: snapshot.notes,
    };
    return [
      'Market Snapshot Summary:', JSON.stringify(summary),
      'Return NONE if uncertain. Otherwise, follow the exact format.',
    ].join('\n');
  }

  parse(_decision: DecisionType, text: string): TradingSignal {
    const raw = (text || '').trim();
    if (!raw) return { direction: 'NONE', raw };
    const none = /\bnone\b/i.test(raw);
    const dirMatch = raw.match(/\b(LONG|SHORT)\b/i);
    if (!dirMatch || none) return { direction: 'NONE', raw };
    const direction = dirMatch[1].toUpperCase() as 'LONG' | 'SHORT';
    const assetMatch = raw.match(/\b(LONG|SHORT)\s+([A-Z0-9:\/-]+)\b/i);
    const priceMatch = raw.match(/\bIN\s+(\d+(?:\.\d+)?)\b/i);
    const tp1 = this.findNum(raw, /TP1\s*:\s*(\d+(?:\.\d+)?)/i);
    const tp2 = this.findNum(raw, /TP2\s*:\s*(\d+(?:\.\d+)?)/i);
    const tp3 = this.findNum(raw, /TP3\s*:\s*(\d+(?:\.\d+)?)/i);
    const sl = this.findNum(raw, /SL\s*:\s*(\d+(?:\.\d+)?)/i);
    const reasonMatch = raw.match(/Reason\s*:\s*(.+)$/i);
    return {
      direction,
      asset: assetMatch?.[2],
      entry: priceMatch ? Number(priceMatch[1]) : undefined,
      tp1: tp1 ?? undefined,
      tp2: tp2 ?? undefined,
      tp3: tp3 ?? undefined,
      sl: sl ?? undefined,
      reason: reasonMatch ? reasonMatch[1].trim() : undefined,
      raw,
    };
  }

  success(_decision: DecisionType, parsed: TradingSignal): boolean {
    return parsed?.direction === 'LONG' || parsed?.direction === 'SHORT';
  }

  private findNum(text: string, re: RegExp): number | null {
    const m = text.match(re);
    return m ? Number(m[1]) : null;
  }
}
