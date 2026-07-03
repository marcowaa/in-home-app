import { db } from "./db";
import { users, paymentProviders, userWalletTransactions, p2pTransfers, escrowOrders, escrowTracking } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import { storage } from "./storage";

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateReference(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `INH${timestamp}${random}`;
}

function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `ESC${timestamp}${random}`;
}

async function seed() {
  console.log("🌱 Seeding demo data...");

  // Seed payment providers
  const existingProviders = await db.select().from(paymentProviders);
  if (existingProviders.length === 0) {
    const providers = [
      { name: "فودافون كاش", nameEn: "Vodafone Cash", type: "wallet", icon: "📱", color: "#E60000", sortOrder: 1, mockFeeRate: "0.01", mockFixedFee: "2" },
      { name: "اتصالات كاش", nameEn: "e& Cash", type: "wallet", icon: "📱", color: "#0075BE", sortOrder: 2, mockFeeRate: "0.01", mockFixedFee: "2" },
      { name: "أورانج كاش", nameEn: "Orange Cash", type: "wallet", icon: "📱", color: "#FF7900", sortOrder: 3, mockFeeRate: "0.01", mockFixedFee: "2" },
      { name: "وي باي", nameEn: "WE Pay", type: "wallet", icon: "📱", color: "#800080", sortOrder: 4, mockFeeRate: "0.01", mockFixedFee: "2" },
      { name: "البنك الأهلي المصري", nameEn: "NBE", type: "bank", icon: "🏦", color: "#1B3A6B", sortOrder: 5, mockFeeRate: "0.005", mockFixedFee: "5" },
      { name: "بنك مصر", nameEn: "Banque Misr", type: "bank", icon: "🏦", color: "#D52B1E", sortOrder: 6, mockFeeRate: "0.005", mockFixedFee: "5" },
      { name: "بنك القاهرة", nameEn: "Bank of Cairo", type: "bank", icon: "🏦", color: "#0066B3", sortOrder: 7, mockFeeRate: "0.005", mockFixedFee: "5" },
      { name: "CIB", nameEn: "CIB", type: "bank", icon: "🏦", color: "#00563F", sortOrder: 8, mockFeeRate: "0.005", mockFixedFee: "5" },
      { name: "InstaPay", nameEn: "InstaPay", type: "instapay", icon: "⚡", color: "#663399", sortOrder: 9, mockFeeRate: "0.005", mockFixedFee: "5" },
      { name: "فوري", nameEn: "Fawry", type: "cash", icon: "🏪", color: "#FF6B00", sortOrder: 10, mockFeeRate: "0.015", mockFixedFee: "3" },
    ];

    for (const p of providers) {
      await db.insert(paymentProviders).values({
        ...p,
        isActive: true,
      });
    }
    console.log(`✅ Seeded ${providers.length} payment providers`);
  }

  // Seed demo users
  const existingUsers = await db.select().from(users);
  if (existingUsers.length === 0) {
    const demoUsers = [
      { phone: "01012345678", name: "أحمد محمد", balance: "5000", kyc: "verified" },
      { phone: "01087654321", name: "محمود علي", balance: "3000", kyc: "verified" },
      { phone: "01122334455", name: "كريم سعيد", balance: "1500", kyc: "basic" },
      { phone: "01099887766", name: "سارة أحمد", balance: "1000", kyc: "basic" },
      { phone: "01233445566", name: "عمر خالد", balance: "2500", kyc: "verified" },
    ];

    for (const u of demoUsers) {
      const pin = await bcrypt.hash("1234", 10);
      const user = await storage.createUser({
        phone: u.phone,
        name: u.name,
        pin,
        walletBalance: u.balance,
        frozenBalance: "0",
        kycStatus: u.kyc,
        isActive: true,
        referralCode: generateReferralCode(),
      });

      // Create initial topup transaction
      await storage.createUserTransaction({
        userId: user.id,
        type: "topup",
        amount: u.balance,
        balanceAfter: u.balance,
        feeAmount: "0",
        description: "رصيد افتتاحي",
        status: "completed",
        referenceNumber: generateReference(),
      });
    }
    console.log(`✅ Seeded ${demoUsers.length} demo users`);

    // Create a sample completed transfer
    const allUsers = await db.select().from(users);
    if (allUsers.length >= 2) {
      const sender = allUsers[0];
      const receiver = allUsers[3];
      const transferAmt = "500";

      const transfer = await storage.createP2PTransfer({
        senderId: sender.id,
        receiverId: receiver.id,
        amount: transferAmt,
        fee: "0",
        method: "phone",
        receiverIdentifier: receiver.phone,
        receiverName: receiver.name || "مستخدم",
        senderName: sender.name || "مستخدم",
        status: "completed",
        description: "تحويل تجريبي",
        referenceNumber: generateReference(),
        otpVerified: true,
        completedAt: new Date(),
      });

      await storage.createUserTransaction({
        userId: sender.id,
        type: "transfer_sent",
        amount: transferAmt,
        balanceAfter: sender.walletBalance,
        feeAmount: "0",
        description: `تحويل إلى ${receiver.name}`,
        relatedId: transfer.id,
        counterpartyId: receiver.id,
        counterpartyName: receiver.name || "مستخدم",
        status: "completed",
        referenceNumber: transfer.referenceNumber,
      });

      await storage.createUserTransaction({
        userId: receiver.id,
        type: "transfer_received",
        amount: transferAmt,
        balanceAfter: receiver.walletBalance,
        feeAmount: "0",
        description: `تحويل من ${sender.name}`,
        relatedId: transfer.id,
        counterpartyId: sender.id,
        counterpartyName: sender.name || "مستخدم",
        status: "completed",
        referenceNumber: transfer.referenceNumber,
      });

      console.log("✅ Seeded sample P2P transfer");
    }

    // Create sample escrow orders in different states
    if (allUsers.length >= 3) {
      const buyer = allUsers[0];
      const seller = allUsers[1];
      const delivery = allUsers[2];

      // Pending escrow order
      const pendingOrder = await storage.createEscrowOrder({
        creatorId: buyer.id,
        sellerId: seller.id,
        orderNumber: generateOrderNumber(),
        productDescription: "لابتوب ديل XPS 15",
        productValue: "15000",
        deliveryFeeRate: "0.02",
        deliveryFeeAmount: "300",
        platformFeeRate: "0.005",
        platformFeeAmount: "75",
        frozenAmount: "15075",
        status: "pending",
        terms: { deliveryDeadlineHours: 72, inspectionPeriodHours: 24, returnAllowed: true },
        pickupAddress: "القاهرة - مدينة نصر",
        deliveryAddress: "القاهرة - المعادي",
        confirmationCode: Math.floor(100000 + Math.random() * 900000).toString(),
        creatorName: buyer.name || buyer.phone,
        sellerName: seller.name || seller.phone,
        deadlineHours: 72,
      });

      await storage.createEscrowTracking({
        escrowOrderId: pendingOrder.id,
        status: "created",
        notes: "تم إنشاء طلب التوصيل الآمن",
        createdBy: buyer.id,
        createdByName: buyer.name || buyer.phone,
      });

      // In-transit escrow order
      const inTransitOrder = await storage.createEscrowOrder({
        creatorId: allUsers[4].id,
        sellerId: allUsers[3].id,
        deliveryPersonId: delivery.id,
        orderNumber: generateOrderNumber(),
        productDescription: "آيفون 15 برو",
        productValue: "45000",
        deliveryFeeRate: "0.015",
        deliveryFeeAmount: "675",
        platformFeeRate: "0.005",
        platformFeeAmount: "225",
        frozenAmount: "45225",
        status: "in_transit",
        terms: { deliveryDeadlineHours: 48, inspectionPeriodHours: 24, returnAllowed: true },
        pickupAddress: "الإسكندرية - سموحة",
        deliveryAddress: "القاهرة - التجمع",
        confirmationCode: Math.floor(100000 + Math.random() * 900000).toString(),
        creatorName: allUsers[4].name || allUsers[4].phone,
        sellerName: allUsers[3].name || allUsers[3].phone,
        deliveryPersonName: delivery.name || delivery.phone,
        deadlineHours: 48,
        acceptedAt: new Date(Date.now() - 3600000),
        pickedUpAt: new Date(Date.now() - 1800000),
      });

      await storage.createEscrowTracking({
        escrowOrderId: inTransitOrder.id,
        status: "created",
        notes: "تم إنشاء طلب التوصيل الآمن",
        createdBy: allUsers[4].id,
        createdByName: allUsers[4].name || allUsers[4].phone,
      });
      await storage.createEscrowTracking({
        escrowOrderId: inTransitOrder.id,
        status: "accepted",
        notes: `قبل المندوب ${delivery.name} الطلب`,
        createdBy: delivery.id,
        createdByName: delivery.name || delivery.phone,
      });
      await storage.createEscrowTracking({
        escrowOrderId: inTransitOrder.id,
        status: "picked_up",
        notes: "تم استلام المنتج من البائع",
        createdBy: delivery.id,
        createdByName: delivery.name || delivery.phone,
      });
      await storage.createEscrowTracking({
        escrowOrderId: inTransitOrder.id,
        status: "in_transit",
        notes: "المنتج في الطريق للتوصيل",
        createdBy: delivery.id,
        createdByName: delivery.name || delivery.phone,
      });

      console.log("✅ Seeded 2 sample escrow orders (pending + in_transit)");
    }
  } else {
    console.log("ℹ️  Users already exist, skipping user seed");
  }

  console.log("✅ Seed complete!");

  // Seed contract rules
  await storage.seedDefaultContractRules();
  console.log("✅ Seeded contract rules");

  process.exit(0);
}

seed().catch(err => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
