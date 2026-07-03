import { eq, and, desc, sql as dsql, or } from "drizzle-orm";
import { db } from "./db";
import { getTenantDb } from "./tenantDb";
import {
  paymentMethods,
  orders,
  appSettings,
  adminUsers,
  deliveryDrivers,
  driverNotifications,
  orderDriverAssignments,
  driverWalletTransactions,
  driverWithdrawalRequests,
  driverDepositRequests,
  adminNotifications,
  driverRatings,
  driverReferrals,
  apiKeys,
  webhooks,
  apiLogs,
  webhookLogs,
  operationLogs,
  type InsertPaymentMethod,
  type PaymentMethod,
  type InsertOrder,
  type Order,
  type InsertAppSettings,
  type AppSettings,
  type InsertAdminUser,
  type AdminUser,
  type InsertDeliveryDriver,
  type DeliveryDriver,
  type DriverNotification,
  type InsertDriverNotification,
  type OrderDriverAssignment,
  type InsertOrderDriverAssignment,
  type DriverWalletTransaction,
  type InsertDriverWalletTransaction,
  type DriverWithdrawalRequest,
  type InsertDriverWithdrawalRequest,
  type DriverDepositRequest,
  type InsertDriverDepositRequest,
  type AdminNotification,
  type InsertAdminNotification,
  type DriverRating,
  type InsertDriverRating,
  type DriverReferral,
  type InsertDriverReferral,
  type ApiKey,
  type InsertApiKey,
  type Webhook,
  type InsertWebhook,
  type ApiLog,
  type InsertApiLog,
  type WebhookLog,
  type InsertWebhookLog,
  type OperationLog,
  type InsertOperationLog,
  proAdmins,
  type ProAdmin,
  type InsertProAdmin,
  users,
  type User,
  type InsertUser,
  userWalletTransactions,
  type UserWalletTransaction,
  type InsertUserWalletTransaction,
  p2pTransfers,
  type P2PTransfer,
  type InsertP2PTransfer,
  escrowOrders,
  type EscrowOrder,
  type InsertEscrowOrder,
  escrowTracking,
  type EscrowTracking,
  type InsertEscrowTracking,
  userBeneficiaries,
  type UserBeneficiary,
  type InsertUserBeneficiary,
  paymentProviders,
  type PaymentProvider,
  type InsertPaymentProvider,
  userNotifications,
  type UserNotification,
  type InsertUserNotification,
  flexibleContracts,
  type FlexibleContract,
  type InsertFlexibleContract,
  contractMilestones,
  type ContractMilestone,
  type InsertContractMilestone,
  contractDisputes,
  type ContractDispute,
  type InsertContractDispute,
  contractTracking,
  type ContractTracking,
  type InsertContractTracking,
  contractReviews,
  type ContractReview,
  type InsertContractReview,
  contractTemplates,
  type ContractTemplate,
  type InsertContractTemplate,
  supportTickets,
  type SupportTicket,
  type InsertSupportTicket,
  supportTicketMessages,
  type SupportTicketMessage,
  type InsertSupportTicketMessage,
  contractRules,
  type ContractRule,
  type InsertContractRule,
  contractParticipants,
  type ContractParticipant,
  type InsertContractParticipant,
  contractSuggestions,
  type ContractSuggestion,
  type InsertContractSuggestion,
} from "@shared/schema";

export interface IStorage {
  // Payment Methods
  getPaymentMethods(): Promise<PaymentMethod[]>;
  getPaymentMethod(id: string): Promise<PaymentMethod | undefined>;
  createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<boolean>;

  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByNumber(orderNumber: string): Promise<Order | undefined>;
  getOrderByTrackingCode(trackingCode: string): Promise<Order | undefined>;
  getOrdersByDriver(driverId: string): Promise<Order[]>;
  createOrder(data: InsertOrder): Promise<Order>;
  updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined>;

  // App Settings
  getSettings(): Promise<AppSettings | undefined>;
  updateSettings(data: Partial<InsertAppSettings>): Promise<AppSettings>;

  // Admin Users
  getAdminByUsername(username: string): Promise<AdminUser | undefined>;
  createAdmin(data: InsertAdminUser): Promise<AdminUser>;
  updateAdminPassword(id: string, password: string): Promise<AdminUser | undefined>;

  // Delivery Drivers
  getDrivers(): Promise<DeliveryDriver[]>;
  getDriver(id: string): Promise<DeliveryDriver | undefined>;
  getDriverByUsername(username: string): Promise<DeliveryDriver | undefined>;
  getDriverByPhone(phone: string): Promise<DeliveryDriver | undefined>;
  createDriver(data: InsertDeliveryDriver): Promise<DeliveryDriver>;
  updateDriver(id: string, data: Partial<InsertDeliveryDriver>): Promise<DeliveryDriver | undefined>;
  deleteDriver(id: string): Promise<boolean>;

  // Driver Notifications
  getDriverNotifications(driverId: string, limit?: number, offset?: number): Promise<DriverNotification[]>;
  getDriverNotificationCount(driverId: string): Promise<number>;
  getDriverUnreadCount(driverId: string): Promise<number>;
  createDriverNotification(data: InsertDriverNotification): Promise<DriverNotification>;
  updateDriverNotification(id: string, data: Partial<DriverNotification>): Promise<DriverNotification | undefined>;
  markDriverNotificationsRead(driverId: string): Promise<void>;
  deleteDriverNotification(id: string): Promise<boolean>;
  clearDriverNotifications(driverId: string): Promise<void>;
  sendBulkDriverNotification(driverIds: string[], data: { type: string; title: string; message: string }): Promise<void>;

  // Admin Notifications
  getAdminNotifications(limit?: number, offset?: number): Promise<AdminNotification[]>;
  getAdminUnreadCount(): Promise<number>;
  createAdminNotification(data: InsertAdminNotification): Promise<AdminNotification>;
  markAdminNotificationsRead(): Promise<void>;
  deleteAdminNotification(id: string): Promise<boolean>;
  clearAdminNotifications(): Promise<void>;

  // Global Search
  globalSearch(query: string): Promise<{
    orders: any[];
    drivers: any[];
    notifications: any[];
  }>;
  driverSearch(driverId: string, query: string): Promise<{
    orders: any[];
    notifications: any[];
    transactions: any[];
  }>;

  // Order Driver Assignments
  getOrderAssignments(orderId: string): Promise<OrderDriverAssignment[]>;
  getDriverAssignments(driverId: string): Promise<OrderDriverAssignment[]>;
  getAssignment(id: string): Promise<OrderDriverAssignment | undefined>;
  getAssignmentByOrderAndDriver(orderId: string, driverId: string): Promise<OrderDriverAssignment | undefined>;
  createAssignment(data: InsertOrderDriverAssignment): Promise<OrderDriverAssignment>;
  updateAssignment(id: string, data: Partial<OrderDriverAssignment>): Promise<OrderDriverAssignment | undefined>;
  cancelOtherAssignments(orderId: string, acceptedDriverId: string): Promise<void>;

  // Driver Wallet
  getDriverTransactions(driverId: string): Promise<DriverWalletTransaction[]>;
  createWalletTransaction(data: InsertDriverWalletTransaction): Promise<DriverWalletTransaction>;
  getWithdrawalRequests(driverId?: string): Promise<DriverWithdrawalRequest[]>;
  getWithdrawalRequest(id: string): Promise<DriverWithdrawalRequest | undefined>;
  createWithdrawalRequest(data: InsertDriverWithdrawalRequest): Promise<DriverWithdrawalRequest>;
  updateWithdrawalRequest(id: string, data: Partial<DriverWithdrawalRequest>): Promise<DriverWithdrawalRequest | undefined>;

  // Driver Deposit Requests
  getDepositRequests(driverId?: string): Promise<DriverDepositRequest[]>;
  getDepositRequest(id: string): Promise<DriverDepositRequest | undefined>;
  createDepositRequest(data: InsertDriverDepositRequest): Promise<DriverDepositRequest>;
  updateDepositRequest(id: string, data: Partial<DriverDepositRequest>): Promise<DriverDepositRequest | undefined>;

  // Driver Ratings
  getDriverRatings(driverId: string): Promise<DriverRating[]>;
  getAllRatings(): Promise<DriverRating[]>;
  createDriverRating(data: InsertDriverRating): Promise<DriverRating>;
  deleteDriverRating(id: string): Promise<boolean>;

  // Driver Referrals
  getDriverReferrals(referrerId?: string): Promise<DriverReferral[]>;
  getReferral(id: string): Promise<DriverReferral | undefined>;
  createDriverReferral(data: InsertDriverReferral): Promise<DriverReferral>;
  updateDriverReferral(id: string, data: Partial<DriverReferral>): Promise<DriverReferral | undefined>;
  getDriverByReferralCode(code: string): Promise<DeliveryDriver | undefined>;

