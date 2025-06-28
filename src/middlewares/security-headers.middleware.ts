import { createMiddleware } from "hono/factory";
import type { AppEnv } from "@/schemas/app-env.schema";

export interface SecurityHeadersConfig {
  /**
   * HTTP Strict Transport Security (HSTS)
   * Forces HTTPS connections and prevents downgrade attacks
   * Set to null to disable HSTS completely
   */
  hsts?: {
    maxAge?: number; // seconds, default: 31536000 (1 year)
    includeSubDomains?: boolean; // default: true
    preload?: boolean; // default: false
  } | null;

  /**
   * Content Security Policy (CSP)
   * Prevents XSS attacks by controlling resource loading
   * Set to null to disable CSP completely
   */
  contentSecurityPolicy?: {
    defaultSrc?: string[];
    scriptSrc?: string[];
    styleSrc?: string[];
    imgSrc?: string[];
    connectSrc?: string[];
    fontSrc?: string[];
    objectSrc?: string[];
    mediaSrc?: string[];
    frameSrc?: string[];
    childSrc?: string[];
    frameAncestors?: string[];
    formAction?: string[];
    upgradeInsecureRequests?: boolean;
    blockAllMixedContent?: boolean;
  } | null;

  /**
   * X-Frame-Options
   * Prevents clickjacking attacks
   */
  frameOptions?: "DENY" | "SAMEORIGIN" | string; // string for ALLOW-FROM uri

  /**
   * X-Content-Type-Options
   * Prevents MIME type sniffing
   */
  contentTypeOptions?: "nosniff";

  /**
   * Referrer-Policy
   * Controls referrer information sent with requests
   */
  referrerPolicy?: 
    | "no-referrer"
    | "no-referrer-when-downgrade" 
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url";

  /**
   * X-XSS-Protection
   * Legacy XSS protection (mostly superseded by CSP)
   */
  xssProtection?: "1; mode=block" | "0";

  /**
   * Permissions-Policy (formerly Feature-Policy)
   * Controls browser features and APIs
   * Set to null to disable permissions policy completely
   */
  permissionsPolicy?: {
    camera?: string[];
    microphone?: string[];
    geolocation?: string[];
    gyroscope?: string[];
    magnetometer?: string[];
    payment?: string[];
    usb?: string[];
  } | null;

  /**
   * Cross-Origin-Embedder-Policy
   * Controls embedding of cross-origin resources
   */
  crossOriginEmbedderPolicy?: "unsafe-none" | "require-corp";

  /**
   * Cross-Origin-Opener-Policy
   * Controls cross-origin window interactions
   */
  crossOriginOpenerPolicy?: "unsafe-none" | "same-origin-allow-popups" | "same-origin";

  /**
   * Cross-Origin-Resource-Policy
   * Controls cross-origin resource sharing
   */
  crossOriginResourcePolicy?: "same-site" | "same-origin" | "cross-origin";

  /**
   * Custom headers to add
   */
  customHeaders?: Record<string, string>;

  /**
   * Whether to remove server information headers
   */
  removeServerHeader?: boolean;

  /**
   * Whether to remove X-Powered-By headers
   */
  removePoweredBy?: boolean;
}

const defaultConfig: Required<Omit<SecurityHeadersConfig, 'customHeaders'>> & { customHeaders: Record<string, string> } = {
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: false,
  },
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for common use cases
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", "https:", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    childSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: true,
    blockAllMixedContent: true,
  },
  frameOptions: "DENY",
  contentTypeOptions: "nosniff",
  referrerPolicy: "strict-origin-when-cross-origin",
  xssProtection: "1; mode=block",
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    gyroscope: [],
    magnetometer: [],
    payment: [],
    usb: [],
  },
  crossOriginEmbedderPolicy: "unsafe-none",
  crossOriginOpenerPolicy: "same-origin",
  crossOriginResourcePolicy: "same-origin",
  customHeaders: {},
  removeServerHeader: true,
  removePoweredBy: true,
};

