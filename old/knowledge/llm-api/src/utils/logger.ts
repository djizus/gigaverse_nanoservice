import * as fs from 'fs';

// Simple logger utility with environment detection
const env = process.env.NODE_ENV || 'development';
const isDocker = fs.existsSync('/.dockerenv');
const envLabel =
  env === 'production'
    ? 'PROD'
    : env === 'staging'
      ? 'STAGING'
      : env === 'docker'
        ? 'DOCKER'
        : 'DEV';
const deploymentLabel = isDocker ? 'DOCKER' : 'HOST';
const prefix = `[${envLabel}][${deploymentLabel}]`;

export function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`${prefix} [INFO] ${timestamp} ${message}`, data);
  } else {
    console.log(`${prefix} [INFO] ${timestamp} ${message}`);
  }
}

export function error(message: string, err?: any) {
  const timestamp = new Date().toISOString();
  if (err) {
    console.error(`${prefix} [ERROR] ${timestamp} ${message}`, err);
  } else {
    console.error(`${prefix} [ERROR] ${timestamp} ${message}`);
  }
}

export function warn(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.warn(`${prefix} [WARN] ${timestamp} ${message}`, data);
  } else {
    console.warn(`${prefix} [WARN] ${timestamp} ${message}`);
  }
}

export function debug(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  // Only log debug in development
  if (env === 'development' || env === 'test') {
    if (data) {
      console.log(`${prefix} [DEBUG] ${timestamp} ${message}`, data);
    } else {
      console.log(`${prefix} [DEBUG] ${timestamp} ${message}`);
    }
  }
}

// Export the prefix for services that want to use it directly
export const logPrefix = prefix;
