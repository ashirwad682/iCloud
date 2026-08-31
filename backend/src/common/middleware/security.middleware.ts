import { Request, Response, NextFunction } from 'express';

/**
 * Recursively sanitizes objects to prevent NoSQL query injections ($gt, $ne, $where, etc.)
 */
function sanitizeInput(target: any): any {
  if (!target || typeof target !== 'object') {
    if (typeof target === 'string') {
      // Strip potential script injections
      return target.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    return target;
  }

  if (Array.isArray(target)) {
    return target.map((item) => sanitizeInput(item));
  }

  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(target)) {
    // Strip keys starting with $ or containing dots to block MongoDB injection attacks
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    cleanObj[key] = sanitizeInput(value);
  }
  return cleanObj;
}

/**
 * Enterprise High-Security Middleware
 */
export function advancedSecurityMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 1. High-Security Response Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.removeHeader('X-Powered-By');

  // 2. NoSQL & XSS Sanitization
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeInput(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeInput(req.params);
  }

  next();
}
