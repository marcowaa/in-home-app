import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { users, userWalletTransactions, p2pTransfers, escrowOrders, escrowTracking, userBeneficiaries, paymentProviders, userNotifications } from "@shared/schema";
import { eq, desc, or, and, sql } from "drizzle-orm";
import { db } from "./db";

// Helper: generate reference number
function generateReference(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `INH${timestamp}${random}`;
}

// Helper: generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `ESC${timestamp}${random}`;
}

// Helper: generate 6-digit confirmation code
function generateConfirmationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: generate referral code
function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function registerUserRoutes(app: Express) {

  // ===== AUTH ROUTES =====

  // Demo login — no OTP, no password, instant access
  app.post("/api/user/auth/demo-login", async (req: Request, res: Response) => {
    const { phone, name } = req.body;

    const demoPhone = phone || "01000000000";
    const demoName = name || "مستخدم تجريبي";

    let user = await storage.getUserByPhone(demoPhone);
    if (!user) {
      user = await storage.createUser({
        phone: demoPhone,
        name: demoName,
        walletBalance: "500",
        frozenBalance: "0",
        kycStatus: "none",
        isActive: true,
        referralCode: generateReferralCode(),
      });
      // Welcome bonus transaction
      await storage.createUserTransaction({
        userId: user.id,
        type: "topup",
        amount: "500",
        balanceAfter: "500",
        feeAmount: "0",
        description: "رصيد تجريبي للتجربة",
        status: "completed",
        referenceNumber: generateReference(),
      });
    } else if (!user.name) {
      user = await storage.updateUser(user.id, { name: demoName });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "الحساب موقوف" });
    }

    (req.session as any).userLoggedIn = true;
    (req.session as any).userId = user.id;

    res.json({
      loggedIn: true,
      needsRegistration: false,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        hasPin: !!user.pin,
      },
    });
  });

  // Send OTP (mock - returns OTP in response for demo)
  app.post("/api/user/auth/send-otp", async (req: Request, res: Response) => {
    const { phone } = req.body;
    if (!phone || phone.length < 10) {
      return res.status(400).json({ message: "رقم الهاتف غير صالح" });
    }
    // Mock OTP: always return 1234 for demo
    const otp = "1234";

    // Build message with fraud protection code from settings
    const settings = await storage.getSettings();
    const fraudCode = (settings as any)?.fraudCode || "AB12";
    const template = (settings as any)?.otpMessageTemplate || "كود التحقق: {OTP} | رمز الحماية: {FRAUD_CODE}";
    const fullMessage = template.replace("{OTP}", otp).replace("{FRAUD_CODE}", fraudCode);

    // In production, send SMS with fullMessage here
    res.json({ sent: true, otp, message: fullMessage, fraudCode });
  });

  // Verify OTP + login/register
  app.post("/api/user/auth/verify-otp", async (req: Request, res: Response) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ message: "بيانات ناقصة" });
    }
    if (otp !== "1234") {
      return res.status(400).json({ message: "الكود غير صحيح" });
    }

    let user = await storage.getUserByPhone(phone);
    if (!user) {
      // Create new user with default balance for demo
      user = await storage.createUser({
        phone,
        walletBalance: "0",
        frozenBalance: "0",
        kycStatus: "none",
        isActive: true,
        referralCode: generateReferralCode(),
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "الحساب موقوف" });
    }

    // Check if profile is complete (has name + pin)
    const needsRegistration = !user.name || !user.pin;

    (req.session as any).userLoggedIn = true;
    (req.session as any).userId = user.id;

    res.json({
      loggedIn: true,
      needsRegistration,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        hasPin: !!user.pin,
      },
    });
  });

  // Complete registration (name + PIN)
  app.post("/api/user/auth/register", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const { name, pin } = req.body;
    if (!name || !pin || pin.length !== 4) {
      return res.status(400).json({ message: "الاسم وكود 4 أرقام مطلوبة" });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    const user = await storage.updateUser(req.session.userId, { name, pin: hashedPin });

    // Give welcome bonus for demo
    if (user) {
      const bonusAmount = "100";
      await storage.updateUser(user.id, {
        walletBalance: String(parseFloat(user.walletBalance || "0") + parseFloat(bonusAmount)),
      });
      await storage.createUserTransaction({
        userId: user.id,
        type: "topup",
        amount: bonusAmount,
        balanceAfter: String(parseFloat(user.walletBalance || "0") + parseFloat(bonusAmount)),
        feeAmount: "0",
        description: "مكافأة الترحيب",
        status: "completed",
        referenceNumber: generateReference(),
      });
    }

    const updatedUser = await storage.getUser(user!.id);
    res.json({
      loggedIn: true,
      user: {
        id: updatedUser?.id,
        phone: updatedUser?.phone,
        name: updatedUser?.name,
        hasPin: !!updatedUser?.pin,
      },
    });
  });

  // Logout
  app.post("/api/user/auth/logout", (req: Request, res: Response) => {
    (req.session as any).userLoggedIn = false;
    (req.session as any).userId = undefined;
    res.json({ loggedOut: true });
  });

  // Check auth status
  app.get("/api/user/auth/check", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.json({ loggedIn: false });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.json({ loggedIn: false });
    }
    res.json({
      loggedIn: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        avatarUrl: user.avatarUrl,
        walletBalance: user.walletBalance,
        frozenBalance: user.frozenBalance,
        kycStatus: user.kycStatus,
        referralCode: user.referralCode,
        hasPin: !!user.pin,
      },
    });
  });

  // ===== WALLET ROUTES =====

  // Get wallet balance
  app.get("/api/user/wallet", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    const transactions = await storage.getUserTransactions(user.id, 50);
    res.json({
      balance: user.walletBalance,
      frozenBalance: user.frozenBalance,
      availableBalance: String(parseFloat(user.walletBalance || "0") - parseFloat(user.frozenBalance || "0")),
      transactions,
    });
  });

  // Get wallet transactions
  app.get("/api/user/wallet/transactions", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const transactions = await storage.getUserTransactions(req.session.userId, limit, offset);
    res.json({ transactions });
  });

  // Top up wallet (mock - instant credit)
  app.post("/api/user/wallet/topup", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const { amount, providerId } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ message: "المبلغ غير صالح" });
    }
    if (amt > 50000) {
      return res.status(400).json({ message: "الحد الأقصى للشحن 50,000 ج.م" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    const newBalance = String(parseFloat(user.walletBalance || "0") + amt);
    await storage.updateUser(user.id, { walletBalance: newBalance });

    let providerName = "محفظة";
    if (providerId) {
      const providers = await storage.getPaymentProviders();
      const provider = providers.find(p => p.id === providerId);
      if (provider) providerName = provider.name;
    }

    const reference = generateReference();
    await storage.createUserTransaction({
      userId: user.id,
      type: "topup",
      amount: String(amt),
      balanceAfter: newBalance,
      feeAmount: "0",
      description: `شحن محفظة عبر ${providerName}`,
      status: "completed",
      referenceNumber: reference,
    });

    await storage.createUserNotification({
      userId: user.id,
      type: "wallet",
      title: "تم شحن المحفظة",
      message: `تم شحن ${amt} ج.م في محفظتك`,
    });

    res.json({
      success: true,
      newBalance,
      reference,
    });
  });

  // Withdraw from wallet (mock - instant debit)
  app.post("/api/user/wallet/withdraw", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const { amount, providerId } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ message: "المبلغ غير صالح" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    const available = parseFloat(user.walletBalance || "0") - parseFloat(user.frozenBalance || "0");
    if (amt > available) {
      return res.status(400).json({ message: "الرصيد غير كافٍ" });
    }

    const fee = Math.max(amt * 0.005, 2); // 0.5% fee, min 2 EGP
    const totalDeduct = amt + fee;
    if (totalDeduct > available) {
      return res.status(400).json({ message: "الرصيد لا يغطي الرسوم" });
    }

    const newBalance = String(parseFloat(user.walletBalance || "0") - totalDeduct);
    await storage.updateUser(user.id, { walletBalance: newBalance });

    let providerName = "محفظة";
    if (providerId) {
      const providers = await storage.getPaymentProviders();
      const provider = providers.find(p => p.id === providerId);
      if (provider) providerName = provider.name;
    }

    const reference = generateReference();
    await storage.createUserTransaction({
      userId: user.id,
      type: "withdraw",
      amount: String(amt),
      balanceAfter: newBalance,
      feeAmount: String(fee),
      description: `سحب عبر ${providerName}`,
      status: "completed",
      referenceNumber: reference,
    });

    res.json({
      success: true,
      newBalance,
      fee: String(fee),
      reference,
    });
  });

  // Get payment providers
  app.get("/api/user/wallet/providers", async (req: Request, res: Response) => {
    const providers = await storage.getPaymentProviders();
    res.json({ providers });
  });

  // ===== P2P TRANSFER ROUTES =====

  // Lookup user by phone (for transfers)
  app.get("/api/user/lookup", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ message: "رقم الهاتف مطلوب" });

    const user = await storage.getUserByPhone(phone as string);
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }
    if (user.id === req.session.userId) {
      return res.status(400).json({ message: "لا يمكن التحويل لنفسك" });
    }
    res.json({
      id: user.id,
      name: user.name || "مستخدم",
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    });
  });

  // Estimate transfer fee
  app.post("/api/user/transfer/estimate", async (req: Request, res: Response) => {
    const { amount, method } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ message: "المبلغ غير صالح" });
    }

    let feeRate = 0;
    let fixedFee = 0;

    switch (method) {
      case "phone":
        feeRate = 0; // Free for internal transfers
        break;
      case "wallet":
        feeRate = 0.01; // 1%
        fixedFee = 2;
        break;
      case "bank":
      case "instapay":
        feeRate = 0.005; // 0.5%
        fixedFee = 5;
        break;
      default:
        feeRate = 0.01;
        fixedFee = 2;
    }

    const fee = Math.max(amt * feeRate + fixedFee, 1);
    const total = amt + fee;
    res.json({ amount: String(amt), fee: String(fee), total: String(total), feeRate, fixedFee });
  });

  // Create P2P transfer
  app.post("/api/user/transfer/create", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }

    const { receiverId, amount, method, description, providerName, receiverIdentifier, receiverName } = req.body;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ message: "المبلغ غير صالح" });
    }
    if (!receiverId && !receiverIdentifier) {
      return res.status(400).json({ message: "المستلم مطلوب" });
    }

    const sender = await storage.getUser(req.session.userId);
    if (!sender) return res.status(404).json({ message: "المرسل غير موجود" });

    // Calculate fee
    let feeRate = 0;
    let fixedFee = 0;
    switch (method) {
      case "phone": feeRate = 0; fixedFee = 0; break;
      case "wallet": feeRate = 0.01; fixedFee = 2; break;
      case "bank":
      case "instapay": feeRate = 0.005; fixedFee = 5; break;
      default: feeRate = 0.01; fixedFee = 2;
    }
    const fee = Math.max(amt * feeRate + fixedFee, method === "phone" ? 0 : 1);
    const total = amt + fee;

    const available = parseFloat(sender.walletBalance || "0") - parseFloat(sender.frozenBalance || "0");
    if (total > available) {
      return res.status(400).json({ message: "الرصيد غير كافٍ" });
    }

    // Resolve receiver
    let receiver = null;
    if (receiverId) {
      receiver = await storage.getUser(receiverId);
    } else if (receiverIdentifier) {
      receiver = await storage.getUserByPhone(receiverIdentifier);
    }
    if (!receiver && method === "phone") {
      return res.status(404).json({ message: "المستلم غير موجود" });
    }

    const reference = generateReference();
    const transfer = await storage.createP2PTransfer({
      senderId: sender.id,
      receiverId: receiver?.id || "external",
      amount: String(amt),
      fee: String(fee),
      method,
      receiverIdentifier: receiverIdentifier || receiver?.phone || "",
      receiverName: receiverName || receiver?.name || "مستخدم خارجي",
      senderName: sender.name || sender.phone,
      status: "pending",
      description: description || "",
      referenceNumber: reference,
      providerName: providerName || "",
    });

    res.json({
      transferId: transfer.id,
      reference,
      amount: String(amt),
      fee: String(fee),
      total: String(total),
      receiverName: transfer.receiverName,
      receiverIdentifier: transfer.receiverIdentifier,
    });
  });

  // Confirm transfer with PIN
  app.post("/api/user/transfer/:id/confirm", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const { pin } = req.body;
    const transferId = req.params.id;

    const transfer = await storage.getP2PTransfer(transferId);
    if (!transfer) return res.status(404).json({ message: "التحويل غير موجود" });
    if (transfer.senderId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (transfer.status !== "pending") {
      return res.status(400).json({ message: "التحويل ليس قيد الانتظار" });
    }

    const sender = await storage.getUser(req.session.userId);
    if (!sender) return res.status(404).json({ message: "المرسل غير موجود" });

    // Verify PIN (for demo, accept any 4 digits if no pin set)
    if (sender.pin) {
      const pinMatch = await bcrypt.compare(pin, sender.pin);
      if (!pinMatch) {
        return res.status(400).json({ message: "كود PIN غير صحيح" });
      }
    }

    // Double-check balance
    const amt = parseFloat(transfer.amount);
    const fee = parseFloat(transfer.fee);
    const total = amt + fee;
    const available = parseFloat(sender.walletBalance || "0") - parseFloat(sender.frozenBalance || "0");
    if (total > available) {
      await storage.updateP2PTransfer(transferId, { status: "failed" });
      return res.status(400).json({ message: "الرصيد غير كافٍ" });
    }

    // Deduct from sender
    const senderNewBalance = String(parseFloat(sender.walletBalance || "0") - total);
    await storage.updateUser(sender.id, { walletBalance: senderNewBalance });

    await storage.createUserTransaction({
      userId: sender.id,
      type: "transfer_sent",
      amount: String(amt),
      balanceAfter: senderNewBalance,
      feeAmount: String(fee),
      description: `تحويل إلى ${transfer.receiverName}`,
      relatedId: transfer.id,
      counterpartyId: transfer.receiverId,
      counterpartyName: transfer.receiverName,
      status: "completed",
      referenceNumber: transfer.referenceNumber,
    });

    // Credit receiver if internal
    if (transfer.receiverId !== "external") {
      const receiver = await storage.getUser(transfer.receiverId);
      if (receiver) {
        const receiverNewBalance = String(parseFloat(receiver.walletBalance || "0") + amt);
        await storage.updateUser(receiver.id, { walletBalance: receiverNewBalance });

        await storage.createUserTransaction({
          userId: receiver.id,
          type: "transfer_received",
          amount: String(amt),
          balanceAfter: receiverNewBalance,
          feeAmount: "0",
          description: `تحويل من ${sender.name || sender.phone}`,
          relatedId: transfer.id,
          counterpartyId: sender.id,
          counterpartyName: sender.name || sender.phone,
          status: "completed",
          referenceNumber: transfer.referenceNumber,
        });

        await storage.createUserNotification({
          userId: receiver.id,
          type: "transfer",
          title: "تحويل وارد",
          message: `استلمت ${amt} ج.م من ${sender.name || sender.phone}`,
          relatedId: transfer.id,
        });
      }
    }

    await storage.updateP2PTransfer(transferId, {
      status: "completed",
      otpVerified: true,
      completedAt: new Date(),
    });

    res.json({
      success: true,
      reference: transfer.referenceNumber,
      newBalance: senderNewBalance,
    });
  });

  // Get transfer history
  app.get("/api/user/transfer/history", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const transfers = await storage.getTransfersByUser(req.session.userId, 50);
    res.json({ transfers });
  });

  // Get transfer details
  app.get("/api/user/transfer/:id", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const transfer = await storage.getP2PTransfer(req.params.id);
    if (!transfer) return res.status(404).json({ message: "التحويل غير موجود" });
    if (transfer.senderId !== req.session.userId && transfer.receiverId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    res.json({ transfer });
  });

  // Generate QR code data
  app.get("/api/user/my-qr", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });
    res.json({
      qrData: JSON.stringify({ userId: user.id, name: user.name || "مستخدم", phone: user.phone }),
      userId: user.id,
      name: user.name,
      phone: user.phone,
    });
  });

  // ===== BENEFICIARIES =====

  app.get("/api/user/beneficiaries", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const beneficiaries = await storage.getBeneficiaries(req.session.userId);
    res.json({ beneficiaries });
  });

  app.post("/api/user/beneficiaries", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const { name, identifier, type, bankName } = req.body;
    if (!name || !identifier || !type) {
      return res.status(400).json({ message: "بيانات ناقصة" });
    }
    const beneficiary = await storage.createBeneficiary({
      userId: req.session.userId,
      name,
      identifier,
      type,
      bankName: bankName || null,
    });
    res.json({ beneficiary });
  });

  app.delete("/api/user/beneficiaries/:id", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    await storage.deleteBeneficiary(req.params.id);
    res.json({ deleted: true });
  });

  // ===== ESCROW ORDERS (KEY FEATURE) =====

  // Create escrow order
  app.post("/api/user/escrow/create", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }

    const {
      sellerId, productDescription, productValue,
      deliveryFeeRate, pickupAddress, deliveryAddress,
      deadlineHours, terms,
    } = req.body;

    const value = parseFloat(productValue);
    if (!value || value <= 0) {
      return res.status(400).json({ message: "قيمة المنتج غير صحيحة" });
    }
    if (!sellerId) {
      return res.status(400).json({ message: "البائع مطلوب" });
    }
    if (!productDescription) {
      return res.status(400).json({ message: "وصف المنتج مطلوب" });
    }

    const creator = await storage.getUser(req.session.userId);
    if (!creator) return res.status(404).json({ message: "المستخدم غير موجود" });

    const seller = await storage.getUser(sellerId);
    if (!seller) return res.status(404).json({ message: "البائع غير موجود" });

    const dFeeRate = parseFloat(deliveryFeeRate) || 0.02;
    const dFeeAmount = value * dFeeRate;
    const pFeeRate = 0.005; // 0.5% platform fee
    const pFeeAmount = value * pFeeRate;
    const frozenAmount = value + pFeeAmount;

    const available = parseFloat(creator.walletBalance || "0") - parseFloat(creator.frozenBalance || "0");
    if (frozenAmount > available) {
      return res.status(400).json({ message: "الرصيد غير كافٍ للتجميد" });
    }

    // Freeze the amount
    const newFrozen = String(parseFloat(creator.frozenBalance || "0") + frozenAmount);
    await storage.updateUser(creator.id, { frozenBalance: newFrozen });

    const orderNumber = generateOrderNumber();
    const confirmationCode = generateConfirmationCode();

    const order = await storage.createEscrowOrder({
      creatorId: creator.id,
      sellerId: seller.id,
      orderNumber,
      productDescription,
      productValue: String(value),
      deliveryFeeRate: String(dFeeRate),
      deliveryFeeAmount: String(dFeeAmount),
      platformFeeRate: String(pFeeRate),
      platformFeeAmount: String(pFeeAmount),
      frozenAmount: String(frozenAmount),
      status: "pending",
      terms: terms || { deliveryDeadlineHours: deadlineHours || 72, inspectionPeriodHours: 24, returnAllowed: true },
      pickupAddress: pickupAddress || "",
      deliveryAddress: deliveryAddress || "",
      confirmationCode,
      creatorName: creator.name || creator.phone,
      sellerName: seller.name || seller.phone,
      deadlineHours: deadlineHours || 72,
    });

    // Create tracking event
    await storage.createEscrowTracking({
      escrowOrderId: order.id,
      status: "created",
      notes: "تم إنشاء طلب التوصيل الآمن",
      createdBy: creator.id,
      createdByName: creator.name || creator.phone,
    });

    // Create wallet transaction
    await storage.createUserTransaction({
      userId: creator.id,
      type: "escrow_freeze",
      amount: String(frozenAmount),
      balanceAfter: creator.walletBalance,
      feeAmount: "0",
      description: `تجميد رصيد لطلب ${orderNumber}`,
      relatedId: order.id,
      counterpartyId: seller.id,
      counterpartyName: seller.name || seller.phone,
      status: "completed",
      referenceNumber: generateReference(),
    });

    // Notify seller
    await storage.createUserNotification({
      userId: seller.id,
      type: "escrow",
      title: "طلب شراء جديد",
      message: `${creator.name || creator.phone} يريد شراء ${productDescription} بقيمة ${value} ج.م`,
      relatedId: order.id,
    });

    res.json({
      success: true,
      orderId: order.id,
      orderNumber,
      confirmationCode,
      frozenAmount: String(frozenAmount),
      deliveryFee: String(dFeeAmount),
      platformFee: String(pFeeAmount),
    });
  });

  // Get escrow order details
  app.get("/api/user/escrow/:id", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const order = await storage.getEscrowOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });

    // Check if user is involved
    const userId = req.session.userId;
    if (order.creatorId !== userId && order.sellerId !== userId && order.deliveryPersonId !== userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const tracking = await storage.getEscrowTracking(order.id);
    res.json({ order, tracking });
  });

  // Get user's escrow orders
  app.get("/api/user/escrow/my-orders", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const userId = req.session.userId;
    const asBuyer = await storage.getEscrowOrdersByCreator(userId);
    const asSeller = await storage.getEscrowOrdersBySeller(userId);
    const asDelivery = await storage.getEscrowOrdersByDeliveryPerson(userId);
    res.json({ asBuyer, asSeller, asDelivery });
  });

  // Get available escrow orders (for delivery persons)
  app.get("/api/user/escrow/available", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const orders = await storage.getAvailableEscrowOrders();
    res.json({ orders });
  });

  // Accept as delivery person
  app.post("/api/user/escrow/:id/accept", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const order = await storage.getEscrowOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    if (order.status !== "pending") {
      return res.status(400).json({ message: "الطلب غير متاح" });
    }
    if (order.creatorId === req.session.userId || order.sellerId === req.session.userId) {
      return res.status(400).json({ message: "لا يمكنك قبول طلبك" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    const updated = await storage.updateEscrowOrder(order.id, {
      deliveryPersonId: user.id,
      deliveryPersonName: user.name || user.phone,
      status: "accepted",
      acceptedAt: new Date(),
    });

    await storage.createEscrowTracking({
      escrowOrderId: order.id,
      status: "accepted",
      notes: `قبل المندوب ${user.name || user.phone} الطلب`,
      createdBy: user.id,
      createdByName: user.name || user.phone,
    });

    // Notify buyer and seller
    await storage.createUserNotification({
      userId: order.creatorId,
      type: "escrow",
      title: "تم قبول طلبك",
      message: `${user.name || user.phone} قبل طلب التوصيل`,
      relatedId: order.id,
    });
    await storage.createUserNotification({
      userId: order.sellerId,
      type: "escrow",
      title: "مندوب للتوصيل",
      message: `${user.name || user.phone} سيقوم بتوصيل ${order.productDescription}`,
      relatedId: order.id,
    });

    res.json({ success: true, order: updated });
  });

  // Confirm pickup from seller
  app.post("/api/user/escrow/:id/pickup", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const order = await storage.getEscrowOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    if (order.deliveryPersonId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (order.status !== "accepted") {
      return res.status(400).json({ message: "الحالة غير صحيحة" });
    }

    const updated = await storage.updateEscrowOrder(order.id, {
      status: "picked_up",
      pickedUpAt: new Date(),
    });

    await storage.createEscrowTracking({
      escrowOrderId: order.id,
      status: "picked_up",
      notes: "تم استلام المنتج من البائع",
      createdBy: req.session.userId,
      createdByName: order.deliveryPersonName || "المندوب",
    });

    await storage.createUserNotification({
      userId: order.creatorId,
      type: "escrow",
      title: "تم استلام المنتج",
      message: `المندوب استلم ${order.productDescription} من البائع`,
      relatedId: order.id,
    });

    res.json({ success: true, order: updated });
  });

  // Confirm delivery to buyer
  app.post("/api/user/escrow/:id/deliver", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const order = await storage.getEscrowOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    if (order.deliveryPersonId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (order.status !== "picked_up") {
      return res.status(400).json({ message: "الحالة غير صحيحة" });
    }

    const updated = await storage.updateEscrowOrder(order.id, {
      status: "delivered",
      deliveredAt: new Date(),
    });

    await storage.createEscrowTracking({
      escrowOrderId: order.id,
      status: "delivered",
      notes: "تم التوصيل للمشتري - في انتظار التأكيد",
      createdBy: req.session.userId,
      createdByName: order.deliveryPersonName || "المندوب",
    });

    await storage.createUserNotification({
      userId: order.creatorId,
      type: "escrow",
      title: "تم التوصيل!",
      message: `وصلك ${order.productDescription} - يرجى تأكيد الاستلام`,
      relatedId: order.id,
    });

    res.json({ success: true, order: updated });
  });

  // Buyer confirms receipt → release funds
  app.post("/api/user/escrow/:id/confirm", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const order = await storage.getEscrowOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    if (order.creatorId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (order.status !== "delivered") {
      return res.status(400).json({ message: "الحالة غير صحيحة" });
    }

    const { confirmationCode } = req.body;
    if (confirmationCode !== order.confirmationCode) {
      return res.status(400).json({ message: "كود التأكيد غير صحيح" });
    }

    // Release funds
    const seller = await storage.getUser(order.sellerId);
    const deliveryPerson = order.deliveryPersonId ? await storage.getUser(order.deliveryPersonId) : null;
    const buyer = await storage.getUser(order.creatorId);
    if (!seller || !buyer) return res.status(500).json({ message: "خطأ في البيانات" });

    // Unfreeze from buyer
    const buyerNewFrozen = String(parseFloat(buyer.frozenBalance || "0") - parseFloat(order.frozenAmount));
    await storage.updateUser(buyer.id, { frozenBalance: buyerNewFrozen });

    // Credit seller (product value - delivery fee)
    const sellerAmount = parseFloat(order.productValue) - parseFloat(order.deliveryFeeAmount);
    const sellerNewBalance = String(parseFloat(seller.walletBalance || "0") + sellerAmount);
    await storage.updateUser(seller.id, { walletBalance: sellerNewBalance });

    await storage.createUserTransaction({
      userId: seller.id,
      type: "escrow_release",
      amount: String(sellerAmount),
      balanceAfter: sellerNewBalance,
      feeAmount: order.deliveryFeeAmount,
      description: `بيع ${order.productDescription} - طلب ${order.orderNumber}`,
      relatedId: order.id,
      counterpartyId: buyer.id,
      counterpartyName: buyer.name || buyer.phone,
      status: "completed",
      referenceNumber: generateReference(),
    });

    // Credit delivery person
    if (deliveryPerson) {
      const deliveryNewBalance = String(parseFloat(deliveryPerson.walletBalance || "0") + parseFloat(order.deliveryFeeAmount));
      await storage.updateUser(deliveryPerson.id, { walletBalance: deliveryNewBalance });

      await storage.createUserTransaction({
        userId: deliveryPerson.id,
        type: "escrow_delivery_fee",
        amount: order.deliveryFeeAmount,
        balanceAfter: deliveryNewBalance,
        feeAmount: "0",
        description: `عمولة توصيل - طلب ${order.orderNumber}`,
        relatedId: order.id,
        counterpartyId: buyer.id,
        counterpartyName: buyer.name || buyer.phone,
        status: "completed",
        referenceNumber: generateReference(),
      });

      await storage.createUserNotification({
        userId: deliveryPerson.id,
        type: "escrow",
        title: "تم استلام العمولة",
        message: `استلمت ${order.deliveryFeeAmount} ج.م لتوصيل ${order.productDescription}`,
        relatedId: order.id,
      });
    }

    // Buyer transaction (funds released)
    await storage.createUserTransaction({
      userId: buyer.id,
      type: "escrow_release",
      amount: order.frozenAmount,
      balanceAfter: buyer.walletBalance,
      feeAmount: order.platformFeeAmount,
      description: `إفراج عن رصيد مجمّد - طلب ${order.orderNumber}`,
      relatedId: order.id,
      counterpartyId: seller.id,
      counterpartyName: seller.name || seller.phone,
      status: "completed",
      referenceNumber: generateReference(),
    });

    const updated = await storage.updateEscrowOrder(order.id, {
      status: "released",
      completedAt: new Date(),
    });

    await storage.createEscrowTracking({
      escrowOrderId: order.id,
      status: "confirmed",
      notes: "أكد المشتري الاستلام - تم إفراج عن الأموال",
      createdBy: buyer.id,
      createdByName: buyer.name || buyer.phone,
    });

    // Notify seller
    await storage.createUserNotification({
      userId: seller.id,
      type: "escrow",
      title: "تم بيع منتجك!",
      message: `استلمت ${sellerAmount} ج.م لبيع ${order.productDescription}`,
      relatedId: order.id,
    });

    res.json({
      success: true,
      order: updated,
      sellerAmount: String(sellerAmount),
      deliveryFee: order.deliveryFeeAmount,
      platformFee: order.platformFeeAmount,
    });
  });

  // Buyer rejects → refund
  app.post("/api/user/escrow/:id/reject", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const order = await storage.getEscrowOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    if (order.creatorId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (order.status !== "delivered") {
      return res.status(400).json({ message: "الحالة غير صحيحة" });
    }

    const buyer = await storage.getUser(order.creatorId);
    if (!buyer) return res.status(500).json({ message: "خطأ" });

    // Refund frozen amount to buyer
    const newFrozen = String(parseFloat(buyer.frozenBalance || "0") - parseFloat(order.frozenAmount));
    const newBalance = String(parseFloat(buyer.walletBalance || "0") + parseFloat(order.frozenAmount) - parseFloat(order.platformFeeAmount));
    await storage.updateUser(buyer.id, {
      frozenBalance: newFrozen,
      walletBalance: newBalance,
    });

    // Give delivery person attempt fee (from platform fee)
    if (order.deliveryPersonId) {
      const deliveryPerson = await storage.getUser(order.deliveryPersonId);
      if (deliveryPerson) {
        const attemptFee = Math.min(parseFloat(order.platformFeeAmount), 25); // max 25 EGP attempt fee
        const deliveryNewBalance = String(parseFloat(deliveryPerson.walletBalance || "0") + attemptFee);
        await storage.updateUser(deliveryPerson.id, { walletBalance: deliveryNewBalance });

        await storage.createUserTransaction({
          userId: deliveryPerson.id,
          type: "escrow_delivery_fee",
          amount: String(attemptFee),
          balanceAfter: deliveryNewBalance,
          feeAmount: "0",
          description: `رسوم محاولة توصيل - طلب ${order.orderNumber}`,
          relatedId: order.id,
          status: "completed",
          referenceNumber: generateReference(),
        });
      }
    }

    await storage.createUserTransaction({
      userId: buyer.id,
      type: "escrow_refund",
      amount: String(parseFloat(order.frozenAmount) - parseFloat(order.platformFeeAmount)),
      balanceAfter: newBalance,
      feeAmount: order.platformFeeAmount,
      description: `استرداد - طلب ${order.orderNumber}`,
      relatedId: order.id,
      status: "completed",
      referenceNumber: generateReference(),
    });

    const updated = await storage.updateEscrowOrder(order.id, {
      status: "refunded",
      completedAt: new Date(),
    });

    await storage.createEscrowTracking({
      escrowOrderId: order.id,
      status: "rejected",
      notes: "رفض المشتري الاستلام - تم استرداد المبلغ",
      createdBy: buyer.id,
      createdByName: buyer.name || buyer.phone,
    });

    // Notify seller and delivery
    await storage.createUserNotification({
      userId: order.sellerId,
      type: "escrow",
      title: "تم رفض الاستلام",
      message: `تم رفض استلام ${order.productDescription} - سيُعاد المنتج`,
      relatedId: order.id,
    });

    res.json({ success: true, order: updated });
  });

  // Cancel escrow order (before acceptance)
  app.post("/api/user/escrow/:id/cancel", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const order = await storage.getEscrowOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    if (order.creatorId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (order.status !== "pending") {
      return res.status(400).json({ message: "لا يمكن الإلغاء في هذه الحالة" });
    }

    // Unfreeze and refund
    const buyer = await storage.getUser(order.creatorId);
    if (!buyer) return res.status(500).json({ message: "خطأ" });

    const newFrozen = String(parseFloat(buyer.frozenBalance || "0") - parseFloat(order.frozenAmount));
    await storage.updateUser(buyer.id, { frozenBalance: newFrozen });

    await storage.createUserTransaction({
      userId: buyer.id,
      type: "escrow_refund",
      amount: order.frozenAmount,
      balanceAfter: buyer.walletBalance,
      feeAmount: "0",
      description: `إلغاء طلب ${order.orderNumber} - استرداد كامل`,
      relatedId: order.id,
      status: "completed",
      referenceNumber: generateReference(),
    });

    const updated = await storage.updateEscrowOrder(order.id, {
      status: "cancelled",
      completedAt: new Date(),
    });

    await storage.createEscrowTracking({
      escrowOrderId: order.id,
      status: "cancelled",
      notes: "تم إلغاء الطلب - استرداد كامل",
      createdBy: buyer.id,
      createdByName: buyer.name || buyer.phone,
    });

    res.json({ success: true, order: updated });
  });

  // Get tracking timeline
  app.get("/api/user/escrow/:id/track", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const order = await storage.getEscrowOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    const tracking = await storage.getEscrowTracking(order.id);
    res.json({ order, tracking });
  });

  // Add tracking event (delivery person)
  app.post("/api/user/escrow/:id/tracking", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const order = await storage.getEscrowOrder(req.params.id);
    if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
    if (order.deliveryPersonId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const user = await storage.getUser(req.session.userId);
    const tracking = await storage.createEscrowTracking({
      escrowOrderId: order.id,
      status: req.body.status || "in_transit",
      location: req.body.location || null,
      notes: req.body.notes || "",
      photos: req.body.photos || null,
      createdBy: user!.id,
      createdByName: user!.name || user!.phone,
    });

    // Update order status if in_transit
    if (req.body.status === "in_transit" && order.status === "picked_up") {
      await storage.updateEscrowOrder(order.id, { status: "in_transit" });
    }

    res.json({ success: true, tracking });
  });

  // ===== USER NOTIFICATIONS =====

  app.get("/api/user/notifications", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const notifications = await storage.getUserNotifications(req.session.userId, 20);
    const unreadCount = await storage.getUserUnreadCount(req.session.userId);
    res.json({ notifications, unreadCount });
  });

  app.post("/api/user/notifications/read", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    await storage.markUserNotificationsRead(req.session.userId);
    res.json({ success: true });
  });

  // ===== ADMIN: User platform stats =====

  app.get("/api/admin/user-stats", async (req: Request, res: Response) => {
    if (!req.session?.adminLoggedIn && !req.session?.proAdminLoggedIn) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const allUsers = await storage.getAllUsers();
    const allEscrow = await storage.getAllEscrowOrders();

    const totalTransferVolume = await db.select({
      total: sql<string>`COALESCE(SUM(${p2pTransfers.amount}), 0)`,
    }).from(p2pTransfers).where(eq(p2pTransfers.status, "completed"));

    const totalEscrowVolume = allEscrow.reduce((sum, o) => sum + parseFloat(o.frozenAmount || "0"), 0);
    const platformRevenue = allEscrow
      .filter(o => o.status === "released")
      .reduce((sum, o) => sum + parseFloat(o.platformFeeAmount || "0"), 0);

    res.json({
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.isActive).length,
      totalEscrowOrders: allEscrow.length,
      pendingEscrow: allEscrow.filter(o => o.status === "pending").length,
      totalTransferVolume: totalTransferVolume[0]?.total || "0",
      totalEscrowVolume: String(totalEscrowVolume),
      platformRevenue: String(platformRevenue),
    });
  });
}
