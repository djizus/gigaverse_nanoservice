import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Put,
  Param,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { CurrentUserId } from './decorators/current-user.decorator';

// Temporairement, on définit les admins par leur email
const ADMIN_EMAILS = ['thomas@example.com']; // Remplacez par votre email

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: { email: string; password: string; fullName?: string },
  ) {
    return this.authService.register(body.email, body.password, body.fullName);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Post('logout')
  @UseGuards(SupabaseAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    return this.authService.logout(token);
  }

  // Route profile supprimée - le frontend peut décoder le JWT directement
  // Si besoin d'infos supplémentaires, réimplémenter avec des données enrichies

  @Get('check')
  @UseGuards(SupabaseAuthGuard)
  async checkAuth(@Request() req) {
    return {
      authenticated: true,
      user: req.user,
    };
  }

  // Routes d'approbation supprimées - Tu approuves manuellement dans le dashboard Supabase
  // Pour approuver un utilisateur :
  // 1. Aller dans Supabase Dashboard → Authentication → Users
  // 2. Cliquer sur l'utilisateur
  // 3. Dans Raw User Meta Data, modifier : {"approved": true, "full_name": "Nom"}
  // 4. Sauvegarder
}
