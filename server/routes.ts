import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage, createTenantStorage, type IStorage } from "./storage";
import {
  insertPaymentMethodSchema,
  insertOrderSchema,
  insertAppSettingsSchema,
  p2pTransfers,
  contractReviews,
  users,
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireApiKey, generateApiKey, generateSecretKey, API_PERMISSIONS, PERMISSION_LABELS } from "./apiMiddleware";
import { triggerWebhook, WEBHOOK_EVENTS, WEBHOOK_EVENT_LABELS } from "./webhooks";
import connectPgSimple from "connect-pg-simple";
import { pool, db } from "./db";
import { generateDbName, createTenantDatabase, initializeTenantDatabase, dropTenantDatabase } from "./tenantDb";
import { registerUserRoutes } from "./userRoutes";
import { registerContractRoutes } from "./contractRoutes";
import { registerSupportRoutes } from "./supportRoutes";

// Multer configuration for local file uploads
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|heic|heif)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مدعوم"));
    }
  },
});

declare module "express-session" {
  interface SessionData {
    adminLoggedIn?: boolean;
    proAdminLoggedIn?: boolean;
    proAdminId?: string;
    tenantDbName?: string;
    driverLoggedIn?: boolean;
    driverId?: string;
    userLoggedIn?: boolean;
    userId?: string;
  }
}

// Extend Express Request to hold tenant storage
declare global {
  namespace Express {
    interface Request {
      tenantStorage?: IStorage;
    }
  }
}

/**
 * Get the appropriate storage for this request.
 * Returns tenant storage for pro admins, main storage otherwise.
 */
function getStorage(req: Request): IStorage {
  return req.tenantStorage || storage;
}

// Auth middleware
function requireAdmin(req: Request, res: Response, next: Function) {
  if (req.session?.adminLoggedIn || req.session?.proAdminLoggedIn) {
    next();
  } else {
    res.status(401).json({ message: "غير مصرح" });
  }
}

function requireMainAdmin(req: Request, res: Response, next: Function) {
  if (req.session?.adminLoggedIn && !req.session?.proAdminLoggedIn) {
    next();
  } else {
    res.status(403).json({ message: "هذا الإجراء متاح فقط للمسؤول الرئيسي" });
  }
}

function requireDriver(req: Request, res: Response, next: Function) {
  if (req.session?.driverLoggedIn && req.session?.driverId) {
    next();
  } else {
    res.status(401).json({ message: "غير مصرح" });
  }
}

function requireUser(req: Request, res: Response, next: Function) {
  if (req.session?.userLoggedIn && req.session?.userId) {
    next();
  } else {
    res.status(401).json({ message: "غير مصرح" });
  }
}

