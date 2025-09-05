import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LlmModule } from './llm/llm.module';
import { LlmController } from './llm/llm.controller';
import { DaydreamsModule } from './daydreams/daydreams.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { validateEnv } from './config/env.validation';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // rend la config accessible partout
      validate: validateEnv,
    }),
    AuthModule,
    LlmModule,
    DaydreamsModule,
    KnowledgeModule,
  ],
  controllers: [AppController, LlmController],
  providers: [AppService],
})
export class AppModule {}
