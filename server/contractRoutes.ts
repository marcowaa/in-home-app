import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { db } from "./db";
import { eq, desc, or, and, sql } from "drizzle-orm";
import { p2pTransfers, flexibleContracts } from "@shared/schema";

function generateContractNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `CON${timestamp}${random}`;
}

function generateReference(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, "0");
  return `INH${timestamp}${random}`;
}

function generateConfirmationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: get the other party's ID
function otherPartyId(contract: any, userId: string): string {
  return userId === contract.creatorId ? contract.counterpartyId : contract.creatorId;
}

export function registerContractRoutes(app: Express) {

  // ===== AUTO-EXPIRY CHECK (runs on each contracts query) =====

  app.use("/api/user/contracts", async (req: Request, res: Response, next: any) => {
    try {
      const now = new Date();
      // Expire pending contracts past autoExpiredAt
      const pendingContracts = await storage.getContractsByStatus("pending");
      for (const c of pendingContracts) {
        if (c.autoExpiredAt && new Date(c.autoExpiredAt) < now) {
          // Refund frozen amount
          const creator = await storage.getUser(c.creatorId);
          if (creator) {
            const newFrozen = String(Math.max(parseFloat(creator.frozenBalance || "0") - parseFloat(c.frozenAmount || "0"), 0));
            await storage.updateUser(creator.id, { frozenBalance: newFrozen });
            await storage.createUserTransaction({
              userId: creator.id,
              type: "escrow_refund",
              amount: c.frozenAmount,
              balanceAfter: creator.walletBalance,
              feeAmount: "0",
              description: `انتهاء صلاحية عقد ${c.contractNumber} - استرداد تلقائي`,
              relatedId: c.id,
              status: "completed",
              referenceNumber: generateReference(),
            });
          }
          await storage.updateContract(c.id, { status: "expired", cancelledAt: now });
          await storage.createContractTracking({
            contractId: c.id,
            status: "expired",
            notes: "انتهت صلاحية العقد تلقائياً — استرداد كامل",
            createdBy: "system",
            createdByName: "النظام",
          });
        }
      }
    } catch (e) { /* silent fail, don't block requests */ }
    next();
  });

  // ===== CONTRACT TEMPLATES =====

  app.get("/api/user/contracts/templates", async (req: Request, res: Response) => {
    const templates = await storage.getContractTemplates();
    res.json({ templates });
  });

  // ===== CONTRACT RULES (read-only for users) =====

  app.get("/api/user/contracts/rules", async (req: Request, res: Response) => {
    const rules = await storage.getAllContractRules();
    res.json({ rules });
  });

  // ===== CONTRACT SUGGESTIONS (autocomplete) =====

  // Search suggestions for a field
  app.get("/api/user/contracts/suggestions", async (req: Request, res: Response) => {
    const field = req.query.field as string;
    const q = (req.query.q as string) || "";
    const contractType = req.query.type as string;

    if (!field) {
      return res.status(400).json({ message: "الحقل مطلوب" });
    }

    const suggestions = await storage.searchSuggestions(field, q, contractType);
    res.json({ suggestions: suggestions.map(s => ({ value: s.value, usageCount: s.usageCount })) });
  });

  // Save a new suggestion (when user types something not in the list)
  app.post("/api/user/contracts/suggestions", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }

    const { field, value, contractType } = req.body;
    if (!field || !value || value.trim().length < 2) {
      return res.status(400).json({ message: "بيانات ناقصة" });
    }

    const suggestion = await storage.createOrIncrementSuggestion(
      field,
      value.trim(),
      contractType || "all",
      req.session.userId,
    );
    res.json({ success: true, suggestion: { value: suggestion.value, usageCount: suggestion.usageCount } });
  });

  // ===== CREATE CONTRACT =====

  app.post("/api/user/contracts/create", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }

    const {
      type, counterpartyId, title, description, totalAmount,
      deliveryFeeRate, pickupAddress, deliveryAddress,
      deadlineHours, inspectionPeriodHours, terms, milestones,
      creatorRole, isPublic, requiredFreezeRate,
    } = req.body;

    // Validation
    if (!type || !title || !description || !totalAmount) {
      return res.status(400).json({ message: "بيانات ناقصة" });
    }
    const amt = parseFloat(totalAmount);
    if (!amt || amt <= 0) {
      return res.status(400).json({ message: "المبلغ غير صحيح" });
    }

    const role = creatorRole || "seeker";
    const isPub = isPublic || false;

    // If not public, counterpartyId is required
    if (!isPub && !counterpartyId) {
      return res.status(400).json({ message: "حدد الطرف الآخر أو اجعل العقد عاماً" });
    }

    // Fetch contract rules
    const rules = await storage.getContractRule(type);
    if (!rules) {
      return res.status(400).json({ message: "نوع عقد غير مدعوم" });
    }

    // Amount limits
    if (rules.minAmount && amt < parseFloat(rules.minAmount)) {
      return res.status(400).json({ message: `الحد الأدنى ${rules.minAmount} ج.م` });
    }
    if (rules.maxAmount && amt > parseFloat(rules.maxAmount)) {
      return res.status(400).json({ message: `الحد الأقصى ${rules.maxAmount} ج.م` });
    }

    // KYC limits
    const creator = await storage.getUser(req.session.userId);
    if (!creator) return res.status(404).json({ message: "المستخدم غير موجود" });

    const kycLimits: Record<string, { daily: number; perContract: number }> = {
      none: { daily: 5000, perContract: 2000 },
      basic: { daily: 50000, perContract: 20000 },
      verified: { daily: 500000, perContract: 200000 },
    };
    const kycLevel = creator.kycStatus || "none";
    const limit = kycLimits[kycLevel] || kycLimits.none;

    if (rules.requireKyc === "verified" && kycLevel !== "verified") {
      return res.status(403).json({ message: "هذا النوع يتطلب توثيق الهوية الكامل" });
    }
    if (rules.requireKyc === "basic" && kycLevel === "none") {
      return res.status(403).json({ message: "هذا النوع يتطلب على الأقل توثيق أساسي" });
    }
    if (amt > limit.perContract) {
      return res.status(400).json({ message: `حد المبلغ لعقد واحد مع مستوى التوثيق الحالي: ${limit.perContract} ج.م` });
    }

    const counterparty = counterpartyId ? await storage.getUser(counterpartyId) : null;
    if (counterparty && counterparty.id === creator.id) {
      return res.status(400).json({ message: "لا يمكن إنشاء عقد مع نفسك" });
    }

    // Service: validate milestones sum = total
    if (type === "service" && milestones && Array.isArray(milestones) && milestones.length > 0) {
      const sum = milestones.reduce((s: number, m: any) => s + (parseFloat(m.amount) || 0), 0);
      if (Math.abs(sum - amt) > 0.01) {
        return res.status(400).json({ message: `مجموع المراحل (${sum}) يجب أن يساوي المبلغ الإجمالي (${amt})` });
      }
      if (milestones.length > (rules.maxMilestones || 10)) {
        return res.status(400).json({ message: `الحد الأقصى للمراحل: ${rules.maxMilestones}` });
      }
    }

    const pFeeRate = parseFloat(rules.platformFeeRate || "0.005");
    const dFeeRate = parseFloat(deliveryFeeRate) || 0;
    const dFeeAmount = amt * dFeeRate;
    const pFeeAmount = amt * pFeeRate;

    // Rental: deposit
    let depositAmount = 0;
    if (type === "rental" && rules.depositRequired) {
      depositAmount = amt * parseFloat(rules.depositRate || "0.1");
    }

    // Required freeze from the OTHER party (security deposit)
    const reqFreezeRate = parseFloat(requiredFreezeRate) || 0;
    const reqFreezeAmount = amt * reqFreezeRate;

    // Freeze logic:
    // - seeker: freezes product value + platform fee from their wallet
    // - provider: doesn't freeze (the acceptor/seeker will pay when accepting)
    let frozenFromCreator = 0;
    if (role === "seeker") {
      frozenFromCreator = amt + pFeeAmount + depositAmount;
    } else {
      // provider: only pays platform fee
      frozenFromCreator = pFeeAmount;
    }

    if (frozenFromCreator > 0) {
      const available = parseFloat(creator.walletBalance || "0") - parseFloat(creator.frozenBalance || "0");
      if (frozenFromCreator > available) {
        return res.status(400).json({ message: "الرصيد غير كافٍ" });
      }
      const newFrozen = String(parseFloat(creator.frozenBalance || "0") + frozenFromCreator);
      await storage.updateUser(creator.id, { frozenBalance: newFrozen });
    }

    const frozenAmount = frozenFromCreator;

    const contractNumber = generateContractNumber();
    const confirmationCode = generateConfirmationCode();

    // Auto-expire date
    const autoExpireHours = rules.autoExpireHours || 72;
    const autoExpiredAt = new Date(Date.now() + autoExpireHours * 60 * 60 * 1000);

    const contract = await storage.createContract({
      contractNumber,
      type,
      status: "pending",
      creatorId: creator.id,
      counterpartyId: counterparty?.id || null,
      title,
      description,
      totalAmount: String(amt),
      platformFeeRate: String(pFeeRate),
      platformFeeAmount: String(pFeeAmount),
      frozenAmount: String(frozenAmount),
      deliveryFeeRate: String(dFeeRate),
      deliveryFeeAmount: String(dFeeAmount),
      terms: { ...(terms || { deliveryDeadlineHours: deadlineHours || 72, inspectionPeriodHours: inspectionPeriodHours || rules.inspectionPeriodDefault || 24, returnAllowed: true }) },
      milestones: milestones || null,
      pickupAddress: pickupAddress || null,
      deliveryAddress: deliveryAddress || null,
      confirmationCode,
      creatorName: creator.name || creator.phone,
      counterpartyName: counterparty?.name || counterparty?.phone || null,
      deadlineHours: deadlineHours || autoExpireHours,
      inspectionPeriodHours: inspectionPeriodHours || rules.inspectionPeriodDefault || 24,
      depositAmount: String(depositAmount),
      maxExtensions: rules.maxExtensions || 2,
      autoExpiredAt,
      creatorRole: role,
      isPublic: isPub,
      requiredFreezeRate: String(reqFreezeRate),
      requiredFreezeAmount: String(reqFreezeAmount),
    });

    // Create milestones if provided (for service type)
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      for (let i = 0; i < milestones.length; i++) {
        const m = milestones[i];
        await storage.createMilestone({
          contractId: contract.id,
          title: m.title,
          description: m.description || "",
          amount: String(m.amount),
          status: "pending",
          dueDate: m.dueDate ? new Date(m.dueDate) : null,
          sortOrder: i,
        });
      }
    }

    // Create tracking event
    await storage.createContractTracking({
      contractId: contract.id,
      status: "created",
      notes: `تم إنشاء عقد ${type} بقيمة ${amt} ج.م${depositAmount > 0 ? ` + وديعة ${depositAmount}` : ""} (${role === "seeker" ? "طالب خدمة" : "مقدم خدمة"})`,
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
      description: `تجميد رصيد لعقد ${contractNumber}`,
      relatedId: contract.id,
      counterpartyId: counterparty?.id || null,
      counterpartyName: counterparty?.name || counterparty?.phone || null,
      status: "completed",
      referenceNumber: generateReference(),
    });

    // Auto-save suggestions for future use
    if (title) await storage.createOrIncrementSuggestion("title", title, type, creator.id);
    if (description) await storage.createOrIncrementSuggestion("description", description, type, creator.id);
    if (pickupAddress) await storage.createOrIncrementSuggestion("pickupAddress", pickupAddress, type, creator.id);
    if (deliveryAddress) await storage.createOrIncrementSuggestion("deliveryAddress", deliveryAddress, type, creator.id);

    // Notify counterparty (only if specified — skip for public contracts)
    if (counterparty) {
      await storage.createUserNotification({
        userId: counterparty.id,
        type: "contract",
        title: "عقد جديد بانتظارك",
        message: `${creator.name || creator.phone} أرسل لك عقد ${type}: ${title} بقيمة ${amt} ج.م`,
        relatedId: contract.id,
      });

      // Send confirmation code to counterparty only (for purchase type)
      if (type === "purchase" && rules.requireConfirmationCode) {
        await storage.createUserNotification({
          userId: counterparty.id,
          type: "contract",
          title: `كود تأكيد عقد ${contractNumber}`,
          message: `كود التأكيد: ${confirmationCode}`,
          relatedId: contract.id,
        });
      }
    }

    res.json({
      success: true,
      contractId: contract.id,
      contractNumber,
      frozenAmount: String(frozenAmount),
      platformFee: String(pFeeAmount),
      deliveryFee: String(dFeeAmount),
      depositAmount: String(depositAmount),
      requiredFreezeAmount: String(reqFreezeAmount),
      confirmationCode: type !== "purchase" ? confirmationCode : undefined,
    });
  });

  // ===== PUBLIC MARKETPLACE (no auth required) =====

  app.get("/api/public/contracts", async (req: Request, res: Response) => {
    const contractType = req.query.type as string;
    let contracts = await storage.getAvailableContracts();
    // Only public contracts
    contracts = contracts.filter((c: any) => c.isPublic === true);
    if (contractType) {
      contracts = contracts.filter((c: any) => c.type === contractType);
    }
    res.json({ contracts });
  });

  // ===== LIST USER CONTRACTS =====

  app.get("/api/user/contracts", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const userId = req.session.userId;
    const asCreator = await storage.getContractsByCreator(userId);
    const asCounterparty = await storage.getContractsByCounterparty(userId);
    const asDelivery = await storage.getContractsByDeliveryPerson(userId);
    const available = await storage.getAvailableContracts();
    res.json({ asCreator, asCounterparty, asDelivery, available });
  });

  // ===== CONTRACT DETAILS =====

  app.get("/api/user/contracts/:id", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    const userId = req.session.userId;
    if (contract.creatorId !== userId && contract.counterpartyId !== userId && contract.deliveryPersonId !== userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const milestones = await storage.getMilestones(contract.id);
    const tracking = await storage.getContractTracking(contract.id);
    const reviews = await storage.getContractReviews(contract.id);
    res.json({ contract, milestones, tracking, reviews });
  });

  // ===== ACCEPT CONTRACT =====

  app.post("/api/user/contracts/:id/accept", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    const userId = req.session.userId;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "المستخدم غير موجود" });

    if (contract.status !== "pending") {
      return res.status(400).json({ message: "العقد غير متاح للقبول" });
    }

    // Public contract: anyone can accept (becomes counterparty)
    if (contract.isPublic) {
      // Can't accept your own contract
      if (contract.creatorId === userId) {
        return res.status(400).json({ message: "لا يمكنك قبول عقدك" });
      }

      // If required freeze from acceptor, freeze from their wallet
      const reqFreeze = parseFloat(contract.requiredFreezeAmount || "0");
      if (reqFreeze > 0) {
        const available = parseFloat(user.walletBalance || "0") - parseFloat(user.frozenBalance || "0");
        if (reqFreeze > available) {
          return res.status(400).json({ message: "الرصيد غير كافٍ للتجميد المطلوب" });
        }
        const newFrozen = String(parseFloat(user.frozenBalance || "0") + reqFreeze);
        await storage.updateUser(user.id, { frozenBalance: newFrozen });

        await storage.createUserTransaction({
          userId: user.id,
          type: "escrow_freeze",
          amount: String(reqFreeze),
          balanceAfter: user.walletBalance,
          feeAmount: "0",
          description: `تجميد لقبول عقد ${contract.contractNumber}`,
          relatedId: contract.id,
          counterpartyId: contract.creatorId,
          counterpartyName: contract.creatorName || "",
          status: "completed",
          referenceNumber: generateReference(),
        });
      }

      const updated = await storage.updateContract(contract.id, {
        counterpartyId: user.id,
        counterpartyName: user.name || user.phone,
        status: "accepted",
        acceptedAt: new Date(),
      });

      await storage.createContractTracking({
        contractId: contract.id,
        status: "accepted",
        notes: `قبل ${user.name || user.phone} العقد العام`,
        createdBy: user.id,
        createdByName: user.name || user.phone,
      });

      await storage.createUserNotification({
        userId: contract.creatorId,
        type: "contract",
        title: "تم قبول عقدك!",
        message: `${user.name || user.phone} قبل عقد ${contract.title}`,
        relatedId: contract.id,
      });

      return res.json({ success: true, contract: updated });
    }

    // Non-public: counterparty or delivery person
    if (contract.counterpartyId !== userId && contract.creatorId !== userId) {
      if (contract.type !== "purchase" && contract.type !== "rental" && contract.type !== "delivery") {
        return res.status(400).json({ message: "هذا النوع لا يدعم مندوب توصيل" });
      }
    }

    // If counterparty accepting
    if (contract.counterpartyId === userId) {
      const updated = await storage.updateContract(contract.id, {
        status: "accepted",
        acceptedAt: new Date(),
      });

      await storage.createContractTracking({
        contractId: contract.id,
        status: "accepted",
        notes: `قبل ${user.name || user.phone} العقد`,
        createdBy: user.id,
        createdByName: user.name || user.phone,
      });

      await storage.createUserNotification({
        userId: contract.creatorId,
        type: "contract",
        title: "تم قبول العقد",
        message: `${user.name || user.phone} قبل عقد ${contract.title}`,
        relatedId: contract.id,
      });

      res.json({ success: true, contract: updated });
    } else {
      // Delivery person accepting
      const updated = await storage.updateContract(contract.id, {
        deliveryPersonId: user.id,
        deliveryPersonName: user.name || user.phone,
        status: "accepted",
        acceptedAt: new Date(),
      });

      await storage.createContractTracking({
        contractId: contract.id,
        status: "accepted",
        notes: `قبل المندوب ${user.name || user.phone} التوصيل`,
        createdBy: user.id,
        createdByName: user.name || user.phone,
      });

      await storage.createUserNotification({
        userId: contract.creatorId,
        type: "contract",
        title: "تم قبول التوصيل",
        message: `${user.name || user.phone} سيقوم بتوصيل ${contract.title}`,
        relatedId: contract.id,
      });
      await storage.createUserNotification({
        userId: contract.counterpartyId,
        type: "contract",
        title: "مندوب توصيل",
        message: `${user.name || user.phone} سيقوم بتوصيل ${contract.title}`,
        relatedId: contract.id,
      });

      res.json({ success: true, contract: updated });
    }
  });

  // ===== REJECT CONTRACT (before acceptance) =====

  app.post("/api/user/contracts/:id/reject", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    if (contract.counterpartyId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status !== "pending") {
      return res.status(400).json({ message: "لا يمكن الرفض في هذه الحالة" });
    }

    // Refund frozen amount
    const creator = await storage.getUser(contract.creatorId);
    if (!creator) return res.status(500).json({ message: "خطأ" });

    const newFrozen = String(parseFloat(creator.frozenBalance || "0") - parseFloat(contract.frozenAmount));
    await storage.updateUser(creator.id, { frozenBalance: newFrozen });

    await storage.createUserTransaction({
      userId: creator.id,
      type: "escrow_refund",
      amount: contract.frozenAmount,
      balanceAfter: creator.walletBalance,
      feeAmount: "0",
      description: `رفض عقد ${contract.contractNumber} - استرداد كامل`,
      relatedId: contract.id,
      status: "completed",
      referenceNumber: generateReference(),
    });

    const updated = await storage.updateContract(contract.id, {
      status: "cancelled",
      cancelledAt: new Date(),
    });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "rejected",
      notes: "تم رفض العقد - استرداد كامل",
      createdBy: req.session.userId,
      createdByName: (await storage.getUser(req.session.userId))?.name || "",
    });

    await storage.createUserNotification({
      userId: contract.creatorId,
      type: "contract",
      title: "تم رفض العقد",
      message: `تم رفض عقد ${contract.title} - تم استرداد المبلغ`,
      relatedId: contract.id,
    });

    res.json({ success: true, contract: updated });
  });

  // ===== CANCEL CONTRACT (by creator, before acceptance) =====

  app.post("/api/user/contracts/:id/cancel", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    if (contract.creatorId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status !== "pending" && contract.status !== "accepted") {
      return res.status(400).json({ message: "لا يمكن الإلغاء في هذه الحالة" });
    }

    // Fetch rules for cancellation fee
    const rules = await storage.getContractRule(contract.type);
    let cancellationFee = 0;
    let refundAmount = parseFloat(contract.frozenAmount || "0");

    // Cancellation fee only after acceptance
    if (contract.status === "accepted" && rules) {
      const feeRate = parseFloat(rules.cancellationFeeRate || "0");
      const feeFixed = parseFloat(rules.cancellationFeeFixed || "0");
      cancellationFee = (parseFloat(contract.totalAmount || "0") * feeRate) + feeFixed;
      refundAmount = parseFloat(contract.frozenAmount || "0") - cancellationFee;
    }

    // Refund frozen amount minus cancellation fee
    const creator = await storage.getUser(contract.creatorId);
    if (!creator) return res.status(500).json({ message: "خطأ" });

    const newFrozen = String(parseFloat(creator.frozenBalance || "0") - parseFloat(contract.frozenAmount));
    await storage.updateUser(creator.id, { frozenBalance: newFrozen });

    // If cancellation fee, deduct from wallet
    if (cancellationFee > 0) {
      const newBalance = String(parseFloat(creator.walletBalance || "0") - cancellationFee);
      await storage.updateUser(creator.id, { walletBalance: newBalance });
    }

    await storage.createUserTransaction({
      userId: creator.id,
      type: "escrow_refund",
      amount: String(refundAmount),
      balanceAfter: creator.walletBalance,
      feeAmount: String(cancellationFee),
      description: `إلغاء عقد ${contract.contractNumber}${cancellationFee > 0 ? ` - رسوم إلغاء ${cancellationFee.toFixed(2)} ج.م` : " - استرداد كامل"}`,
      relatedId: contract.id,
      status: "completed",
      referenceNumber: generateReference(),
    });

    const updated = await storage.updateContract(contract.id, {
      status: "cancelled",
      cancelledAt: new Date(),
      cancellationFee: String(cancellationFee),
      cancellationFeeApplied: cancellationFee > 0,
    });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "cancelled",
      notes: `تم إلغاء العقد${cancellationFee > 0 ? ` برسوم ${cancellationFee.toFixed(2)} ج.م` : " - استرداد كامل"}`,
      createdBy: req.session.userId,
      createdByName: creator.name || creator.phone,
    });

    await storage.createUserNotification({
      userId: contract.counterpartyId,
      type: "contract",
      title: "تم إلغاء العقد",
      message: `تم إلغاء عقد ${contract.title}`,
      relatedId: contract.id,
    });

    res.json({ success: true, contract: updated });
  });

  // ===== START CONTRACT (begin work) =====

  app.post("/api/user/contracts/:id/start", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    if (contract.creatorId !== req.session.userId && contract.counterpartyId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status !== "accepted") {
      return res.status(400).json({ message: "الحالة غير صحيحة" });
    }

    const updated = await storage.updateContract(contract.id, {
      status: "in_progress",
      startedAt: new Date(),
    });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "in_progress",
      notes: "بدأ تنفيذ العقد",
      createdBy: req.session.userId,
      createdByName: (await storage.getUser(req.session.userId))?.name || "",
    });

    // Set first milestone as in_progress if milestones exist
    const milestones = await storage.getMilestones(contract.id);
    if (milestones.length > 0) {
      await storage.updateMilestone(milestones[0].id, { status: "in_progress" });
      await storage.updateContract(contract.id, { currentMilestoneId: milestones[0].id });
    }

    res.json({ success: true, contract: updated });
  });

  // ===== MILESTONE: SUBMIT =====

  app.post("/api/user/contracts/:id/milestones/:milestoneId/submit", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    // Counterparty (service provider) submits milestone
    if (contract.counterpartyId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status !== "in_progress" && contract.status !== "milestone_review") {
      return res.status(400).json({ message: "الحالة غير صحيحة" });
    }

    const milestone = await storage.getMilestone(req.params.milestoneId);
    if (!milestone || milestone.contractId !== contract.id) {
      return res.status(404).json({ message: "المرحلة غير موجودة" });
    }
    if (milestone.status !== "in_progress" && milestone.status !== "rejected") {
      return res.status(400).json({ message: "حالة المرحلة غير صحيحة" });
    }

    const { evidence } = req.body;
    const updated = await storage.updateMilestone(milestone.id, {
      status: "submitted",
      submittedAt: new Date(),
      evidence: evidence || null,
    });

    await storage.updateContract(contract.id, { status: "milestone_review" });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "milestone_submitted",
      notes: `تم تسليم المرحلة: ${milestone.title}`,
      createdBy: req.session.userId,
      createdByName: (await storage.getUser(req.session.userId))?.name || "",
    });

    await storage.createUserNotification({
      userId: contract.creatorId,
      type: "contract",
      title: "مرحلة جاهزة للمراجعة",
      message: `تم تسليم المرحلة "${milestone.title}" في عقد ${contract.title}`,
      relatedId: contract.id,
    });

    res.json({ success: true, milestone: updated });
  });

  // ===== MILESTONE: APPROVE (release partial funds) =====

  app.post("/api/user/contracts/:id/milestones/:milestoneId/approve", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    // Creator (buyer/client) approves milestone
    if (contract.creatorId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status !== "milestone_review") {
      return res.status(400).json({ message: "الحالة غير صحيحة" });
    }

    const milestone = await storage.getMilestone(req.params.milestoneId);
    if (!milestone || milestone.contractId !== contract.id) {
      return res.status(404).json({ message: "المرحلة غير موجودة" });
    }
    if (milestone.status !== "submitted") {
      return res.status(400).json({ message: "حالة المرحلة غير صحيحة" });
    }

    // Release milestone amount to counterparty
    const creator = await storage.getUser(contract.creatorId);
    const counterparty = await storage.getUser(contract.counterpartyId);
    if (!creator || !counterparty) return res.status(500).json({ message: "خطأ" });

    const milestoneAmount = parseFloat(milestone.amount);

    // Unfreeze from creator
    const newFrozen = String(parseFloat(creator.frozenBalance || "0") - milestoneAmount);
    await storage.updateUser(creator.id, { frozenBalance: newFrozen });

    // Credit counterparty
    const counterpartyNewBalance = String(parseFloat(counterparty.walletBalance || "0") + milestoneAmount);
    await storage.updateUser(counterparty.id, { walletBalance: counterpartyNewBalance });

    await storage.createUserTransaction({
      userId: counterparty.id,
      type: "escrow_release",
      amount: String(milestoneAmount),
      balanceAfter: counterpartyNewBalance,
      feeAmount: "0",
      description: `اعتماد مرحلة "${milestone.title}" - عقد ${contract.contractNumber}`,
      relatedId: contract.id,
      counterpartyId: creator.id,
      counterpartyName: creator.name || creator.phone,
      status: "completed",
      referenceNumber: generateReference(),
    });

    const updatedMilestone = await storage.updateMilestone(milestone.id, {
      status: "paid",
      approvedAt: new Date(),
    });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "milestone_approved",
      notes: `تم اعتماد المرحلة: ${milestone.title} وتحرير ${milestoneAmount} ج.م`,
      createdBy: req.session.userId,
      createdByName: creator.name || creator.phone,
    });

    // Check if this was the last milestone
    const allMilestones = await storage.getMilestones(contract.id);
    const pendingMilestones = allMilestones.filter(m => m.status === "pending" || m.status === "in_progress" || m.status === "rejected");
    
    if (pendingMilestones.length === 0) {
      // All milestones done — complete the contract
      await storage.updateContract(contract.id, {
        status: "completed",
        completedAt: new Date(),
        currentMilestoneId: null,
      });
      await storage.createContractTracking({
        contractId: contract.id,
        status: "completed",
        notes: "تم إكمال جميع المراحل بنجاح",
        createdBy: req.session.userId,
        createdByName: creator.name || creator.phone,
      });
      await storage.createUserNotification({
        userId: counterparty.id,
        type: "contract",
        title: "تم إكمال العقد!",
        message: `تم إكمال عقد ${contract.title} وتحرير جميع المبالغ`,
        relatedId: contract.id,
      });
    } else {
      // Activate next milestone
      const nextMilestone = pendingMilestones[0];
      await storage.updateMilestone(nextMilestone.id, { status: "in_progress" });
      await storage.updateContract(contract.id, {
        status: "in_progress",
        currentMilestoneId: nextMilestone.id,
      });
    }

    res.json({
      success: true,
      milestone: updatedMilestone,
      releasedAmount: String(milestoneAmount),
      counterpartyNewBalance,
    });
  });

  // ===== MILESTONE: REJECT =====

  app.post("/api/user/contracts/:id/milestones/:milestoneId/reject", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    if (contract.creatorId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status !== "milestone_review") {
      return res.status(400).json({ message: "الحالة غير صحيحة" });
    }

    const milestone = await storage.getMilestone(req.params.milestoneId);
    if (!milestone || milestone.contractId !== contract.id) {
      return res.status(404).json({ message: "المرحلة غير موجودة" });
    }

    const { reason } = req.body;
    const updated = await storage.updateMilestone(milestone.id, {
      status: "rejected",
      rejectedAt: new Date(),
    });

    await storage.updateContract(contract.id, { status: "in_progress" });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "milestone_rejected",
      notes: `تم رفض المرحلة "${milestone.title}"${reason ? `: ${reason}` : ""}`,
      createdBy: req.session.userId,
      createdByName: (await storage.getUser(req.session.userId))?.name || "",
    });

    await storage.createUserNotification({
      userId: contract.counterpartyId,
      type: "contract",
      title: "مرحلة مرفوضة",
      message: `تم رفض المرحلة "${milestone.title}" في عقد ${contract.title}${reason ? ` - ${reason}` : ""}`,
      relatedId: contract.id,
    });

    res.json({ success: true, milestone: updated });
  });

  // ===== COMPLETE CONTRACT (confirm delivery for purchase type) =====

  app.post("/api/user/contracts/:id/complete", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    if (contract.creatorId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status !== "in_progress" && contract.status !== "accepted" && contract.status !== "delivered") {
      return res.status(400).json({ message: "الحالة غير صحيحة" });
    }

    // For purchase/delivery type, require confirmation code
    if (contract.type === "purchase" || contract.type === "delivery") {
      const { confirmationCode } = req.body;
      if (confirmationCode !== contract.confirmationCode) {
        return res.status(400).json({ message: "كود التأكيد غير صحيح" });
      }
    }

    // Release all remaining frozen funds
    const creator = await storage.getUser(contract.creatorId);
    const counterparty = await storage.getUser(contract.counterpartyId);
    const deliveryPerson = contract.deliveryPersonId ? await storage.getUser(contract.deliveryPersonId) : null;
    if (!creator || !counterparty) return res.status(500).json({ message: "خطأ" });

    const remainingFrozen = parseFloat(creator.frozenBalance || "0");
    const deliveryFee = parseFloat(contract.deliveryFeeAmount || "0");
    const counterpartyAmount = remainingFrozen - deliveryFee;

    // Unfreeze from creator
    await storage.updateUser(creator.id, { frozenBalance: "0" });

    // Credit counterparty
    const counterpartyNewBalance = String(parseFloat(counterparty.walletBalance || "0") + counterpartyAmount);
    await storage.updateUser(counterparty.id, { walletBalance: counterpartyNewBalance });

    await storage.createUserTransaction({
      userId: counterparty.id,
      type: "escrow_release",
      amount: String(counterpartyAmount),
      balanceAfter: counterpartyNewBalance,
      feeAmount: contract.deliveryFeeAmount,
      description: `إكمال عقد ${contract.contractNumber} - ${contract.title}`,
      relatedId: contract.id,
      counterpartyId: creator.id,
      counterpartyName: creator.name || creator.phone,
      status: "completed",
      referenceNumber: generateReference(),
    });

    // Credit delivery person
    if (deliveryPerson && deliveryFee > 0) {
      const deliveryNewBalance = String(parseFloat(deliveryPerson.walletBalance || "0") + deliveryFee);
      await storage.updateUser(deliveryPerson.id, { walletBalance: deliveryNewBalance });

      await storage.createUserTransaction({
        userId: deliveryPerson.id,
        type: "escrow_delivery_fee",
        amount: String(deliveryFee),
        balanceAfter: deliveryNewBalance,
        feeAmount: "0",
        description: `عمولة توصيل - عقد ${contract.contractNumber}`,
        relatedId: contract.id,
        status: "completed",
        referenceNumber: generateReference(),
      });

      await storage.createUserNotification({
        userId: deliveryPerson.id,
        type: "contract",
        title: "تم استلام العمولة",
        message: `استلمت ${deliveryFee} ج.م لتوصيل ${contract.title}`,
        relatedId: contract.id,
      });
    }

    const updated = await storage.updateContract(contract.id, {
      status: "completed",
      completedAt: new Date(),
    });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "completed",
      notes: "تم إكمال العقد وإطلاق المبلغ",
      createdBy: creator.id,
      createdByName: creator.name || creator.phone,
    });

    await storage.createUserNotification({
      userId: counterparty.id,
      type: "contract",
      title: "تم إكمال العقد!",
      message: `استلمت ${counterpartyAmount} ج.م من عقد ${contract.title}`,
      relatedId: contract.id,
    });

    res.json({
      success: true,
      contract: updated,
      counterpartyAmount: String(counterpartyAmount),
      deliveryFee: String(deliveryFee),
    });
  });

  // ===== DISPUTE =====

  app.post("/api/user/contracts/:id/dispute", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    const userId = req.session.userId;
    if (contract.creatorId !== userId && contract.counterpartyId !== userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status === "disputed" || contract.status === "completed" || contract.status === "cancelled") {
      return res.status(400).json({ message: "لا يمكن فتح نزاع في هذه الحالة" });
    }

    const { reason, description, evidence } = req.body;
    if (!reason || !description) {
      return res.status(400).json({ message: "السبب والوصف مطلوبان" });
    }

    const againstId = userId === contract.creatorId ? contract.counterpartyId : contract.creatorId;

    const dispute = await storage.createDispute({
      contractId: contract.id,
      raisedBy: userId,
      raisedAgainst: againstId,
      reason,
      description,
      evidence: evidence || null,
      status: "open",
    });

    await storage.updateContract(contract.id, {
      status: "disputed",
      disputedAt: new Date(),
      disputeReason: description,
    });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "disputed",
      notes: `تم فتح نزاع: ${reason} - ${description}`,
      createdBy: userId,
      createdByName: (await storage.getUser(userId))?.name || "",
    });

    await storage.createUserNotification({
      userId: againstId,
      type: "contract",
      title: "نزاع مفتوح",
      message: `تم فتح نزاع على عقد ${contract.title}: ${reason}`,
      relatedId: contract.id,
    });

    res.json({ success: true, dispute });
  });

  // ===== TRACKING =====

  app.get("/api/user/contracts/:id/tracking", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });
    const tracking = await storage.getContractTracking(contract.id);
    res.json({ contract, tracking });
  });

  app.post("/api/user/contracts/:id/tracking", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    const userId = req.session.userId;
    if (contract.creatorId !== userId && contract.counterpartyId !== userId && contract.deliveryPersonId !== userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }

    const user = await storage.getUser(userId);
    const tracking = await storage.createContractTracking({
      contractId: contract.id,
      status: req.body.status || "update",
      location: req.body.location || null,
      notes: req.body.notes || "",
      photos: req.body.photos || null,
      createdBy: user!.id,
      createdByName: user!.name || user!.phone,
    });

    res.json({ success: true, tracking });
  });

  // ===== DELIVERY: CONFIRM PICKUP (seller confirms handover to delivery person) =====

  app.post("/api/user/contracts/:id/confirm-pickup", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    if (contract.counterpartyId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح — البائع فقط يؤكد الاستلام" });
    }
    if (contract.status !== "accepted" && contract.status !== "in_progress") {
      return res.status(400).json({ message: "الحالة غير صحيحة" });
    }

    const updated = await storage.updateContract(contract.id, {
      status: "in_progress",
      startedAt: contract.startedAt || new Date(),
    });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "picked_up",
      notes: "أكد البائع تسليم المنتج للمندوب",
      createdBy: req.session.userId,
      createdByName: (await storage.getUser(req.session.userId))?.name || "",
      photos: req.body.photos || null,
    });

    await storage.createUserNotification({
      userId: contract.creatorId,
      type: "contract",
      title: "تم استلام المنتج",
      message: `المنتج في الطريق إليك — ${contract.title}`,
      relatedId: contract.id,
    });

    if (contract.deliveryPersonId) {
      await storage.createUserNotification({
        userId: contract.deliveryPersonId,
        type: "contract",
        title: "تم تأكيد الاستلام",
        message: `يمكنك بدء التوصيل — ${contract.title}`,
        relatedId: contract.id,
      });
    }

    res.json({ success: true, contract: updated });
  });

  // ===== DELIVERY: CONFIRM DELIVERY (delivery person confirms delivery to buyer) =====

  app.post("/api/user/contracts/:id/confirm-delivery", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    if (contract.deliveryPersonId !== req.session.userId && contract.counterpartyId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status !== "in_progress") {
      return res.status(400).json({ message: "الحالة غير صحيحة" });
    }

    const updated = await storage.updateContract(contract.id, {
      status: "delivered",
    });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "delivered",
      notes: "تم التوصيل للمشتري — في انتظار التأكيد",
      createdBy: req.session.userId,
      createdByName: (await storage.getUser(req.session.userId))?.name || "",
      photos: req.body.photos || null,
    });

    await storage.createUserNotification({
      userId: contract.creatorId,
      type: "contract",
      title: "تم التوصيل!",
      message: `وصلك ${contract.title} — أكد الاستلام أو افتح نزاع`,
      relatedId: contract.id,
    });

    res.json({ success: true, contract: updated });
  });

  // ===== RENTAL: REQUEST RETURN =====

  app.post("/api/user/contracts/:id/request-return", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    if (contract.creatorId !== req.session.userId && contract.counterpartyId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status !== "in_progress") {
      return res.status(400).json({ message: "العقد ليس قيد التنفيذ" });
    }

    await storage.createContractTracking({
      contractId: contract.id,
      status: "return_requested",
      notes: "طلب إرجاع العين المستأجرة",
      createdBy: req.session.userId,
      createdByName: (await storage.getUser(req.session.userId))?.name || "",
    });

    const otherPartyId = req.session.userId === contract.creatorId ? contract.counterpartyId : contract.creatorId;
    await storage.createUserNotification({
      userId: otherPartyId,
      type: "contract",
      title: "طلب إرجاع",
      message: `طلب إرجاع العين المستأجرة — ${contract.title}`,
      relatedId: contract.id,
    });

    res.json({ success: true });
  });

  // ===== RENTAL: CONFIRM RETURN (other party confirms receiving the item back) =====

  app.post("/api/user/contracts/:id/confirm-return", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    if (contract.creatorId !== req.session.userId && contract.counterpartyId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status !== "in_progress") {
      return res.status(400).json({ message: "العقد ليس قيد التنفيذ" });
    }

    // Release deposit + complete contract
    const creator = await storage.getUser(contract.creatorId);
    const counterparty = await storage.getUser(contract.counterpartyId);
    if (!creator || !counterparty) return res.status(500).json({ message: "خطأ" });

    const deposit = parseFloat(contract.depositAmount || "0");
    const totalFrozen = parseFloat(contract.frozenAmount || "0");

    // Unfreeze everything from creator
    await storage.updateUser(creator.id, { frozenBalance: "0" });

    // Credit counterparty (amount + deposit back if no damage)
    const counterpartyAmount = totalFrozen;
    const counterpartyNewBalance = String(parseFloat(counterparty.walletBalance || "0") + counterpartyAmount);
    await storage.updateUser(counterparty.id, { walletBalance: counterpartyNewBalance });

    await storage.createUserTransaction({
      userId: counterparty.id,
      type: "escrow_release",
      amount: String(counterpartyAmount),
      balanceAfter: counterpartyNewBalance,
      feeAmount: "0",
      description: `إرجاع العين + تحرير المبلغ — عقد ${contract.contractNumber}`,
      relatedId: contract.id,
      counterpartyId: creator.id,
      counterpartyName: creator.name || creator.phone,
      status: "completed",
      referenceNumber: generateReference(),
    });

    const updated = await storage.updateContract(contract.id, {
      status: "completed",
      completedAt: new Date(),
    });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "returned",
      notes: "تم تأكيد الإرجاع — تحرير المبلغ والوديعة",
      createdBy: req.session.userId,
      createdByName: (await storage.getUser(req.session.userId))?.name || "",
      photos: req.body.photos || null,
    });

    await storage.createUserNotification({
      userId: otherPartyId(contract, req.session.userId),
      type: "contract",
      title: "تم إرجاع العين",
      message: `تم تأكيد الإرجاع وتحرير المبلغ — ${contract.title}`,
      relatedId: contract.id,
    });

    res.json({ success: true, contract: updated, releasedAmount: String(counterpartyAmount) });
  });

  // ===== RENTAL: EXTEND (request extension with fee) =====

  app.post("/api/user/contracts/:id/extend", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    if (contract.creatorId !== req.session.userId && contract.counterpartyId !== req.session.userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status !== "in_progress") {
      return res.status(400).json({ message: "العقد ليس قيد التنفيذ" });
    }

    const currentExtensions = contract.extensionCount || 0;
    const maxExtensions = contract.maxExtensions || 2;
    if (currentExtensions >= maxExtensions) {
      return res.status(400).json({ message: `وصلت للحد الأقصى من التمديدات (${maxExtensions})` });
    }

    const rules = await storage.getContractRule("rental");
    const extensionFeeRate = parseFloat(rules?.extensionFeeRate || "0.01");
    const extensionHours = req.body.hours || 24;
    const extensionFee = parseFloat(contract.totalAmount || "0") * extensionFeeRate * (extensionHours / 24);

    // Charge extension fee from creator
    const creator = await storage.getUser(contract.creatorId);
    if (!creator) return res.status(500).json({ message: "خطأ" });

    const available = parseFloat(creator.walletBalance || "0") - parseFloat(creator.frozenBalance || "0");
    if (extensionFee > available) {
      return res.status(400).json({ message: "الرصيد غير كافٍ لرسوم التمديد" });
    }

    // Deduct extension fee
    const newBalance = String(parseFloat(creator.walletBalance || "0") - extensionFee);
    await storage.updateUser(creator.id, { walletBalance: newBalance });

    // Add to frozen
    const newFrozen = String(parseFloat(creator.frozenBalance || "0") + extensionFee);
    await storage.updateUser(creator.id, { frozenBalance: newFrozen });

    const updated = await storage.updateContract(contract.id, {
      extensionCount: currentExtensions + 1,
      frozenAmount: String(parseFloat(contract.frozenAmount || "0") + extensionFee),
    });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "extended",
      notes: `تمديد ${extensionHours} ساعة برسوم ${extensionFee.toFixed(2)} ج.م`,
      createdBy: req.session.userId,
      createdByName: (await storage.getUser(req.session.userId))?.name || "",
    });

    res.json({
      success: true,
      extensionFee: String(extensionFee),
      newExtensionCount: currentExtensions + 1,
      contract: updated,
    });
  });

  // ===== REVIEW =====

  app.post("/api/user/contracts/:id/review", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    const userId = req.session.userId;
    if (contract.creatorId !== userId && contract.counterpartyId !== userId) {
      return res.status(403).json({ message: "غير مصرح" });
    }
    if (contract.status !== "completed" && contract.status !== "released") {
      return res.status(400).json({ message: "لا يمكن التقييم قبل الإكمال" });
    }

    const { rating, comment, reviewedRole } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "التقييم من 1 إلى 5" });
    }

    const reviewedId = userId === contract.creatorId ? contract.counterpartyId : contract.creatorId;

    // Check if already reviewed
    const existingReviews = await storage.getContractReviews(contract.id);
    if (existingReviews.some(r => r.reviewerId === userId)) {
      return res.status(400).json({ message: "تم التقييم مسبقاً" });
    }

    const review = await storage.createContractReview({
      contractId: contract.id,
      reviewerId: userId,
      reviewedId,
      reviewedRole: reviewedRole || (userId === contract.creatorId ? "counterparty" : "creator"),
      rating: String(rating),
      comment: comment || null,
    });

    res.json({ success: true, review });
  });
}
