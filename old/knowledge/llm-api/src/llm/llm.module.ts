import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LlmController } from './llm.controller';
import { DaydreamsModule } from '../daydreams/daydreams.module';

@Module({
  imports: [HttpModule, DaydreamsModule],
  controllers: [LlmController],
})
export class LlmModule {}
