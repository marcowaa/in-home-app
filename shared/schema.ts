import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin Users
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).pick({
  username: true,
  password: true,
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// Delivery Drivers
export const deliveryDrivers = pgTable("delivery_drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  whatsappPhone: text("whatsapp_phone"),
  verificationCode: text("verification_code"),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  isAvailable: boolean("is_available").default(true),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).default("0"),
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0"),
  completedOrders: integer("completed_orders").default(0),
  profileImage: text("profile_image"),
  governorate: text("governorate"),
  city: text("city"),
  village: text("village"),
  idVerified: boolean("id_verified").default(false),
  criminalRecordVerified: boolean("criminal_record_verified").default(false),
  nationalIdImage: text("national_id_image"),
  nationalIdImageBack: text("national_id_image_back"),
  criminalRecordImage: text("criminal_record_image"),
  criminalRecordImageBack: text("criminal_record_image_back"),
  maxWeight: decimal("max_weight", { precision: 6, scale: 2 }),
  vehicleType: text("vehicle_type"),
  fullyVerified: boolean("fully_verified").default(false),
  referralCode: text("referral_code").unique(),
  referredBy: varchar("referred_by"),
  averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default("0"),
  totalRatings: integer("total_ratings").default(0),
  addedByAdmin: text("added_by_admin"),
  loginCount: integer("login_count").default(0),
  isHidden: boolean("is_hidden").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeliveryDriverSchema = createInsertSchema(deliveryDrivers).omit({
  id: true,
  createdAt: true,
});

export type InsertDeliveryDriver = z.infer<typeof insertDeliveryDriverSchema>;
export type DeliveryDriver = typeof deliveryDrivers.$inferSelect;

// Payment Methods (used for driver deposits)
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  icon: text("icon"),
  instructions: text("instructions"),
  accountNumber: text("account_number"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({
  id: true,
  createdAt: true,
});

export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;

// Orders
export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  quantity: number;
  price: string;
  total: string;
}

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address").notNull(),
  customerCity: text("customer_city"),
  customerNotes: text("customer_notes"),
  items: jsonb("items").notNull().$type<OrderItem[]>(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethodId: varchar("payment_method_id").references(() => paymentMethods.id),
  paymentMethodName: text("payment_method_name"),
  status: text("status").default("pending"),
  isPaid: boolean("is_paid").default(false),
  amountCollected: decimal("amount_collected", { precision: 10, scale: 2 }),
  amountCollectedConfirmed: boolean("amount_collected_confirmed").default(false),
  trackingCode: text("tracking_code"),
  deliveryCode: text("delivery_code"),
  driverId: varchar("driver_id").references(() => deliveryDrivers.id),
  driverName: text("driver_name"),
  pickupDeadline: timestamp("pickup_deadline"),
  deliveryDeadline: timestamp("delivery_deadline"),
  pickedUpAt: timestamp("picked_up_at"),
  shippedAt: timestamp("shipped_at"),
  deliveredAt: timestamp("delivered_at"),
  pickupAddress: text("pickup_address"),
  shipmentType: text("shipment_type"),
  weight: decimal("weight", { precision: 6, scale: 2 }),
  frozenAmount: decimal("frozen_amount", { precision: 10, scale: 2 }),
  confirmationCode: text("confirmation_code"),
  driverCommission: decimal("driver_commission", { precision: 10, scale: 2 }),
  commissionPrepaid: boolean("commission_prepaid").default(false),
  commissionConfirmed: boolean("commission_confirmed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Driver Notifications
export const driverNotifications = pgTable("driver_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").references(() => deliveryDrivers.id).notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  status: text("status").default("pending"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export type DriverNotification = typeof driverNotifications.$inferSelect;
export type InsertDriverNotification = typeof driverNotifications.$inferInsert;

// Order Driver Assignments
export const orderDriverAssignments = pgTable("order_driver_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  driverId: varchar("driver_id").references(() => deliveryDrivers.id).notNull(),
  status: text("status").default("pending"),
  rejectionReason: text("rejection_reason"),
  assignedAt: timestamp("assigned_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
});

export type OrderDriverAssignment = typeof orderDriverAssignments.$inferSelect;
export type InsertOrderDriverAssignment = typeof orderDriverAssignments.$inferInsert;

// Driver Wallet Transactions
export const driverWalletTransactions = pgTable("driver_wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").references(() => deliveryDrivers.id).notNull(),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }),
  description: text("description"),
  orderId: varchar("order_id"),
  status: text("status").default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DriverWalletTransaction = typeof driverWalletTransactions.$inferSelect;
export type InsertDriverWalletTransaction = typeof driverWalletTransactions.$inferInsert;

// Driver Withdrawal Requests
export const driverWithdrawalRequests = pgTable("driver_withdrawal_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").references(() => deliveryDrivers.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export type DriverWithdrawalRequest = typeof driverWithdrawalRequests.$inferSelect;
export type InsertDriverWithdrawalRequest = typeof driverWithdrawalRequests.$inferInsert;

// Driver Deposit Requests
export const driverDepositRequests = pgTable("driver_deposit_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").references(() => deliveryDrivers.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethodId: varchar("payment_method_id").references(() => paymentMethods.id),
  paymentMethodName: text("payment_method_name"),
  status: text("status").default("pending"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export type DriverDepositRequest = typeof driverDepositRequests.$inferSelect;
export type InsertDriverDepositRequest = typeof driverDepositRequests.$inferInsert;

// App Settings
export const appSettings = pgTable("app_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  storeName: text("store_name").default("نظام المندوبين"),
  storeNameEn: text("store_name_en").default("Driver System"),
  siteTitle: text("site_title").default("نظام المندوبين - إدارة الشحن والتوصيل"),
  siteDescription: text("site_description").default("نظام متكامل لإدارة المندوبين والشحن والتوصيل - لوحة تحكم إدارية متقدمة ولوحة المندوب"),
  logo: text("logo"),
  appIcon: text("app_icon"),
  favicon: text("favicon"),
  whatsappNumber: text("whatsapp_number"),
  supportButtonEnabled: boolean("support_button_enabled").default(false),
  supportButtonType: text("support_button_type").default("whatsapp"),
  supportButtonValue: text("support_button_value"),
  supportButtonLabel: text("support_button_label").default("تواصل معنا"),
  primaryColor: text("primary_color").default("#ec4899"),
  currency: text("currency").default("ج.م"),
  adminDashboardBackground: text("admin_dashboard_background"),
  adminSidebarBackground: text("admin_sidebar_background"),
  adminLoginBackground: text("admin_login_background"),
  driverCommissionBase: decimal("driver_commission_base", { precision: 5, scale: 2 }).default("5"),
  driverCommissionVerifiedId: decimal("driver_commission_verified_id", { precision: 5, scale: 2 }).default("8"),
  driverCommissionVerifiedCriminal: decimal("driver_commission_verified_criminal", { precision: 5, scale: 2 }).default("12"),
  referralBonusAmount: decimal("referral_bonus_amount", { precision: 10, scale: 2 }).default("50"),
  // Security & fraud protection
  fraudCode: text("fraud_code").default("AB12"),
  otpMessageTemplate: text("otp_message_template").default("كود التحقق: {OTP} | رمز الحماية: {FRAUD_CODE}"),
  // Transfer limits
  maxDailyTransfers: integer("max_daily_transfers").default(10),
  maxTransferAmount: decimal("max_transfer_amount", { precision: 12, scale: 2 }).default("50000"),
  minTransferAmount: decimal("min_transfer_amount", { precision: 12, scale: 2 }).default("1"),
  transferFeeRate: decimal("transfer_fee_rate", { precision: 5, scale: 4 }).default("0.005"),
  transferFeeFixed: decimal("transfer_fee_fixed", { precision: 12, scale: 2 }).default("2"),
  // Advisor settings
  advisorFeeRate: decimal("advisor_fee_rate", { precision: 5, scale: 4 }).default("0.05"),
  advisorConsultationFee: decimal("advisor_consultation_fee", { precision: 12, scale: 2 }).default("25"),
  // Contract automation
  contractAutoCompleteHours: integer("contract_auto_complete_hours").default(48),
  disputeTimeoutHours: integer("dispute_timeout_hours").default(168),
  maxActiveContracts: integer("max_active_contracts").default(20),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = typeof appSettings.$inferSelect;

// Admin Notifications
export const adminNotifications = pgTable("admin_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: varchar("related_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type AdminNotification = typeof adminNotifications.$inferSelect;
export type InsertAdminNotification = typeof adminNotifications.$inferInsert;

// Driver Ratings
export const driverRatings = pgTable("driver_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").references(() => deliveryDrivers.id).notNull(),
  orderId: varchar("order_id").references(() => orders.id),
  rating: decimal("rating", { precision: 2, scale: 1 }).notNull(),
  comment: text("comment"),
  customerName: text("customer_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DriverRating = typeof driverRatings.$inferSelect;
export type InsertDriverRating = typeof driverRatings.$inferInsert;

// Driver Referrals
export const driverReferrals = pgTable("driver_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerId: varchar("referrer_id").references(() => deliveryDrivers.id).notNull(),
  referredId: varchar("referred_id").references(() => deliveryDrivers.id).notNull(),
  bonus: decimal("bonus", { precision: 10, scale: 2 }).default("0"),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type DriverReferral = typeof driverReferrals.$inferSelect;
export type InsertDriverReferral = typeof driverReferrals.$inferInsert;

// API Keys for integrations
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull().unique(),
  secretKey: text("secret_key").notNull(),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  ipWhitelist: text("ip_whitelist"),
  rateLimit: integer("rate_limit").default(100),
  totalRequests: integer("total_requests").default(0),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  tenantDbName: text("tenant_db_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;

// Webhooks
export const webhooks = pgTable("webhooks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  url: text("url").notNull(),
  events: jsonb("events").$type<string[]>().default([]),
  secret: text("secret"),
  headers: jsonb("headers").$type<Record<string, string>>().default({}),
  isActive: boolean("is_active").default(true),
  failCount: integer("fail_count").default(0),
  maxRetries: integer("max_retries").default(3),
  lastTriggeredAt: timestamp("last_triggered_at"),
  lastStatus: integer("last_status"),
  lastError: text("last_error"),
  tenantDbName: text("tenant_db_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Webhook = typeof webhooks.$inferSelect;
export type InsertWebhook = typeof webhooks.$inferInsert;

// API Logs
export const apiLogs = pgTable("api_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id"),
  apiKeyName: text("api_key_name"),
  method: text("method").notNull(),
  endpoint: text("endpoint").notNull(),
  statusCode: integer("status_code"),
  responseTime: integer("response_time"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  requestBody: jsonb("request_body"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ApiLog = typeof apiLogs.$inferSelect;
export type InsertApiLog = typeof apiLogs.$inferInsert;

// Operation Logs - unified log of all completed operations
export const operationLogs = pgTable("operation_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // delivery, commission, deposit, withdrawal, refund, penalty, referral_bonus, order_created, order_cancelled, driver_assigned
  driverId: varchar("driver_id").references(() => deliveryDrivers.id),
  driverName: text("driver_name"),
  orderId: varchar("order_id"),
  orderNumber: text("order_number"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  description: text("description").notNull(),
  status: text("status").default("completed"), // completed, cancelled, pending
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type OperationLog = typeof operationLogs.$inferSelect;
export type InsertOperationLog = typeof operationLogs.$inferInsert;

// Webhook Logs
export const webhookLogs = pgTable("webhook_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  webhookId: varchar("webhook_id").references(() => webhooks.id).notNull(),
  event: text("event").notNull(),
  url: text("url").notNull(),
  requestBody: jsonb("request_body"),
  responseStatus: integer("response_status"),
  responseBody: text("response_body"),
  success: boolean("success").default(false),
  error: text("error"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").defaultNow(),
})

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;

// Pro Admin Accounts (Tenants)
export const proAdmins = pgTable("pro_admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  dbName: text("db_name").notNull(),
  isActive: boolean("is_active").default(true),
  autoDisableAt: timestamp("auto_disable_at"),
  autoEnableAt: timestamp("auto_enable_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProAdminSchema = createInsertSchema(proAdmins).pick({
  username: true,
  password: true,
  name: true,
});

export type ProAdmin = typeof proAdmins.$inferSelect;
export type InsertProAdmin = z.infer<typeof insertProAdminSchema>;

// ========================
// USER PAYMENTS PLATFORM
// ========================

// General consumer users (InstaPay-like)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  pin: text("pin"), // hashed 4-digit PIN
  walletBalance: decimal("wallet_balance", { precision: 12, scale: 2 }).default("0"),
  frozenBalance: decimal("frozen_balance", { precision: 12, scale: 2 }).default("0"),
  kycStatus: text("kyc_status").default("none"), // none, basic, verified
  isActive: boolean("is_active").default(true),
  referralCode: text("referral_code").unique(),
  referredBy: varchar("referred_by"),
  // KYC fields
  fullName: text("full_name"),
  nationalId: text("national_id"),
  nationalIdImageFront: text("national_id_image_front"),
  nationalIdImageBack: text("national_id_image_back"),
  proofOfAddress: text("proof_of_address"),
  dateOfBirth: text("date_of_birth"),
  email: text("email"),
  kycVerifiedAt: timestamp("kyc_verified_at"),
  kycVerifiedBy: varchar("kyc_verified_by"),
  kycRejectionReason: text("kyc_rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User wallet transactions (all wallet movements)
export const userWalletTransactions = pgTable("user_wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // topup, withdraw, transfer_sent, transfer_received, escrow_freeze, escrow_release, escrow_refund, escrow_delivery_fee
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }),
  feeAmount: decimal("fee_amount", { precision: 12, scale: 2 }).default("0"),
  description: text("description"),
  relatedId: varchar("related_id"), // transfer or escrow order ID
  counterpartyId: varchar("counterparty_id"), // other user ID
  counterpartyName: text("counterparty_name"),
  status: text("status").default("completed"), // pending, completed, failed
  referenceNumber: text("reference_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserWalletTransaction = typeof userWalletTransactions.$inferSelect;
export type InsertUserWalletTransaction = typeof userWalletTransactions.$inferInsert;

// P2P money transfers
export const p2pTransfers = pgTable("p2p_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").references(() => users.id).notNull(),
  receiverId: varchar("receiver_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  fee: decimal("fee", { precision: 12, scale: 2 }).default("0"),
  method: text("method").notNull(), // phone, qr, bank, wallet, instapay
  receiverIdentifier: text("receiver_identifier"), // phone, bank account, wallet number
  receiverName: text("receiver_name"),
  senderName: text("sender_name"),
  status: text("status").default("pending"), // pending, confirmed, completed, failed, cancelled
  otpCode: text("otp_code"),
  otpVerified: boolean("otp_verified").default(false),
  description: text("description"),
  referenceNumber: text("reference_number").notNull().unique(),
  providerName: text("provider_name"), // Vodafone Cash, NBE, etc.
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type P2PTransfer = typeof p2pTransfers.$inferSelect;
export type InsertP2PTransfer = typeof p2pTransfers.$inferInsert;

// Escrow orders (shipping deals with frozen funds - KEY FEATURE)
export const escrowOrders = pgTable("escrow_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").references(() => users.id).notNull(), // buyer
  sellerId: varchar("seller_id").references(() => users.id).notNull(),
  deliveryPersonId: varchar("delivery_person_id").references(() => users.id),
  orderNumber: text("order_number").notNull().unique(),
  productDescription: text("product_description").notNull(),
  productValue: decimal("product_value", { precision: 12, scale: 2 }).notNull(),
  deliveryFeeRate: decimal("delivery_fee_rate", { precision: 5, scale: 4 }).default("0.02"),
  deliveryFeeAmount: decimal("delivery_fee_amount", { precision: 12, scale: 2 }).default("0"),
  platformFeeRate: decimal("platform_fee_rate", { precision: 5, scale: 4 }).default("0.005"),
  platformFeeAmount: decimal("platform_fee_amount", { precision: 12, scale: 2 }).default("0"),
  frozenAmount: decimal("frozen_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, accepted, picked_up, in_transit, delivered, confirmed, released, rejected, refunded, cancelled, disputed, expired
  terms: jsonb("terms"), // { deliveryDeadlineHours, inspectionPeriodHours, returnAllowed, etc. }
  pickupAddress: text("pickup_address"),
  deliveryAddress: text("delivery_address"),
  confirmationCode: text("confirmation_code"),
  creatorName: text("creator_name"),
  sellerName: text("seller_name"),
  deliveryPersonName: text("delivery_person_name"),
  deadlineHours: integer("deadline_hours").default(72),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  completedAt: timestamp("completed_at"),
});

export type EscrowOrder = typeof escrowOrders.$inferSelect;
export type InsertEscrowOrder = typeof escrowOrders.$inferInsert;

// Escrow delivery tracking events
export const escrowTracking = pgTable("escrow_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  escrowOrderId: varchar("escrow_order_id").references(() => escrowOrders.id).notNull(),
  status: text("status").notNull(), // created, accepted, picked_up, in_transit, arrived, confirmed, rejected
  location: jsonb("location"), // { lat, lng }
  notes: text("notes"),
  photos: jsonb("photos"), // array of URLs
  createdBy: varchar("created_by").references(() => users.id),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EscrowTracking = typeof escrowTracking.$inferSelect;
export type InsertEscrowTracking = typeof escrowTracking.$inferInsert;

// User beneficiaries (saved transfer recipients)
export const userBeneficiaries = pgTable("user_beneficiaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  identifier: text("identifier").notNull(), // phone, bank account, wallet number
  type: text("type").notNull(), // phone, bank, wallet
  bankName: text("bank_name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserBeneficiary = typeof userBeneficiaries.$inferSelect;
export type InsertUserBeneficiary = typeof userBeneficiaries.$inferInsert;

// Payment providers (mock PSP config for demo)
export const paymentProviders = pgTable("payment_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  type: text("type").notNull(), // wallet, bank, cash, instapay
  icon: text("icon"),
  color: text("color"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  mockFeeRate: decimal("mock_fee_rate", { precision: 5, scale: 4 }).default("0"),
  mockFixedFee: decimal("mock_fixed_fee", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type PaymentProvider = typeof paymentProviders.$inferSelect;
export type InsertPaymentProvider = typeof paymentProviders.$inferInsert;

// User notifications
export const userNotifications = pgTable("user_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: varchar("related_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UserNotification = typeof userNotifications.$inferSelect;
export type InsertUserNotification = typeof userNotifications.$inferInsert;

// ================================================================
// FLEXIBLE CONTRACTS SYSTEM
// ================================================================

// Flexible contracts (replaces limited escrow_orders)
export const flexibleContracts = pgTable("flexible_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractNumber: text("contract_number").notNull().unique(),
  type: text("type").notNull(), // purchase, service, rental, custom, split_cost
  status: text("status").default("pending"), // draft, pending, accepted, in_progress, milestone_review, completed, disputed, cancelled, expired, refunded
  creatorId: varchar("creator_id").references(() => users.id).notNull(),
  counterpartyId: varchar("counterparty_id").references(() => users.id).notNull(),
  deliveryPersonId: varchar("delivery_person_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  platformFeeRate: decimal("platform_fee_rate", { precision: 5, scale: 4 }).default("0.005"),
  platformFeeAmount: decimal("platform_fee_amount", { precision: 12, scale: 2 }).default("0"),
  frozenAmount: decimal("frozen_amount", { precision: 12, scale: 2 }).default("0"),
  deliveryFeeRate: decimal("delivery_fee_rate", { precision: 5, scale: 4 }).default("0"),
  deliveryFeeAmount: decimal("delivery_fee_amount", { precision: 12, scale: 2 }).default("0"),
  terms: jsonb("terms"), // type-specific terms
  milestones: jsonb("milestones"), // array of milestone objects
  currentMilestoneId: varchar("current_milestone_id"),
  pickupAddress: text("pickup_address"),
  deliveryAddress: text("delivery_address"),
  confirmationCode: text("confirmation_code"),
  deadlineHours: integer("deadline_hours").default(72),
  inspectionPeriodHours: integer("inspection_period_hours").default(24),
  creatorName: text("creator_name"),
  counterpartyName: text("counterparty_name"),
  deliveryPersonName: text("delivery_person_name"),
  acceptedAt: timestamp("accepted_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  disputedAt: timestamp("disputed_at"),
  disputeReason: text("dispute_reason"),
  disputeResolution: text("dispute_resolution"),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  // New fields for enhanced rules
  cancellationFee: decimal("cancellation_fee", { precision: 12, scale: 2 }).default("0"),
  cancellationFeeApplied: boolean("cancellation_fee_applied").default(false),
  depositAmount: decimal("deposit_amount", { precision: 12, scale: 2 }).default("0"),
  extensionCount: integer("extension_count").default(0),
  maxExtensions: integer("max_extensions").default(2),
  lateReturnPenalty: decimal("late_return_penalty", { precision: 12, scale: 2 }).default("0"),
  autoExpiredAt: timestamp("auto_expired_at"),
  lastReminderSentAt: timestamp("last_reminder_sent_at"),
  // Marketplace + role fields
  creatorRole: text("creator_role").default("seeker"), // provider (مقدم خدمة) | seeker (طالب خدمة)
  isPublic: boolean("is_public").default(false), // public contract (no specific counterparty)
  requiredFreezeRate: decimal("required_freeze_rate", { precision: 5, scale: 4 }).default("0"), // 0, 0.25, 0.5, 1.0
  requiredFreezeAmount: decimal("required_freeze_amount", { precision: 12, scale: 2 }).default("0"),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).default("0"), // what creator pays acceptor
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type FlexibleContract = typeof flexibleContracts.$inferSelect;
export type InsertFlexibleContract = typeof flexibleContracts.$inferInsert;

// Contract milestones (for service/rental contracts with phases)
export const contractMilestones = pgTable("contract_milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => flexibleContracts.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, in_progress, submitted, approved, rejected, paid
  dueDate: timestamp("due_date"),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  evidence: jsonb("evidence"), // photos, documents
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ContractMilestone = typeof contractMilestones.$inferSelect;
export type InsertContractMilestone = typeof contractMilestones.$inferInsert;

// Contract disputes
export const contractDisputes = pgTable("contract_disputes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => flexibleContracts.id).notNull(),
  raisedBy: varchar("raised_by").references(() => users.id).notNull(),
  raisedAgainst: varchar("raised_against").references(() => users.id).notNull(),
  reason: text("reason").notNull(), // non_delivery, wrong_item, quality_issue, service_incomplete, payment_dispute, other
  description: text("description").notNull(),
  evidence: jsonb("evidence"), // photos, documents
  status: text("status").default("open"), // open, under_review, resolved_buyer, resolved_seller, resolved_refund, escalated
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ContractDispute = typeof contractDisputes.$inferSelect;
export type InsertContractDispute = typeof contractDisputes.$inferInsert;

// Contract tracking events
export const contractTracking = pgTable("contract_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => flexibleContracts.id).notNull(),
  status: text("status").notNull(),
  location: jsonb("location"),
  notes: text("notes"),
  photos: jsonb("photos"),
  createdBy: varchar("created_by"),
  createdByName: text("created_by_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ContractTracking = typeof contractTracking.$inferSelect;
export type InsertContractTracking = typeof contractTracking.$inferInsert;

// Contract reviews/ratings
export const contractReviews = pgTable("contract_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => flexibleContracts.id).notNull(),
  reviewerId: varchar("reviewer_id").references(() => users.id).notNull(),
  reviewedId: varchar("reviewed_id").references(() => users.id).notNull(),
  reviewedRole: text("reviewed_role"), // creator, counterparty, delivery
  rating: decimal("rating", { precision: 2, scale: 1 }).notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ContractReview = typeof contractReviews.$inferSelect;
export type InsertContractReview = typeof contractReviews.$inferInsert;

// Contract templates
export const contractTemplates = pgTable("contract_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  type: text("type").notNull(), // purchase, service, rental, custom, split_cost
  description: text("description"),
  defaultTerms: jsonb("default_terms"),
  defaultFeeRate: decimal("default_fee_rate", { precision: 5, scale: 4 }).default("0.005"),
  icon: text("icon"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ContractTemplate = typeof contractTemplates.$inferSelect;
export type InsertContractTemplate = typeof contractTemplates.$inferInsert;

// ================================================================
// SUPPORT TICKETS SYSTEM
// ================================================================

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: text("ticket_number").notNull().unique(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  category: text("category").notNull(), // transfer, contract, wallet, kyc, account, technical, other
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  priority: text("priority").default("medium"), // low, medium, high, urgent
  status: text("status").default("open"), // open, in_progress, waiting_user, resolved, closed
  relatedId: varchar("related_id"),
  relatedType: text("related_type"), // contract, transfer, wallet
  assignedTo: varchar("assigned_to"),
  firstResponseAt: timestamp("first_response_at"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  satisfactionRating: integer("satisfaction_rating"),
  satisfactionComment: text("satisfaction_comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;

export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").references(() => supportTickets.id).notNull(),
  senderId: varchar("sender_id").notNull(),
  senderRole: text("sender_role").notNull(), // user, admin
  message: text("message").notNull(),
  attachments: jsonb("attachments"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type InsertSupportTicketMessage = typeof supportTicketMessages.$inferInsert;

// ================================================================
// CONTRACT RULES (per-type configurable rules)
// ================================================================

export const contractRules = pgTable("contract_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractType: text("contract_type").notNull().unique(),
  minAmount: decimal("min_amount", { precision: 12, scale: 2 }).default("10"),
  maxAmount: decimal("max_amount", { precision: 12, scale: 2 }).default("100000"),
  platformFeeRate: decimal("platform_fee_rate", { precision: 5, scale: 4 }).default("0.005"),
  cancellationFeeRate: decimal("cancellation_fee_rate", { precision: 5, scale: 4 }).default("0"),
  cancellationFeeFixed: decimal("cancellation_fee_fixed", { precision: 12, scale: 2 }).default("0"),
  autoExpireHours: integer("auto_expire_hours").default(72),
  inspectionPeriodDefault: integer("inspection_period_default").default(24),
  allowPartialRefund: boolean("allow_partial_refund").default(true),
  requireKyc: text("require_kyc").default("none"),
  requirePin: boolean("require_pin").default(true),
  requireConfirmationCode: boolean("require_confirmation_code").default(true),
  allowDeliveryPerson: boolean("allow_delivery_person").default(false),
  maxMilestones: integer("max_milestones").default(10),
  allowExtension: boolean("allow_extension").default(false),
  maxExtensions: integer("max_extensions").default(2),
  extensionFeeRate: decimal("extension_fee_rate", { precision: 5, scale: 4 }).default("0.01"),
  lateReturnPenaltyRate: decimal("late_return_penalty_rate", { precision: 5, scale: 4 }).default("0.05"),
  depositRequired: boolean("deposit_required").default(false),
  depositRate: decimal("deposit_rate", { precision: 5, scale: 4 }).default("0.1"),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ContractRule = typeof contractRules.$inferSelect;
export type InsertContractRule = typeof contractRules.$inferInsert;

// ================================================================
// CONTRACT PARTICIPANTS (for split_cost multi-party)
// ================================================================

export const contractParticipants = pgTable("contract_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => flexibleContracts.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  userName: text("user_name"),
  shareAmount: decimal("share_amount", { precision: 12, scale: 2 }).notNull(),
  sharePercentage: decimal("share_percentage", { precision: 5, scale: 2 }),
  status: text("status").default("invited"),
  paidAt: timestamp("paid_at"),
  declinedAt: timestamp("declined_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ContractParticipant = typeof contractParticipants.$inferSelect;
export type InsertContractParticipant = typeof contractParticipants.$inferInsert;

// ================================================================
// CONTRACT SUGGESTIONS (user-generated + system suggestions)
// ================================================================

export const contractSuggestions = pgTable("contract_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  field: text("field").notNull(), // title, description, pickupAddress, deliveryAddress
  value: text("value").notNull(),
  contractType: text("contract_type"), // purchase, service, rental, delivery, custom, split_cost, or "all"
  usageCount: integer("usage_count").default(1),
  isSystem: boolean("is_system").default(false), // system-provided vs user-created
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by"), // userId of first person who typed this
  createdAt: timestamp("created_at").defaultNow(),
});

export type ContractSuggestion = typeof contractSuggestions.$inferSelect;
export type InsertContractSuggestion = typeof contractSuggestions.$inferInsert;