  // API Keys
  getApiKeys(): Promise<ApiKey[]>;
  getApiKey(id: string): Promise<ApiKey | undefined>;
  getApiKeyByKey(apiKey: string): Promise<ApiKey | undefined>;
  createApiKey(data: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: string, data: Partial<InsertApiKey>): Promise<ApiKey | undefined>;
  deleteApiKey(id: string): Promise<boolean>;
  incrementApiKeyUsage(id: string): Promise<void>;

  // Webhooks
  getWebhooks(): Promise<Webhook[]>;
  getWebhook(id: string): Promise<Webhook | undefined>;
  getActiveWebhooksByEvent(event: string): Promise<Webhook[]>;
  createWebhook(data: InsertWebhook): Promise<Webhook>;
  updateWebhook(id: string, data: Partial<InsertWebhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: string): Promise<boolean>;
  incrementWebhookFail(id: string): Promise<void>;
  resetWebhookFail(id: string): Promise<void>;

  // API Logs
  getApiLogs(limit?: number): Promise<ApiLog[]>;
  createApiLog(data: InsertApiLog): Promise<ApiLog>;
  getApiLogStats(): Promise<{ total: number; today: number; errors: number }>;
  clearApiLogs(): Promise<void>;

  // Webhook Logs
  getWebhookLogs(webhookId?: string, limit?: number): Promise<WebhookLog[]>;
  createWebhookLog(data: InsertWebhookLog): Promise<WebhookLog>;