function buildCSPValue(csp: SecurityHeadersConfig['contentSecurityPolicy']): string {
  if (!csp) return "";

  const directives: string[] = [];

  // Add all directive types
  if (csp.defaultSrc) directives.push(`default-src ${csp.defaultSrc.join(' ')}`);
  if (csp.scriptSrc) directives.push(`script-src ${csp.scriptSrc.join(' ')}`);
  if (csp.styleSrc) directives.push(`style-src ${csp.styleSrc.join(' ')}`);
  if (csp.imgSrc) directives.push(`img-src ${csp.imgSrc.join(' ')}`);
  if (csp.connectSrc) directives.push(`connect-src ${csp.connectSrc.join(' ')}`);
  if (csp.fontSrc) directives.push(`font-src ${csp.fontSrc.join(' ')}`);
  if (csp.objectSrc) directives.push(`object-src ${csp.objectSrc.join(' ')}`);
  if (csp.mediaSrc) directives.push(`media-src ${csp.mediaSrc.join(' ')}`);
  if (csp.frameSrc) directives.push(`frame-src ${csp.frameSrc.join(' ')}`);
  if (csp.childSrc) directives.push(`child-src ${csp.childSrc.join(' ')}`);
  if (csp.frameAncestors) directives.push(`frame-ancestors ${csp.frameAncestors.join(' ')}`);
  if (csp.formAction) directives.push(`form-action ${csp.formAction.join(' ')}`);

  // Add boolean directives
  if (csp.upgradeInsecureRequests) directives.push('upgrade-insecure-requests');
  if (csp.blockAllMixedContent) directives.push('block-all-mixed-content');

  return directives.join('; ');
}

function buildHSTSValue(hsts: SecurityHeadersConfig['hsts']): string {
  if (!hsts) return "";

  let value = `max-age=${hsts.maxAge ?? 31536000}`;
  
  if (hsts.includeSubDomains) {
    value += '; includeSubDomains';
  }
  
  if (hsts.preload) {
    value += '; preload';
  }

  return value;
}

function buildPermissionsPolicyValue(policy: SecurityHeadersConfig['permissionsPolicy']): string {
  if (!policy || Object.keys(policy).length === 0) return "";

  const directives: string[] = [];

  Object.entries(policy).forEach(([feature, allowlist]) => {
    if (allowlist.length === 0) {
      directives.push(`${feature}=()`);
    } else {
      const origins = allowlist.map(origin => 
        origin === 'self' ? '"self"' : origin
      ).join(' ');
      directives.push(`${feature}=(${origins})`);
    }
  });

  return directives.join(', ');
}

