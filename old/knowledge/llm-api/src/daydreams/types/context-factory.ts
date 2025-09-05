import { AnyContext } from '@daydreamsai/core';
import { Template } from '../template.service';

/**
 * Services available for context creation
 */
export interface ContextServices {
  mcpService?: any;
  chromaService?: any;
  memoryService?: any;
  storageService?: any;
  configService?: any;
  [key: string]: any;
}

/**
 * Enhanced template with context-specific information
 */
export interface EnhancedTemplate extends Template {
  contextType: string;
  requiredServices: string[];
  dynamicCapabilities: boolean;
  contextFactory?: (services: ContextServices) => AnyContext;
  actionFactories?: Array<{
    name: string;
    factory: (services: ContextServices) => any;
    dependencies: string[];
  }>;
}

/**
 * Validation result for context creation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingServices: string[];
  availableCapabilities: string[];
}

/**
 * Context factory interface for dynamic context creation
 */
export interface ContextFactory {
  /**
   * Create a context instance from a template
   */
  createFromTemplate(
    template: EnhancedTemplate,
    services: ContextServices,
    overrides?: Record<string, any>,
  ): Promise<AnyContext>;

  /**
   * Validate if a template can be instantiated with available services
   */
  validateTemplate(
    template: EnhancedTemplate,
    availableServices: ContextServices,
  ): ValidationResult;

  /**
   * Get available capabilities for a context type
   */
  getAvailableCapabilities(
    contextType: string,
    services: ContextServices,
  ): string[];

  /**
   * Register a context type with its factory function
   */
  registerContextType(contextType: string, metadata: ContextTypeMetadata): void;

  /**
   * Check if a context type is supported
   */
  isContextTypeSupported(contextType: string): boolean;
}

/**
 * Context metadata for registration
 */
export interface ContextTypeMetadata {
  type: string;
  name: string;
  description: string;
  requiredServices: string[];
  factory: (services: ContextServices) => AnyContext;
  supportedCapabilities: string[];
  defaultArgs?: Record<string, any>;
}

/**
 * Agent factory interface for creating agents from templates
 */
export interface AgentFactory {
  /**
   * Create an agent from a template
   */
  createFromTemplate(
    templateId: string,
    services: ContextServices,
    overrides?: Partial<any>,
  ): Promise<any>;

  /**
   * Validate a template for agent creation
   */
  validateTemplate(templateId: string): Promise<ValidationResult>;

  /**
   * Get available capabilities for a template
   */
  getTemplateCapabilities(templateId: string): Promise<string[]>;

  /**
   * Preview what an agent would look like from a template
   */
  previewFromTemplate(
    templateId: string,
    overrides?: Record<string, any>,
  ): Promise<any>;
}

/**
 * Capability metadata
 */
export interface CapabilityMetadata {
  name: string;
  description: string;
  contextTypes: string[];
  requiredServices: string[];
  actionNames: string[];
}

/**
 * Factory configuration
 */
export interface FactoryConfig {
  enableDynamicCapabilities: boolean;
  enableContextValidation: boolean;
  enableServiceDiscovery: boolean;
  cacheContextInstances: boolean;
  maxCacheSize: number;
}
