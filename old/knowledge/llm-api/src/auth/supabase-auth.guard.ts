import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseAuthGuard.name);
  private readonly supabase: SupabaseClient;

  constructor(private reflector: Reflector) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_API_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_API_KEY are required');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.logger.log('SupabaseAuthGuard initialized');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    this.logger.debug('[SupabaseAuthGuard] Checking auth...');
    this.logger.debug(
      '[SupabaseAuthGuard] Authorization header:',
      authHeader ? 'Present' : 'Missing',
    );

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    this.logger.debug(
      `[SupabaseAuthGuard] Token first 20 chars: ${token.substring(0, 20)}...`,
    );

    try {
      // Validate token directly with Supabase
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser(token);

      if (error) {
        this.logger.error(
          `[SupabaseAuthGuard] Supabase validation error: ${error.message}`,
        );
        throw new UnauthorizedException('Invalid token');
      }

      if (!user) {
        this.logger.error('[SupabaseAuthGuard] No user returned from Supabase');
        throw new UnauthorizedException('Invalid token');
      }

      // Check if user is approved
      if (user.user_metadata?.approved !== true) {
        this.logger.warn(
          `[SupabaseAuthGuard] User ${user.email} is not approved`,
        );
        throw new UnauthorizedException('User not approved');
      }

      this.logger.debug(
        `[SupabaseAuthGuard] User ${user.email} validated successfully`,
      );

      // Attach user to request for use in controllers
      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        metadata: user.user_metadata,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('[SupabaseAuthGuard] Token validation failed:', error);
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
