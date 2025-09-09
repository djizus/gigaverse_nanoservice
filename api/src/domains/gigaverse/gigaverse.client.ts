// Gigaverse HTTP Client
// Based on ~/fun/client/src/games/gigaverse/client/HttpClient.ts and GameClient.ts

import { 
  GigaverseApiResponse, 
  StartRunPayload, 
  MoveActionPayload, 
  LootActionPayload,
  GigaverseAction,
  GigaverseConfig
} from './gigaverse.types';

export class GigaverseHttpClient {
  private config: GigaverseConfig;
  private authToken: string;
  private currentActionToken: string | number | null = null;

  constructor(authToken: string, config?: Partial<GigaverseConfig>) {
    this.authToken = authToken;
    this.config = {
      apiBaseUrl: "https://gigaverse.io/api",
      maxRetries: 3,
      retryDelayMs: 1000,
      actionTimeoutMs: 30000,
      ...config
    };
  }

  public setActionToken(token: string | number) {
    this.currentActionToken = token;
  }

  public getActionToken(): string | number | null {
    return this.currentActionToken;
  }

  private async makeRequest<T = GigaverseApiResponse>(
    endpoint: string,
    payload: Record<string, any>
  ): Promise<T> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.actionTimeoutMs);

    try {
      console.log(`[GigaverseClient] ${payload.action} request to ${url}`);
      console.log(`[GigaverseClient] Payload:`, JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          'Accept': '*/*',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include'
      });

      clearTimeout(timeout);

      const result = await response.json() as T;
      
      if (!response.ok) {
        console.error(`[GigaverseClient] ${payload.action} error response:`, JSON.stringify(result, null, 2));
        
        // Extract token from error response if available (following ~/fun pattern)
        if ('actionToken' in result && result.actionToken) {
          const oldToken = this.currentActionToken;
          this.setActionToken(result.actionToken);
          console.log(`[GigaverseClient] Updated actionToken from error: ${oldToken} → ${result.actionToken}`);
        }
        
        return result; // Return error response, don't throw
      }

      console.log(`[GigaverseClient] ${payload.action} success response:`, JSON.stringify(result, null, 2));

      // Always update token from successful response (server authority)
      if ('actionToken' in result && result.actionToken) {
        const oldToken = this.currentActionToken;
        this.setActionToken(result.actionToken);
        console.log(`[GigaverseClient] Updated actionToken: ${oldToken} → ${result.actionToken}`);
      } else if (result.data && 'actionToken' in result.data && result.data.actionToken) {
        const oldToken = this.currentActionToken;
        this.setActionToken(result.data.actionToken);
        console.log(`[GigaverseClient] Updated actionToken from data: ${oldToken} → ${result.data.actionToken}`);
      }

      return result;
    } catch (error) {
      clearTimeout(timeout);
      console.error(`[GigaverseClient] ${payload.action} network/timeout error:`, error);
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private formatError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return String(error);
  }

  protected async getRequest<T = any>(endpoint: string): Promise<T> {
    const url = `${this.config.apiBaseUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': '*/*',
        },
        mode: 'cors',
        credentials: 'include'
      });
      const result = await response.json();
      return result as T;
    } catch (error) {
      console.error(`[GigaverseClient] GET ${endpoint} error:`, error);
      throw error;
    }
  }
}

export class GigaverseGameClient extends GigaverseHttpClient {
  
  /**
   * Start a new dungeon run
   */
  async startRun(payload: Omit<StartRunPayload, 'action'>): Promise<GigaverseApiResponse> {
    // Use current token or empty string for fresh session
    const finalToken = this.getActionToken() ?? "";
    
    console.log(`[GigaverseClient] startRun - Using token: ${finalToken}`);
    
    const actionPayload: StartRunPayload = {
      action: "start_run",
      actionToken: finalToken,
      ...payload
    };
    
    return this.makeRequest('/game/dungeon/action', actionPayload);
  }

  /**
   * Make a combat move (rock/paper/scissor)
   */
  async makeMove(
    move: "rock" | "paper" | "scissor",
    dungeonId: number,
    data: MoveActionPayload['data']
  ): Promise<GigaverseApiResponse> {
    // Use token fallback pattern from ~/fun: current token or empty string
    const finalToken = this.getActionToken() ?? "";
    
    console.log(`[GigaverseClient] makeMove - Using token: ${finalToken}`);
    
    const actionPayload: MoveActionPayload = {
      action: move,
      actionToken: finalToken,
      dungeonId,
      data
    };
    
    // First attempt
    let response = await this.makeRequest('/game/dungeon/action', actionPayload);
    
    // Single retry pattern from ~/fun codebase - check for token error patterns
    if (!response.success && 
        response.message && 
        (response.message.includes("Invalid action token") || 
         response.message.includes("Error handling action") ||
         response.message.includes("Error tracking action")) &&
        'actionToken' in response && response.actionToken) {
      
      console.log(`[GigaverseClient] Retrying makeMove with server token: ${response.actionToken}`);
      
      // Retry with server-provided token
      response = await this.makeRequest('/game/dungeon/action', {
        ...actionPayload,
        actionToken: response.actionToken
      });
    }
    
    return response;
  }

  /**
   * Select loot option
   */
  async selectLoot(
    lootChoice: "loot_one" | "loot_two" | "loot_three" | "loot_four",
    dungeonId: number,
    data: LootActionPayload['data']
  ): Promise<GigaverseApiResponse> {
    // Use token fallback pattern from ~/fun: current token or empty string
    const finalToken = this.getActionToken() ?? "";
    
    console.log(`[GigaverseClient] selectLoot - Using token: ${finalToken}`);
    
    const actionPayload: LootActionPayload = {
      action: lootChoice,
      actionToken: finalToken,
      dungeonId,
      data
    };
    
    // First attempt
    let response = await this.makeRequest('/game/dungeon/action', actionPayload);
    
    // Single retry pattern from ~/fun codebase - check for token error patterns
    if (!response.success && 
        response.message && 
        (response.message.includes("Invalid action token") || 
         response.message.includes("Error handling action") ||
         response.message.includes("Error tracking action")) &&
        'actionToken' in response && response.actionToken) {
      
      console.log(`[GigaverseClient] Retrying selectLoot with server token: ${response.actionToken}`);
      
      // Retry with server-provided token
      response = await this.makeRequest('/game/dungeon/action', {
        ...actionPayload,
        actionToken: response.actionToken
      });
    }
    
    return response;
  }

  /**
   * Fetch current dungeon state - checks if player is in an active run
   * Uses the proper /game/dungeon/state endpoint like in ~/fun
   */
  async fetchDungeonState(): Promise<GigaverseApiResponse> {
    try {
      const url = `${this.config.apiBaseUrl}/game/dungeon/state`;
      
      console.log(`[GigaverseClient] Fetching dungeon state from ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': '*/*',
          'sec-ch-ua': '"Not;A=Brand";v="99", "Google Chrome";v="139", "Chromium";v="139"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'Referer': 'https://gigaverse.io/play'
        },
        mode: 'cors',
        credentials: 'include'
      });

      const result = await response.json();
      
      console.log(`[GigaverseClient] Dungeon state response:`, JSON.stringify(result, null, 2));
      
      // Store action token if present
      if (result.actionToken) {
        this.setActionToken(result.actionToken);
      }
      
      return result;
    } catch (error) {
      console.log(`[GigaverseClient] No active dungeon state:`, error);
      return {
        success: false,
        message: "No active dungeon run"
      };
    }
  }

  /**
   * Resume an existing dungeon run from current state
   */
  async resumeDungeon(dungeonId: number): Promise<GigaverseApiResponse> {
    const resumePayload = {
      action: "resume_run",
      dungeonId,
      data: {
        consumables: [],
        itemId: 0,
        index: 0,
        isJuiced: false,
        gearInstanceIds: []
      }
    };
    
    return this.makeRequest('/game/dungeon/action', resumePayload);
  }

  /**
   * Generic action method for flexibility
   */
  async performAction(payload: GigaverseAction): Promise<GigaverseApiResponse> {
    return this.makeRequest('/game/dungeon/action', payload);
  }

  // ===== FISHING API =====
  async getFishingCards(address: string): Promise<any> {
    return this.getRequest(`/fishing/cards/player/${address}`);
  }

  async getFishingState(address: string): Promise<any> {
    return this.getRequest(`/fishing/state/${address}`);
  }

  async startFishingAction(payload: { action: 'start_run'|'play_cards'; actionToken: any; data: { cards: number[]; nodeId?: string } }): Promise<GigaverseApiResponse> {
    return this.makeRequest('/fishing/action', payload);
  }
}
