import { TradingDataAdapter } from './adapters/data-adapter.interface';
import { GmxTradingDataAdapter } from './adapters/gmx.adapter';
import { HyperliquidTradingDataAdapter } from './adapters/hyperliquid.adapter';

export class TradingDataRegistry {
  private adapters: TradingDataAdapter[] = [
    new GmxTradingDataAdapter(),
    new HyperliquidTradingDataAdapter(),
  ];

  get(id: string | undefined): TradingDataAdapter {
    const key = (id || 'gmx').toLowerCase();
    const found = this.adapters.find(a => a.id === key);
    if (!found) throw new Error(`Unknown trading data source: ${id}`);
    return found;
  }

  list(): string[] { return this.adapters.map(a => a.id); }
}

