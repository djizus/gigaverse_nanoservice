/**
 * Environment utilities for managing different deployment environments
 */

// Environment detection
export const vercelEnv = import.meta.env.VITE_ENV || import.meta.env.MODE;
export const isProduction = vercelEnv === 'production' || import.meta.env.PROD;
export const isStaging = vercelEnv === 'staging';
export const isPreview = vercelEnv === 'preview' || isStaging;
export const isDevelopment = vercelEnv === 'development' || import.meta.env.DEV;

// API Configuration
export const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const wsUrl = import.meta.env.VITE_WS_URL || apiUrl.replace(/^http/, 'ws');
export const publicUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

// Feature flags
const FEATURE_FLAGS = (import.meta.env.VITE_FEATURE_FLAGS || '').split(',').filter(Boolean);

export const isFeatureEnabled = (feature: string): boolean => {
  return FEATURE_FLAGS.includes(feature);
};

// Environment-specific configuration
export const getEnvironmentConfig = () => ({
  env: vercelEnv,
  apiUrl,
  wsUrl,
  publicUrl,
  isProduction,
  isStaging,
  isPreview,
  isDevelopment,
  features: FEATURE_FLAGS,
});

// Helper to build API endpoints
export const buildApiUrl = (path: string): string => {
  const base = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

// Environment-specific headers
export const getEnvironmentHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    'X-Environment': vercelEnv,
  };

  // Add staging-specific headers
  if (isStaging || isPreview) {
    headers['X-Preview-Mode'] = 'true';
  }

  return headers;
};

// Debug logger that only logs in non-production
export const debugLog = (...args: any[]) => {
  if (!isProduction) {
    console.log('[DEBUG]', ...args);
  }
};

// Export environment info for debugging
export const environmentInfo = {
  environment: vercelEnv,
  apiEndpoint: apiUrl,
  websocketEndpoint: wsUrl,
  isProductionBuild: isProduction,
  isStagingEnvironment: isStaging,
  isDevelopmentMode: isDevelopment,
  activeFeatures: FEATURE_FLAGS,
  buildTime: import.meta.env.VITE_BUILD_TIME || 'unknown',
};

// Log environment on app initialization (non-production only)
if (!isProduction && typeof window !== 'undefined') {
  console.log('🌍 Environment Configuration:', environmentInfo);
}