export const createSecurityHeadersMiddleware = (config: SecurityHeadersConfig = {}) => {
  // Handle merging with null/undefined checks
  const mergeHsts = () => {
    if (config.hsts === null) return null;
    if (config.hsts === undefined) return defaultConfig.hsts;
    return { ...defaultConfig.hsts, ...config.hsts };
  };

  const mergeCSP = () => {
    if (config.contentSecurityPolicy === null) return null;
    if (config.contentSecurityPolicy === undefined) return defaultConfig.contentSecurityPolicy;
    return { ...defaultConfig.contentSecurityPolicy, ...config.contentSecurityPolicy };
  };

  const mergePermissions = () => {
    if (config.permissionsPolicy === null) return null;
    if (config.permissionsPolicy === undefined) return defaultConfig.permissionsPolicy;
    return { ...defaultConfig.permissionsPolicy, ...config.permissionsPolicy };
  };

  const finalConfig = {
    ...defaultConfig,
    ...config,
    hsts: mergeHsts(),
    contentSecurityPolicy: mergeCSP(),
    permissionsPolicy: mergePermissions(),
    customHeaders: { ...defaultConfig.customHeaders, ...(config.customHeaders || {}) },
  };

  return createMiddleware<AppEnv>(async (c, next) => {
    await next();

    // Remove security-sensitive headers
    if (finalConfig.removeServerHeader) {
      c.res.headers.delete('Server');
    }
    if (finalConfig.removePoweredBy) {
      c.res.headers.delete('X-Powered-By');
    }

    // Set HSTS (only on HTTPS)
    const protocol = c.req.header('x-forwarded-proto') || 
                    (c.req.url.startsWith('https') ? 'https' : 'http');
    
    if (protocol === 'https' && finalConfig.hsts !== null && finalConfig.hsts !== undefined) {
      const hstsValue = buildHSTSValue(finalConfig.hsts);
      if (hstsValue) {
        c.res.headers.set('Strict-Transport-Security', hstsValue);
      }
    }

    // Set Content Security Policy
    if (finalConfig.contentSecurityPolicy !== null && finalConfig.contentSecurityPolicy !== undefined) {
      const cspValue = buildCSPValue(finalConfig.contentSecurityPolicy);
      if (cspValue) {
        c.res.headers.set('Content-Security-Policy', cspValue);
      }
    }

    // Set X-Frame-Options
    if (finalConfig.frameOptions) {
      c.res.headers.set('X-Frame-Options', finalConfig.frameOptions);
    }

    // Set X-Content-Type-Options
    if (finalConfig.contentTypeOptions) {
      c.res.headers.set('X-Content-Type-Options', finalConfig.contentTypeOptions);
    }

    // Set Referrer-Policy
    if (finalConfig.referrerPolicy) {
      c.res.headers.set('Referrer-Policy', finalConfig.referrerPolicy);
    }

    // Set X-XSS-Protection
    if (finalConfig.xssProtection) {
      c.res.headers.set('X-XSS-Protection', finalConfig.xssProtection);
    }

    // Set Permissions-Policy
    if (finalConfig.permissionsPolicy !== null && finalConfig.permissionsPolicy !== undefined) {
      const policyValue = buildPermissionsPolicyValue(finalConfig.permissionsPolicy);
      if (policyValue) {
        c.res.headers.set('Permissions-Policy', policyValue);
      }
    }

    // Set Cross-Origin headers
    if (finalConfig.crossOriginEmbedderPolicy) {
      c.res.headers.set('Cross-Origin-Embedder-Policy', finalConfig.crossOriginEmbedderPolicy);
    }

    if (finalConfig.crossOriginOpenerPolicy) {
      c.res.headers.set('Cross-Origin-Opener-Policy', finalConfig.crossOriginOpenerPolicy);
    }

    if (finalConfig.crossOriginResourcePolicy) {
      c.res.headers.set('Cross-Origin-Resource-Policy', finalConfig.crossOriginResourcePolicy);
    }

    // Set custom headers
    Object.entries(finalConfig.customHeaders).forEach(([name, value]) => {
      c.res.headers.set(name, value);
    });
  });
};

// Default security headers middleware for authentication service
export const securityHeadersMiddleware = createSecurityHeadersMiddleware({
  // Authentication service specific CSP
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", "https:", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'none'"],
    frameSrc: ["'none'"],
    childSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: true,
    blockAllMixedContent: true,
  },
  
  // Strict frame policy for authentication service
  frameOptions: "DENY",
  
  // Conservative permissions for authentication service
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    gyroscope: [],
    magnetometer: [],
    payment: [],
    usb: [],
  },
  
  // Authentication service custom headers
  customHeaders: {
    'X-Service-Type': 'authentication',
    'X-API-Version': '1.0',
  },
});

// Relaxed headers for development
export const devSecurityHeadersMiddleware = createSecurityHeadersMiddleware({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"], // Allow eval for dev tools
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:", "http:"],
    connectSrc: ["'self'", "ws:", "wss:"], // Allow websockets for hot reload
    fontSrc: ["'self'", "https:", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'none'"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: false, // Don't force HTTPS in dev
    blockAllMixedContent: false,
  },
  
  hsts: {
    maxAge: 0, // Disable HSTS in development
    includeSubDomains: false,
    preload: false,
  },
  
  customHeaders: {
    'X-Environment': 'development',
    'X-Service-Type': 'authentication',
    'X-API-Version': '1.0',
  },
});