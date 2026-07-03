import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { storage, createTenantStorage } from "./storage";

// Available API permissions
export const API_PERMISSIONS = [
  "orders.read",
  "orders.create",
  "orders.update",
  "orders.cancel",
  "tracking.read",
  "drivers.read",
  "drivers.location",
  "ratings.read",
  "ratings.create",
  "webhooks.manage",
] as const;

export type ApiPermission = (typeof API_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<string, string> = {
  "orders.read": "قراءة الطلبات",
  "orders.create": "إنشاء طلبات",
  "orders.update": "تحديث الطلبات",
  "orders.cancel": "إلغاء الطلبات",
  "tracking.read": "تتبع الشحنات",
  "drivers.read": "قراءة بيانات المندوبين",
  "drivers.location": "موقع المندوبين",
  "ratings.read": "قراءة التقييمات",
  "ratings.create": "إضافة تقييمات",
  "webhooks.manage": "إدارة Webhooks",
};

// Rate limiting store (in-memory)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Generate API key
export function generateApiKey(): string {
  return "dk_live_" + crypto.randomBytes(24).toString("hex");
}

// Generate secret key
export function generateSecretKey(): string {
  return "sk_" + crypto.randomBytes(32).toString("hex");
}

// API Key authentication middleware
export function requireApiKey(...requiredPermissions: ApiPermission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const apiKeyHeader = req.headers["x-api-key"] as string;

    if (!apiKeyHeader) {
      await logRequest(req, 401, Date.now() - startTime, null, null, "Missing API key");
      return res.status(401).json({
        error: "unauthorized",
        message: "API key is required. Set X-API-Key header.",
      });
    }

    try {
      const keyRecord = await storage.getApiKeyByKey(apiKeyHeader);

      if (!keyRecord) {
        await logRequest(req, 401, Date.now() - startTime, null, null, "Invalid API key");
        return res.status(401).json({
          error: "unauthorized",
          message: "Invalid API key.",
        });
      }

      if (!keyRecord.isActive) {
        await logRequest(req, 403, Date.now() - startTime, keyRecord.id, keyRecord.name, "Inactive API key");
        return res.status(403).json({
          error: "forbidden",
          message: "API key is deactivated.",
        });
      }

      // Check expiry
      if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
        await logRequest(req, 403, Date.now() - startTime, keyRecord.id, keyRecord.name, "Expired API key");
        return res.status(403).json({
          error: "forbidden",
          message: "API key has expired.",
        });
      }

      // Check IP whitelist
      if (keyRecord.ipWhitelist) {
        const allowedIps = keyRecord.ipWhitelist.split(",").map(ip => ip.trim());
        const clientIp = req.ip || req.socket.remoteAddress || "";
        if (allowedIps.length > 0 && allowedIps[0] !== "" && !allowedIps.includes(clientIp)) {
          await logRequest(req, 403, Date.now() - startTime, keyRecord.id, keyRecord.name, "IP not whitelisted");
          return res.status(403).json({
            error: "forbidden",
            message: "IP address not allowed.",
          });
        }
      }

      // Check rate limit
      const rateLimit = keyRecord.rateLimit || 100;
      const limitKey = keyRecord.id;
      const now = Date.now();
      let limitData = rateLimitStore.get(limitKey);

      if (!limitData || limitData.resetAt < now) {
        limitData = { count: 0, resetAt: now + 60000 }; // 1 minute window
        rateLimitStore.set(limitKey, limitData);
      }

      limitData.count++;

      if (limitData.count > rateLimit) {
        res.setHeader("X-RateLimit-Limit", rateLimit.toString());
        res.setHeader("X-RateLimit-Remaining", "0");
        res.setHeader("X-RateLimit-Reset", Math.ceil(limitData.resetAt / 1000).toString());
        await logRequest(req, 429, Date.now() - startTime, keyRecord.id, keyRecord.name, "Rate limit exceeded");
        return res.status(429).json({
          error: "rate_limit_exceeded",
          message: `Rate limit of ${rateLimit} requests/minute exceeded.`,
        });
      }

      res.setHeader("X-RateLimit-Limit", rateLimit.toString());
      res.setHeader("X-RateLimit-Remaining", Math.max(0, rateLimit - limitData.count).toString());

      // Check permissions
      const keyPermissions = (keyRecord.permissions as string[]) || [];
      for (const perm of requiredPermissions) {
        if (!keyPermissions.includes(perm)) {
          await logRequest(req, 403, Date.now() - startTime, keyRecord.id, keyRecord.name, `Missing permission: ${perm}`);
          return res.status(403).json({
            error: "forbidden",
            message: `Missing required permission: ${perm}`,
          });
        }
      }

      // Increment usage
      await storage.incrementApiKeyUsage(keyRecord.id);

      // Attach key info to request
      (req as any).apiKey = keyRecord;

      // Set tenant storage if key belongs to a tenant
      if (keyRecord.tenantDbName) {
        try {
          req.tenantStorage = createTenantStorage(keyRecord.tenantDbName);
        } catch (err) {
          console.error("Failed to create tenant storage for API key:", err);
        }
      }

      // Log successful request after response
      const originalSend = res.send;
      res.send = function (body) {
        const responseTime = Date.now() - startTime;
        logRequest(req, res.statusCode, responseTime, keyRecord.id, keyRecord.name, null).catch(() => { });
        return originalSend.call(this, body);
      };

      next();
    } catch (err: any) {
      await logRequest(req, 500, Date.now() - startTime, null, null, err.message);
      return res.status(500).json({
        error: "internal_error",
        message: "Authentication error.",
      });
    }
  };
}

async function logRequest(
  req: Request,
  statusCode: number,
  responseTime: number,
  apiKeyId: string | null,
  apiKeyName: string | null,
  errorMessage: string | null
): Promise<void> {
  try {
    await storage.createApiLog({
      apiKeyId,
      apiKeyName,
      method: req.method,
      endpoint: req.originalUrl || req.url,
      statusCode,
      responseTime,
      ipAddress: req.ip || req.socket.remoteAddress || "",
      userAgent: req.headers["user-agent"] || "",
      requestBody: req.method !== "GET" ? req.body : null,
      errorMessage,
    });
  } catch (err) {
    console.error("Failed to log API request:", err);
  }
}
