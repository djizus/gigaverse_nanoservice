import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private supabaseAdmin: SupabaseClient; // For admin operations
  private supabaseClient: SupabaseClient; // For regular operations

  constructor(private configService: ConfigService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_API_KEY;

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required');
    }

    // Create admin client (for server-side admin operations)
    if (supabaseServiceKey) {
      this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      this.logger.log('✅ Admin client initialized with service_role key');
    } else {
      this.logger.warn(
        '⚠️  No SUPABASE_SERVICE_KEY found - admin operations will be limited',
      );
    }

    // Create regular client (for normal auth operations)
    if (supabaseAnonKey) {
      this.supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      this.logger.log('✅ Client initialized with anon key');
    } else {
      throw new Error('SUPABASE_API_KEY is required');
    }
  }

  async register(email: string, password: string, fullName?: string) {
    try {
      this.logger.log(`📝 Registration attempt for: ${email}`);

      // Simple client-side registration - let everyone register
      const { data, error } = await this.supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            approved: false, // Default to not approved - you'll approve manually
          },
        },
      });

      if (error) {
        this.logger.error('❌ Registration error:', error);
        throw new BadRequestException(error.message);
      }

      // Simple success message
      const message = data.user?.email_confirmed_at
        ? 'Registration successful! Please wait for manual approval by an administrator.'
        : 'Registration successful! Please check your email to confirm your account, then wait for manual approval.';

      this.logger.log(
        `✅ User registered: ${data.user?.email} - awaiting manual approval`,
      );

      return {
        message,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      };
    } catch (error) {
      this.logger.error('💥 Registration failed:', error);
      throw error;
    }
  }

  async login(email: string, password: string) {
    try {
      this.logger.log(`🔐 Login attempt for: ${email}`);

      // Sign in user using client
      const { data, error } = await this.supabaseClient.auth.signInWithPassword(
        {
          email,
          password,
        },
      );

      if (error) {
        this.logger.error('❌ Login error:', error);
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check if user is approved
      const isApproved = data.user.user_metadata?.approved === true;

      this.logger.log(`🔍 User ${email} - approved: ${isApproved}`);

      if (!isApproved) {
        // Sign out the user immediately
        await this.supabaseClient.auth.signOut();
        throw new UnauthorizedException(
          'Your account is pending approval. Please contact an administrator.',
        );
      }

      this.logger.log(`✅ Login successful for: ${email}`);

      // Return Supabase session token
      return {
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.user_metadata?.full_name,
        },
        session: data.session,
        access_token: data.session.access_token, // Use Supabase token directly
      };
    } catch (error) {
      this.logger.error('💥 Login failed:', error);
      throw error;
    }
  }

  async validateUser(userId: string): Promise<any> {
    try {
      if (!this.supabaseAdmin) {
        this.logger.error('❌ Admin operations not available - no service key');
        return null;
      }

      const { data, error } =
        await this.supabaseAdmin.auth.admin.getUserById(userId);

      if (error || !data.user) {
        return null;
      }

      // Check if user is approved
      const isApproved = data.user.user_metadata?.approved === true;

      if (!isApproved) {
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name,
      };
    } catch (error) {
      this.logger.error('User validation failed:', error);
      return null;
    }
  }

  async logout(token: string) {
    try {
      if (this.supabaseAdmin) {
        // Supabase will handle token revocation
        const { error } = await this.supabaseAdmin.auth.admin.signOut(token);

        if (error) {
          this.logger.error('Logout error:', error);
        }
      }

      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error('Logout failed:', error);
      throw error;
    }
  }

  async getProfile(userId: string) {
    try {
      if (!this.supabaseAdmin) {
        throw new UnauthorizedException('Admin operations not available');
      }

      const { data, error } =
        await this.supabaseAdmin.auth.admin.getUserById(userId);

      if (error || !data.user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.user_metadata?.full_name,
        approved: data.user.user_metadata?.approved === true,
        createdAt: data.user.created_at,
      };
    } catch (error) {
      this.logger.error('Get profile failed:', error);
      throw error;
    }
  }

  // Note: Les fonctions d'approbation sont supprimées
  // Tu approuves manuellement dans le dashboard Supabase en modifiant user_metadata.approved = true

  // validateUser supprimée - l'approbation est vérifiée une seule fois au login
  // Le JWT Supabase fait foi pour l'authentification des requêtes suivantes
}
