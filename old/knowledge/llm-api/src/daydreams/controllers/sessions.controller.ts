import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  SessionsService,
  CreateSessionDto,
  UpdateSessionDto,
} from '../services/sessions.service';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { CurrentUserId } from '../../auth/decorators/current-user.decorator';

@Controller('daydreams/sessions')
@UseGuards(SupabaseAuthGuard)
export class SessionsController {
  private readonly logger = new Logger(SessionsController.name);

  constructor(private readonly sessionsService: SessionsService) {}

  /**
   * Create a new session
   */
  @Post()
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @CurrentUserId() userId: string,
  ) {
    try {
      this.logger.log(
        `Creating new session: ${createSessionDto.name} for agent: ${createSessionDto.agentId}`,
      );

      // Verify agent ownership
      const isOwner = await this.sessionsService.verifyAgentOwnership(
        createSessionDto.agentId,
        userId,
      );

      if (!isOwner) {
        return {
          success: false,
          error: "Access denied: You don't own this agent",
        };
      }

      const session = await this.sessionsService.createSession({
        ...createSessionDto,
        userId,
      });

      return {
        success: true,
        session,
      };
    } catch (error) {
      this.logger.error('Error creating session:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get all sessions for an agent
   */
  @Get('agent/:agentId')
  async getSessionsByAgent(
    @Param('agentId') agentId: string,
    @CurrentUserId() userId: string,
  ) {
    try {
      this.logger.log(
        `Fetching sessions for agent: ${agentId}, user: ${userId}`,
      );

      // Verify agent ownership
      const isOwner = await this.sessionsService.verifyAgentOwnership(
        agentId,
        userId,
      );

      if (!isOwner) {
        return {
          success: false,
          error: 'Access denied',
          sessions: [],
        };
      }

      const sessions = await this.sessionsService.getSessionsByAgent(
        agentId,
        userId,
      );

      return {
        success: true,
        sessions,
      };
    } catch (error) {
      this.logger.error('Error fetching sessions:', error);
      return {
        success: false,
        error: error.message,
        sessions: [],
      };
    }
  }

  /**
   * Get a specific session by ID
   */
  @Get(':sessionId')
  async getSessionById(
    @Param('sessionId') sessionId: string,
    @CurrentUserId() userId: string,
  ) {
    try {
      this.logger.log(`Fetching session: ${sessionId}`);
      const session = await this.sessionsService.getSessionById(sessionId);

      if (!session) {
        return {
          success: false,
          error: 'Session not found',
        };
      }

      // Verify session ownership
      const isOwner = await this.sessionsService.verifySessionOwnership(
        sessionId,
        userId,
      );

      if (!isOwner) {
        return {
          success: false,
          error: 'Access denied',
        };
      }

      return {
        success: true,
        session,
      };
    } catch (error) {
      this.logger.error('Error fetching session:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update a session
   */
  @Put(':sessionId')
  async updateSession(
    @Param('sessionId') sessionId: string,
    @Body() updateSessionDto: UpdateSessionDto,
    @CurrentUserId() userId: string,
  ) {
    try {
      this.logger.log(`Updating session: ${sessionId}`);

      // Verify session ownership
      const isOwner = await this.sessionsService.verifySessionOwnership(
        sessionId,
        userId,
      );

      if (!isOwner) {
        return {
          success: false,
          error: 'Access denied',
        };
      }

      const session = await this.sessionsService.updateSession(
        sessionId,
        updateSessionDto,
      );

      return {
        success: true,
        session,
      };
    } catch (error) {
      this.logger.error('Error updating session:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete a session
   */
  @Delete(':sessionId')
  async deleteSession(
    @Param('sessionId') sessionId: string,
    @CurrentUserId() userId: string,
  ) {
    try {
      this.logger.log(`Deleting session: ${sessionId}`);

      // Verify session ownership
      const isOwner = await this.sessionsService.verifySessionOwnership(
        sessionId,
        userId,
      );

      if (!isOwner) {
        return {
          success: false,
          error: 'Access denied',
        };
      }

      await this.sessionsService.deleteSession(sessionId);

      return {
        success: true,
      };
    } catch (error) {
      this.logger.error('Error deleting session:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Find session by Daydreams key
   */
  @Get('by-key/:daydreamsKey')
  async getSessionByDaydreamsKey(@Param('daydreamsKey') daydreamsKey: string) {
    try {
      this.logger.log(`Fetching session by Daydreams key: ${daydreamsKey}`);
      const session =
        await this.sessionsService.getSessionByDaydreamsKey(daydreamsKey);

      if (!session) {
        return {
          success: false,
          error: 'Session not found',
        };
      }

      return {
        success: true,
        session,
      };
    } catch (error) {
      this.logger.error('Error fetching session by key:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
