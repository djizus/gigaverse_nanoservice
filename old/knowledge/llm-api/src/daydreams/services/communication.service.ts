import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageData } from '../daydreams.service';

export interface CommunicationChannel {
  sourceId: string;
  targetId: string;
  direction: 'unidirectional' | 'bidirectional';
  metadata?: Record<string, any>;
}

@Injectable()
export class CommunicationService {
  private channels: Map<string, CommunicationChannel> = new Map();
  private messageHandlers: Map<
    string,
    (message: MessageData) => Promise<void>
  > = new Map();

  constructor(private configService: ConfigService) {}

  /**
   * Crée un canal de communication entre deux agents
   */
  async createChannel(
    sourceId: string,
    targetId: string,
    direction: 'unidirectional' | 'bidirectional' = 'bidirectional',
  ): Promise<string> {
    const channelId = `${sourceId}-${targetId}`;

    this.channels.set(channelId, {
      sourceId,
      targetId,
      direction,
      metadata: {
        createdAt: new Date().toISOString(),
      },
    });

    console.log(
      `[INFO] Created communication channel: ${channelId} (${direction})`,
    );

    // Si le canal est bidirectionnel, créer aussi le canal inverse
    if (direction === 'bidirectional') {
      const reverseChannelId = `${targetId}-${sourceId}`;
      this.channels.set(reverseChannelId, {
        sourceId: targetId,
        targetId: sourceId,
        direction,
        metadata: {
          createdAt: new Date().toISOString(),
          pairedChannel: channelId,
        },
      });
      console.log(
        `[INFO] Created reverse communication channel: ${reverseChannelId}`,
      );
    }

    return channelId;
  }

  /**
   * Enregistre un gestionnaire de messages pour un canal
   */
  registerMessageHandler(
    channelId: string,
    handler: (message: MessageData) => Promise<void>,
  ): boolean {
    if (!this.channels.has(channelId)) {
      console.error(
        `[ERROR] Cannot register handler: channel ${channelId} does not exist`,
      );
      return false;
    }

    this.messageHandlers.set(channelId, handler);
    return true;
  }

  /**
   * Envoie un message via un canal de communication
   */
  async sendMessage(channelId: string, message: MessageData): Promise<boolean> {
    if (!this.channels.has(channelId)) {
      console.error(
        `[ERROR] Cannot send message: channel ${channelId} does not exist`,
      );
      return false;
    }

    const handler = this.messageHandlers.get(channelId);
    if (!handler) {
      console.error(
        `[ERROR] No message handler registered for channel ${channelId}`,
      );
      return false;
    }

    try {
      await handler(message);
      return true;
    } catch (error) {
      console.error(
        `[ERROR] Failed to send message through channel ${channelId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Vérifie si un canal de communication existe
   */
  channelExists(sourceId: string, targetId: string): boolean {
    const channelId = `${sourceId}-${targetId}`;
    return this.channels.has(channelId);
  }

  /**
   * Récupère tous les canaux de communication
   */
  getAllChannels(): CommunicationChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Supprime un canal de communication
   */
  removeChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return false;
    }

    this.channels.delete(channelId);
    this.messageHandlers.delete(channelId);

    // Si c'est un canal bidirectionnel, supprimer aussi le canal inverse
    if (channel.direction === 'bidirectional') {
      const reverseChannelId = `${channel.targetId}-${channel.sourceId}`;
      this.channels.delete(reverseChannelId);
      this.messageHandlers.delete(reverseChannelId);
    }

    return true;
  }
}
