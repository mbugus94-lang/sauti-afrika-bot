import type { Request, Response, NextFunction } from "express";

// Error handling middleware
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error("[Error]", err);

  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === "development";

  res.status(500).json({
    error: "Internal server error",
    message: isDev ? err.message : undefined,
    stack: isDev ? err.stack : undefined,
  });
}

// Request logging middleware
export function requestLogger(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;
  const ip = req.ip || req.socket.remoteAddress || "unknown";

  console.log(`[${timestamp}] ${method} ${path} - ${ip}`);
  next();
}

// Rate limiting helper (simple in-memory implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  windowMs: number = 15 * 60 * 1000, // 15 minutes
  maxRequests: number = 100
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    const record = requestCounts.get(ip);
    if (!record || now > record.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    } else {
      record.count++;
      if (record.count > maxRequests) {
        res.status(429).json({
          error: "Too many requests",
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        });
        return;
      }
    }

    next();
  };
}

// Security headers middleware
export function securityHeaders(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  next();
}
