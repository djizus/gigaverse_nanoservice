import { ContextDefinition } from "../types/context";

export class ContextRegistryService {
  private contexts: ContextDefinition[] = [
    { id: 'chat', name: 'Chat', description: 'Basic chat context' },
    { id: 'gigaverse', name: 'Gigaverse', description: 'Gigaverse nanoservice-inspired context' },
  ];

  list(): ContextDefinition[] {
    return [...this.contexts];
  }

  register(context: ContextDefinition): void {
    const exists = this.contexts.some(c => c.id === context.id);
    if (!exists) this.contexts.push(context);
  }
}