// Generate random codes
function generateTrackingCode(): string {
  return "SHP-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

function generateDeliveryCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateReferralCode(): string {
  return "REF-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  const PgSession = connectPgSimple(session);

  // Session middleware
  app.use(
    session({
      store: new PgSession({
        pool: pool,
        tableName: "user_sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET!,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production", // Use secure cookies in production
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );

  // Tenant resolution middleware - resolve tenant storage for pro admins
  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    if (req.session?.proAdminLoggedIn && req.session?.tenantDbName) {
      try {
        req.tenantStorage = createTenantStorage(req.session.tenantDbName);
      } catch (err) {
        console.error("Failed to create tenant storage:", err);
      }
    }
    next();
  });

  // Initialize default admin if not exists (do NOT reset password on every restart)
  const existingAdmin = await storage.getAdminByUsername("admin");
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await storage.createAdmin({ username: "admin", password: hashedPassword });
  }

  // Initialize default settings if not exists
  const settings = await storage.getSettings();
  if (!settings) {
    await storage.updateSettings({
      storeName: "نظام المندوبين",
      storeNameEn: "Driver System",
      currency: "ج.م",
    });
  }

  // Initialize default payment methods if none exist
  const paymentMethods = await storage.getPaymentMethods();
  if (paymentMethods.length === 0) {
    await storage.createPaymentMethod({
      name: "فودافون كاش",
      nameEn: "Vodafone Cash",
      description: "الدفع عبر محفظة فودافون كاش",
      instructions: "قم بتحويل المبلغ إلى رقم المحفظة",
      isActive: true,
      sortOrder: 1,
    });
    await storage.createPaymentMethod({
      name: "أورانج موني",
      nameEn: "Orange Money",
      description: "الدفع عبر محفظة أورانج موني",
      instructions: "قم بتحويل المبلغ إلى رقم المحفظة",
      isActive: true,
      sortOrder: 2,
    });
    await storage.createPaymentMethod({
      name: "فوري",
      nameEn: "Fawry",
      description: "الدفع عبر منافذ فوري",
      instructions: "ستصلك رسالة برقم الكود للدفع في أي منفذ فوري",
      isActive: true,
      sortOrder: 3,
    });
  }

  // ============= AUTO-TOGGLE TIMER FOR PRO ACCOUNTS =============
  // Check every 60 seconds for accounts that need to be auto-enabled or auto-disabled
  setInterval(async () => {
    try {
      const now = new Date();
      const allPros = await storage.getProAdmins();
      for (const pro of allPros) {
        // Auto-disable: account is active and autoDisableAt has passed
        if (pro.isActive && pro.autoDisableAt && new Date(pro.autoDisableAt) <= now) {
          await storage.updateProAdmin(pro.id, { isActive: false, autoDisableAt: null });
          console.log(`Auto-disabled pro account: ${pro.username}`);
        }
        // Auto-enable: account is inactive and autoEnableAt has passed
        if (!pro.isActive && pro.autoEnableAt && new Date(pro.autoEnableAt) <= now) {
          await storage.updateProAdmin(pro.id, { isActive: true, autoEnableAt: null });
          console.log(`Auto-enabled pro account: ${pro.username}`);
        }
      }
    } catch (err) {
      console.error("Auto-toggle timer error:", err);
    }
  }, 60 * 1000); // every 60 seconds

  // ============= FILE UPLOAD =============

  // Serve uploaded files
  app.use("/uploads", express.static(uploadsDir));

  // Upload single image
  app.post("/api/upload", requireAdmin, (req: Request, res: Response, next: NextFunction) => {
    upload.single("image")(req, res, (err: any) => {
      if (err) {
        console.error("Upload error:", err.message);
        return res.status(400).json({ message: err.message || "فشل في رفع الصورة" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم اختيار صورة" });
      }
      const url = `/uploads/${req.file.filename}`;
      console.log("File uploaded:", url);
      res.json({ url });
    });
  });

  // Upload multiple images (up to 6)
  app.post("/api/upload/multiple", requireAdmin, (req: Request, res: Response, next: NextFunction) => {
    upload.array("images", 6)(req, res, (err: any) => {
      if (err) {
        console.error("Upload error:", err.message);
        return res.status(400).json({ message: err.message || "فشل في رفع الصور" });
      }
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "لم يتم اختيار صور" });
      }
      const urls = files.map((f) => `/uploads/${f.filename}`);
      console.log("Files uploaded:", urls);
      res.json({ urls });
    });
  });

  // Delete uploaded image
  app.delete("/api/upload", requireAdmin, (req: Request, res: Response) => {
    const { url } = req.body;
    if (url && typeof url === "string" && url.startsWith("/uploads/")) {
      const filePath = path.join(uploadsDir, path.basename(url));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.json({ message: "تم الحذف" });
  });

  // ============= PUBLIC ROUTES =============

  // Payment Methods
  app.get("/api/payment-methods", async (req, res) => {
    try {
      const methods = await getStorage(req).getPaymentMethods();
      res.json(methods);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب وسائل الدفع" });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await getStorage(req).getSettings();
      res.json(settings || {});
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب الإعدادات" });
    }
  });

  // ============= DELIVERY DRIVER AUTH =============

  // Driver - Register (step 1: request verification code)
  app.post("/api/driver/register/request", async (req, res) => {
    try {
      const { name, whatsappPhone, username, password, governorate, city, village, maxWeight, referralCode: refCode } = req.body;
      if (!name || !whatsappPhone || !username || !password) {
        return res.status(400).json({ message: "جميع الحقول مطلوبة" });
      }
      const existingUsername = await getStorage(req).getDriverByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      // Check username uniqueness across admin and pro-admin tables
      const existingAdmin = await storage.getAdminByUsername(username);
      if (existingAdmin) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      const existingPro = await storage.getProAdminByUsername(username);
      if (existingPro) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      const existingPhone = await getStorage(req).getDriverByPhone(whatsappPhone);
      if (existingPhone) {
        return res.status(400).json({ message: "رقم الهاتف مسجل بالفعل" });
      }
      // Check referral code
      let referrerId: string | null = null;
      if (refCode) {
        const referrer = await getStorage(req).getDriverByReferralCode(refCode);
        if (referrer) {
          referrerId = referrer.id;
        }
      }
      // Generate 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const newReferralCode = generateReferralCode();
      const hashedPassword = await bcrypt.hash(password, 10);
      const driver = await getStorage(req).createDriver({
        name,
        whatsappPhone,
        phone: whatsappPhone,
        username,
        password: hashedPassword,
        verificationCode,
        isVerified: false,
        isActive: false,
        isAvailable: true,
        walletBalance: "0",
        totalEarnings: "0",
        completedOrders: 0,
        governorate: governorate || null,
        city: city || null,
        village: village || null,
        maxWeight: maxWeight || null,
        referralCode: newReferralCode,
        referredBy: referrerId,
      } as any);
      // Admin will see the code in notifications panel
      // Notify admin with verification code
      storage.createAdminNotification({
        type: "driver_registration",
        title: "تسجيل مندوب جديد",
        message: `مندوب جديد: ${name} (${whatsappPhone}) - رمز التحقق: ${verificationCode}`,
        relatedId: driver.id,
      }).catch(() => { });
      res.status(201).json({ message: "تم إرسال رمز التحقق إلى الإدارة", driverId: driver.id });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "فشل في التسجيل" });
    }
  });

  // Driver - Register (step 2: verify code)
  app.post("/api/driver/register/verify", async (req, res) => {
    try {
      const { driverId, code } = req.body;
      if (!driverId || !code) {
        return res.status(400).json({ message: "رمز التحقق مطلوب" });
      }
      const driver = await getStorage(req).getDriver(driverId);
      if (!driver) {
        return res.status(404).json({ message: "الحساب غير موجود" });
      }
      if (driver.isVerified) {
        return res.status(400).json({ message: "الحساب مفعل بالفعل" });
      }
      if (driver.verificationCode !== code) {
        return res.status(400).json({ message: "رمز التحقق غير صحيح" });
      }
      await getStorage(req).updateDriver(driver.id, { isVerified: true, isActive: true, verificationCode: null } as any);
      // If driver was referred, create a referral record
      if (driver.referredBy) {
        try {
          const settings = await getStorage(req).getSettings();
          const bonusAmount = settings?.referralBonusAmount || "50";
          await getStorage(req).createDriverReferral({
            referrerId: driver.referredBy,
            referredId: driver.id,
            bonus: bonusAmount,
            status: "pending",
          });
          // Notify admin
          getStorage(req).createAdminNotification({
            type: "referral",
            title: "إحالة جديدة",
            message: `المندوب ${driver.name} تسجل عبر رابط إحالة`,
            relatedId: driver.id,
          }).catch(() => { });
        } catch (e) {
          console.error("Referral creation error:", e);
        }
      }
      req.session.driverLoggedIn = true;
      req.session.driverId = driver.id;
      res.json({ message: "تم تفعيل الحساب بنجاح", driver: { id: driver.id, name: driver.name, username: driver.username } });
    } catch (error) {
      res.status(500).json({ message: "فشل في التحقق" });
    }
  });

  app.post("/api/driver/login", async (req, res) => {
    try {
      const { username, password, verificationCode } = req.body;
      const driver = await getStorage(req).getDriverByUsername(username);
      if (!driver || !driver.isActive) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }
      if (!driver.isVerified) {
        return res.status(401).json({ message: "الحساب غير مفعل بعد. تحقق من رمز التحقق" });
      }
      const isValid = await bcrypt.compare(password, driver.password);
      if (!isValid) {
        return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
      }

      const currentLoginCount = (driver as any).loginCount || 0;
      const wasAddedByAdmin = !!(driver as any).addedByAdmin;

      // If added by admin and first login → skip verification
      if (wasAddedByAdmin && currentLoginCount === 0) {
        await getStorage(req).updateDriver(driver.id, { loginCount: 1 } as any);
        req.session.driverLoggedIn = true;
        req.session.driverId = driver.id;
        return res.json({ message: "تم تسجيل الدخول", driver: { id: driver.id, name: driver.name, username: driver.username } });
      }

      // From second login onward (or self-registered drivers) → require verification code
      if (!verificationCode) {
        // Generate and store code, notify the responsible admin
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await getStorage(req).updateDriver(driver.id, { verificationCode: code } as any);

        // Determine which admin to notify
        const adminUsername = (driver as any).addedByAdmin || null;
        let notifMessage = `رمز تحقق تسجيل دخول المندوب ${driver.name}: ${code}`;

        await storage.createAdminNotification({
          type: "driver_login_verification",
          title: "رمز تحقق تسجيل دخول مندوب",
          message: notifMessage,
          relatedId: driver.id,
        });

        console.log(`[LOGIN-VERIFY] Driver ${driver.name} (${driver.username}) code: ${code} → admin: ${adminUsername || "main"}`);
        return res.json({ message: "تم إرسال رمز التحقق إلى الإدارة", requireVerification: true });
      }

      // Verify the code
      if (driver.verificationCode !== verificationCode) {
        return res.status(400).json({ message: "رمز التحقق غير صحيح" });
      }

      // Clear code, increment login count, and log in
      await getStorage(req).updateDriver(driver.id, { verificationCode: null, loginCount: currentLoginCount + 1 } as any);
      req.session.driverLoggedIn = true;
      req.session.driverId = driver.id;
      res.json({ message: "تم تسجيل الدخول", driver: { id: driver.id, name: driver.name, username: driver.username } });
    } catch (error) {
      res.status(500).json({ message: "فشل في تسجيل الدخول" });
    }
  });

  app.post("/api/driver/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "تم تسجيل الخروج" });
    });
  });

  app.get("/api/driver/check", requireDriver, async (req, res) => {
    const driver = await getStorage(req).getDriver(req.session.driverId!);
    if (!driver) return res.status(401).json({ message: "غير مصرح" });
    res.json({
      loggedIn: true,
      driver: {
        id: driver.id, name: driver.name, username: driver.username,
        phone: driver.phone, walletBalance: driver.walletBalance,
        totalEarnings: driver.totalEarnings, completedOrders: driver.completedOrders,
        isAvailable: driver.isAvailable, profileImage: driver.profileImage,
        governorate: driver.governorate, city: driver.city, village: driver.village,
        idVerified: driver.idVerified, criminalRecordVerified: driver.criminalRecordVerified,
        nationalIdImage: driver.nationalIdImage, nationalIdImageBack: driver.nationalIdImageBack,
        criminalRecordImage: driver.criminalRecordImage, criminalRecordImageBack: driver.criminalRecordImageBack,
        maxWeight: driver.maxWeight,
        vehicleType: driver.vehicleType,
        fullyVerified: driver.fullyVerified,
        referralCode: driver.referralCode,
        averageRating: driver.averageRating,
        totalRatings: driver.totalRatings,
      }
    });
  });

  // Driver - Upload profile image
  app.post("/api/driver/profile-image", requireDriver, (req, res) => {
    upload.single("image")(req, res, async (err: any) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: "لم يتم رفع صورة" });
      try {
        const driver = await getStorage(req).getDriver(req.session.driverId!);
        // Delete old image file if exists
        if (driver?.profileImage) {
          const oldPath = path.join(uploadsDir, path.basename(driver.profileImage));
          fs.unlink(oldPath, () => { });
        }
        const imageUrl = `/uploads/${req.file.filename}`;
        await getStorage(req).updateDriver(req.session.driverId!, { profileImage: imageUrl } as any);
        res.json({ message: "تم رفع الصورة بنجاح", profileImage: imageUrl });
      } catch (error) {
        res.status(500).json({ message: "فشل في رفع الصورة" });
      }
    });
  });

  // Driver - Update location
  app.post("/api/driver/location", requireDriver, async (req, res) => {
    try {
      const { latitude, longitude } = req.body;
      await getStorage(req).updateDriver(req.session.driverId!, { latitude, longitude } as any);
      res.json({ message: "تم تحديث الموقع" });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث الموقع" });
    }
  });

  // Driver - Toggle availability
  app.post("/api/driver/availability", requireDriver, async (req, res) => {
    try {
      const { isAvailable } = req.body;
      await getStorage(req).updateDriver(req.session.driverId!, { isAvailable } as any);
      res.json({ message: isAvailable ? "أنت متاح الآن" : "أنت غير متاح" });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث الحالة" });
    }
  });

  // Driver - Update max weight
  app.post("/api/driver/max-weight", requireDriver, async (req, res) => {
    try {
      const { maxWeight } = req.body;
      if (!maxWeight || parseFloat(maxWeight) <= 0) {
        return res.status(400).json({ message: "الوزن غير صحيح" });
      }
      await getStorage(req).updateDriver(req.session.driverId!, { maxWeight: maxWeight.toString() } as any);
      res.json({ message: "تم تحديث أقصى وزن للشحن" });
    } catch (error) {
      res.status(500).json({ message: "فشل في التحديث" });
    }
  });

  // Driver - Update vehicle type
  app.post("/api/driver/vehicle-type", requireDriver, async (req, res) => {
    try {
      const { vehicleType } = req.body;
      if (!vehicleType) {
        return res.status(400).json({ message: "نوع المركبة مطلوب" });
      }
      await getStorage(req).updateDriver(req.session.driverId!, { vehicleType } as any);
      res.json({ message: "تم تحديث نوع المركبة" });
    } catch (error) {
      res.status(500).json({ message: "فشل في التحديث" });
    }
  });

  // Driver - Get referral info
  app.get("/api/driver/referral", requireDriver, async (req, res) => {
    try {
      const driver = await getStorage(req).getDriver(req.session.driverId!);
      if (!driver) return res.status(404).json({ message: "غير موجود" });
      const referrals = await getStorage(req).getDriverReferrals(driver.id);
      const referralDetails = [];
      for (const r of referrals) {
        const referred = await getStorage(req).getDriver(r.referredId);
        referralDetails.push({
          ...r,
          referredName: referred?.name || "مندوب",
        });
      }
      res.json({
        referralCode: driver.referralCode,
        referrals: referralDetails,
        totalReferrals: referrals.length,
        approvedReferrals: referrals.filter(r => r.status === "approved").length,
      });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Driver - Get my ratings
  app.get("/api/driver/ratings", requireDriver, async (req, res) => {
    try {
      const ratings = await getStorage(req).getDriverRatings(req.session.driverId!);
      res.json(ratings);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Driver - Upload national ID front image
  app.post("/api/driver/national-id", requireDriver, (req, res) => {
    upload.single("image")(req, res, async (err: any) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: "لم يتم رفع صورة" });
      try {
        const imageUrl = `/uploads/${req.file.filename}`;
        await getStorage(req).updateDriver(req.session.driverId!, { nationalIdImage: imageUrl } as any);
        res.json({ message: "تم رفع الوجه الأمامي للهوية", nationalIdImage: imageUrl });
      } catch (error) {
        res.status(500).json({ message: "فشل في رفع الصورة" });
      }
    });
  });

  // Driver - Upload national ID back image
  app.post("/api/driver/national-id-back", requireDriver, (req, res) => {
    upload.single("image")(req, res, async (err: any) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: "لم يتم رفع صورة" });
      try {
        const imageUrl = `/uploads/${req.file.filename}`;
        await getStorage(req).updateDriver(req.session.driverId!, { nationalIdImageBack: imageUrl } as any);
        res.json({ message: "تم رفع الوجه الخلفي للهوية. سيتم مراجعتها من الإدارة", nationalIdImageBack: imageUrl });
      } catch (error) {
        res.status(500).json({ message: "فشل في رفع الصورة" });
      }
    });
  });

  // Driver - Upload criminal record front image
  app.post("/api/driver/criminal-record", requireDriver, (req, res) => {
    upload.single("image")(req, res, async (err: any) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: "لم يتم رفع صورة" });
      try {
        const imageUrl = `/uploads/${req.file.filename}`;
        await getStorage(req).updateDriver(req.session.driverId!, { criminalRecordImage: imageUrl } as any);
        res.json({ message: "تم رفع الوجه الأمامي للفيش الجنائي", criminalRecordImage: imageUrl });
      } catch (error) {
        res.status(500).json({ message: "فشل في رفع الصورة" });
      }
    });
  });

  // Driver - Upload criminal record back image
  app.post("/api/driver/criminal-record-back", requireDriver, (req, res) => {
    upload.single("image")(req, res, async (err: any) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: "لم يتم رفع صورة" });
      try {
        const imageUrl = `/uploads/${req.file.filename}`;
        await getStorage(req).updateDriver(req.session.driverId!, { criminalRecordImageBack: imageUrl } as any);
        res.json({ message: "تم رفع الوجه الخلفي للفيش الجنائي. سيتم مراجعتها من الإدارة", criminalRecordImageBack: imageUrl });
      } catch (error) {
        res.status(500).json({ message: "فشل في رفع الصورة" });
      }
    });
  });

  // Driver - Notifications (with pagination)
  app.get("/api/driver/notifications", requireDriver, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const notifications = await getStorage(req).getDriverNotifications(req.session.driverId!, limit, offset);
      const unreadCount = await getStorage(req).getDriverUnreadCount(req.session.driverId!);
      const total = await getStorage(req).getDriverNotificationCount(req.session.driverId!);
      res.json({ notifications, unreadCount, total });
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب الإشعارات" });
    }
  });

  app.post("/api/driver/notifications/read", requireDriver, async (req, res) => {
    try {
      await getStorage(req).markDriverNotificationsRead(req.session.driverId!);
      res.json({ message: "تم" });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Driver - Delete single notification
  app.delete("/api/driver/notifications/:id", requireDriver, async (req, res) => {
    try {
      const deleted = await getStorage(req).deleteDriverNotification(req.params.id);
      if (!deleted) return res.status(404).json({ message: "الإشعار غير موجود" });
      res.json({ message: "تم حذف الإشعار" });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف الإشعار" });
    }
  });

  // Driver - Clear all notifications
  app.delete("/api/driver/notifications", requireDriver, async (req, res) => {
    try {
      await getStorage(req).clearDriverNotifications(req.session.driverId!);
      res.json({ message: "تم حذف جميع الإشعارات" });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Driver - Search
  app.get("/api/driver/search", requireDriver, async (req, res) => {
    try {
      const query = (req.query.q as string || "").trim();
      if (!query || query.length < 2) return res.json({ orders: [], notifications: [], transactions: [] });
      const results = await getStorage(req).driverSearch(req.session.driverId!, query);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "فشل في البحث" });
    }
  });

  // Driver - Accept order assignment
  app.post("/api/driver/orders/:orderId/accept", requireDriver, async (req, res) => {
    try {
      const driverId = req.session.driverId!;
      const { orderId } = req.params;
      const assignment = await getStorage(req).getAssignmentByOrderAndDriver(orderId, driverId);
      if (!assignment || assignment.status !== "pending") {
        return res.status(400).json({ message: "لا يوجد طلب توصيل معلق لك" });
      }
      const order = await getStorage(req).getOrder(orderId);
      if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
      // Check if another driver already accepted
      const allAssignments = await getStorage(req).getOrderAssignments(orderId);
      const alreadyAccepted = allAssignments.find(a => a.status === "accepted" && a.driverId !== driverId);
      if (alreadyAccepted) {
        await getStorage(req).updateAssignment(assignment.id, { status: "cancelled", respondedAt: new Date() });
        return res.status(400).json({ message: "تم قبول الطلب من مندوب آخر" });
      }
      // Accept this assignment
      await getStorage(req).updateAssignment(assignment.id, { status: "accepted", respondedAt: new Date() });
      // Cancel others
      await getStorage(req).cancelOtherAssignments(orderId, driverId);
      // Update order with driver info + generate confirmation code
      const driver = await getStorage(req).getDriver(driverId);
      const pickupDeadline = new Date(Date.now() + 60 * 60 * 1000); // 1 hour to pickup
      const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
      await getStorage(req).updateOrder(orderId, {
        status: "shipped",
        driverId: driverId,
        driverName: driver?.name || "",
        trackingCode: generateTrackingCode(),
        deliveryCode: generateDeliveryCode(),
        confirmationCode,
        shippedAt: new Date(),
        pickupDeadline,
      } as any);
      // Notify driver
      await getStorage(req).createDriverNotification({
        driverId,
        orderId,
        type: "order_accepted",
        title: "تم قبول الطلب",
        message: `تم قبول الطلب ${order.orderNumber}. بانتظار كود التأكيد من العميل.`,
        status: "read",
        isRead: false,
      });
      // Notify admin with the confirmation code
      await getStorage(req).createAdminNotification({
        type: "new_order",
        title: "مندوب قبل الطلب - كود التأكيد",
        message: `المندوب ${driver?.name} قبل الطلب #${order.orderNumber}. كود التأكيد: ${confirmationCode} - أرسله للعميل مع تحديد العمولة.`,
        relatedId: orderId,
      });
      // Notify other drivers that it's cancelled
      for (const a of allAssignments) {
        if (a.driverId !== driverId && a.status === "pending") {
          await getStorage(req).createDriverNotification({
            driverId: a.driverId,
            orderId,
            type: "order_cancelled",
            title: "تم إلغاء الطلب",
            message: `الطلب ${order.orderNumber} تم قبوله من مندوب آخر.`,
            status: "read",
            isRead: false,
          });
        }
      }
      res.json({ message: "تم قبول الطلب بنجاح" });
    } catch (error) {
      console.error("Accept order error:", error);
      res.status(500).json({ message: "فشل في قبول الطلب" });
    }
  });

  // Driver - Reject order assignment
  app.post("/api/driver/orders/:orderId/reject", requireDriver, async (req, res) => {
    try {
      const driverId = req.session.driverId!;
      const { orderId } = req.params;
      const assignment = await getStorage(req).getAssignmentByOrderAndDriver(orderId, driverId);
      if (!assignment || assignment.status !== "pending") {
        return res.status(400).json({ message: "لا يوجد طلب توصيل معلق لك" });
      }
      const { reason } = req.body;
      await getStorage(req).updateAssignment(assignment.id, { status: "rejected", respondedAt: new Date(), rejectionReason: reason || null } as any);
      // Notify admin about rejection with order details
      const order = await getStorage(req).getOrder(orderId);
      const driver = await getStorage(req).getDriver(driverId);
      if (order) {
        await getStorage(req).createAdminNotification({
          type: "driver_order_rejected",
          title: "مندوب رفض الطلب",
          message: `المندوب ${driver?.name || ""} رفض الطلب #${order.orderNumber} - ${order.customerName} - ${order.total} ج.م${reason ? ` | السبب: ${reason}` : ""}`,
          relatedId: orderId,
        });
      }
      res.json({ message: "تم رفض الطلب" });
    } catch (error) {
      res.status(500).json({ message: "فشل في رفض الطلب" });
    }
  });

  // Admin - Set driver commission and get message for customer
  app.post("/api/admin/orders/:id/set-commission", requireAdmin, async (req, res) => {
    try {
      const order = await getStorage(req).getOrder(req.params.id);
      if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
      const { commission } = req.body;
      if (!commission || parseFloat(commission) < 0) return res.status(400).json({ message: "يجب تحديد العمولة" });
      await getStorage(req).updateOrder(order.id, { driverCommission: commission } as any);
      const code = order.confirmationCode || order.deliveryCode;
      const commissionNote = order.commissionPrepaid
        ? `عمولة المندوب: ${commission} ج.م (مدفوعة مسبقاً)`
        : `عمولة المندوب: ${commission} ج.م (تُدفع نقداً للمندوب عند التسليم)`;
      const message = `طلبك رقم #${order.orderNumber}\nكود التأكيد: ${code}\n${commissionNote}\nالإجمالي: ${order.total} ج.م\n\nيرجى إعطاء الكود للمندوب عند استلام الشحنة.`;
      // Notify driver about the commission
      if (order.driverId) {
        const driverMsg = order.commissionPrepaid
          ? `عمولتك للطلب #${order.orderNumber}: ${commission} ج.م - ستضاف لرصيدك بعد إتمام التسليم`
          : `عمولتك للطلب #${order.orderNumber}: ${commission} ج.م - ستحصل عليها نقداً من العميل`;
        await getStorage(req).createDriverNotification({
          driverId: order.driverId,
          orderId: order.id,
          type: "general",
          title: "تم تحديد العمولة",
          message: driverMsg,
          isRead: false,
        });
      }
      res.json({ message, commission, code });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Driver - Confirm pickup (start delivery countdown)
  app.post("/api/driver/orders/:id/pickup", requireDriver, async (req, res) => {
    try {
      const order = await getStorage(req).getOrder(req.params.id);
      if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
      if (order.driverId !== req.session.driverId) return res.status(403).json({ message: "غير مصرح" });
      if (order.status !== "shipped") return res.status(400).json({ message: "حالة الطلب لا تسمح" });
      const deliveryDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours to deliver
      await getStorage(req).updateOrder(order.id, { pickedUpAt: new Date(), deliveryDeadline } as any);
      res.json({ message: "تم تأكيد الاستلام. لديك ساعتان للتوصيل", deliveryDeadline });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Driver - My orders
  app.get("/api/driver/orders", requireDriver, async (req, res) => {
    try {
      const driverOrders = await getStorage(req).getOrdersByDriver(req.session.driverId!);
      res.json(driverOrders);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب الطلبات" });
    }
  });

  // Driver - My pending assignments
  app.get("/api/driver/assignments", requireDriver, async (req, res) => {
    try {
      const assignments = await getStorage(req).getDriverAssignments(req.session.driverId!);
      // Include order data for each assignment
      const result = [];
      for (const a of assignments) {
        if (a.status === "pending") {
          const order = await getStorage(req).getOrder(a.orderId);
          if (order) {
            result.push({ ...a, order });
          }
        }
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Driver - Confirm delivery with confirmation code
  app.post("/api/driver/orders/:id/confirm", requireDriver, async (req, res) => {
    try {
      const { deliveryCode, amountCollected } = req.body;
      const order = await getStorage(req).getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }
      if (order.driverId !== req.session.driverId) {
        return res.status(403).json({ message: "هذا الطلب غير مسند إليك" });
      }
      if (order.status !== "shipped") {
        return res.status(400).json({ message: "لا يمكن تأكيد التوصيل لهذا الطلب" });
      }
      // Check against confirmationCode first, then deliveryCode as fallback
      const validCode = order.confirmationCode || order.deliveryCode;
      if (validCode !== deliveryCode) {
        return res.status(400).json({ message: "كود التأكيد غير صحيح" });
      }
      const updateData: any = {
        status: "delivered",
        deliveredAt: new Date(),
      };
      // If order is not paid (COD), driver collects money
      if (!order.isPaid && amountCollected) {
        updateData.amountCollected = amountCollected;
        updateData.amountCollectedConfirmed = false;
      }
      await getStorage(req).updateOrder(order.id, updateData);
      // Return frozen amount to driver balance + add completed orders count
      const driverData = await getStorage(req).getDriver(req.session.driverId!);
      const frozenAmount = parseFloat(order.frozenAmount || "0");
      const commissionAmount = parseFloat(order.driverCommission || "0");
      const currentBalance = parseFloat(driverData!.walletBalance || "0");
      // If commission is prepaid, add it to wallet along with frozen amount
      const walletAddition = order.commissionPrepaid ? frozenAmount + commissionAmount : frozenAmount;
      const newBalance = (currentBalance + walletAddition).toFixed(2);
      const newEarnings = (parseFloat(driverData!.totalEarnings || "0") + walletAddition).toFixed(2);
      const newCompleted = (driverData!.completedOrders || 0) + 1;
      await getStorage(req).updateDriver(req.session.driverId!, {
        walletBalance: newBalance,
        totalEarnings: newEarnings,
        completedOrders: newCompleted,
      } as any);
      await getStorage(req).createWalletTransaction({
        driverId: req.session.driverId!,
        type: "commission",
        amount: frozenAmount.toFixed(2),
        balanceAfter: (currentBalance + frozenAmount).toFixed(2),
        description: `إتمام الطلب ${order.orderNumber} - إرجاع المبلغ المجمد`,
        orderId: order.id,
        status: "completed",
      });
      // If commission is prepaid, create a separate wallet transaction for it
      if (order.commissionPrepaid && commissionAmount > 0) {
        await getStorage(req).createWalletTransaction({
          driverId: req.session.driverId!,
          type: "commission",
          amount: commissionAmount.toFixed(2),
          balanceAfter: newBalance,
          description: `عمولة مدفوعة للطلب ${order.orderNumber}`,
          orderId: order.id,
          status: "completed",
        });
        // Auto-confirm commission for prepaid
        await getStorage(req).updateOrder(order.id, { commissionConfirmed: true } as any);
      }
      // Notify
      const driverCommission = order.driverCommission || "0";
      const commNotifyMsg = order.commissionPrepaid
        ? `تم تسليم الطلب ${order.orderNumber}. تم إرجاع ${frozenAmount} ج.م + عمولة ${driverCommission} ج.م لرصيدك`
        : `تم تسليم الطلب ${order.orderNumber}. تم إرجاع ${frozenAmount} ج.م لرصيدك. عمولتك النقدية: ${driverCommission} ج.م`;
      await getStorage(req).createDriverNotification({
        driverId: req.session.driverId!,
        orderId: order.id,
        type: "general",
        title: "تم التسليم بنجاح",
        message: commNotifyMsg,
        status: "read",
        isRead: false,
      });

      // Log operation - delivery
      await getStorage(req).createOperationLog({
        type: "delivery",
        driverId: req.session.driverId!,
        driverName: driverData?.name || "",
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        amount: order.total,
        description: `تم توصيل الطلب #${order.orderNumber} للعميل ${order.customerName}`,
        status: "completed",
        metadata: { amountCollected: amountCollected || null, isPaid: order.isPaid },
      });

      // Log operation - frozen amount returned
      await getStorage(req).createOperationLog({
        type: "commission",
        driverId: req.session.driverId!,
        driverName: driverData?.name || "",
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        amount: walletAddition.toFixed(2),
        description: order.commissionPrepaid
          ? `إرجاع المبلغ المجمد + عمولة مدفوعة للطلب #${order.orderNumber}`
          : `إرجاع المبلغ المجمد للطلب #${order.orderNumber} - العمولة النقدية: ${driverCommission} ج.م`,
        status: "completed",
        metadata: { frozenAmount, driverCommission, commissionPrepaid: order.commissionPrepaid, orderTotal: order.total },
      });

      res.json({ message: "تم تأكيد التسليم بنجاح" });
    } catch (error) {
      console.error("Confirm delivery error:", error);
      res.status(500).json({ message: "فشل في تأكيد التسليم" });
    }
  });

  // Driver - Confirm commission received
  app.post("/api/driver/orders/:id/confirm-commission", requireDriver, async (req, res) => {
    try {
      const order = await getStorage(req).getOrder(req.params.id);
      if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
      if (order.driverId !== req.session.driverId) return res.status(403).json({ message: "غير مصرح" });
      if (order.status !== "delivered") return res.status(400).json({ message: "الطلب لم يكتمل بعد" });
      await getStorage(req).updateOrder(order.id, { commissionConfirmed: true } as any);
      res.json({ message: "تم تأكيد استلام العمولة" });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Driver - Wallet transactions
  app.get("/api/driver/wallet", requireDriver, async (req, res) => {
    try {
      const driver = await getStorage(req).getDriver(req.session.driverId!);
      const transactions = await getStorage(req).getDriverTransactions(req.session.driverId!);
      const withdrawals = await getStorage(req).getWithdrawalRequests(req.session.driverId!);
      const deposits = await getStorage(req).getDepositRequests(req.session.driverId!);
      res.json({
        balance: driver?.walletBalance || "0",
        totalEarnings: driver?.totalEarnings || "0",
        transactions,
        withdrawals,
        deposits,
      });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Driver - Deposit request (pending admin approval)
  app.post("/api/driver/wallet/deposit", requireDriver, async (req, res) => {
    try {
      const { amount, paymentMethodId } = req.body;
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "المبلغ غير صحيح" });
      }
      if (!paymentMethodId) {
        return res.status(400).json({ message: "يرجى اختيار وسيلة الدفع" });
      }
      const paymentMethod = await getStorage(req).getPaymentMethod(paymentMethodId);
      if (!paymentMethod) {
        return res.status(400).json({ message: "وسيلة الدفع غير موجودة" });
      }
      await getStorage(req).createDepositRequest({
        driverId: req.session.driverId!,
        amount: amount,
        paymentMethodId: paymentMethodId,
        paymentMethodName: paymentMethod.name,
        status: "pending",
      });
      // Notify admin
      const driverForDeposit = await getStorage(req).getDriver(req.session.driverId!);
      getStorage(req).createAdminNotification({
        type: "deposit_request",
        title: "طلب إيداع جديد",
        message: `طلب إيداع ${amount} ج.م من المندوب ${driverForDeposit?.name || "غير معروف"} عبر ${paymentMethod.name}`,
      }).catch(() => { });
      res.json({ message: "تم إرسال طلب الإيداع. سيتم مراجعته من الإدارة" });
    } catch (error) {
      res.status(500).json({ message: "فشل في إرسال طلب الإيداع" });
    }
  });

  // Driver - Request withdrawal
  app.post("/api/driver/wallet/withdraw", requireDriver, async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "المبلغ غير صحيح" });
      }
      const driver = await getStorage(req).getDriver(req.session.driverId!);
      if (parseFloat(driver!.walletBalance || "0") < parseFloat(amount)) {
        return res.status(400).json({ message: "الرصيد غير كافٍ" });
      }
      await getStorage(req).createWithdrawalRequest({
        driverId: req.session.driverId!,
        amount: amount,
        status: "pending",
      });
      // Notify admin
      getStorage(req).createAdminNotification({
        type: "withdrawal_request",
        title: "طلب سحب جديد",
        message: `طلب سحب ${amount} ج.م من المندوب ${driver!.name}`,
      }).catch(() => { });
      res.json({ message: "تم إرسال طلب السحب. سيتم مراجعته من الإدارة" });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // ============= ADMIN AUTH =============

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Check main admin first
      const admin = await getStorage(req).getAdminByUsername(username);
      if (admin) {
        const isValidPassword = await bcrypt.compare(password, admin.password);
        if (!isValidPassword) {
          return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
        }
        req.session.adminLoggedIn = true;
        req.session.proAdminLoggedIn = false;
        req.session.proAdminId = undefined;
        return res.json({ message: "تم تسجيل الدخول بنجاح" });
      }

      // Check pro admin
      const proAdmin = await getStorage(req).getProAdminByUsername(username);
      if (proAdmin) {
        if (!proAdmin.isActive) {
          return res.status(401).json({ message: "هذا الحساب معطل" });
        }
        const isValidPassword = await bcrypt.compare(password, proAdmin.password);
        if (!isValidPassword) {
          return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
        }
        req.session.adminLoggedIn = false;
        req.session.proAdminLoggedIn = true;
        req.session.proAdminId = proAdmin.id;
        req.session.tenantDbName = proAdmin.dbName;
        return res.json({ message: "تم تسجيل الدخول بنجاح", isPro: true });
      }

      return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
    } catch (error) {
      res.status(500).json({ message: "فشل في تسجيل الدخول" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "تم تسجيل الخروج" });
    });
  });

  app.get("/api/admin/check", requireAdmin, (req, res) => {
    res.json({
      loggedIn: true,
      isPro: !!req.session.proAdminLoggedIn,
      proAdminId: req.session.proAdminId || null,
    });
  });

  app.post("/api/admin/change-password", requireAdmin, async (req, res) => {
    try {
      const { currentPassword, newPassword, username } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "يرجى إدخال كلمة المرور الحالية والجديدة" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });
      }

      // If pro admin, verify against main DB's pro_admins and update both
      if (req.session.proAdminLoggedIn && req.session.proAdminId) {
        const proAdmin = await storage.getProAdmin(req.session.proAdminId);
        if (!proAdmin) {
          return res.status(404).json({ message: "المستخدم غير موجود" });
        }
        const isValidPassword = await bcrypt.compare(currentPassword, proAdmin.password);
        if (!isValidPassword) {
          return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
        }
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        // Update in main DB (pro_admins table)
        await storage.updateProAdmin(proAdmin.id, { password: hashedNewPassword });
        // Also update in tenant DB (admin_users table)
        const tenantAdmin = await getStorage(req).getAdminByUsername(proAdmin.username);
        if (tenantAdmin) {
          await getStorage(req).updateAdminPassword(tenantAdmin.id, hashedNewPassword);
        }
        return res.json({ message: "تم تغيير كلمة المرور بنجاح" });
      }

      // Main admin password change
      const adminUsername = username || "admin";
      const admin = await getStorage(req).getAdminByUsername(adminUsername);
      if (!admin) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
      }
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await getStorage(req).updateAdminPassword(admin.id, hashedNewPassword);
      res.json({ message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "فشل في تغيير كلمة المرور" });
    }
  });

  // ============= PRO ACCOUNT MANAGEMENT (Main Admin Only) =============

  // Get all pro admins
  app.get("/api/admin/pro-accounts", requireMainAdmin, async (req, res) => {
    try {
      const pros = await getStorage(req).getProAdmins();
      // Don't expose passwords
      const safePros = pros.map(({ password, ...rest }) => rest);
      res.json(safePros);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب الحسابات" });
    }
  });

  // Create pro admin
  app.post("/api/admin/pro-accounts", requireMainAdmin, async (req, res) => {
    try {
      const { username, password, name } = req.body;
      if (!username || !password || !name) {
        return res.status(400).json({ message: "جميع الحقول مطلوبة" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      // Check if username already exists in main admins or pro admins
      const existingAdmin = await getStorage(req).getAdminByUsername(username);
      const existingPro = await getStorage(req).getProAdminByUsername(username);
      if (existingAdmin || existingPro) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }

      // Generate tenant database name and create isolated database
      const dbName = generateDbName(username);
      console.log(`Creating tenant database: ${dbName} for user: ${username}`);
      await createTenantDatabase(dbName);
      await initializeTenantDatabase(dbName, username, password);
      console.log(`Tenant database ${dbName} initialized successfully`);

      const hashedPassword = await bcrypt.hash(password, 10);
      const pro = await getStorage(req).createProAdmin({ username, password: hashedPassword, name, dbName });
      const { password: _, ...safePro } = pro;
      res.json(safePro);
    } catch (error) {
      console.error("Failed to create pro admin:", error);
      res.status(500).json({ message: "فشل في إنشاء الحساب" });
    }
  });

  // Update pro admin
  app.patch("/api/admin/pro-accounts/:id", requireMainAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, name, isActive, disableAfterDays, enableAfterDays } = req.body;
      const updateData: any = {};
      if (username !== undefined) {
        // Check uniqueness
        const existingAdmin = await getStorage(req).getAdminByUsername(username);
        const existingPro = await getStorage(req).getProAdminByUsername(username);
        if (existingAdmin || (existingPro && existingPro.id !== id)) {
          return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
        }
        updateData.username = username;
      }
      if (password !== undefined) {
        if (password.length < 6) {
          return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
        }
        updateData.password = await bcrypt.hash(password, 10);
      }
      if (name !== undefined) updateData.name = name;
      if (isActive !== undefined) updateData.isActive = isActive;

      // Timer: auto-disable after X days
      if (disableAfterDays !== undefined) {
        if (disableAfterDays === null || disableAfterDays === 0) {
          updateData.autoDisableAt = null;
        } else {
          const d = new Date();
          d.setDate(d.getDate() + Number(disableAfterDays));
          updateData.autoDisableAt = d;
        }
      }

      // Timer: auto-enable after X days
      if (enableAfterDays !== undefined) {
        if (enableAfterDays === null || enableAfterDays === 0) {
          updateData.autoEnableAt = null;
        } else {
          const d = new Date();
          d.setDate(d.getDate() + Number(enableAfterDays));
          updateData.autoEnableAt = d;
        }
      }

      const updated = await getStorage(req).updateProAdmin(id, updateData);
      if (!updated) return res.status(404).json({ message: "الحساب غير موجود" });
      const { password: _, ...safePro } = updated;
      res.json(safePro);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث الحساب" });
    }
  });

  // Delete pro admin
  app.delete("/api/admin/pro-accounts/:id", requireMainAdmin, async (req, res) => {
    try {
      // Look up the pro admin to get their dbName before deleting
      const proAdmin = await getStorage(req).getProAdmin(req.params.id);
      if (!proAdmin) return res.status(404).json({ message: "الحساب غير موجود" });

      // Drop the tenant database
      if (proAdmin.dbName) {
        try {
          console.log(`Dropping tenant database: ${proAdmin.dbName}`);
          await dropTenantDatabase(proAdmin.dbName);
          console.log(`Tenant database ${proAdmin.dbName} dropped successfully`);
        } catch (dbErr) {
          console.error("Failed to drop tenant database:", dbErr);
        }
      }

      const deleted = await getStorage(req).deleteProAdmin(req.params.id);
      if (!deleted) return res.status(404).json({ message: "الحساب غير موجود" });
      res.json({ message: "تم حذف الحساب" });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف الحساب" });
    }
  });

  // ============= ADMIN ROUTES =============

  // Orders (Admin)
  app.get("/api/orders", requireAdmin, async (req, res) => {
    try {
      const allOrders = await getStorage(req).getOrders();
      res.json(allOrders);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب الطلبات" });
    }
  });

  // Admin - Create order with driver assignment and balance freeze
  app.post("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const {
        customerName, customerPhone, customerAddress, customerCity, customerNotes,
        driverId, total, pickupAddress, shipmentType, weight, deliveryDeadline,
        commissionPrepaid,
      } = req.body;

      if (!customerName || !customerPhone || !customerAddress || !total || !driverId) {
        return res.status(400).json({ message: "جميع الحقول المطلوبة يجب ملؤها" });
      }

      const driver = await getStorage(req).getDriver(driverId);
      if (!driver) {
        return res.status(404).json({ message: "المندوب غير موجود" });
      }

      const orderTotal = parseFloat(total);
      const driverBalance = parseFloat(driver.walletBalance || "0");
      if (driverBalance < orderTotal) {
        return res.status(400).json({ message: `رصيد المندوب غير كافي. الرصيد الحالي: ${driverBalance} والمطلوب: ${orderTotal}` });
      }

      // Freeze amount from driver balance
      const newBalance = (driverBalance - orderTotal).toFixed(2);
      await getStorage(req).updateDriver(driverId, { walletBalance: newBalance } as any);

      // Generate order number and codes
      const orderNumber = "ORD-" + Date.now().toString(36).toUpperCase();
      const trackingCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const deliveryCode = Math.floor(100000 + Math.random() * 900000).toString();
      const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

      const order = await getStorage(req).createOrder({
        orderNumber,
        customerName,
        customerPhone,
        customerAddress,
        customerCity: customerCity || null,
        customerNotes: customerNotes || null,
        items: [{ productId: "shipment", productName: shipmentType || "شحنة", productImage: "", quantity: 1, price: total, total }],
        subtotal: total,
        total,
        status: "processing",
        driverId,
        driverName: driver.name,
        trackingCode,
        deliveryCode,
        confirmationCode,
        pickupAddress: pickupAddress || null,
        shipmentType: shipmentType || null,
        weight: weight || null,
        frozenAmount: total,
        commissionPrepaid: commissionPrepaid || false,
        deliveryDeadline: deliveryDeadline ? new Date(deliveryDeadline) : null,
      } as any);

      // Notify driver
      const commissionTypeText = commissionPrepaid ? "العمولة مدفوعة (تضاف لرصيدك بعد التسليم)" : "العمولة نقدية من العميل";
      await getStorage(req).createDriverNotification({
        driverId,
        orderId: order.id,
        type: "new_order",
        title: "طلب شحن جديد",
        message: `تم تكليفك بطلب شحن #${orderNumber} - ${customerName} - ${total} ج.م\n${commissionTypeText}`,
        isRead: false,
      });

      // Log the operation
      await getStorage(req).createOperationLog({
        action: "order_created",
        details: `تم إنشاء طلب #${orderNumber} وتم تجميد ${total} ج.م من رصيد المندوب ${driver.name}`,
        performedBy: "admin",
      } as any);

      res.status(201).json(order);
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ message: "فشل في إنشاء الطلب" });
    }
  });

  app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const existingOrder = await getStorage(req).getOrder(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }

      const updateData: any = { ...req.body };

      // If assigning drivers (multi-driver)
      if (updateData.assignDriverIds && Array.isArray(updateData.assignDriverIds)) {
        const driverIds: string[] = updateData.assignDriverIds;
        delete updateData.assignDriverIds;

        for (const dId of driverIds) {
          const driver = await getStorage(req).getDriver(dId);
          if (!driver) continue;
          // Check if already assigned
          const existing = await getStorage(req).getAssignmentByOrderAndDriver(req.params.id, dId);
          if (existing) continue;
          // Create assignment
          await getStorage(req).createAssignment({ orderId: req.params.id, driverId: dId, status: "pending" });
          // Send notification to driver
          await getStorage(req).createDriverNotification({
            driverId: dId,
            orderId: req.params.id,
            type: "order_request",
            title: "طلب توصيل جديد",
            message: `لديك طلب توصيل جديد #${existingOrder.orderNumber} - ${existingOrder.customerCity || ""} - ${existingOrder.total} ج.م`,
            status: "pending",
            isRead: false,
          });
        }
        // Update status to processing
        updateData.status = "processing";
      }

      // If manually assigning single driver and shipping
      if (updateData.status === "shipped" && updateData.driverId && existingOrder.status !== "shipped") {
        const driver = await getStorage(req).getDriver(updateData.driverId);
        if (!driver) return res.status(400).json({ message: "رجل الشحن غير موجود" });
        updateData.driverName = driver.name;
        updateData.trackingCode = generateTrackingCode();
        updateData.deliveryCode = generateDeliveryCode();
        updateData.shippedAt = new Date();
        updateData.pickupDeadline = new Date(Date.now() + 60 * 60 * 1000);
        // Log operation - driver assigned
        await getStorage(req).createOperationLog({
          type: "driver_assigned",
          driverId: driver.id,
          driverName: driver.name,
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          customerName: existingOrder.customerName,
          customerPhone: existingOrder.customerPhone,
          amount: existingOrder.total,
          description: `تم تعيين المندوب ${driver.name} للطلب #${existingOrder.orderNumber}`,
          status: "completed",
        });
        // Notify driver about direct assignment
        await getStorage(req).createDriverNotification({
          driverId: driver.id,
          orderId: existingOrder.id,
          type: "order_request",
          title: "تم تعيينك لطلب توصيل",
          message: `تم تعيينك مباشرة للطلب #${existingOrder.orderNumber} - ${existingOrder.customerCity || ""} - ${existingOrder.total} ج.م`,
          status: "pending",
          isRead: false,
        });
        // Notify admin
        await getStorage(req).createAdminNotification({
          type: "new_order",
          title: "تم شحن طلب",
          message: `تم تعيين المندوب ${driver.name} للطلب #${existingOrder.orderNumber} وبدء الشحن`,
          relatedId: existingOrder.id,
          isRead: false,
        });
      }

      // Confirm amount collected
      if (updateData.amountCollectedConfirmed !== undefined) {
        // Admin confirms driver collected the money
      }

      const order = await getStorage(req).updateOrder(req.params.id, updateData);
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث الطلب" });
    }
  });

  // Admin - Get order assignments
  app.get("/api/admin/orders/:id/assignments", requireAdmin, async (req, res) => {
    try {
      const assignments = await getStorage(req).getOrderAssignments(req.params.id);
      const result = [];
      for (const a of assignments) {
        const driver = await getStorage(req).getDriver(a.driverId);
        result.push({ ...a, driverName: driver?.name, driverPhone: driver?.phone });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Get eligible drivers for order (sorted by wallet balance)
  app.get("/api/admin/orders/:id/eligible-drivers", requireAdmin, async (req, res) => {
    try {
      const order = await getStorage(req).getOrder(req.params.id);
      if (!order) return res.status(404).json({ message: "الطلب غير موجود" });
      const allDrivers = await getStorage(req).getDrivers();
      const orderTotal = parseFloat(order.total);
      // Filter: active, verified, available, balance >= order total
      const eligible = allDrivers
        .filter(d => d.isActive && d.isVerified && d.isAvailable)
        .filter(d => parseFloat(d.walletBalance || "0") >= orderTotal)
        .map(d => ({
          id: d.id,
          name: d.name,
          phone: d.phone,
          walletBalance: d.walletBalance,
          completedOrders: d.completedOrders,
          latitude: d.latitude,
          longitude: d.longitude,
          maxWeight: d.maxWeight,
          idVerified: d.idVerified,
          criminalRecordVerified: d.criminalRecordVerified,
        }));
      res.json(eligible);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Delivery Drivers (Admin)
  app.get("/api/admin/drivers", requireAdmin, async (req, res) => {
    try {
      const drivers = await getStorage(req).getDrivers();
      // Filter out hidden drivers and don't send passwords
      const visible = drivers.filter((d: any) => !d.isHidden);
      res.json(visible.map(d => ({ ...d, password: undefined })));
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب رجال الشحن" });
    }
  });

  app.post("/api/admin/drivers", requireAdmin, async (req, res) => {
    try {
      const { username, password, name, phone, isActive } = req.body;
      if (!username || !password || !name) {
        return res.status(400).json({ message: "الاسم واسم المستخدم وكلمة المرور مطلوبة" });
      }
      // Check username uniqueness across all user types
      const existingDriver = await getStorage(req).getDriverByUsername(username);
      if (existingDriver) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      const existingAdmin = await storage.getAdminByUsername(username);
      if (existingAdmin) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      const existingPro = await storage.getProAdminByUsername(username);
      if (existingPro) {
        return res.status(400).json({ message: "اسم المستخدم مستخدم بالفعل" });
      }
      // Determine who is adding this driver
      let addedByAdmin: string | null = null;
      if (req.session?.proAdminLoggedIn && req.session?.proAdminId) {
        const proAdmin = await storage.getProAdmin(req.session.proAdminId);
        if (proAdmin) addedByAdmin = proAdmin.username;
      } else {
        // Main admin - get username from admin_users
        const admins = await storage.getAdminByUsername("admin");
        addedByAdmin = admins ? admins.username : "admin";
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newReferralCode = generateReferralCode();
      const driver = await getStorage(req).createDriver({
        username, password: hashedPassword, name, phone,
        isActive: isActive !== false,
        isVerified: true,
        referralCode: newReferralCode,
        addedByAdmin,
        loginCount: 0,
      } as any);
      res.status(201).json({ ...driver, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "فشل في إنشاء حساب رجل الشحن" });
    }
  });

  app.patch("/api/admin/drivers/:id", requireAdmin, async (req, res) => {
    try {
      const updateData: any = { ...req.body };
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 10);
      } else {
        delete updateData.password;
      }
      const existingDriver = await getStorage(req).getDriver(req.params.id);
      const driver = await getStorage(req).updateDriver(req.params.id, updateData);
      if (!driver) {
        return res.status(404).json({ message: "رجل الشحن غير موجود" });
      }
      // Notify driver on activation/deactivation change
      if (existingDriver && updateData.isActive !== undefined && existingDriver.isActive !== updateData.isActive) {
        await getStorage(req).createDriverNotification({
          driverId: driver.id,
          type: "general",
          title: updateData.isActive ? "تم تفعيل حسابك" : "تم تعطيل حسابك",
          message: updateData.isActive ? "تم تفعيل حسابك بنجاح. يمكنك الآن استقبال الطلبات" : "تم تعطيل حسابك مؤقتاً. تواصل مع الإدارة لمزيد من المعلومات",
          isRead: false,
        });
      }
      // Notify driver on verification change
      if (existingDriver && updateData.isVerified !== undefined && existingDriver.isVerified !== updateData.isVerified) {
        await getStorage(req).createDriverNotification({
          driverId: driver.id,
          type: "general",
          title: updateData.isVerified ? "تم التحقق من حسابك" : "تم إلغاء التحقق من حسابك",
          message: updateData.isVerified ? "تم التحقق من حسابك بنجاح" : "تم إلغاء التحقق من حسابك. تواصل مع الإدارة",
          isRead: false,
        });
      }
      res.json({ ...driver, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث رجل الشحن" });
    }
  });

  app.delete("/api/admin/drivers/:id", requireAdmin, async (req, res) => {
    try {
      // Soft delete: hide from admin's list but keep the account
      const driver = await getStorage(req).updateDriver(req.params.id, { isHidden: true, isActive: false } as any);
      if (!driver) {
        return res.status(404).json({ message: "رجل الشحن غير موجود" });
      }
      res.json({ message: "تم إخفاء المندوب من القائمة" });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف رجل الشحن" });
    }
  });

  // Admin - Get notifications (with pagination)
  app.get("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const notifications = await getStorage(req).getAdminNotifications(limit, offset);
      const unreadCount = await getStorage(req).getAdminUnreadCount();
      res.json({ notifications, unreadCount });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Mark notifications as read
  app.post("/api/admin/notifications/read", requireAdmin, async (req, res) => {
    try {
      await getStorage(req).markAdminNotificationsRead();
      res.json({ message: "تم" });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Delete single notification
  app.delete("/api/admin/notifications/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await getStorage(req).deleteAdminNotification(req.params.id);
      if (!deleted) return res.status(404).json({ message: "الإشعار غير موجود" });
      res.json({ message: "تم حذف الإشعار" });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف الإشعار" });
    }
  });

  // Admin - Clear all notifications
  app.delete("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
      await getStorage(req).clearAdminNotifications();
      res.json({ message: "تم حذف جميع الإشعارات" });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Send custom notification to driver(s)
  app.post("/api/admin/notifications/send", requireAdmin, async (req, res) => {
    try {
      const { driverIds, title, message, sendToAll } = req.body;
      if (!title || !message) return res.status(400).json({ message: "العنوان والرسالة مطلوبان" });

      let targetIds: string[] = driverIds || [];
      if (sendToAll) {
        const allDrivers = await getStorage(req).getDrivers();
        targetIds = allDrivers.map(d => d.id);
      }

      if (targetIds.length === 0) return res.status(400).json({ message: "لا يوجد مندوبين لإرسال الإشعار إليهم" });

      await getStorage(req).sendBulkDriverNotification(targetIds, {
        type: "admin_message",
        title,
        message,
      });

      res.json({ message: `تم إرسال الإشعار إلى ${targetIds.length} مندوب` });
    } catch (error) {
      res.status(500).json({ message: "فشل في إرسال الإشعار" });
    }
  });

  // Admin - Global Search
  app.get("/api/admin/search", requireAdmin, async (req, res) => {
    try {
      const query = (req.query.q as string || "").trim();
      if (!query || query.length < 2) return res.json({ orders: [], drivers: [], notifications: [] });
      const results = await getStorage(req).globalSearch(query);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "فشل في البحث" });
    }
  });

  // Admin - Get pending driver registrations (unverified)
  app.get("/api/admin/drivers/pending", requireAdmin, async (req, res) => {
    try {
      const drivers = await getStorage(req).getDrivers();
      const pending = drivers.filter(d => !d.isVerified).map(d => ({
        ...d,
        password: undefined,
      }));
      res.json(pending);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Toggle full verification badge
  app.post("/api/admin/drivers/:id/full-verify", requireAdmin, async (req, res) => {
    try {
      const { fullyVerified } = req.body;
      const driver = await getStorage(req).updateDriver(req.params.id, { fullyVerified } as any);
      if (!driver) return res.status(404).json({ message: "المندوب غير موجود" });
      // Notify driver about badge change
      await getStorage(req).createDriverNotification({
        driverId: driver.id,
        type: "general",
        title: fullyVerified ? "حصلت على شارة التوثيق الكامل ✅" : "تم إزالة شارة التوثيق",
        message: fullyVerified ? "تهانينا! حصلت على شارة التوثيق الكامل. هذا يعزز ثقة العملاء بك" : "تم إزالة شارة التوثيق من حسابك",
        isRead: false,
      });
      res.json({ ...driver, password: undefined });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Get all ratings
  app.get("/api/admin/ratings", requireAdmin, async (req, res) => {
    try {
      const ratings = await getStorage(req).getAllRatings();
      const result = [];
      for (const r of ratings) {
        const driver = await getStorage(req).getDriver(r.driverId);
        result.push({ ...r, driverName: driver?.name || "مندوب" });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Get ratings for specific driver
  app.get("/api/admin/drivers/:id/ratings", requireAdmin, async (req, res) => {
    try {
      const ratings = await getStorage(req).getDriverRatings(req.params.id);
      res.json(ratings);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Add rating for driver
  app.post("/api/admin/drivers/:id/ratings", requireAdmin, async (req, res) => {
    try {
      const { rating, comment, customerName } = req.body;
      if (!rating || parseFloat(rating) < 1 || parseFloat(rating) > 5) {
        return res.status(400).json({ message: "التقييم يجب أن يكون بين 1 و 5" });
      }
      const driver = await getStorage(req).getDriver(req.params.id);
      const newRating = await getStorage(req).createDriverRating({
        driverId: req.params.id,
        rating: rating.toString(),
        comment: comment || null,
        customerName: customerName || "عميل",
      });
      // Update driver average rating
      const allRatings = await getStorage(req).getDriverRatings(req.params.id);
      const avg = (allRatings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / allRatings.length).toFixed(1);
      await getStorage(req).updateDriver(req.params.id, { averageRating: avg, totalRatings: allRatings.length } as any);

      // Trigger webhook
      await triggerWebhook("rating.created", {
        ratingId: newRating.id,
        driverId: req.params.id,
        driverName: driver?.name || "",
        rating: newRating.rating,
        comment: newRating.comment,
        customerName: newRating.customerName,
        newAverage: avg,
        totalRatings: allRatings.length,
      }, req.session?.tenantDbName);

      res.status(201).json(newRating);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Delete a rating
  app.delete("/api/admin/ratings/:id", requireAdmin, async (req, res) => {
    try {
      // Get rating before delete for webhook data
      const allRatings = await getStorage(req).getAllRatings();
      const ratingToDelete = allRatings.find(r => r.id === req.params.id);

      const deleted = await getStorage(req).deleteDriverRating(req.params.id);
      if (!deleted) return res.status(404).json({ message: "غير موجود" });

      // Trigger webhook & recalculate average
      if (ratingToDelete) {
        const remainingRatings = await getStorage(req).getDriverRatings(ratingToDelete.driverId);
        const newAvg = remainingRatings.length > 0
          ? (remainingRatings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / remainingRatings.length).toFixed(1)
          : "0";
        await getStorage(req).updateDriver(ratingToDelete.driverId, {
          averageRating: newAvg,
          totalRatings: remainingRatings.length,
        } as any);

        const driver = await getStorage(req).getDriver(ratingToDelete.driverId);
        await triggerWebhook("rating.deleted", {
          ratingId: ratingToDelete.id,
          driverId: ratingToDelete.driverId,
          driverName: driver?.name || "",
          deletedRating: ratingToDelete.rating,
          newAverage: newAvg,
          totalRatings: remainingRatings.length,
        }, req.session?.tenantDbName);
      }

      res.json({ message: "تم حذف التقييم" });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Get all referrals
  app.get("/api/admin/referrals", requireAdmin, async (req, res) => {
    try {
      const referrals = await getStorage(req).getDriverReferrals();
      const result = [];
      for (const r of referrals) {
        const referrer = await getStorage(req).getDriver(r.referrerId);
        const referred = await getStorage(req).getDriver(r.referredId);
        result.push({
          ...r,
          referrerName: referrer?.name || "مندوب",
          referredName: referred?.name || "مندوب",
        });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Approve/reject referral bonus
  app.patch("/api/admin/referrals/:id", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const referral = await getStorage(req).getReferral(req.params.id);
      if (!referral) return res.status(404).json({ message: "غير موجود" });
      if (referral.status !== "pending") return res.status(400).json({ message: "تم معالجة هذه الإحالة بالفعل" });

      if (status === "approved") {
        // Add bonus to referrer wallet
        const referrer = await getStorage(req).getDriver(referral.referrerId);
        if (referrer) {
          const newBalance = (parseFloat(referrer.walletBalance || "0") + parseFloat(referral.bonus || "0")).toFixed(2);
          await getStorage(req).updateDriver(referrer.id, { walletBalance: newBalance } as any);
          await getStorage(req).createWalletTransaction({
            driverId: referrer.id,
            type: "referral_bonus",
            amount: referral.bonus || "0",
            balanceAfter: newBalance,
            description: `مكافأة إحالة مندوب جديد`,
            status: "completed",
          });
          // Log operation
          await getStorage(req).createOperationLog({
            type: "referral_bonus",
            driverId: referrer.id,
            driverName: referrer.name,
            amount: referral.bonus || "0",
            description: `مكافأة إحالة مندوب جديد - ${referral.bonus} ج.م`,
            status: "completed",
            metadata: { referredId: referral.referredId, newBalance },
          });
        }
      }

      const updated = await getStorage(req).updateDriverReferral(referral.id, { status });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Get verification code for driver
  app.get("/api/admin/drivers/:id/code", requireAdmin, async (req, res) => {
    try {
      const driver = await getStorage(req).getDriver(req.params.id);
      if (!driver) return res.status(404).json({ message: "غير موجود" });
      res.json({ code: driver.verificationCode, phone: driver.whatsappPhone, name: driver.name });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Withdrawal requests
  app.get("/api/admin/withdrawals", requireAdmin, async (req, res) => {
    try {
      const requests = await getStorage(req).getWithdrawalRequests();
      const result = [];
      for (const r of requests) {
        const driver = await getStorage(req).getDriver(r.driverId);
        result.push({ ...r, driverName: driver?.name, driverPhone: driver?.phone });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Process withdrawal
  app.patch("/api/admin/withdrawals/:id", requireAdmin, async (req, res) => {
    try {
      const { status, adminNote } = req.body;
      const withdrawal = await getStorage(req).getWithdrawalRequest(req.params.id);
      if (!withdrawal) return res.status(404).json({ message: "غير موجود" });
      if (withdrawal.status !== "pending") return res.status(400).json({ message: "تم معالجة هذا الطلب بالفعل" });

      if (status === "approved") {
        const driver = await getStorage(req).getDriver(withdrawal.driverId);
        const newBalance = (parseFloat(driver!.walletBalance || "0") - parseFloat(withdrawal.amount)).toFixed(2);
        if (parseFloat(newBalance) < 0) {
          return res.status(400).json({ message: "رصيد المندوب غير كافٍ" });
        }
        await getStorage(req).updateDriver(withdrawal.driverId, { walletBalance: newBalance } as any);
        await getStorage(req).createWalletTransaction({
          driverId: withdrawal.driverId,
          type: "withdrawal",
          amount: `-${withdrawal.amount}`,
          balanceAfter: newBalance,
          description: `سحب أموال - ${adminNote || "تمت الموافقة"}`,
          status: "completed",
        });
        await getStorage(req).createDriverNotification({
          driverId: withdrawal.driverId,
          type: "general",
          title: "تمت الموافقة على السحب",
          message: `تمت الموافقة على طلب سحب ${withdrawal.amount} ج.م`,
          isRead: false,
        });
        // Log operation
        await getStorage(req).createOperationLog({
          type: "withdrawal",
          driverId: withdrawal.driverId,
          driverName: driver!.name,
          amount: `-${withdrawal.amount}`,
          description: `سحب أموال ${withdrawal.amount} ج.م - ${adminNote || "تمت الموافقة"}`,
          status: "completed",
          metadata: { adminNote, newBalance },
        });
      } else if (status === "rejected") {
        await getStorage(req).createDriverNotification({
          driverId: withdrawal.driverId,
          type: "general",
          title: "تم رفض طلب السحب",
          message: `تم رفض طلب سحب ${withdrawal.amount} ج.م. ${adminNote || ""}`,
          isRead: false,
        });
      }

      const updated = await getStorage(req).updateWithdrawalRequest(req.params.id, {
        status,
        adminNote,
        processedAt: new Date(),
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Deposit requests
  app.get("/api/admin/deposit-requests", requireAdmin, async (req, res) => {
    try {
      const requests = await getStorage(req).getDepositRequests();
      const result = [];
      for (const r of requests) {
        const driver = await getStorage(req).getDriver(r.driverId);
        result.push({ ...r, driverName: driver?.name, driverPhone: driver?.phone });
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Process deposit request
  app.patch("/api/admin/deposit-requests/:id", requireAdmin, async (req, res) => {
    try {
      const { status, adminNote } = req.body;
      const deposit = await getStorage(req).getDepositRequest(req.params.id);
      if (!deposit) return res.status(404).json({ message: "غير موجود" });
      if (deposit.status !== "pending") return res.status(400).json({ message: "تم معالجة هذا الطلب بالفعل" });

      if (status === "approved") {
        const driver = await getStorage(req).getDriver(deposit.driverId);
        const newBalance = (parseFloat(driver!.walletBalance || "0") + parseFloat(deposit.amount)).toFixed(2);
        await getStorage(req).updateDriver(deposit.driverId, { walletBalance: newBalance } as any);
        await getStorage(req).createWalletTransaction({
          driverId: deposit.driverId,
          type: "deposit",
          amount: deposit.amount,
          balanceAfter: newBalance,
          description: `إيداع رصيد - ${deposit.paymentMethodName}`,
          status: "completed",
        });
        await getStorage(req).createDriverNotification({
          driverId: deposit.driverId,
          type: "general",
          title: "تمت الموافقة على الإيداع",
          message: `تمت الموافقة على طلب إيداع ${deposit.amount} ج.م وتم إضافة الرصيد`,
          isRead: false,
        });
        // Log operation
        await getStorage(req).createOperationLog({
          type: "deposit",
          driverId: deposit.driverId,
          driverName: driver!.name,
          amount: deposit.amount,
          description: `إيداع رصيد ${deposit.amount} ج.م - ${deposit.paymentMethodName}`,
          status: "completed",
          metadata: { paymentMethod: deposit.paymentMethodName, newBalance },
        });
      } else if (status === "rejected") {
        await getStorage(req).createDriverNotification({
          driverId: deposit.driverId,
          type: "general",
          title: "تم رفض طلب الإيداع",
          message: `تم رفض طلب إيداع ${deposit.amount} ج.م. ${adminNote || ""}`,
          isRead: false,
        });
      }

      const updated = await getStorage(req).updateDepositRequest(req.params.id, {
        status,
        adminNote,
        processedAt: new Date(),
      });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Update driver profile image
  app.post("/api/admin/drivers/:id/profile-image", requireAdmin, (req, res) => {
    upload.single("image")(req, res, async (err: any) => {
      if (err) return res.status(400).json({ message: err.message });
      if (!req.file) return res.status(400).json({ message: "لم يتم رفع صورة" });
      try {
        const driver = await getStorage(req).getDriver(req.params.id);
        if (!driver) return res.status(404).json({ message: "غير موجود" });
        const imageUrl = `/uploads/${req.file.filename}`;
        await getStorage(req).updateDriver(req.params.id, { profileImage: imageUrl } as any);
        res.json({ message: "تم تحديث الصورة", profileImage: imageUrl });
      } catch (error) {
        res.status(500).json({ message: "فشل في تحديث الصورة" });
      }
    });
  });

  // Admin - Remove driver profile image
  app.delete("/api/admin/drivers/:id/profile-image", requireAdmin, async (req, res) => {
    try {
      const driver = await getStorage(req).getDriver(req.params.id);
      if (!driver) return res.status(404).json({ message: "غير موجود" });
      await getStorage(req).updateDriver(req.params.id, { profileImage: null } as any);
      res.json({ message: "تم حذف الصورة" });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Add deposit to driver wallet
  app.post("/api/admin/drivers/:id/deposit", requireAdmin, async (req, res) => {
    try {
      const { amount } = req.body;
      const driver = await getStorage(req).getDriver(req.params.id);
      if (!driver) return res.status(404).json({ message: "غير موجود" });
      const newBalance = (parseFloat(driver.walletBalance || "0") + parseFloat(amount)).toFixed(2);
      await getStorage(req).updateDriver(req.params.id, { walletBalance: newBalance } as any);
      await getStorage(req).createWalletTransaction({
        driverId: req.params.id,
        type: "deposit",
        amount,
        balanceAfter: newBalance,
        description: "إيداع من الإدارة",
        status: "completed",
      });
      await getStorage(req).createDriverNotification({
        driverId: req.params.id,
        type: "general",
        title: "تم إيداع رصيد",
        message: `تم إيداع ${amount} ج.م في محفظتك`,
        isRead: false,
      });
      res.json({ message: "تم الإيداع", balance: newBalance });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Verify driver ID
  app.post("/api/admin/drivers/:id/verify-id", requireAdmin, async (req, res) => {
    try {
      const { verified } = req.body;
      const driver = await getStorage(req).getDriver(req.params.id);
      if (!driver) return res.status(404).json({ message: "غير موجود" });
      await getStorage(req).updateDriver(req.params.id, { idVerified: verified } as any);
      // Notify driver
      await getStorage(req).createDriverNotification({
        driverId: req.params.id,
        type: "general",
        title: verified ? "تم توثيق الهوية" : "تم إلغاء توثيق الهوية",
        message: verified
          ? "تم توثيق حسابك بالهوية الوطنية. تم رفع نسبة عمولتك!"
          : "تم إلغاء توثيق الهوية من حسابك",
        isRead: false,
      });
      res.json({ message: verified ? "تم توثيق الهوية" : "تم إلغاء التوثيق" });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Admin - Verify driver criminal record
  app.post("/api/admin/drivers/:id/verify-criminal", requireAdmin, async (req, res) => {
    try {
      const { verified } = req.body;
      const driver = await getStorage(req).getDriver(req.params.id);
      if (!driver) return res.status(404).json({ message: "غير موجود" });
      await getStorage(req).updateDriver(req.params.id, { criminalRecordVerified: verified } as any);
      await getStorage(req).createDriverNotification({
        driverId: req.params.id,
        type: "general",
        title: verified ? "تم توثيق الفيش الجنائي" : "تم إلغاء توثيق الفيش الجنائي",
        message: verified
          ? "تم توثيق حسابك بالفيش الجنائي النظيف. تم رفع نسبة عمولتك للحد الأقصى!"
          : "تم إلغاء توثيق الفيش الجنائي من حسابك",
        isRead: false,
      });
      res.json({ message: verified ? "تم توثيق الفيش الجنائي" : "تم إلغاء التوثيق" });
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Payment Methods (Admin)
  app.post("/api/admin/payment-methods", requireAdmin, async (req, res) => {
    try {
      const parsed = insertPaymentMethodSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "بيانات غير صحيحة", errors: parsed.error.errors });
      }
      const method = await getStorage(req).createPaymentMethod(parsed.data);
      res.status(201).json(method);
    } catch (error) {
      res.status(500).json({ message: "فشل في إنشاء وسيلة الدفع" });
    }
  });

  app.patch("/api/admin/payment-methods/:id", requireAdmin, async (req, res) => {
    try {
      const method = await getStorage(req).updatePaymentMethod(req.params.id, req.body);
      if (!method) {
        return res.status(404).json({ message: "وسيلة الدفع غير موجودة" });
      }
      res.json(method);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث وسيلة الدفع" });
    }
  });

  app.delete("/api/admin/payment-methods/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await getStorage(req).deletePaymentMethod(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "وسيلة الدفع غير موجودة" });
      }
      res.json({ message: "تم حذف وسيلة الدفع بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف وسيلة الدفع" });
    }
  });

  // Settings (Admin)
  app.patch("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await getStorage(req).updateSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث الإعدادات" });
    }
  });

  // ============= INTEGRATION MANAGEMENT (Admin) =============

  // API Keys CRUD - always stored in main DB with tenant tagging
  app.get("/api/admin/api-keys", requireAdmin, async (req, res) => {
    try {
      const tenantDb = req.session?.tenantDbName || null;
      const allKeys = await storage.getApiKeys();
      const keys = allKeys.filter(k => (k.tenantDbName || null) === tenantDb);
      res.json(keys);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب مفاتيح API" });
    }
  });

  app.post("/api/admin/api-keys", requireAdmin, async (req, res) => {
    try {
      const { name, permissions, rateLimit, ipWhitelist, expiresAt } = req.body;
      const key = await storage.createApiKey({
        name,
        apiKey: generateApiKey(),
        secretKey: generateSecretKey(),
        permissions: permissions || [],
        rateLimit: rateLimit || 100,
        ipWhitelist: ipWhitelist || "",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
        tenantDbName: req.session?.tenantDbName || null,
      });
      res.status(201).json(key);
    } catch (error) {
      res.status(500).json({ message: "فشل في إنشاء مفتاح API" });
    }
  });

  app.patch("/api/admin/api-keys/:id", requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getApiKey(req.params.id);
      if (!existing || (existing.tenantDbName || null) !== (req.session?.tenantDbName || null)) {
        return res.status(404).json({ message: "مفتاح غير موجود" });
      }
      const { tenantDbName, ...updateData } = req.body;
      const key = await storage.updateApiKey(req.params.id, updateData);
      if (!key) return res.status(404).json({ message: "مفتاح غير موجود" });
      res.json(key);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث المفتاح" });
    }
  });

  app.delete("/api/admin/api-keys/:id", requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getApiKey(req.params.id);
      if (!existing || (existing.tenantDbName || null) !== (req.session?.tenantDbName || null)) {
        return res.status(404).json({ message: "مفتاح غير موجود" });
      }
      const deleted = await storage.deleteApiKey(req.params.id);
      if (!deleted) return res.status(404).json({ message: "مفتاح غير موجود" });
      res.json({ message: "تم حذف المفتاح" });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف المفتاح" });
    }
  });

  // Regenerate API key
  app.post("/api/admin/api-keys/:id/regenerate", requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getApiKey(req.params.id);
      if (!existing || (existing.tenantDbName || null) !== (req.session?.tenantDbName || null)) {
        return res.status(404).json({ message: "مفتاح غير موجود" });
      }
      const key = await storage.updateApiKey(req.params.id, {
        apiKey: generateApiKey(),
        secretKey: generateSecretKey(),
      } as any);
      if (!key) return res.status(404).json({ message: "مفتاح غير موجود" });
      res.json(key);
    } catch (error) {
      res.status(500).json({ message: "فشل في إعادة إنشاء المفتاح" });
    }
  });

  // Webhooks CRUD - always stored in main DB with tenant tagging
  app.get("/api/admin/webhooks", requireAdmin, async (req, res) => {
    try {
      const tenantDb = req.session?.tenantDbName || null;
      const allWhs = await storage.getWebhooks();
      const whs = allWhs.filter(w => (w.tenantDbName || null) === tenantDb);
      res.json(whs);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب Webhooks" });
    }
  });

  app.post("/api/admin/webhooks", requireAdmin, async (req, res) => {
    try {
      const { name, url, events, secret, headers, maxRetries } = req.body;
      const wh = await storage.createWebhook({
        name,
        url,
        events: events || [],
        secret: secret || "",
        headers: headers || {},
        maxRetries: maxRetries || 3,
        isActive: true,
        tenantDbName: req.session?.tenantDbName || null,
      });
      res.status(201).json(wh);
    } catch (error) {
      res.status(500).json({ message: "فشل في إنشاء Webhook" });
    }
  });

  app.patch("/api/admin/webhooks/:id", requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getWebhook(req.params.id);
      if (!existing || (existing.tenantDbName || null) !== (req.session?.tenantDbName || null)) {
        return res.status(404).json({ message: "Webhook غير موجود" });
      }
      const { tenantDbName, ...updateData } = req.body;
      const wh = await storage.updateWebhook(req.params.id, updateData);
      if (!wh) return res.status(404).json({ message: "Webhook غير موجود" });
      res.json(wh);
    } catch (error) {
      res.status(500).json({ message: "فشل في تحديث Webhook" });
    }
  });

  app.delete("/api/admin/webhooks/:id", requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getWebhook(req.params.id);
      if (!existing || (existing.tenantDbName || null) !== (req.session?.tenantDbName || null)) {
        return res.status(404).json({ message: "Webhook غير موجود" });
      }
      const deleted = await storage.deleteWebhook(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Webhook غير موجود" });
      res.json({ message: "تم حذف Webhook" });
    } catch (error) {
      res.status(500).json({ message: "فشل في حذف Webhook" });
    }
  });

  // Test webhook
  app.post("/api/admin/webhooks/:id/test", requireAdmin, async (req, res) => {
    try {
      const existing = await storage.getWebhook(req.params.id);
      if (!existing || (existing.tenantDbName || null) !== (req.session?.tenantDbName || null)) {
        return res.status(404).json({ message: "Webhook غير موجود" });
      }
      const wh = existing;

      const testPayload = {
        event: "test",
        timestamp: new Date().toISOString(),
        data: { message: "This is a test webhook from نظام المندوبين" },
      };

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Webhook-Event": "test",
        ...(wh.headers as Record<string, string> || {}),
      };

      if (wh.secret) {
        const crypto = await import("crypto");
        headers["X-Webhook-Signature"] = crypto.createHmac("sha256", wh.secret)
          .update(JSON.stringify(testPayload)).digest("hex");
      }

      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(wh.url, {
          method: "POST",
          headers,
          body: JSON.stringify(testPayload),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        const body = await response.text().catch(() => "");

        await storage.createWebhookLog({
          webhookId: wh.id,
          event: "test",
          url: wh.url,
          requestBody: testPayload.data,
          responseStatus: response.status,
          responseBody: body.substring(0, 1000),
          success: response.ok,
          error: response.ok ? null : `HTTP ${response.status}`,
          duration,
        });

        res.json({ success: response.ok, status: response.status, duration, body: body.substring(0, 200) });
      } catch (err: any) {
        const duration = Date.now() - startTime;
        await storage.createWebhookLog({
          webhookId: wh.id,
          event: "test",
          url: wh.url,
          requestBody: testPayload.data,
          responseStatus: 0,
          success: false,
          error: err.message,
          duration,
        });
        res.json({ success: false, status: 0, duration, error: err.message });
      }
    } catch (error) {
      res.status(500).json({ message: "فشل في اختبار Webhook" });
    }
  });

  // Webhook logs
  app.get("/api/admin/webhook-logs", requireAdmin, async (req, res) => {
    try {
      const webhookId = req.query.webhookId as string | undefined;
      const logs = await storage.getWebhookLogs(webhookId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب سجلات Webhook" });
    }
  });

  // API Logs
  app.get("/api/admin/api-logs", requireAdmin, async (_req, res) => {
    try {
      const logs = await storage.getApiLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب سجلات API" });
    }
  });

  app.get("/api/admin/api-logs/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await getStorage(req).getApiLogStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب إحصائيات API" });
    }
  });

  app.delete("/api/admin/api-logs", requireAdmin, async (_req, res) => {
    try {
      await getStorage(req).clearApiLogs();
      res.json({ message: "تم مسح السجلات" });
    } catch (error) {
      res.status(500).json({ message: "فشل في مسح السجلات" });
    }
  });

  // Integration metadata for UI
  app.get("/api/admin/integration-meta", requireAdmin, async (_req, res) => {
    res.json({
      permissions: API_PERMISSIONS,
      permissionLabels: PERMISSION_LABELS,
      webhookEvents: WEBHOOK_EVENTS,
      webhookEventLabels: WEBHOOK_EVENT_LABELS,
    });
  });

  // ============= OPERATION LOGS =============

  // Admin - Get operation logs with search
  app.get("/api/admin/operation-logs", requireAdmin, async (req, res) => {
    try {
      const { search, type, driverId, dateFrom, dateTo, status, page, limit: limitStr } = req.query as any;
      const limit = parseInt(limitStr) || 50;
      const offset = ((parseInt(page) || 1) - 1) * limit;
      const result = await getStorage(req).getOperationLogs({
        search, type, driverId, dateFrom, dateTo, status, limit, offset,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب السجلات" });
    }
  });

  // Admin - Get operation stats
  app.get("/api/admin/operation-stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await getStorage(req).getOperationStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "فشل" });
    }
  });

  // Driver - Get operation logs with search
  app.get("/api/driver/operation-logs", requireDriver, async (req, res) => {
    try {
      const { search, type, dateFrom, dateTo, page, limit: limitStr } = req.query as any;
      const limit = parseInt(limitStr) || 50;
      const offset = ((parseInt(page) || 1) - 1) * limit;
      const result = await getStorage(req).getDriverOperationLogs(req.session.driverId!, {
        search, type, dateFrom, dateTo, limit, offset,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "فشل في جلب السجلات" });
    }
  });

  // ============= EXTERNAL API v1 =============

  // Create order via API
  app.post("/api/v1/orders", requireApiKey("orders.create"), async (req, res) => {
    try {
      const { customerName, customerPhone, customerAddress, customerCity, customerNotes, items, total, subtotal, callbackUrl } = req.body;

      if (!customerName || !customerPhone || !customerAddress || !items || !total) {
        return res.status(400).json({
          error: "validation_error",
          message: "Required fields: customerName, customerPhone, customerAddress, items, total",
        });
      }

      const orderNumber = "API-" + Date.now().toString(36).toUpperCase();
      const trackingCode = generateTrackingCode();
      const deliveryCode = generateDeliveryCode();

      const order = await getStorage(req).createOrder({
        orderNumber,
        customerName,
        customerPhone,
        customerAddress,
        customerCity: customerCity || "",
        customerNotes: customerNotes || "",
        items: items || [],
        subtotal: subtotal || total,
        total,
        trackingCode,
        deliveryCode,
        status: "pending",
      });

      // Trigger webhook
      await triggerWebhook("order.created", {
        orderId: order.id,
        orderNumber: order.orderNumber,
        trackingCode: order.trackingCode,
        total: order.total,
        customerName: order.customerName,
      }, (req as any).apiKey?.tenantDbName);

      // Notify admin
      await getStorage(req).createAdminNotification({
        type: "new_order",
        title: "طلب جديد عبر API",
        message: `طلب جديد رقم ${order.orderNumber} من ${customerName} بقيمة ${total}`,
        relatedId: order.id,
      });

      res.status(201).json({
        success: true,
        order: {
          id: order.id,
          orderNumber: order.orderNumber,
          trackingCode: order.trackingCode,
          deliveryCode: order.deliveryCode,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: "server_error", message: error.message || "Failed to create order" });
    }
  });

  // Get order by ID
  app.get("/api/v1/orders/:id", requireApiKey("orders.read"), async (req, res) => {
    try {
      const order = await getStorage(req).getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "not_found", message: "Order not found" });
      res.json({
        id: order.id,
        orderNumber: order.orderNumber,
        trackingCode: order.trackingCode,
        status: order.status,
        isPaid: order.isPaid,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        customerCity: order.customerCity,
        items: order.items,
        subtotal: order.subtotal,
        total: order.total,
        driverName: order.driverName,
        driverId: order.driverId,
        createdAt: order.createdAt,
        pickedUpAt: order.pickedUpAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
      });
    } catch (error) {
      res.status(500).json({ error: "server_error", message: "Failed to fetch order" });
    }
  });

  // List orders
  app.get("/api/v1/orders", requireApiKey("orders.read"), async (req, res) => {
    try {
      const allOrders = await getStorage(req).getOrders();
      const { status, limit, offset } = req.query;

      let filtered = allOrders;
      if (status) filtered = filtered.filter(o => o.status === status);

      const start = parseInt(offset as string) || 0;
      const count = parseInt(limit as string) || 50;
      const page = filtered.slice(start, start + count);

      res.json({
        orders: page.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          trackingCode: o.trackingCode,
          status: o.status,
          total: o.total,
          customerName: o.customerName,
          driverName: o.driverName,
          createdAt: o.createdAt,
        })),
        total: filtered.length,
        hasMore: start + count < filtered.length,
      });
    } catch (error) {
      res.status(500).json({ error: "server_error", message: "Failed to fetch orders" });
    }
  });

  // Update order status
  app.patch("/api/v1/orders/:id", requireApiKey("orders.update"), async (req, res) => {
    try {
      const order = await getStorage(req).getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "not_found", message: "Order not found" });

      const allowedFields = ["customerNotes", "status"];
      const updateData: any = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
      }

      const updated = await getStorage(req).updateOrder(req.params.id, updateData);
      res.json({ success: true, order: updated });
    } catch (error) {
      res.status(500).json({ error: "server_error", message: "Failed to update order" });
    }
  });

  // Cancel order
  app.post("/api/v1/orders/:id/cancel", requireApiKey("orders.cancel"), async (req, res) => {
    try {
      const order = await getStorage(req).getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "not_found", message: "Order not found" });
      if (order.status === "delivered") {
        return res.status(400).json({ error: "invalid_status", message: "Cannot cancel delivered order" });
      }

      const updated = await getStorage(req).updateOrder(req.params.id, { status: "cancelled" });

      await triggerWebhook("order.cancelled", {
        orderId: order.id,
        orderNumber: order.orderNumber,
      }, (req as any).apiKey?.tenantDbName);

      res.json({ success: true, order: updated });
    } catch (error) {
      res.status(500).json({ error: "server_error", message: "Failed to cancel order" });
    }
  });

  // Track order by tracking code (no auth required - public)
  app.get("/api/v1/tracking/:code", async (req, res) => {
    try {
      const order = await getStorage(req).getOrderByTrackingCode(req.params.code);
      if (!order) return res.status(404).json({ error: "not_found", message: "Order not found" });

      const driver = order.driverId ? await getStorage(req).getDriver(order.driverId) : null;

      res.json({
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: order.customerName,
        total: order.total,
        driverName: order.driverName,
        driverPhone: driver?.phone || null,
        createdAt: order.createdAt,
        pickedUpAt: order.pickedUpAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
      });
    } catch (error) {
      res.status(500).json({ error: "server_error", message: "Tracking failed" });
    }
  });

  // Get available drivers
  app.get("/api/v1/drivers", requireApiKey("drivers.read"), async (req, res) => {
    try {
      const drivers = await getStorage(req).getDrivers();
      const available = drivers.filter(d => d.isActive && d.isVerified);

      res.json({
        drivers: available.map(d => ({
          id: d.id,
          name: d.name,
          phone: d.phone,
          vehicleType: d.vehicleType,
          isAvailable: d.isAvailable,
          fullyVerified: d.fullyVerified,
          averageRating: d.averageRating,
          completedOrders: d.completedOrders,
          governorate: d.governorate,
          city: d.city,
        })),
        total: available.length,
      });
    } catch (error) {
      res.status(500).json({ error: "server_error", message: "Failed to fetch drivers" });
    }
  });

  // Get driver details
  app.get("/api/v1/drivers/:id", requireApiKey("drivers.read"), async (req, res) => {
    try {
      const driver = await getStorage(req).getDriver(req.params.id);
      if (!driver) return res.status(404).json({ error: "not_found", message: "Driver not found" });

      res.json({
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        isAvailable: driver.isAvailable,
        fullyVerified: driver.fullyVerified,
        averageRating: driver.averageRating,
        totalRatings: driver.totalRatings,
        completedOrders: driver.completedOrders,
        governorate: driver.governorate,
        city: driver.city,
        village: driver.village,
      });
    } catch (error) {
      res.status(500).json({ error: "server_error", message: "Failed to fetch driver" });
    }
  });

  // Get driver location
  app.get("/api/v1/drivers/:id/location", requireApiKey("drivers.location"), async (req, res) => {
    try {
      const driver = await getStorage(req).getDriver(req.params.id);
      if (!driver) return res.status(404).json({ error: "not_found", message: "Driver not found" });

      res.json({
        driverId: driver.id,
        name: driver.name,
        latitude: driver.latitude,
        longitude: driver.longitude,
        isAvailable: driver.isAvailable,
      });
    } catch (error) {
      res.status(500).json({ error: "server_error", message: "Failed to fetch location" });
    }
  });

  // ============= RATINGS API v1 =============

  // Get ratings for a driver
  app.get("/api/v1/drivers/:id/ratings", requireApiKey("ratings.read"), async (req, res) => {
    try {
      const driver = await getStorage(req).getDriver(req.params.id);
      if (!driver) return res.status(404).json({ error: "not_found", message: "Driver not found" });

      const ratings = await getStorage(req).getDriverRatings(req.params.id);
      const { limit, offset } = req.query;
      const start = parseInt(offset as string) || 0;
      const count = parseInt(limit as string) || 50;
      const page = ratings.slice(start, start + count);

      res.json({
        driverId: driver.id,
        driverName: driver.name,
        averageRating: driver.averageRating,
        totalRatings: driver.totalRatings,
        ratings: page.map(r => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          customerName: r.customerName,
          orderId: r.orderId,
          createdAt: r.createdAt,
        })),
        total: ratings.length,
        hasMore: start + count < ratings.length,
      });
    } catch (error) {
      res.status(500).json({ error: "server_error", message: "Failed to fetch ratings" });
    }
  });

  // Create rating for a driver
  app.post("/api/v1/drivers/:id/ratings", requireApiKey("ratings.create"), async (req, res) => {
    try {
      const driver = await getStorage(req).getDriver(req.params.id);
      if (!driver) return res.status(404).json({ error: "not_found", message: "Driver not found" });

      const { rating, comment, customerName, orderId } = req.body;
      if (!rating || parseFloat(rating) < 1 || parseFloat(rating) > 5) {
        return res.status(400).json({
          error: "validation_error",
          message: "Rating must be between 1 and 5",
        });
      }

      const newRating = await getStorage(req).createDriverRating({
        driverId: req.params.id,
        rating: rating.toString(),
        comment: comment || null,
        customerName: customerName || "عميل API",
        orderId: orderId || null,
      });

      // Update driver average rating
      const allRatings = await getStorage(req).getDriverRatings(req.params.id);
      const avg = (allRatings.reduce((sum, r) => sum + parseFloat(r.rating), 0) / allRatings.length).toFixed(1);
      await getStorage(req).updateDriver(req.params.id, { averageRating: avg, totalRatings: allRatings.length } as any);

      // Trigger webhook
      await triggerWebhook("rating.created", {
        ratingId: newRating.id,
        driverId: driver.id,
        driverName: driver.name,
        rating: newRating.rating,
        comment: newRating.comment,
        customerName: newRating.customerName,
        orderId: newRating.orderId,
        newAverage: avg,
        totalRatings: allRatings.length,
      }, (req as any).apiKey?.tenantDbName);

      // Notify driver
      await getStorage(req).createDriverNotification({
        driverId: req.params.id,
        orderId: orderId || undefined,
        type: "general",
        title: "تقييم جديد",
        message: `حصلت على تقييم ${rating} نجوم${comment ? ': ' + comment : ''}`,
        isRead: false,
      });

      res.status(201).json({
        success: true,
        rating: {
          id: newRating.id,
          driverId: newRating.driverId,
          rating: newRating.rating,
          comment: newRating.comment,
          customerName: newRating.customerName,
          orderId: newRating.orderId,
          createdAt: newRating.createdAt,
        },
        driverStats: {
          averageRating: avg,
          totalRatings: allRatings.length,
        },
      });
    } catch (error: any) {
      res.status(500).json({ error: "server_error", message: error.message || "Failed to create rating" });
    }
  });

  // Get all ratings (across all drivers)
  app.get("/api/v1/ratings", requireApiKey("ratings.read"), async (req, res) => {
    try {
      const allRatings = await getStorage(req).getAllRatings();
      const { limit, offset, driverId, minRating, maxRating } = req.query;

      let filtered = allRatings;
      if (driverId) filtered = filtered.filter(r => r.driverId === driverId);
      if (minRating) filtered = filtered.filter(r => parseFloat(r.rating) >= parseFloat(minRating as string));
      if (maxRating) filtered = filtered.filter(r => parseFloat(r.rating) <= parseFloat(maxRating as string));

      const start = parseInt(offset as string) || 0;
      const count = parseInt(limit as string) || 50;
      const page = filtered.slice(start, start + count);

      // Enrich with driver name
      const result = [];
      for (const r of page) {
        const driver = await getStorage(req).getDriver(r.driverId);
        result.push({
          id: r.id,
          driverId: r.driverId,
          driverName: driver?.name || "غير معروف",
          rating: r.rating,
          comment: r.comment,
          customerName: r.customerName,
          orderId: r.orderId,
          createdAt: r.createdAt,
        });
      }

      res.json({
        ratings: result,
        total: filtered.length,
        hasMore: start + count < filtered.length,
      });
    } catch (error) {
      res.status(500).json({ error: "server_error", message: "Failed to fetch ratings" });
    }
  });

  // Register user payment platform routes
  registerUserRoutes(app);
  
  // Register flexible contract routes
  registerContractRoutes(app);
  
  // Register support ticket routes
  registerSupportRoutes(app);

  // ================================================================
  // ADMIN: CONTRACT MANAGEMENT
  // ================================================================

  app.get("/api/admin/contracts", requireAdmin, async (req: Request, res: Response) => {
    const contracts = await storage.getAllContracts();
    res.json({ contracts });
  });

  app.get("/api/admin/contracts/:id", requireAdmin, async (req: Request, res: Response) => {
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });
    const milestones = await storage.getMilestones(contract.id);
    const tracking = await storage.getContractTracking(contract.id);
    const disputes = await storage.getDisputesByContract(contract.id);
    res.json({ contract, milestones, tracking, disputes });
  });

  app.post("/api/admin/contracts/:id/resolve", requireAdmin, async (req: Request, res: Response) => {
    const contract = await storage.getContract(req.params.id);
    if (!contract) return res.status(404).json({ message: "العقد غير موجود" });

    const { resolution, action } = req.body; // action: "release" or "refund"
    if (!action || (action !== "release" && action !== "refund")) {
      return res.status(400).json({ message: "الإجراء مطلوب (release/refund)" });
    }

    const creator = await storage.getUser(contract.creatorId);
    const counterparty = await storage.getUser(contract.counterpartyId);
    if (!creator || !counterparty) return res.status(500).json({ message: "خطأ" });

    const frozenAmount = parseFloat(contract.frozenAmount || "0");

    // Unfreeze from creator
    const newFrozen = String(Math.max(parseFloat(creator.frozenBalance || "0") - frozenAmount, 0));
    await storage.updateUser(creator.id, { frozenBalance: newFrozen });

    if (action === "release") {
      // Release to counterparty
      const newBalance = String(parseFloat(counterparty.walletBalance || "0") + frozenAmount);
      await storage.updateUser(counterparty.id, { walletBalance: newBalance });
      await storage.createUserTransaction({
        userId: counterparty.id,
        type: "escrow_release",
        amount: String(frozenAmount),
        balanceAfter: newBalance,
        feeAmount: "0",
        description: `إفراج بأمر الأدمن - عقد ${contract.contractNumber}`,
        relatedId: contract.id,
        counterpartyId: creator.id,
        counterpartyName: creator.name || creator.phone,
        status: "completed",
        referenceNumber: `ADM${Date.now()}`,
      });
    } else {
      // Refund to creator
      const newBalance = String(parseFloat(creator.walletBalance || "0") + frozenAmount);
      await storage.updateUser(creator.id, { walletBalance: newBalance });
      await storage.createUserTransaction({
        userId: creator.id,
        type: "escrow_refund",
        amount: String(frozenAmount),
        balanceAfter: newBalance,
        feeAmount: "0",
        description: `استرداد بأمر الأدمن - عقد ${contract.contractNumber}`,
        relatedId: contract.id,
        status: "completed",
        referenceNumber: `ADM${Date.now()}`,
      });
    }

    const updated = await storage.updateContract(contract.id, {
      status: action === "release" ? "completed" : "refunded",
      completedAt: new Date(),
      disputeResolution: resolution || `Admin ${action}`,
      resolvedBy: req.session.userId,
      resolvedAt: new Date(),
    });

    await storage.createContractTracking({
      contractId: contract.id,
      status: "admin_resolved",
      notes: `تم الحل بواسطة الأدمن: ${resolution || action}`,
      createdBy: req.session.userId,
      createdByName: "Admin",
    });

    // Notify both parties
    await storage.createUserNotification({
      userId: contract.creatorId,
      type: "contract",
      title: "تم حل النزاع",
      message: `تم حل نزاع عقد ${contract.title}: ${resolution || action}`,
      relatedId: contract.id,
    });
    await storage.createUserNotification({
      userId: contract.counterpartyId,
      type: "contract",
      title: "تم حل النزاع",
      message: `تم حل نزاع عقد ${contract.title}: ${resolution || action}`,
      relatedId: contract.id,
    });

    res.json({ success: true, contract: updated });
  });

  // ================================================================
  // ADMIN: DISPUTES MANAGEMENT
  // ================================================================

  app.get("/api/admin/disputes", requireAdmin, async (req: Request, res: Response) => {
    const disputes = await storage.getAllDisputes();
    res.json({ disputes });
  });

  app.post("/api/admin/disputes/:id/assign", requireAdmin, async (req: Request, res: Response) => {
    const dispute = await storage.updateDispute(req.params.id, {
      status: "under_review",
      resolvedBy: req.session.userId,
    });
    res.json({ success: true, dispute });
  });

  // ================================================================
  // ADMIN: USERS MANAGEMENT
  // ================================================================

  app.get("/api/admin/users", requireAdmin, async (req: Request, res: Response) => {
    const allUsers = await storage.getAllUsers();
    res.json({ users: allUsers });
  });

  app.post("/api/admin/users/:id/ban", requireAdmin, async (req: Request, res: Response) => {
    const user = await storage.banUser(req.params.id);
    res.json({ success: true, user: user ? { id: user.id, isActive: user.isActive } : null });
  });

  app.post("/api/admin/users/:id/unban", requireAdmin, async (req: Request, res: Response) => {
    const user = await storage.unbanUser(req.params.id);
    res.json({ success: true, user: user ? { id: user.id, isActive: user.isActive } : null });
  });

  app.post("/api/admin/users/:id/adjust-balance", requireAdmin, async (req: Request, res: Response) => {
    const { newBalance } = req.body;
    if (!newBalance && newBalance !== "0") {
      return res.status(400).json({ message: "الرصيد الجديد مطلوب" });
    }
    const user = await storage.adjustUserBalance(req.params.id, String(newBalance));
    await storage.createUserTransaction({
      userId: req.params.id,
      type: "topup",
      amount: String(newBalance),
      balanceAfter: String(newBalance),
      feeAmount: "0",
      description: "تعديل رصيد بواسطة الأدمن",
      status: "completed",
      referenceNumber: `ADM${Date.now()}`,
    });
    res.json({ success: true, user: user ? { id: user.id, walletBalance: user.walletBalance } : null });
  });

  app.post("/api/admin/users/:id/kyc/approve", requireAdmin, async (req: Request, res: Response) => {
    const user = await storage.approveKyc(req.params.id, req.session.userId);
    if (user) {
      await storage.createUserNotification({
        userId: user.id,
        type: "kyc",
        title: "تم توثيق حسابك",
        message: "تم اعتماد توثيق الهوية بنجاح",
      });
    }
    res.json({ success: true, user: user ? { id: user.id, kycStatus: user.kycStatus } : null });
  });

  app.post("/api/admin/users/:id/kyc/reject", requireAdmin, async (req: Request, res: Response) => {
    const { reason } = req.body;
    const user = await storage.rejectKyc(req.params.id, reason || "غير محدد");
    if (user) {
      await storage.createUserNotification({
        userId: user.id,
        type: "kyc",
        title: "تم رفض التوثيق",
        message: `تم رفض توثيق الهوية: ${reason || "غير محدد"}`,
      });
    }
    res.json({ success: true, user: user ? { id: user.id, kycStatus: user.kycStatus } : null });
  });

  // ================================================================
  // ADMIN: PAYMENTS STATS
  // ================================================================

  app.get("/api/admin/payments/stats", requireAdmin, async (req: Request, res: Response) => {
    const allUsers = await storage.getAllUsers();
    const allContracts = await storage.getAllContracts();
    const allTickets = await storage.getSupportStats();

    const totalTransferVolume = await db.select({
      total: sql<string>`COALESCE(SUM(${p2pTransfers.amount}), 0)`,
    }).from(p2pTransfers).where(eq(p2pTransfers.status, "completed"));

    const totalContractVolume = allContracts.reduce((sum, c) => sum + parseFloat(c.totalAmount || "0"), 0);
    const platformRevenue = allContracts
      .filter(c => c.status === "completed")
      .reduce((sum, c) => sum + parseFloat(c.platformFeeAmount || "0"), 0);
    const openDisputes = allContracts.filter(c => c.status === "disputed").length;
    const pendingKyc = allUsers.filter(u => u.kycStatus === "basic").length;

    res.json({
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => u.isActive).length,
      verifiedUsers: allUsers.filter(u => u.kycStatus === "verified").length,
      pendingKyc,
      totalContracts: allContracts.length,
      activeContracts: allContracts.filter(c => c.status === "in_progress" || c.status === "accepted" || c.status === "milestone_review").length,
      completedContracts: allContracts.filter(c => c.status === "completed").length,
      disputedContracts: openDisputes,
      totalTransferVolume: totalTransferVolume[0]?.total || "0",
      totalContractVolume: String(totalContractVolume),
      platformRevenue: String(platformRevenue),
      supportStats: allTickets,
    });
  });

  // ================================================================
  // ADMIN: CONTRACT TEMPLATES MANAGEMENT
  // ================================================================

  app.get("/api/admin/contract-templates", requireAdmin, async (req: Request, res: Response) => {
    const templates = await storage.getAllContractTemplates();
    res.json({ templates });
  });

  app.post("/api/admin/contract-templates", requireAdmin, async (req: Request, res: Response) => {
    const { name, nameEn, type, description, defaultTerms, defaultFeeRate, icon, sortOrder } = req.body;
    if (!name || !type) {
      return res.status(400).json({ message: "الاسم والنوع مطلوبان" });
    }
    const template = await storage.createContractTemplate({
      name,
      nameEn: nameEn || null,
      type,
      description: description || null,
      defaultTerms: defaultTerms || null,
      defaultFeeRate: String(defaultFeeRate || "0.005"),
      icon: icon || null,
      sortOrder: sortOrder || 0,
    });
    res.json({ success: true, template });
  });

  app.patch("/api/admin/contract-templates/:id", requireAdmin, async (req: Request, res: Response) => {
    const { name, nameEn, type, description, defaultTerms, defaultFeeRate, icon, isActive, sortOrder } = req.body;
    const template = await storage.updateContractTemplate(req.params.id, {
      name, nameEn, type, description, defaultTerms,
      defaultFeeRate: defaultFeeRate ? String(defaultFeeRate) : undefined,
      icon, isActive, sortOrder,
    });
    res.json({ success: true, template });
  });

  app.delete("/api/admin/contract-templates/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteContractTemplate(req.params.id);
    res.json({ success: true });
  });

  // ================================================================
  // USER: FRAUD CODE (personal anti-phishing code)
  // ================================================================

  app.get("/api/user/fraud-code", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const user = await storage.getUser(req.session.userId);
    const userFraudCode = (user as any)?.fraudCode || null;
    res.json({ fraudCode: userFraudCode });
  });

  app.post("/api/user/fraud-code", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const { fraudCode } = req.body;
    if (!fraudCode || fraudCode.length !== 4 || !/^[A-Z0-9]{4}$/.test(fraudCode)) {
      return res.status(400).json({ message: "الرمز يجب أن يكون 4 خانات (أحرف إنجليزية وأرقام)" });
    }
    await db.update(users).set({ fraudCode } as any).where(eq(users.id, req.session.userId));
    res.json({ success: true, fraudCode });
  });

  // ================================================================
  // USER: KYC ENDPOINTS
  // ================================================================

  app.post("/api/user/kyc/submit", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const { fullName, nationalId, nationalIdImageFront, nationalIdImageBack, dateOfBirth, email, proofOfAddress } = req.body;
    if (!fullName || !nationalId) {
      return res.status(400).json({ message: "الاسم ورقم الهاتف مطلوبان" });
    }
    const user = await storage.submitKyc(req.session.userId, {
      fullName, nationalId, nationalIdImageFront, nationalIdImageBack, dateOfBirth, email, proofOfAddress,
    });
    res.json({ success: true, user: user ? { id: user.id, kycStatus: user.kycStatus } : null });
  });

  app.get("/api/user/kyc/status", async (req: Request, res: Response) => {
    if (!req.session?.userLoggedIn || !req.session?.userId) {
      return res.status(401).json({ message: "غير مصرح" });
    }
    const user = await storage.getUser(req.session.userId);
    res.json({
      kycStatus: user?.kycStatus || "none",
      kycRejectionReason: user?.kycRejectionReason,
      fullName: user?.fullName,
      nationalId: user?.nationalId,
    });
  });

  // ================================================================
  // ADMIN: CONTRACT RULES MANAGEMENT
  // ================================================================

  app.get("/api/admin/contract-rules", requireAdmin, async (req: Request, res: Response) => {
    const rules = await storage.getAllContractRules();
    res.json({ rules });
  });

  app.post("/api/admin/contract-rules", requireAdmin, async (req: Request, res: Response) => {
    const rule = await storage.createContractRule(req.body);
    res.json({ success: true, rule });
  });

  app.patch("/api/admin/contract-rules/:id", requireAdmin, async (req: Request, res: Response) => {
    const rule = await storage.updateContractRule(req.params.id, req.body);
    res.json({ success: true, rule });
  });

  app.delete("/api/admin/contract-rules/:id", requireAdmin, async (req: Request, res: Response) => {
    await storage.deleteContractRule(req.params.id);
    res.json({ success: true });
  });

  // Contract rules endpoint is in contractRoutes.ts (before /:id route)

  // ================================================================
  // PUBLIC: USER RATINGS (for public profile display)
  // ================================================================

  app.get("/api/public/users/:id/ratings", async (req: Request, res: Response) => {
    const userId = req.params.id;
    const reviews = await db.select().from(contractReviews)
      .where(eq(contractReviews.reviewedId, userId))
      .orderBy(desc(contractReviews.createdAt));

    const ratings = reviews.map(r => ({
      rating: parseFloat(r.rating || "0"),
      comment: r.comment,
      reviewerRole: r.reviewedRole,
      contractId: r.contractId,
      createdAt: r.createdAt,
    }));

    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    res.json({ ratings, avgRating: Math.round(avgRating * 10) / 10, totalReviews: ratings.length });
  });
}
