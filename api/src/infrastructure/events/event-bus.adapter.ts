import { EventBusPort } from '../../shared/ports/event-bus.port';
import * as Bus from './event-bus';

export class EventBusAdapter implements EventBusPort {
  publish(event: any): void {
    Bus.publish(event);
  }
  subscribe(handler: (event: any) => void): () => void {
    return Bus.subscribe(handler);
  }
}

