import crypto from "crypto";
import { storage } from "./storage";

// All available webhook events
export const WEBHOOK_EVENTS = [
  "order.created",
  "order.assigned",
  "order.picked_up",
  "order.shipped",
  "order.delivered",
  "order.cancelled",
  "driver.registered",
  "driver.verified",
  "driver.location_updated",
  "payment.deposit",
  "payment.withdrawal",
  "rating.created",
  "rating.deleted",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const WEBHOOK_EVENT_LABELS: Record<string, string> = {
  "order.created": "طلب جديد",
  "order.assigned": "تعيين مندوب",
  "order.picked_up": "استلام الشحنة",
  "order.shipped": "جاري التوصيل",
  "order.delivered": "تم التسليم",
  "order.cancelled": "إلغاء الطلب",
  "driver.registered": "تسجيل مندوب جديد",
  "driver.verified": "توثيق المندوب",
  "driver.location_updated": "تحديث موقع المندوب",
  "payment.deposit": "إيداع",
  "payment.withdrawal": "سحب",
  "rating.created": "تقييم جديد",
  "rating.deleted": "حذف تقييم",
};

function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export async function triggerWebhook(event: WebhookEvent, data: any, tenantDbName?: string | null): Promise<void> {
  try {
    const activeWebhooks = await storage.getActiveWebhooksByEvent(event);
    // Filter by tenant - only trigger webhooks belonging to the same tenant
    const tenantDb = tenantDbName || null;
    const filteredWebhooks = activeWebhooks.filter(w => (w.tenantDbName || null) === tenantDb);

    for (const webhook of filteredWebhooks) {
      const payload = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data,
      });

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
        ...(webhook.headers as Record<string, string> || {}),
      };

      if (webhook.secret) {
        headers["X-Webhook-Signature"] = generateSignature(payload, webhook.secret);
      }

      const startTime = Date.now();

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

        const response = await fetch(webhook.url, {
          method: "POST",
          headers,
          body: payload,
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        const responseBody = await response.text().catch(() => "");

        // Log the attempt
        await storage.createWebhookLog({
          webhookId: webhook.id,
          event,
          url: webhook.url,
          requestBody: data,
          responseStatus: response.status,
          responseBody: responseBody.substring(0, 1000),
          success: response.ok,
          error: response.ok ? null : `HTTP ${response.status}`,
          duration,
        });

        // Update webhook status
        if (response.ok) {
          await storage.resetWebhookFail(webhook.id);
          await storage.updateWebhook(webhook.id, {
            lastTriggeredAt: new Date(),
            lastStatus: response.status,
            lastError: null,
          } as any);
        } else {
          await storage.incrementWebhookFail(webhook.id);
          await storage.updateWebhook(webhook.id, {
            lastTriggeredAt: new Date(),
            lastStatus: response.status,
            lastError: `HTTP ${response.status}: ${responseBody.substring(0, 200)}`,
          } as any);

          // Disable webhook after too many failures
          const wh = await storage.getWebhook(webhook.id);
          if (wh && (wh.failCount || 0) >= (wh.maxRetries || 3)) {
            await storage.updateWebhook(webhook.id, { isActive: false } as any);
          }
        }
      } catch (err: any) {
        const duration = Date.now() - startTime;
        await storage.createWebhookLog({
          webhookId: webhook.id,
          event,
          url: webhook.url,
          requestBody: data,
          responseStatus: 0,
          success: false,
          error: err.message || "Connection failed",
          duration,
        });

        await storage.incrementWebhookFail(webhook.id);
        await storage.updateWebhook(webhook.id, {
          lastTriggeredAt: new Date(),
          lastStatus: 0,
          lastError: err.message || "Connection failed",
        } as any);
      }
    }
  } catch (err) {
    console.error("Webhook trigger error:", err);
  }
}
