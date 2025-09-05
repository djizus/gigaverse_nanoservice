import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import * as fs from 'fs';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly envPrefix: string;
  private readonly isDocker: boolean;

  constructor() {
    const env = process.env.NODE_ENV || 'development';
    this.isDocker = fs.existsSync('/.dockerenv');

    // Create environment prefix
    const envLabel =
      env === 'production'
        ? 'PROD'
        : env === 'staging'
          ? 'STAGING'
          : env === 'docker'
            ? 'DOCKER'
            : 'DEV';
    const deploymentLabel = this.isDocker ? 'DOCKER' : 'HOST';

    this.envPrefix = `[${envLabel}][${deploymentLabel}]`;
  }

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = randomUUID().substring(0, 8);
    const envPrefix = this.envPrefix; // Capture in local variable for closure

    // Attach requestId to request object for downstream use
    req['requestId'] = requestId;

    console.log(`\n${envPrefix} [${requestId}] ====== REQUEST START ======`);
    console.log(`${envPrefix} [${requestId}] ${new Date().toISOString()}`);
    console.log(`${envPrefix} [${requestId}] ${req.method} ${req.url}`);
    console.log(`${envPrefix} [${requestId}] Headers:`, {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      authorization: req.headers.authorization ? 'Bearer ***' : 'Missing',
      origin: req.headers.origin,
    });

    // Log body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      console.log(
        `${envPrefix} [${requestId}] Body:`,
        JSON.stringify(req.body).substring(0, 500),
      );
    }

    // Track response
    const originalSend = res.send;
    let responseLogged = false;

    res.send = function (data) {
      if (!responseLogged) {
        responseLogged = true;
        const duration = Date.now() - startTime;
        console.log(`${envPrefix} [${requestId}] ====== RESPONSE ======`);
        console.log(`${envPrefix} [${requestId}] Status: ${res.statusCode}`);
        console.log(`${envPrefix} [${requestId}] Duration: ${duration}ms`);
        if (res.statusCode >= 400) {
          console.log(`${envPrefix} [${requestId}] Error:`, data);
        }
        console.log(`${envPrefix} [${requestId}] ====== REQUEST END ======\n`);
      }
      return originalSend.call(this, data);
    };

    // Timeout detection
    const timeoutId = setTimeout(() => {
      if (!responseLogged) {
        console.error(
          `${envPrefix} [${requestId}] ⚠️ WARNING: Request still pending after 10s!`,
        );
        console.error(
          `${envPrefix} [${requestId}] Possible hang in: ${req.method} ${req.url}`,
        );
      }
    }, 10000);

    res.on('finish', () => {
      clearTimeout(timeoutId);
      if (!responseLogged) {
        const duration = Date.now() - startTime;
        console.log(
          `${envPrefix} [${requestId}] Response finished without send (${res.statusCode}) - ${duration}ms`,
        );
      }
    });

    next();
  }
}
