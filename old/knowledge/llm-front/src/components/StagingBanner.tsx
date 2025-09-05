import React from 'react';
import { isProduction, isStaging, isPreview, isDevelopment, apiUrl, vercelEnv } from '../utils/env';

/**
 * Banner component that displays environment information in non-production environments
 * Helps developers and testers identify which environment they're currently using
 */
export const StagingBanner: React.FC = () => {
  // Don't show banner in production
  if (isProduction) {
    return null;
  }

  // Determine banner color based on environment
  const getBannerStyle = () => {
    if (isDevelopment) {
      return 'bg-blue-50 border-blue-200 text-blue-800';
    }
    if (isStaging) {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
    if (isPreview) {
      return 'bg-purple-50 border-purple-200 text-purple-800';
    }
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  // Get environment label
  const getEnvironmentLabel = () => {
    if (isDevelopment) return 'Development';
    if (isStaging) return 'Staging';
    if (isPreview) return 'Preview';
    return vercelEnv || 'Unknown';
  };

  // Extract just the domain from the API URL for cleaner display
  const getApiDomain = () => {
    try {
      const url = new URL(apiUrl);
      return url.hostname;
    } catch {
      return apiUrl;
    }
  };

  return (
    <div 
      className={`fixed bottom-2 right-2 z-50 rounded-md border px-3 py-2 text-xs shadow-sm ${getBannerStyle()} opacity-90 hover:opacity-100 transition-opacity`}
      title="Environment Information"
    >
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="font-semibold">ENV:</span>
          <span className="font-mono">{getEnvironmentLabel()}</span>
        </div>
        <span className="text-gray-400">|</span>
        <div className="flex items-center gap-1">
          <span className="font-semibold">API:</span>
          <span className="font-mono text-xs">{getApiDomain()}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Minimal banner that only shows the environment name
 * Use this for a less intrusive indicator
 */
export const MinimalStagingBanner: React.FC = () => {
  if (isProduction) {
    return null;
  }

  const envEmoji = isDevelopment ? '💻' : isStaging ? '🚧' : isPreview ? '👁️' : '❓';
  const envName = isDevelopment ? 'DEV' : isStaging ? 'STAGING' : isPreview ? 'PREVIEW' : '?';

  return (
    <div 
      className="fixed bottom-2 right-2 z-50 rounded-full bg-black/10 backdrop-blur px-2 py-1 text-xs font-mono"
      title={`Environment: ${vercelEnv}\nAPI: ${apiUrl}`}
    >
      <span>{envEmoji} {envName}</span>
    </div>
  );
};

export default StagingBanner;