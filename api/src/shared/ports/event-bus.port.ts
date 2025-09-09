export interface EventBusPort {
  publish(event: any): Promise<void> | void;
  subscribe(handler: (event: any) => void): () => void;
}

