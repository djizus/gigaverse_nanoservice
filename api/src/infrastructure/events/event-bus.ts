// Simple in-memory event bus for dungeon run events (SSE broadcasting)

type EventSubscriber = (event: any) => Promise<void> | void;

const subscribers: Set<EventSubscriber> = new Set();

export async function publish(event: any) {
  for (const sub of Array.from(subscribers)) {
    try {
      await sub(event);
    } catch (err) {
      // Best-effort: ignore subscriber errors
      console.warn('[EventBus] subscriber error:', (err as any)?.message || err);
    }
  }
}

export function subscribe(handler: EventSubscriber) {
  subscribers.add(handler);
  return () => subscribers.delete(handler);
}

