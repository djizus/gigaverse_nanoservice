// Polyfill Promise.try pour compatibilité avec daydreamsai/core
if (!(Promise as any).try) {
  (Promise as any).try = (fn: any) => Promise.resolve().then(fn);
}
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';

// Load environment variables before creating the app
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Activer CORS pour permettre les requêtes du frontend
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:5176',
      'https://knowledge-sepia-gamma.vercel.app',
      'http://193.203.191.46:3000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