  // Operation Logs
  createOperationLog(data: InsertOperationLog): Promise<OperationLog>;
  getOperationLogs(params?: {
    search?: string;
    type?: string;
    driverId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: OperationLog[]; total: number }>;
  getDriverOperationLogs(driverId: string, params?: {
    search?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: OperationLog[]; total: number }>;
  getOperationStats(): Promise<{
    totalOperations: number;
    todayOperations: number;
    totalAmount: string;
    todayAmount: string;
  }>;

  // Pro Admins
  getProAdmins(): Promise<ProAdmin[]>;
  getProAdmin(id: string): Promise<ProAdmin | undefined>;
  getProAdminByUsername(username: string): Promise<ProAdmin | undefined>;
  createProAdmin(data: { username: string; password: string; name: string; dbName: string }): Promise<ProAdmin>;
  updateProAdmin(id: string, data: Partial<{ username: string; password: string; name: string; isActive: boolean; autoDisableAt: Date | null; autoEnableAt: Date | null }>): Promise<ProAdmin | undefined>;
  deleteProAdmin(id: string): Promise<boolean>;

  // ===== User Payment Platform =====

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // User Wallet Transactions
  getUserTransactions(userId: string, limit?: number, offset?: number): Promise<UserWalletTransaction[]>;
  createUserTransaction(data: InsertUserWalletTransaction): Promise<UserWalletTransaction>;

  // P2P Transfers
  getP2PTransfer(id: string): Promise<P2PTransfer | undefined>;
  getTransfersByUser(userId: string, limit?: number): Promise<P2PTransfer[]>;
  createP2PTransfer(data: InsertP2PTransfer): Promise<P2PTransfer>;
  updateP2PTransfer(id: string, data: Partial<InsertP2PTransfer>): Promise<P2PTransfer | undefined>;
  getTransferByReference(reference: string): Promise<P2PTransfer | undefined>;

  // Escrow Orders
  getEscrowOrder(id: string): Promise<EscrowOrder | undefined>;
  getEscrowOrderByNumber(orderNumber: string): Promise<EscrowOrder | undefined>;
  getEscrowOrdersByCreator(userId: string): Promise<EscrowOrder[]>;
  getEscrowOrdersBySeller(userId: string): Promise<EscrowOrder[]>;
  getEscrowOrdersByDeliveryPerson(userId: string): Promise<EscrowOrder[]>;
  getAvailableEscrowOrders(): Promise<EscrowOrder[]>;
  getAllEscrowOrders(): Promise<EscrowOrder[]>;
  createEscrowOrder(data: InsertEscrowOrder): Promise<EscrowOrder>;
  updateEscrowOrder(id: string, data: Partial<InsertEscrowOrder>): Promise<EscrowOrder | undefined>;

  // Escrow Tracking
  getEscrowTracking(escrowOrderId: string): Promise<EscrowTracking[]>;
  createEscrowTracking(data: InsertEscrowTracking): Promise<EscrowTracking>;

  // User Beneficiaries
  getBeneficiaries(userId: string): Promise<UserBeneficiary[]>;
  createBeneficiary(data: InsertUserBeneficiary): Promise<UserBeneficiary>;
  deleteBeneficiary(id: string): Promise<boolean>;

  // Payment Providers
  getPaymentProviders(): Promise<PaymentProvider[]>;
  createPaymentProvider(data: InsertPaymentProvider): Promise<PaymentProvider>;

  // User Notifications
  getUserNotifications(userId: string, limit?: number): Promise<UserNotification[]>;
  getUserUnreadCount(userId: string): Promise<number>;
  createUserNotification(data: InsertUserNotification): Promise<UserNotification>;
  markUserNotificationsRead(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private db: typeof db;

  constructor(dbInstance?: typeof db) {
    this.db = dbInstance || db;
  }

  // Payment Methods
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    return this.db.select().from(paymentMethods).orderBy(paymentMethods.sortOrder);
  }

  async getPaymentMethod(id: string): Promise<PaymentMethod | undefined> {
    const [method] = await this.db.select().from(paymentMethods).where(eq(paymentMethods.id, id));
    return method;
  }

  async createPaymentMethod(data: InsertPaymentMethod): Promise<PaymentMethod> {
    const [method] = await this.db.insert(paymentMethods).values(data).returning();
    return method;
  }

  async updatePaymentMethod(id: string, data: Partial<InsertPaymentMethod>): Promise<PaymentMethod | undefined> {
    const [method] = await this.db.update(paymentMethods).set(data).where(eq(paymentMethods.id, id)).returning();
    return method;
  }

  async deletePaymentMethod(id: string): Promise<boolean> {
    const result = await this.db.delete(paymentMethods).where(eq(paymentMethods.id, id)).returning();
    return result.length > 0;
  }

  // Orders
  async getOrders(): Promise<Order[]> {
    return this.db.select().from(orders).orderBy(orders.createdAt);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await this.db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order | undefined> {
    const [order] = await this.db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
    return order;
  }

  async getOrderByTrackingCode(trackingCode: string): Promise<Order | undefined> {
    const [order] = await this.db.select().from(orders).where(eq(orders.trackingCode, trackingCode));
    return order;
  }

  async getOrdersByDriver(driverId: string): Promise<Order[]> {
    return this.db.select().from(orders).where(eq(orders.driverId, driverId)).orderBy(orders.createdAt);
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    const [order] = await this.db.insert(orders).values(data).returning();
    return order;
  }

  async updateOrder(id: string, data: Partial<InsertOrder>): Promise<Order | undefined> {
    const [order] = await this.db.update(orders).set(data).where(eq(orders.id, id)).returning();
    return order;
  }

  // App Settings
  async getSettings(): Promise<AppSettings | undefined> {
    const [settings] = await this.db.select().from(appSettings).limit(1);
    return settings;
  }

  async updateSettings(data: Partial<InsertAppSettings>): Promise<AppSettings> {
    const existing = await this.getSettings();
    if (existing) {
      const [settings] = await this.db
        .update(appSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(appSettings.id, existing.id))
        .returning();
      return settings;
    } else {
      const [settings] = await this.db.insert(appSettings).values(data).returning();
      return settings;
    }
  }

  // Admin Users
  async getAdminByUsername(username: string): Promise<AdminUser | undefined> {
    const [admin] = await this.db.select().from(adminUsers).where(eq(adminUsers.username, username));
    return admin;
  }

  async createAdmin(data: InsertAdminUser): Promise<AdminUser> {
    const [admin] = await this.db.insert(adminUsers).values(data).returning();
    return admin;
  }

  async updateAdminPassword(id: string, password: string): Promise<AdminUser | undefined> {
    const [admin] = await this.db.update(adminUsers).set({ password }).where(eq(adminUsers.id, id)).returning();
    return admin;
  }

  // Delivery Drivers
  async getDrivers(): Promise<DeliveryDriver[]> {
    return this.db.select().from(deliveryDrivers).orderBy(deliveryDrivers.createdAt);
  }

  async getDriver(id: string): Promise<DeliveryDriver | undefined> {
    const [driver] = await this.db.select().from(deliveryDrivers).where(eq(deliveryDrivers.id, id));
    return driver;
  }

  async getDriverByUsername(username: string): Promise<DeliveryDriver | undefined> {
    const [driver] = await this.db.select().from(deliveryDrivers).where(eq(deliveryDrivers.username, username));
    return driver;
  }

  async getDriverByPhone(phone: string): Promise<DeliveryDriver | undefined> {
    const [driver] = await this.db.select().from(deliveryDrivers).where(eq(deliveryDrivers.whatsappPhone, phone));
    return driver;
  }

  async createDriver(data: InsertDeliveryDriver): Promise<DeliveryDriver> {
    const [driver] = await this.db.insert(deliveryDrivers).values(data).returning();
    return driver;
  }

  async updateDriver(id: string, data: Partial<InsertDeliveryDriver>): Promise<DeliveryDriver | undefined> {
    const [driver] = await this.db.update(deliveryDrivers).set(data).where(eq(deliveryDrivers.id, id)).returning();
    return driver;
  }

  async deleteDriver(id: string): Promise<boolean> {
    const result = await this.db.delete(deliveryDrivers).where(eq(deliveryDrivers.id, id)).returning();
    return result.length > 0;
  }

  // Driver Notifications
  async getDriverNotifications(driverId: string, limit: number = 50, offset: number = 0): Promise<DriverNotification[]> {
    return this.db.select().from(driverNotifications)
      .where(eq(driverNotifications.driverId, driverId))
      .orderBy(desc(driverNotifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getDriverNotificationCount(driverId: string): Promise<number> {
    const result = await this.db.select({ count: dsql<number>`count(*)::int` })
      .from(driverNotifications)
      .where(eq(driverNotifications.driverId, driverId));
    return result[0]?.count || 0;
  }

  async getDriverUnreadCount(driverId: string): Promise<number> {
    const result = await this.db.select({ count: dsql<number>`count(*)::int` })
      .from(driverNotifications)
      .where(and(eq(driverNotifications.driverId, driverId), eq(driverNotifications.isRead, false)));
    return result[0]?.count || 0;
  }

  async createDriverNotification(data: InsertDriverNotification): Promise<DriverNotification> {
    const [notif] = await this.db.insert(driverNotifications).values(data).returning();
    return notif;
  }

  async updateDriverNotification(id: string, data: Partial<DriverNotification>): Promise<DriverNotification | undefined> {
    const [notif] = await this.db.update(driverNotifications).set(data).where(eq(driverNotifications.id, id)).returning();
    return notif;
  }

  async markDriverNotificationsRead(driverId: string): Promise<void> {
    await this.db.update(driverNotifications).set({ isRead: true }).where(
      and(eq(driverNotifications.driverId, driverId), eq(driverNotifications.isRead, false))
    );
  }

  async deleteDriverNotification(id: string): Promise<boolean> {
    const result = await this.db.delete(driverNotifications).where(eq(driverNotifications.id, id)).returning();
    return result.length > 0;
  }

  async clearDriverNotifications(driverId: string): Promise<void> {
    await this.db.delete(driverNotifications).where(eq(driverNotifications.driverId, driverId));
  }

  async sendBulkDriverNotification(driverIds: string[], data: { type: string; title: string; message: string }): Promise<void> {
    if (driverIds.length === 0) return;
    const values = driverIds.map(driverId => ({
      driverId,
      type: data.type,
      title: data.title,
      message: data.message,
    }));
    await this.db.insert(driverNotifications).values(values);
  }

  // Admin Notifications
  async getAdminNotifications(limit: number = 50, offset: number = 0): Promise<AdminNotification[]> {
    return this.db.select().from(adminNotifications)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getAdminUnreadCount(): Promise<number> {
    const result = await this.db.select({ count: dsql<number>`count(*)::int` })
      .from(adminNotifications)
      .where(eq(adminNotifications.isRead, false));
    return result[0]?.count || 0;
  }

  async createAdminNotification(data: InsertAdminNotification): Promise<AdminNotification> {
    const [notif] = await this.db.insert(adminNotifications).values(data).returning();
    return notif;
  }

  async markAdminNotificationsRead(): Promise<void> {
    await this.db.update(adminNotifications).set({ isRead: true }).where(eq(adminNotifications.isRead, false));
  }

  async deleteAdminNotification(id: string): Promise<boolean> {
    const result = await this.db.delete(adminNotifications).where(eq(adminNotifications.id, id)).returning();
    return result.length > 0;
  }

  async clearAdminNotifications(): Promise<void> {
    await this.db.delete(adminNotifications);
  }

  // Global Search (Admin)
  async globalSearch(query: string): Promise<{ orders: any[]; drivers: any[]; notifications: any[] }> {
    const searchTerm = `%${query}%`;
    const matchedOrders = await this.db.select().from(orders)
      .where(dsql`(
        ${orders.orderNumber} ILIKE ${searchTerm}
        OR ${orders.customerName} ILIKE ${searchTerm}
        OR ${orders.customerPhone} ILIKE ${searchTerm}
        OR ${orders.customerAddress} ILIKE ${searchTerm}
        OR ${orders.trackingCode} ILIKE ${searchTerm}
        OR ${orders.driverName} ILIKE ${searchTerm}
        OR ${orders.status} ILIKE ${searchTerm}
      )`)
      .orderBy(desc(orders.createdAt))
      .limit(10);
    const matchedDrivers = await this.db.select().from(deliveryDrivers)
      .where(dsql`(
        ${deliveryDrivers.name} ILIKE ${searchTerm}
        OR ${deliveryDrivers.username} ILIKE ${searchTerm}
        OR ${deliveryDrivers.phone} ILIKE ${searchTerm}
        OR ${deliveryDrivers.governorate} ILIKE ${searchTerm}
        OR ${deliveryDrivers.city} ILIKE ${searchTerm}
        OR ${deliveryDrivers.vehicleType} ILIKE ${searchTerm}
      )`)
      .orderBy(desc(deliveryDrivers.createdAt))
      .limit(10);
    const matchedNotifications = await this.db.select().from(adminNotifications)
      .where(dsql`(
        ${adminNotifications.title} ILIKE ${searchTerm}
        OR ${adminNotifications.message} ILIKE ${searchTerm}
      )`)
      .orderBy(desc(adminNotifications.createdAt))
      .limit(10);
    return {
      orders: matchedOrders,
      drivers: matchedDrivers.map(d => ({ ...d, password: undefined })),
      notifications: matchedNotifications,
    };
  }

  // Driver Search
  async driverSearch(driverId: string, query: string): Promise<{ orders: any[]; notifications: any[]; transactions: any[] }> {
    const searchTerm = `%${query}%`;
    const matchedOrders = await this.db.select().from(orders)
      .where(and(
        eq(orders.driverId, driverId),
        dsql`(
          ${orders.orderNumber} ILIKE ${searchTerm}
          OR ${orders.customerName} ILIKE ${searchTerm}
          OR ${orders.customerPhone} ILIKE ${searchTerm}
          OR ${orders.customerAddress} ILIKE ${searchTerm}
          OR ${orders.status} ILIKE ${searchTerm}
        )`
      ))
      .orderBy(desc(orders.createdAt))
      .limit(10);
    const matchedNotifications = await this.db.select().from(driverNotifications)
      .where(and(
        eq(driverNotifications.driverId, driverId),
        dsql`(
          ${driverNotifications.title} ILIKE ${searchTerm}
          OR ${driverNotifications.message} ILIKE ${searchTerm}
        )`
      ))
      .orderBy(desc(driverNotifications.createdAt))
      .limit(10);
    const matchedTransactions = await this.db.select().from(driverWalletTransactions)
      .where(and(
        eq(driverWalletTransactions.driverId, driverId),
        dsql`(
          ${driverWalletTransactions.description} ILIKE ${searchTerm}
          OR ${driverWalletTransactions.type} ILIKE ${searchTerm}
          OR ${driverWalletTransactions.amount}::text ILIKE ${searchTerm}
        )`
      ))
      .orderBy(desc(driverWalletTransactions.createdAt))
      .limit(10);
    return {
      orders: matchedOrders,
      notifications: matchedNotifications,
      transactions: matchedTransactions,
    };
  }

  // Order Driver Assignments
  async getOrderAssignments(orderId: string): Promise<OrderDriverAssignment[]> {
    return this.db.select().from(orderDriverAssignments).where(eq(orderDriverAssignments.orderId, orderId));
  }

  async getDriverAssignments(driverId: string): Promise<OrderDriverAssignment[]> {
    return this.db.select().from(orderDriverAssignments).where(eq(orderDriverAssignments.driverId, driverId));
  }

  async getAssignment(id: string): Promise<OrderDriverAssignment | undefined> {
    const [a] = await this.db.select().from(orderDriverAssignments).where(eq(orderDriverAssignments.id, id));
    return a;
  }

  async getAssignmentByOrderAndDriver(orderId: string, driverId: string): Promise<OrderDriverAssignment | undefined> {
    const [a] = await this.db.select().from(orderDriverAssignments).where(
      and(eq(orderDriverAssignments.orderId, orderId), eq(orderDriverAssignments.driverId, driverId))
    );
    return a;
  }

  async createAssignment(data: InsertOrderDriverAssignment): Promise<OrderDriverAssignment> {
    const [a] = await this.db.insert(orderDriverAssignments).values(data).returning();
    return a;
  }

  async updateAssignment(id: string, data: Partial<OrderDriverAssignment>): Promise<OrderDriverAssignment | undefined> {
    const [a] = await this.db.update(orderDriverAssignments).set(data).where(eq(orderDriverAssignments.id, id)).returning();
    return a;
  }

  async cancelOtherAssignments(orderId: string, acceptedDriverId: string): Promise<void> {
    await this.db.update(orderDriverAssignments).set({ status: "cancelled", respondedAt: new Date() }).where(
      and(
        eq(orderDriverAssignments.orderId, orderId),
        eq(orderDriverAssignments.status, "pending")
      )
    );
  }

  // Driver Wallet
  async getDriverTransactions(driverId: string): Promise<DriverWalletTransaction[]> {
    return this.db.select().from(driverWalletTransactions)
      .where(eq(driverWalletTransactions.driverId, driverId))
      .orderBy(desc(driverWalletTransactions.createdAt));
  }

  async createWalletTransaction(data: InsertDriverWalletTransaction): Promise<DriverWalletTransaction> {
    const [t] = await this.db.insert(driverWalletTransactions).values(data).returning();
    return t;
  }

  async getWithdrawalRequests(driverId?: string): Promise<DriverWithdrawalRequest[]> {
    if (driverId) {
      return this.db.select().from(driverWithdrawalRequests)
        .where(eq(driverWithdrawalRequests.driverId, driverId))
        .orderBy(desc(driverWithdrawalRequests.createdAt));
    }
    return this.db.select().from(driverWithdrawalRequests).orderBy(desc(driverWithdrawalRequests.createdAt));
  }

  async getWithdrawalRequest(id: string): Promise<DriverWithdrawalRequest | undefined> {
    const [r] = await this.db.select().from(driverWithdrawalRequests).where(eq(driverWithdrawalRequests.id, id));
    return r;
  }

  async createWithdrawalRequest(data: InsertDriverWithdrawalRequest): Promise<DriverWithdrawalRequest> {
    const [r] = await this.db.insert(driverWithdrawalRequests).values(data).returning();
    return r;
  }

  async updateWithdrawalRequest(id: string, data: Partial<DriverWithdrawalRequest>): Promise<DriverWithdrawalRequest | undefined> {
    const [r] = await this.db.update(driverWithdrawalRequests).set(data).where(eq(driverWithdrawalRequests.id, id)).returning();
    return r;
  }

  // Driver Deposit Requests
  async getDepositRequests(driverId?: string): Promise<DriverDepositRequest[]> {
    if (driverId) {
      return this.db.select().from(driverDepositRequests)
        .where(eq(driverDepositRequests.driverId, driverId))
        .orderBy(desc(driverDepositRequests.createdAt));
    }
    return this.db.select().from(driverDepositRequests).orderBy(desc(driverDepositRequests.createdAt));
  }

  async getDepositRequest(id: string): Promise<DriverDepositRequest | undefined> {
    const [r] = await this.db.select().from(driverDepositRequests).where(eq(driverDepositRequests.id, id));
    return r;
  }

  async createDepositRequest(data: InsertDriverDepositRequest): Promise<DriverDepositRequest> {
    const [r] = await this.db.insert(driverDepositRequests).values(data).returning();
    return r;
  }

  async updateDepositRequest(id: string, data: Partial<DriverDepositRequest>): Promise<DriverDepositRequest | undefined> {
    const [r] = await this.db.update(driverDepositRequests).set(data).where(eq(driverDepositRequests.id, id)).returning();
    return r;
  }

  // Driver Ratings
  async getDriverRatings(driverId: string): Promise<DriverRating[]> {
    return this.db.select().from(driverRatings)
      .where(eq(driverRatings.driverId, driverId))
      .orderBy(desc(driverRatings.createdAt));
  }

  async getAllRatings(): Promise<DriverRating[]> {
    return this.db.select().from(driverRatings).orderBy(desc(driverRatings.createdAt));
  }

  async createDriverRating(data: InsertDriverRating): Promise<DriverRating> {
    const [r] = await this.db.insert(driverRatings).values(data).returning();
    return r;
  }

  async deleteDriverRating(id: string): Promise<boolean> {
    const result = await this.db.delete(driverRatings).where(eq(driverRatings.id, id)).returning();
    return result.length > 0;
  }

  // Driver Referrals
  async getDriverReferrals(referrerId?: string): Promise<DriverReferral[]> {
    if (referrerId) {
      return this.db.select().from(driverReferrals)
        .where(eq(driverReferrals.referrerId, referrerId))
        .orderBy(desc(driverReferrals.createdAt));
    }
    return this.db.select().from(driverReferrals).orderBy(desc(driverReferrals.createdAt));
  }

  async getReferral(id: string): Promise<DriverReferral | undefined> {
    const [r] = await this.db.select().from(driverReferrals).where(eq(driverReferrals.id, id));
    return r;
  }

  async createDriverReferral(data: InsertDriverReferral): Promise<DriverReferral> {
    const [r] = await this.db.insert(driverReferrals).values(data).returning();
    return r;
  }

  async updateDriverReferral(id: string, data: Partial<DriverReferral>): Promise<DriverReferral | undefined> {
    const [r] = await this.db.update(driverReferrals).set(data).where(eq(driverReferrals.id, id)).returning();
    return r;
  }

  async getDriverByReferralCode(code: string): Promise<DeliveryDriver | undefined> {
    const [driver] = await this.db.select().from(deliveryDrivers).where(eq(deliveryDrivers.referralCode, code));
    return driver;
  }

  // API Keys
  async getApiKeys(): Promise<ApiKey[]> {
    return this.db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKey(id: string): Promise<ApiKey | undefined> {
    const [key] = await this.db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return key;
  }

  async getApiKeyByKey(apiKey: string): Promise<ApiKey | undefined> {
    const [key] = await this.db.select().from(apiKeys).where(eq(apiKeys.apiKey, apiKey));
    return key;
  }

  async createApiKey(data: InsertApiKey): Promise<ApiKey> {
    const [key] = await this.db.insert(apiKeys).values(data).returning();
    return key;
  }

  async updateApiKey(id: string, data: Partial<InsertApiKey>): Promise<ApiKey | undefined> {
    const [key] = await this.db.update(apiKeys).set(data).where(eq(apiKeys.id, id)).returning();
    return key;
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = await this.db.delete(apiKeys).where(eq(apiKeys.id, id)).returning();
    return result.length > 0;
  }

  async incrementApiKeyUsage(id: string): Promise<void> {
    await this.db.update(apiKeys).set({
      totalRequests: dsql`${apiKeys.totalRequests} + 1`,
      lastUsedAt: new Date(),
    } as any).where(eq(apiKeys.id, id));
  }

  // Webhooks
  async getWebhooks(): Promise<Webhook[]> {
    return this.db.select().from(webhooks).orderBy(desc(webhooks.createdAt));
  }

  async getWebhook(id: string): Promise<Webhook | undefined> {
    const [wh] = await this.db.select().from(webhooks).where(eq(webhooks.id, id));
    return wh;
  }

  async getActiveWebhooksByEvent(event: string): Promise<Webhook[]> {
    const allActive = await this.db.select().from(webhooks).where(eq(webhooks.isActive, true));
    return allActive.filter(wh => {
      const events = wh.events as string[] | null;
      return events && events.includes(event);
    });
  }

  async createWebhook(data: InsertWebhook): Promise<Webhook> {
    const [wh] = await this.db.insert(webhooks).values(data).returning();
    return wh;
  }

  async updateWebhook(id: string, data: Partial<InsertWebhook>): Promise<Webhook | undefined> {
    const [wh] = await this.db.update(webhooks).set(data).where(eq(webhooks.id, id)).returning();
    return wh;
  }

  async deleteWebhook(id: string): Promise<boolean> {
    await this.db.delete(webhookLogs).where(eq(webhookLogs.webhookId, id));
    const result = await this.db.delete(webhooks).where(eq(webhooks.id, id)).returning();
    return result.length > 0;
  }

  async incrementWebhookFail(id: string): Promise<void> {
    await this.db.update(webhooks).set({
      failCount: dsql`${webhooks.failCount} + 1`,
    } as any).where(eq(webhooks.id, id));
  }

  async resetWebhookFail(id: string): Promise<void> {
    await this.db.update(webhooks).set({ failCount: 0, lastError: null }).where(eq(webhooks.id, id));
  }

  // API Logs
  async getApiLogs(limit = 200): Promise<ApiLog[]> {
    return this.db.select().from(apiLogs).orderBy(desc(apiLogs.createdAt)).limit(limit);
  }

  async createApiLog(data: InsertApiLog): Promise<ApiLog> {
    const [log] = await this.db.insert(apiLogs).values(data).returning();
    return log;
  }

  async getApiLogStats(): Promise<{ total: number; today: number; errors: number }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const [totalResult] = await this.db.select({ count: dsql<number>`count(*)::int` }).from(apiLogs);
    const [todayResult] = await this.db.select({ count: dsql<number>`count(*)::int` }).from(apiLogs)
      .where(dsql`${apiLogs.createdAt} >= ${todayStart}`);
    const [errorsResult] = await this.db.select({ count: dsql<number>`count(*)::int` }).from(apiLogs)
      .where(dsql`${apiLogs.statusCode} >= 400`);
    
    return {
      total: totalResult?.count || 0,
      today: todayResult?.count || 0,
      errors: errorsResult?.count || 0,
    };
  }

  async clearApiLogs(): Promise<void> {
    await this.db.delete(apiLogs);
  }

  // Webhook Logs
  async getWebhookLogs(webhookId?: string, limit = 100): Promise<WebhookLog[]> {
    if (webhookId) {
      return this.db.select().from(webhookLogs)
        .where(eq(webhookLogs.webhookId, webhookId))
        .orderBy(desc(webhookLogs.createdAt)).limit(limit);
    }
    return this.db.select().from(webhookLogs).orderBy(desc(webhookLogs.createdAt)).limit(limit);
  }

  async createWebhookLog(data: InsertWebhookLog): Promise<WebhookLog> {
    const [log] = await this.db.insert(webhookLogs).values(data).returning();
    return log;
  }

  // Operation Logs
  async createOperationLog(data: InsertOperationLog): Promise<OperationLog> {
    const [log] = await this.db.insert(operationLogs).values(data).returning();
    return log;
  }

  async getOperationLogs(params?: {
    search?: string;
    type?: string;
    driverId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: OperationLog[]; total: number }> {
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;
    const conditions: any[] = [];

    if (params?.type && params.type !== "all") {
      conditions.push(eq(operationLogs.type, params.type));
    }
    if (params?.driverId && params.driverId !== "all") {
      conditions.push(eq(operationLogs.driverId, params.driverId));
    }
    if (params?.status && params.status !== "all") {
      conditions.push(eq(operationLogs.status, params.status));
    }
    if (params?.dateFrom) {
      conditions.push(dsql`${operationLogs.createdAt} >= ${new Date(params.dateFrom)}`);
    }
    if (params?.dateTo) {
      const endDate = new Date(params.dateTo);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(dsql`${operationLogs.createdAt} <= ${endDate}`);
    }
    if (params?.search) {
      const s = `%${params.search}%`;
      conditions.push(
        dsql`(${operationLogs.orderNumber} ILIKE ${s} OR ${operationLogs.customerName} ILIKE ${s} OR ${operationLogs.customerPhone} ILIKE ${s} OR ${operationLogs.driverName} ILIKE ${s} OR ${operationLogs.description} ILIKE ${s})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await this.db.select({ count: dsql<number>`count(*)::int` })
      .from(operationLogs)
      .where(whereClause);

    const logs = await this.db.select().from(operationLogs)
      .where(whereClause)
      .orderBy(desc(operationLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return { logs, total: countResult?.count || 0 };
  }

  async getDriverOperationLogs(driverId: string, params?: {
    search?: string;
    type?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: OperationLog[]; total: number }> {
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;
    const conditions: any[] = [eq(operationLogs.driverId, driverId)];

    if (params?.type && params.type !== "all") {
      conditions.push(eq(operationLogs.type, params.type));
    }
    if (params?.dateFrom) {
      conditions.push(dsql`${operationLogs.createdAt} >= ${new Date(params.dateFrom)}`);
    }
    if (params?.dateTo) {
      const endDate = new Date(params.dateTo);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(dsql`${operationLogs.createdAt} <= ${endDate}`);
    }
    if (params?.search) {
      const s = `%${params.search}%`;
      conditions.push(
        dsql`(${operationLogs.orderNumber} ILIKE ${s} OR ${operationLogs.customerName} ILIKE ${s} OR ${operationLogs.description} ILIKE ${s})`
      );
    }

    const whereClause = and(...conditions);

    const [countResult] = await this.db.select({ count: dsql<number>`count(*)::int` })
      .from(operationLogs)
      .where(whereClause);

    const logs = await this.db.select().from(operationLogs)
      .where(whereClause)
      .orderBy(desc(operationLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return { logs, total: countResult?.count || 0 };
  }

  async getOperationStats(): Promise<{
    totalOperations: number;
    todayOperations: number;
    totalAmount: string;
    todayAmount: string;
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalResult] = await this.db.select({
      count: dsql<number>`count(*)::int`,
      amount: dsql<string>`COALESCE(SUM(ABS(${operationLogs.amount}::numeric)), 0)::text`,
    }).from(operationLogs);

    const [todayResult] = await this.db.select({
      count: dsql<number>`count(*)::int`,
      amount: dsql<string>`COALESCE(SUM(ABS(${operationLogs.amount}::numeric)), 0)::text`,
    }).from(operationLogs)
      .where(dsql`${operationLogs.createdAt} >= ${todayStart}`);

    return {
      totalOperations: totalResult?.count || 0,
      todayOperations: todayResult?.count || 0,
      totalAmount: totalResult?.amount || "0",
      todayAmount: todayResult?.amount || "0",
    };
  }
  // Pro Admins
  async getProAdmins(): Promise<ProAdmin[]> {
    return this.db.select().from(proAdmins).orderBy(desc(proAdmins.createdAt));
  }

  async getProAdmin(id: string): Promise<ProAdmin | undefined> {
    const [admin] = await this.db.select().from(proAdmins).where(eq(proAdmins.id, id));
    return admin;
  }

  async getProAdminByUsername(username: string): Promise<ProAdmin | undefined> {
    const [admin] = await this.db.select().from(proAdmins).where(eq(proAdmins.username, username));
    return admin;
  }

  async createProAdmin(data: { username: string; password: string; name: string; dbName: string }): Promise<ProAdmin> {
    const [admin] = await this.db.insert(proAdmins).values(data).returning();
    return admin;
  }

  async updateProAdmin(id: string, data: Partial<{ username: string; password: string; name: string; isActive: boolean; autoDisableAt: Date | null; autoEnableAt: Date | null }>): Promise<ProAdmin | undefined> {
    const [admin] = await this.db.update(proAdmins).set(data).where(eq(proAdmins.id, id)).returning();
    return admin;
  }

  async deleteProAdmin(id: string): Promise<boolean> {
    const result = await this.db.delete(proAdmins).where(eq(proAdmins.id, id)).returning();
    return result.length > 0;
  }

  // ===== User Payment Platform =====

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.phone, phone));
    return user;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await this.db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return this.db.select().from(users).orderBy(desc(users.createdAt));
  }

  // User Wallet Transactions
  async getUserTransactions(userId: string, limit = 50, offset = 0): Promise<UserWalletTransaction[]> {
    return this.db.select().from(userWalletTransactions)
      .where(eq(userWalletTransactions.userId, userId))
      .orderBy(desc(userWalletTransactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async createUserTransaction(data: InsertUserWalletTransaction): Promise<UserWalletTransaction> {
    const [tx] = await this.db.insert(userWalletTransactions).values(data).returning();
    return tx;
  }

  // P2P Transfers
  async getP2PTransfer(id: string): Promise<P2PTransfer | undefined> {
    const [transfer] = await this.db.select().from(p2pTransfers).where(eq(p2pTransfers.id, id));
    return transfer;
  }

  async getTransfersByUser(userId: string, limit = 50): Promise<P2PTransfer[]> {
    return this.db.select().from(p2pTransfers)
      .where(or(eq(p2pTransfers.senderId, userId), eq(p2pTransfers.receiverId, userId)))
      .orderBy(desc(p2pTransfers.createdAt))
      .limit(limit);
  }

  async createP2PTransfer(data: InsertP2PTransfer): Promise<P2PTransfer> {
    const [transfer] = await this.db.insert(p2pTransfers).values(data).returning();
    return transfer;
  }

  async updateP2PTransfer(id: string, data: Partial<InsertP2PTransfer>): Promise<P2PTransfer | undefined> {
    const [transfer] = await this.db.update(p2pTransfers).set(data).where(eq(p2pTransfers.id, id)).returning();
    return transfer;
  }

  async getTransferByReference(reference: string): Promise<P2PTransfer | undefined> {
    const [transfer] = await this.db.select().from(p2pTransfers).where(eq(p2pTransfers.referenceNumber, reference));
    return transfer;
  }

  // Escrow Orders
  async getEscrowOrder(id: string): Promise<EscrowOrder | undefined> {
    const [order] = await this.db.select().from(escrowOrders).where(eq(escrowOrders.id, id));
    return order;
  }

  async getEscrowOrderByNumber(orderNumber: string): Promise<EscrowOrder | undefined> {
    const [order] = await this.db.select().from(escrowOrders).where(eq(escrowOrders.orderNumber, orderNumber));
    return order;
  }

  async getEscrowOrdersByCreator(userId: string): Promise<EscrowOrder[]> {
    return this.db.select().from(escrowOrders)
      .where(eq(escrowOrders.creatorId, userId))
      .orderBy(desc(escrowOrders.createdAt));
  }

  async getEscrowOrdersBySeller(userId: string): Promise<EscrowOrder[]> {
    return this.db.select().from(escrowOrders)
      .where(eq(escrowOrders.sellerId, userId))
      .orderBy(desc(escrowOrders.createdAt));
  }

  async getEscrowOrdersByDeliveryPerson(userId: string): Promise<EscrowOrder[]> {
    return this.db.select().from(escrowOrders)
      .where(eq(escrowOrders.deliveryPersonId, userId))
      .orderBy(desc(escrowOrders.createdAt));
  }

  async getAvailableEscrowOrders(): Promise<EscrowOrder[]> {
    return this.db.select().from(escrowOrders)
      .where(eq(escrowOrders.status, "pending"))
      .orderBy(desc(escrowOrders.createdAt));
  }

  async getAllEscrowOrders(): Promise<EscrowOrder[]> {
    return this.db.select().from(escrowOrders).orderBy(desc(escrowOrders.createdAt));
  }

  async createEscrowOrder(data: InsertEscrowOrder): Promise<EscrowOrder> {
    const [order] = await this.db.insert(escrowOrders).values(data).returning();
    return order;
  }

  async updateEscrowOrder(id: string, data: Partial<InsertEscrowOrder>): Promise<EscrowOrder | undefined> {
    const [order] = await this.db.update(escrowOrders).set(data).where(eq(escrowOrders.id, id)).returning();
    return order;
  }

  // Escrow Tracking
  async getEscrowTracking(escrowOrderId: string): Promise<EscrowTracking[]> {
    return this.db.select().from(escrowTracking)
      .where(eq(escrowTracking.escrowOrderId, escrowOrderId))
      .orderBy(escrowTracking.createdAt);
  }

  async createEscrowTracking(data: InsertEscrowTracking): Promise<EscrowTracking> {
    const [tracking] = await this.db.insert(escrowTracking).values(data).returning();
    return tracking;
  }

  // User Beneficiaries
  async getBeneficiaries(userId: string): Promise<UserBeneficiary[]> {
    return this.db.select().from(userBeneficiaries)
      .where(eq(userBeneficiaries.userId, userId))
      .orderBy(desc(userBeneficiaries.createdAt));
  }

  async createBeneficiary(data: InsertUserBeneficiary): Promise<UserBeneficiary> {
    const [beneficiary] = await this.db.insert(userBeneficiaries).values(data).returning();
    return beneficiary;
  }

  async deleteBeneficiary(id: string): Promise<boolean> {
    const result = await this.db.delete(userBeneficiaries).where(eq(userBeneficiaries.id, id)).returning();
    return result.length > 0;
  }

  // Payment Providers
  async getPaymentProviders(): Promise<PaymentProvider[]> {
    return this.db.select().from(paymentProviders)
      .where(eq(paymentProviders.isActive, true))
      .orderBy(paymentProviders.sortOrder);
  }

  async createPaymentProvider(data: InsertPaymentProvider): Promise<PaymentProvider> {
    const [provider] = await this.db.insert(paymentProviders).values(data).returning();
    return provider;
  }

  // User Notifications
  async getUserNotifications(userId: string, limit = 20): Promise<UserNotification[]> {
    return this.db.select().from(userNotifications)
      .where(eq(userNotifications.userId, userId))
      .orderBy(desc(userNotifications.createdAt))
      .limit(limit);
  }

  async getUserUnreadCount(userId: string): Promise<number> {
    const result = await this.db.select()
      .from(userNotifications)
      .where(and(eq(userNotifications.userId, userId), eq(userNotifications.isRead, false)));
    return result.length;
  }

  async createUserNotification(data: InsertUserNotification): Promise<UserNotification> {
    const [notification] = await this.db.insert(userNotifications).values(data).returning();
    return notification;
  }

  async markUserNotificationsRead(userId: string): Promise<void> {
    await this.db.update(userNotifications).set({ isRead: true }).where(eq(userNotifications.userId, userId));
  }

  // ================================================================
  // FLEXIBLE CONTRACTS
  // ================================================================

  async getContract(id: string): Promise<FlexibleContract | undefined> {
    const [c] = await this.db.select().from(flexibleContracts).where(eq(flexibleContracts.id, id));
    return c;
  }

  async getContractByNumber(contractNumber: string): Promise<FlexibleContract | undefined> {
    const [c] = await this.db.select().from(flexibleContracts).where(eq(flexibleContracts.contractNumber, contractNumber));
    return c;
  }

  async getContractsByUser(userId: string): Promise<FlexibleContract[]> {
    return this.db.select().from(flexibleContracts)
      .where(or(eq(flexibleContracts.creatorId, userId), eq(flexibleContracts.counterpartyId, userId)))
      .orderBy(desc(flexibleContracts.createdAt));
  }

  async getContractsByCreator(userId: string): Promise<FlexibleContract[]> {
    return this.db.select().from(flexibleContracts)
      .where(eq(flexibleContracts.creatorId, userId))
      .orderBy(desc(flexibleContracts.createdAt));
  }

  async getContractsByCounterparty(userId: string): Promise<FlexibleContract[]> {
    return this.db.select().from(flexibleContracts)
      .where(eq(flexibleContracts.counterpartyId, userId))
      .orderBy(desc(flexibleContracts.createdAt));
  }

  async getContractsByDeliveryPerson(userId: string): Promise<FlexibleContract[]> {
    return this.db.select().from(flexibleContracts)
      .where(eq(flexibleContracts.deliveryPersonId, userId))
      .orderBy(desc(flexibleContracts.createdAt));
  }

  async getAvailableContracts(): Promise<FlexibleContract[]> {
    // #12 fix: only return public pending contracts for marketplace
    const all = await this.db.select().from(flexibleContracts)
      .where(eq(flexibleContracts.status, "pending"))
      .orderBy(desc(flexibleContracts.createdAt));
    return all.filter(c => c.isPublic === true);
  }

  async getAllContracts(): Promise<FlexibleContract[]> {
    return this.db.select().from(flexibleContracts).orderBy(desc(flexibleContracts.createdAt));
  }

  async getContractsByStatus(status: string): Promise<FlexibleContract[]> {
    return this.db.select().from(flexibleContracts)
      .where(eq(flexibleContracts.status, status))
      .orderBy(desc(flexibleContracts.createdAt));
  }

  async createContract(data: InsertFlexibleContract): Promise<FlexibleContract> {
    const [c] = await this.db.insert(flexibleContracts).values(data).returning();
    return c;
  }

  async updateContract(id: string, data: Partial<InsertFlexibleContract>): Promise<FlexibleContract | undefined> {
    const [c] = await this.db.update(flexibleContracts).set({ ...data, updatedAt: new Date() }).where(eq(flexibleContracts.id, id)).returning();
    return c;
  }

  // Contract Milestones
  async getMilestones(contractId: string): Promise<ContractMilestone[]> {
    return this.db.select().from(contractMilestones)
      .where(eq(contractMilestones.contractId, contractId))
      .orderBy(contractMilestones.sortOrder);
  }

  async getMilestone(id: string): Promise<ContractMilestone | undefined> {
    const [m] = await this.db.select().from(contractMilestones).where(eq(contractMilestones.id, id));
    return m;
  }

  async createMilestone(data: InsertContractMilestone): Promise<ContractMilestone> {
    const [m] = await this.db.insert(contractMilestones).values(data).returning();
    return m;
  }

  async updateMilestone(id: string, data: Partial<InsertContractMilestone>): Promise<ContractMilestone | undefined> {
    const [m] = await this.db.update(contractMilestones).set(data).where(eq(contractMilestones.id, id)).returning();
    return m;
  }

  // Contract Disputes
  async getDispute(id: string): Promise<ContractDispute | undefined> {
    const [d] = await this.db.select().from(contractDisputes).where(eq(contractDisputes.id, id));
    return d;
  }

  async getDisputesByContract(contractId: string): Promise<ContractDispute[]> {
    return this.db.select().from(contractDisputes)
      .where(eq(contractDisputes.contractId, contractId))
      .orderBy(desc(contractDisputes.createdAt));
  }

  async getAllDisputes(): Promise<ContractDispute[]> {
    return this.db.select().from(contractDisputes).orderBy(desc(contractDisputes.createdAt));
  }

  async getOpenDisputes(): Promise<ContractDispute[]> {
    return this.db.select().from(contractDisputes)
      .where(or(eq(contractDisputes.status, "open"), eq(contractDisputes.status, "under_review")))
      .orderBy(desc(contractDisputes.createdAt));
  }

  async createDispute(data: InsertContractDispute): Promise<ContractDispute> {
    const [d] = await this.db.insert(contractDisputes).values(data).returning();
    return d;
  }

  async updateDispute(id: string, data: Partial<InsertContractDispute>): Promise<ContractDispute | undefined> {
    const [d] = await this.db.update(contractDisputes).set(data).where(eq(contractDisputes.id, id)).returning();
    return d;
  }

  // Contract Tracking
  async getContractTracking(contractId: string): Promise<ContractTracking[]> {
    return this.db.select().from(contractTracking)
      .where(eq(contractTracking.contractId, contractId))
      .orderBy(contractTracking.createdAt);
  }

  async createContractTracking(data: InsertContractTracking): Promise<ContractTracking> {
    const [t] = await this.db.insert(contractTracking).values(data).returning();
    return t;
  }

  // Contract Reviews
  async getContractReviews(contractId: string): Promise<ContractReview[]> {
    return this.db.select().from(contractReviews)
      .where(eq(contractReviews.contractId, contractId))
      .orderBy(desc(contractReviews.createdAt));
  }

  async createContractReview(data: InsertContractReview): Promise<ContractReview> {
    const [r] = await this.db.insert(contractReviews).values(data).returning();
    return r;
  }

  // Contract Templates
  async getContractTemplates(): Promise<ContractTemplate[]> {
    return this.db.select().from(contractTemplates)
      .where(eq(contractTemplates.isActive, true))
      .orderBy(contractTemplates.sortOrder);
  }

  async getAllContractTemplates(): Promise<ContractTemplate[]> {
    return this.db.select().from(contractTemplates).orderBy(contractTemplates.sortOrder);
  }

  async createContractTemplate(data: InsertContractTemplate): Promise<ContractTemplate> {
    const [t] = await this.db.insert(contractTemplates).values(data).returning();
    return t;
  }

  async updateContractTemplate(id: string, data: Partial<InsertContractTemplate>): Promise<ContractTemplate | undefined> {
    const [t] = await this.db.update(contractTemplates).set(data).where(eq(contractTemplates.id, id)).returning();
    return t;
  }

  async deleteContractTemplate(id: string): Promise<boolean> {
    const result = await this.db.delete(contractTemplates).where(eq(contractTemplates.id, id)).returning();
    return result.length > 0;
  }

  // ================================================================
  // SUPPORT TICKETS
  // ================================================================

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    const [t] = await this.db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return t;
  }

  async getSupportTicketByNumber(ticketNumber: string): Promise<SupportTicket | undefined> {
    const [t] = await this.db.select().from(supportTickets).where(eq(supportTickets.ticketNumber, ticketNumber));
    return t;
  }

  async getSupportTicketsByUser(userId: string): Promise<SupportTicket[]> {
    return this.db.select().from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getAllSupportTickets(): Promise<SupportTicket[]> {
    return this.db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicketsByStatus(status: string): Promise<SupportTicket[]> {
    return this.db.select().from(supportTickets)
      .where(eq(supportTickets.status, status))
      .orderBy(desc(supportTickets.createdAt));
  }

  async createSupportTicket(data: InsertSupportTicket): Promise<SupportTicket> {
    const [t] = await this.db.insert(supportTickets).values(data).returning();
    return t;
  }

  async updateSupportTicket(id: string, data: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const [t] = await this.db.update(supportTickets).set({ ...data, updatedAt: new Date() }).where(eq(supportTickets.id, id)).returning();
    return t;
  }

  async getTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
    return this.db.select().from(supportTicketMessages)
      .where(eq(supportTicketMessages.ticketId, ticketId))
      .orderBy(supportTicketMessages.createdAt);
  }

  async createTicketMessage(data: InsertSupportTicketMessage): Promise<SupportTicketMessage> {
    const [m] = await this.db.insert(supportTicketMessages).values(data).returning();
    return m;
  }

  async getSupportStats(): Promise<{ total: number; open: number; inProgress: number; resolved: number }> {
    const all = await this.db.select().from(supportTickets);
    return {
      total: all.length,
      open: all.filter(t => t.status === "open").length,
      inProgress: all.filter(t => t.status === "in_progress" || t.status === "waiting_user").length,
      resolved: all.filter(t => t.status === "resolved" || t.status === "closed").length,
    };
  }

  // ================================================================
  // USER MANAGEMENT (ADMIN)
  // ================================================================

  async banUser(id: string): Promise<User | undefined> {
    const [u] = await this.db.update(users).set({ isActive: false }).where(eq(users.id, id)).returning();
    return u;
  }

  async unbanUser(id: string): Promise<User | undefined> {
    const [u] = await this.db.update(users).set({ isActive: true }).where(eq(users.id, id)).returning();
    return u;
  }

  async adjustUserBalance(id: string, newBalance: string): Promise<User | undefined> {
    const [u] = await this.db.update(users).set({ walletBalance: newBalance, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return u;
  }

  async submitKyc(userId: string, data: { fullName: string; nationalId: string; nationalIdImageFront?: string; nationalIdImageBack?: string; dateOfBirth?: string; email?: string; proofOfAddress?: string }): Promise<User | undefined> {
    const [u] = await this.db.update(users).set({
      fullName: data.fullName,
      nationalId: data.nationalId,
      nationalIdImageFront: data.nationalIdImageFront || null,
      nationalIdImageBack: data.nationalIdImageBack || null,
      dateOfBirth: data.dateOfBirth || null,
      email: data.email || null,
      proofOfAddress: data.proofOfAddress || null,
      kycStatus: "basic",
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();
    return u;
  }

  async approveKyc(userId: string, adminId: string): Promise<User | undefined> {
    const [u] = await this.db.update(users).set({
      kycStatus: "verified",
      kycVerifiedAt: new Date(),
      kycVerifiedBy: adminId,
      kycRejectionReason: null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();
    return u;
  }

  async rejectKyc(userId: string, reason: string): Promise<User | undefined> {
    const [u] = await this.db.update(users).set({
      kycStatus: "none",
      kycRejectionReason: reason,
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();
    return u;
  }

  // ================================================================
  // CONTRACT RULES
  // ================================================================

  async getContractRule(type: string): Promise<ContractRule | undefined> {
    const [r] = await this.db.select().from(contractRules).where(eq(contractRules.contractType, type));
    return r;
  }

  async getAllContractRules(): Promise<ContractRule[]> {
    return this.db.select().from(contractRules).orderBy(contractRules.sortOrder);
  }

  async createContractRule(data: InsertContractRule): Promise<ContractRule> {
    const [r] = await this.db.insert(contractRules).values(data).returning();
    return r;
  }

  async updateContractRule(id: string, data: Partial<InsertContractRule>): Promise<ContractRule | undefined> {
    const [r] = await this.db.update(contractRules).set({ ...data, updatedAt: new Date() }).where(eq(contractRules.id, id)).returning();
    return r;
  }

  async deleteContractRule(id: string): Promise<boolean> {
    const result = await this.db.delete(contractRules).where(eq(contractRules.id, id)).returning();
    return result.length > 0;
  }

  async seedDefaultContractRules(): Promise<void> {
    const existing = await this.db.select().from(contractRules);
    if (existing.length > 0) return;

    const defaults = [
      { contractType: "purchase", minAmount: "50", maxAmount: "200000", platformFeeRate: "0.005", cancellationFeeRate: "0.01", autoExpireHours: 72, inspectionPeriodDefault: 24, requireKyc: "basic", requireConfirmationCode: true, allowDeliveryPerson: true, sortOrder: 1 },
      { contractType: "delivery", minAmount: "20", maxAmount: "100000", platformFeeRate: "0.005", cancellationFeeRate: "0.01", autoExpireHours: 48, inspectionPeriodDefault: 12, requireKyc: "none", requireConfirmationCode: true, allowDeliveryPerson: true, sortOrder: 2 },
      { contractType: "service", minAmount: "100", maxAmount: "500000", platformFeeRate: "0.01", cancellationFeeRate: "0.02", autoExpireHours: 168, inspectionPeriodDefault: 48, requireKyc: "basic", requireConfirmationCode: false, allowDeliveryPerson: false, maxMilestones: 10, sortOrder: 3 },
      { contractType: "rental", minAmount: "50", maxAmount: "300000", platformFeeRate: "0.005", cancellationFeeRate: "0.02", autoExpireHours: 168, inspectionPeriodDefault: 24, requireKyc: "basic", requireConfirmationCode: false, allowDeliveryPerson: true, allowExtension: true, maxExtensions: 2, depositRequired: true, depositRate: "0.1", lateReturnPenaltyRate: "0.05", sortOrder: 4 },
      { contractType: "custom", minAmount: "10", maxAmount: "1000000", platformFeeRate: "0.005", cancellationFeeRate: "0.01", autoExpireHours: 72, inspectionPeriodDefault: 24, requireKyc: "none", requireConfirmationCode: false, allowDeliveryPerson: false, sortOrder: 5 },
      { contractType: "split_cost", minAmount: "10", maxAmount: "50000", platformFeeRate: "0", cancellationFeeRate: "0", autoExpireHours: 48, inspectionPeriodDefault: 0, requireKyc: "none", requireConfirmationCode: false, allowDeliveryPerson: false, sortOrder: 6 },
    ];

    for (const d of defaults) {
      await this.db.insert(contractRules).values(d);
    }
  }

  // ================================================================
  // CONTRACT PARTICIPANTS
  // ================================================================

  async getContractParticipants(contractId: string): Promise<ContractParticipant[]> {
    return this.db.select().from(contractParticipants)
      .where(eq(contractParticipants.contractId, contractId))
      .orderBy(contractParticipants.createdAt);
  }

  async createContractParticipant(data: InsertContractParticipant): Promise<ContractParticipant> {
    const [p] = await this.db.insert(contractParticipants).values(data).returning();
    return p;
  }

  async updateContractParticipant(id: string, data: Partial<InsertContractParticipant>): Promise<ContractParticipant | undefined> {
    const [p] = await this.db.update(contractParticipants).set(data).where(eq(contractParticipants.id, id)).returning();
    return p;
  }

  async deleteContractParticipant(id: string): Promise<boolean> {
    const result = await this.db.delete(contractParticipants).where(eq(contractParticipants.id, id)).returning();
    return result.length > 0;
  }

  // ================================================================
  // CONTRACT SUGGESTIONS
  // ================================================================

  async searchSuggestions(field: string, query: string, contractType?: string): Promise<ContractSuggestion[]> {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Return popular suggestions for this field
      let base = this.db.select().from(contractSuggestions)
        .where(and(
          eq(contractSuggestions.field, field),
          eq(contractSuggestions.isActive, true)
        ));
      
      const all = await base.orderBy(desc(contractSuggestions.usageCount)).limit(10);
      if (contractType) {
        return all.filter(s => !s.contractType || s.contractType === contractType || s.contractType === "all");
      }
      return all;
    }

    // Search by value containing the query (case-insensitive via ILIKE)
    const all = await this.db.select().from(contractSuggestions)
      .where(and(
        eq(contractSuggestions.field, field),
        eq(contractSuggestions.isActive, true),
        dsql`${contractSuggestions.value} ILIKE ${'%' + q + '%'}`
      ))
      .orderBy(desc(contractSuggestions.usageCount))
      .limit(10);

    if (contractType) {
      return all.filter(s => !s.contractType || s.contractType === contractType || s.contractType === "all");
    }
    return all;
  }

  async createOrIncrementSuggestion(field: string, value: string, contractType: string, userId?: string): Promise<ContractSuggestion> {
    // Check if suggestion already exists (case-insensitive)
    const existing = await this.db.select().from(contractSuggestions)
      .where(and(
        eq(contractSuggestions.field, field),
        dsql`LOWER(${contractSuggestions.value}) = LOWER(${value})`
      ));

    if (existing.length > 0) {
      // Increment usage count
      const [updated] = await this.db.update(contractSuggestions)
        .set({ usageCount: (existing[0].usageCount || 1) + 1 })
        .where(eq(contractSuggestions.id, existing[0].id))
        .returning();
      return updated;
    }

    // Create new suggestion
    const [s] = await this.db.insert(contractSuggestions).values({
      field,
      value,
      contractType,
      usageCount: 1,
      isSystem: false,
      isActive: true,
      createdBy: userId || null,
    }).returning();
    return s;
  }

  async seedSystemSuggestions(): Promise<void> {
    const existing = await this.db.select().from(contractSuggestions).where(eq(contractSuggestions.isSystem, true));
    if (existing.length > 0) return;

    const systemSuggestions = [
      // Titles for purchase
      { field: "title", value: "شراء لابتوب", contractType: "purchase" },
      { field: "title", value: "شراء موبايل جديد", contractType: "purchase" },
      { field: "title", value: "شراء أثاث منزل", contractType: "purchase" },
      { field: "title", value: "شراء ساعة يد", contractType: "purchase" },
      { field: "title", value: "شراء كاميرا تصوير", contractType: "purchase" },
      // Titles for delivery
      { field: "title", value: "توصيل طلب مطعم", contractType: "delivery" },
      { field: "title", value: "توصيل طرود", contractType: "delivery" },
      { field: "title", value: "توصيل مستندات", contractType: "delivery" },
      { field: "title", value: "توصيل أدوية", contractType: "delivery" },
      { field: "title", value: "توصيل أجهزة إلكترونية", contractType: "delivery" },
      // Titles for service
      { field: "title", value: "تصميم موقع إلكتروني", contractType: "service" },
      { field: "title", value: "صيانة كمبيوتر", contractType: "service" },
      { field: "title", value: "تنظيف منزل", contractType: "service" },
      { field: "title", value: "تطوير تطبيق موبايل", contractType: "service" },
      { field: "title", value: "كتابة محتوى", contractType: "service" },
      { field: "title", value: "تصوير منتجات", contractType: "service" },
      // Titles for rental
      { field: "title", value: "تأجير كاميرا", contractType: "rental" },
      { field: "title", value: "تأجير سيارة", contractType: "rental" },
      { field: "title", value: "تأجير أجهزة صوتية", contractType: "rental" },
      { field: "title", value: "تأجير أدوات بناء", contractType: "rental" },
      // Descriptions
      { field: "description", value: "المنتج بحالة جديدة تماماً مع الضمان", contractType: "purchase" },
      { field: "description", value: "التوصيل خلال نفس اليوم", contractType: "delivery" },
      { field: "description", value: "العمل يشمل التعديلات حتى الرضا التام", contractType: "service" },
      { field: "description", value: "العين بحالة ممتازة مع فحص قبل الاستلام", contractType: "rental" },
      // Addresses
      { field: "pickupAddress", value: "وسط البلد، القاهرة", contractType: "all" },
      { field: "pickupAddress", value: "مدينة نصر، القاهرة", contractType: "all" },
      { field: "pickupAddress", value: "المعادي، القاهرة", contractType: "all" },
      { field: "pickupAddress", value: "الزمالك، القاهرة", contractType: "all" },
      { field: "pickupAddress", value: "التجمع الخامس، القاهرة", contractType: "all" },
      { field: "pickupAddress", value: "الإسكندرية", contractType: "all" },
      { field: "pickupAddress", value: "الجيزة", contractType: "all" },
      { field: "pickupAddress", value: "6 أكتوبر", contractType: "all" },
      { field: "pickupAddress", value: "شيخ زايد", contractType: "all" },
      { field: "deliveryAddress", value: "وسط البلد، القاهرة", contractType: "all" },
      { field: "deliveryAddress", value: "مدينة نصر، القاهرة", contractType: "all" },
      { field: "deliveryAddress", value: "المعادي، القاهرة", contractType: "all" },
      { field: "deliveryAddress", value: "التجمع الخامس، القاهرة", contractType: "all" },
      { field: "deliveryAddress", value: "الإسكندرية", contractType: "all" },
      { field: "deliveryAddress", value: "الجيزة", contractType: "all" },
      { field: "deliveryAddress", value: "6 أكتوبر", contractType: "all" },
      { field: "deliveryAddress", value: "شيخ زايد", contractType: "all" },
    ];

    for (const s of systemSuggestions) {
      await this.db.insert(contractSuggestions).values({
        ...s,
        usageCount: 0,
        isSystem: true,
        isActive: true,
      });
    }
  }
}

export const storage = new DatabaseStorage();

/**
 * Create a storage instance for a specific tenant database
 */
export function createTenantStorage(dbName: string): DatabaseStorage {
  return new DatabaseStorage(getTenantDb(dbName));
}
