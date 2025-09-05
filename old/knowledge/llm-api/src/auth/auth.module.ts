import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseStorageService } from '../daydreams/services/supabase-storage.service';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' }), ConfigModule],
  controllers: [AuthController],
  providers: [AuthService, SupabaseStorageService],
  exports: [AuthService, PassportModule],
})
export class AuthModule {}
