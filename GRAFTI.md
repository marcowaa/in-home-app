<!--
  ═══════════════════════════════════════════════════════════════
  GRAFTI.md — ملف سياق المشروع الشامل
  Project Context File for AI Agents
  
  ⚠️ هذا الملف هو المصدر الواحد للحقيقة عن المشروع.
  ⚠️ README.md و design_guidelines.md قديمان وغير دقيقين.
  ⚠️ عند تحديث المشروع، حدّث هذا الملف فوراً (انظر قسم التحديث أسفله).
  ═══════════════════════════════════════════════════════════════
  آخر تحديث: 2026-07-02
  تم الإنشاء بواسطة: Codely CLI
  ═══════════════════════════════════════════════════════════════
-->

# GRAFTI — منصة المدفوعات والعقود المرنة

> **ملخص سريع:** منصة مدفوعات رقمية متكاملة (مثل InstaPay) مع نظام عقود مرنة بين الأفراد (شراء/خدمة/إيجار/مخصص/تقاسم)، نظام نزاعات، نظام دعم فني، ولوحة تحكم مالية شاملة. مبنية بـ React + Express + PostgreSQL + Drizzle ORM، مع تطبيق أندرويد (Capacitor).

---

## 1. هوية المشروع الحقيقية

| الحقل | القيمة |
|-------|--------|
| **الاسم الفعلي** | نظام المندوبين (Mandoobeen) |
| **App ID** | `com.mandoobeen.app` |
| **الوصف** | منصة إدارة شحن وتوصيل + نظام مدفوعات رقمية وضمان (Escrow) |
| **package.json name** | `rest-express` (اسم تاريخي غير دقيق) |
| **README.md** | ❌ قديم — يصف متجر "أناقة" للملابس النسائية |
| **design_guidelines.md** | ❌ قديم — يصف نفس المتجر |
| **المصادر الموثوقة** | الكود الفعلي، `shared/schema.ts`، `API_DOCUMENTATION.md`، `Dockerfile` |

### ⚠️ تحذيرات حرجة لأي وكيل
1. **لا تعتمد على README.md** — يصف مشروعاً مختلفاً تماماً (متجر ملابس).
2. **لا تعتمد على design_guidelines.md** — نفس المشكلة.
3. **package.json name = "rest-express"** — اسم موروث، تجاهله.
4. **docker-compose** يستخدم أسماء متغيرات بـ "anaqah" (تاريخية) لكنها تعمل بشكل صحيح.
5. **multi-tenancy**: النظام يدعم Pro-Admin متعددي المستأجرين عبر `pro_admins` + `tenantDbName` + قواعد بيانات منفصلة.

---

## 2. Tech Stack

### Frontend (client/)
| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| React | 18 | إطار الواجهة |
| Vite | 7 | البناء و dev server |
| wouter | - | التوجيه (routing) |
| TanStack Query | 5 | إدارة حالة الخادم |
| shadcn/ui (new-york) | - | مكتبة المكونات |
| Radix UI | - | primitives للمكونات |
| TailwindCSS | 3.4 | التنسيق + CSS variables |
| Framer Motion | 11 | الحركات والانتقالات |
| react-hook-form + zod | - | النماذج والتحقق |
| recharts | - | الرسوم البيانية |
| lucide-react + react-icons | - | الأيقونات |
| qrcode.react | - | توليد QR codes |
| date-fns | - | معالجة التواريخ |
| Capacitor | 8.1 | تغليف أندرويد |

### Backend (server/)
| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| Express | 4.21 | خادم API |
| Drizzle ORM | 0.39 | ORM لـ PostgreSQL |
| drizzle-zod | - | توليد schemas تحقق من DB schema |
| pg (node-postgres) | 8.16 | تعريف PostgreSQL |
| bcrypt | 6 | تشفير كلمات المرور |
| express-session + connect-pg-simple | - | الجلسات (مخزنة في PostgreSQL) |
| multer | 2 | رفع الملفات |
| ws | 8 | WebSockets |
| zod | - | التحقق من البيانات |
| @google-cloud/storage | 7 | تخزين الملفات على GCS |
| @uppy/* | - | رفع الملفات (واجهة) |

### Infrastructure
| المكون | التفاصيل |
|--------|----------|
| PostgreSQL | 15 (Docker) |
| Docker + Docker Compose | 4 خدمات: db, app, nginx, backup |
| Nginx | reverse proxy + caching + security headers |
| Google Cloud Storage | لتخزين الصور والملفات المرفوعة |

### Build
- **Dev**: `tsx server/index.ts` + Vite middleware
- **Prod**: `script/build.ts` → Vite (client) + esbuild (server → `dist/index.cjs`)
- **DB**: `drizzle-kit push` (no migration files committed)
- **APK**: `vite build` → `cap sync android` → Gradle

---

## 3. بنية المشروع (Monorepo)

```
in-home/
├── client/                    # React SPA
│   ├── index.html
│   └── src/
│       ├── main.tsx           # نقطة الدخول
│       ├── App.tsx            # التوجيه (wouter)
│       ├── pages/
│       │   ├── admin/         # لوحة الأدمن (10 صفحات)
│       │   ├── driver/        # لوحة السائق (3 صفحات)
│       │   └── app/           # تطبيق المستخدم (12 صفحة)
│       ├── components/
│       │   ├── admin/
│       │   ├── app/            # AppLayout + مكونات
│       │   └── ui/            # shadcn/ui (30+ مكون)
│       ├── contexts/
│       │   └── SettingsContext.tsx
│       ├── hooks/             # use-mobile, use-toast
│       └── lib/               # queryClient, utils
├── server/
│   ├── index.ts               # Express server entry
│   ├── routes.ts              # ⭐ 2780 سطر — 112 API route
│   ├── userRoutes.ts          # ⭐ 35 API route — نظام المدفوعات
│   ├── db.ts                  # pg.Pool + drizzle instance
│   ├── storage.ts             # repository layer
│   ├── tenantDb.ts            # multi-tenant DB factory
│   ├── apiMiddleware.ts       # requireApiKey + rate limit + logging
│   ├── webhooks.ts            # webhook dispatch + HMAC + retry
│   ├── static.ts              # production static serving
│   ├── vite.ts                # dev Vite middleware
│   └── seed.ts                # DB seeding
├── shared/
│   ├── schema.ts              # ⭐ 30+ جدول — مصدر الحقيقة للـ DB
│   └── egyptLocations.ts      # بيانات المحافظات والمدن
├── types/
│   ├── express-session.d.ts   # SessionData augmentation
│   └── vite-client.d.ts
├── android/                   # Capacitor Android project
├── nginx/
│   └── default.conf           # reverse proxy + security
├── script/
│   └── build.ts               # custom build (Vite + esbuild)
├── scripts/
│   ├── backup.sh              # PostgreSQL backup
│   └── build-apk.ps1          # Android APK build
├── Dockerfile                 # multi-stage (builder + prod)
├── docker-compose.yml          # db + app + nginx + backup
├── drizzle.config.ts
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json             # shadcn config
├── capacitor.config.json
├── API_DOCUMENTATION.md       # ⭐ توثيق API العام v1
└── BUILD_APK.md               # تعليمات بناء APK
```

---

## 4. قاعدة البيانات (shared/schema.ts)

### الجداول حسب المجال

#### 🔐 المصادقة والإدارة
| الجدول | الوصف | الحقول الرئيسية |
|--------|-------|------------------|
| `admin_users` | حسابات الأدمن | id, username, password (bcrypt) |
| `pro_admins` | أدمن متعدد المستأجرين | username, password, dbName, isActive, autoDisableAt/EnableAt |
| `delivery_drivers` | السائقين | username, password, name, phone, lat/lng, walletBalance, totalEarnings, isVerified, isActive, isAvailable, idVerified, criminalRecordVerified, fullyVerified, referralCode, averageRating, governorate/city/village, maxWeight, vehicleType |
| `users` | مستخدمو نظام المدفوعات | phone (unique), name, avatarUrl, pin (hashed), walletBalance, frozenBalance, kycStatus (none/basic/verified), referralCode, referredBy |

#### 📦 الطلبات والشحن
| الجدول | الوصف | الحقول الرئيسية |
|--------|-------|------------------|
| `orders` | الطلبات | orderNumber, customer (name/phone/address/city), items (jsonb[]), subtotal/tax/total, status (pending→processing→shipped→delivered/cancelled), isPaid, amountCollected, trackingCode, deliveryCode, driverId, pickup/delivery deadlines, shipmentType, weight, frozenAmount, confirmationCode, driverCommission |
| `order_driver_assignments` | ربط الطلبات بالسائقين | orderId, driverId, status, rejectionReason |

#### 💰 محفظة السائق والمعاملات
| الجدول | الوصف |
|--------|-------|
| `driver_wallet_transactions` | type, amount, balanceAfter, orderId |
| `driver_withdrawal_requests` | طلبات سحب السائقين |
| `driver_deposit_requests` | طلبات إيداع السائقين |

#### 💳 نظام مدفوعات المستخدم (InstaPay-like)
| الجدول | الوصف | الحقول الرئيسية |
|--------|-------|------------------|
| `user_wallet_transactions` | معاملات محفظة المستخدم | type (topup/withdraw/transfer_sent/received/escrow_freeze/release/refund/delivery_fee), feeAmount, relatedId, counterpartyId/Name, referenceNumber |
| `p2p_transfers` | التحويلات بين الأفراد | senderId, receiverId, amount, fee, method (phone/qr/bank/wallet/instapay), receiverIdentifier, status, otpCode, referenceNumber |
| `escrow_orders` | أوامر الضمان | creatorId (buyer), sellerId, deliveryPersonId, productDescription, productValue, deliveryFeeRate (0.02), platformFeeRate (0.005), frozenAmount, status (pending→accepted→picked_up→in_transit→delivered→confirmed→released/rejected/refunded/cancelled/disputed/expired), terms (jsonb), confirmationCode, deadlineHours (72) |
| `escrow_tracking` | تتبع شحنات الضمان | status, location (jsonb), photos (jsonb[]) |
| `user_beneficiaries` | المستفيدون | name, identifier, type (phone/bank/wallet), bankName |
| `payment_providers` | مزودو الدفع | type (wallet/bank/cash/instapay), mockFeeRate, mockFixedFee |

#### 🔔 الإشعارات والتقييمات
| الجدول | الوصف |
|--------|-------|
| `driver_notifications` | إشعارات السائقين |
| `admin_notifications` | إشعارات الأدمن |
| `user_notifications` | إشعارات المستخدمين |
| `driver_ratings` | rating (decimal 2,1), comment, customerName |
| `driver_referrals` | referrerId, referredId, bonus, status |

#### ⚙️ الإعدادات والتكامل
| الجدول | الوصف | الحقول الرئيسية |
|--------|-------|------------------|
| `app_settings` | إعدادات التطبيق (صف واحد) | storeName, siteTitle, logo, whatsappNumber, primaryColor (#ec4899), currency ("ج.م"), driverCommission fields, referralBonusAmount |
| `payment_methods` | طرق الدفع | name, nameEn, icon, instructions, accountNumber, isActive, sortOrder |
| `api_keys` | مفاتيح API | name, apiKey (dk_live_), secretKey, permissions (jsonb[]), ipWhitelist, rateLimit (100), expiresAt, tenantDbName |
| `webhooks` | Webhooks | url, events (jsonb[]), secret, headers, failCount, maxRetries (3), lastStatus/Error |
| `api_logs` | سجلات API | طلبات API مسجلة |
| `webhook_logs` | سجلات Webhook | نتائج إرسال webhooks |
| `operation_logs` | سجلات العمليات | type (delivery/commission/deposit/withdrawal/refund/penalty/referral_bonus/order_*/driver_assigned), metadata (jsonb) |

---

## 5. المصادقة والصلاحيات

### آلية المصادقة
- **الويب (Admin/Driver/User)**: session-based عبر `express-session` + `connect-pg-simple` (مخزن في PostgreSQL، جدول `user_sessions`)
- **API العام (v1)**: API Key عبر header `X-API-Key: dk_live_...` مع صلاحيات per-key
- **كلمات المرور**: bcrypt

### أدوار المستخدمين (Session Flags)
| الدور | Flag في Session | Middleware |
|------|-----------------|------------|
| Admin | `adminLoggedIn` | `requireAdmin` |
| Main Admin | `adminLoggedIn && !proAdminLoggedIn` | `requireMainAdmin` |
| Pro Admin (Tenant) | `proAdminLoggedIn` + `tenantDbName` | `requireAdmin` |
| Driver | `driverLoggedIn` + `driverId` | `requireDriver` |
| User | `userLoggedIn` + `userId` | `requireUser` |
| API (External) | API Key validation | `requireApiKey(permission)` |

### صلاحيات API Keys
`orders.read`, `orders.create`, `orders.update`, `orders.cancel`, `tracking.read`, `drivers.read`, `drivers.location`, `ratings.read`, `ratings.create`, `webhooks.manage`

---

## 6. API Endpoints (147 route إجمالاً)

### نظام السائقين والتوصيل (routes.ts — 112 route)
| الفئة | المسار | الطريقة | الصلاحية |
|-------|--------|--------|----------|
| **عام** | `/api/settings` | GET | عام |
| **عام** | `/api/payment-methods` | GET | عام |
| **عام** | `/api/v1/tracking/:code` | GET | عام (بدون مصادقة) |
| **رفع ملفات** | `/api/upload`, `/api/upload/multiple` | POST | admin |
| **سائق - تسجيل** | `/api/driver/register/request\|verify` | POST | عام |
| **سائق - دخول** | `/api/driver/login\|logout\|check` | POST/GET | session |
| **سائق - ملف** | `/api/driver/profile-image`, `/api/driver/location`, `/api/driver/availability` | POST/GET | driver |
| **سائق - محفظة** | `/api/driver/wallet`, `/api/driver/wallet/deposit`, `/api/driver/wallet/withdraw` | GET/POST | driver |
| **سائق - طلبات** | `/api/driver/orders` (accept/reject/pickup/confirm) | POST | driver |
| **أدمن - طلبات** | `/api/orders`, `/api/admin/orders` | GET/POST/PATCH | admin |
| **أدمن - سائقين** | `/api/admin/drivers` (CRUD + verify + pending) | GET/POST/PATCH | admin |
| **أدمن - إعدادات** | `/api/admin/settings` | PATCH | admin |
| **أدمن - API Keys** | `/api/admin/api-keys` | CRUD | admin |
| **أدمن - Webhooks** | `/api/admin/webhooks` | CRUD + test | admin |
| **أدمن - سجلات** | `/api/admin/api-logs`, `/api/admin/operation-logs` | GET | admin |

### نظام مدفوعات المستخدم (userRoutes.ts — 35 route)
| الفئة | المسار | الطريقة | الوصف |
|-------|--------|--------|-------|
| **مصادقة** | `/api/user/auth/send-otp\|verify-otp` | POST | إرسال/تحقق OTP |
| **مصادقة** | `/api/user/auth/register\|logout` | POST | تسجيل/خروج |
| **مصادقة** | `/api/user/auth/check` | GET | فحص الجلسة |
| **محفظة** | `/api/user/wallet` | GET | رصيد المحفظة |
| **محفظة** | `/wallet/transactions` | GET | سجل المعاملات |
| **محفظة** | `/wallet/topup\|withdraw` | POST | شحن/سحب |
| **محفظة** | `/wallet/providers` | GET | مزودو الدفع |
| **تحويل P2P** | `/api/user/lookup` | GET | البحث عن مستخدم |
| **تحويل P2P** | `/transfer/estimate\|create` | POST | تقدير/إنشاء تحويل |
| **تحويل P2P** | `/transfer/:id/confirm` | POST | تأكيد بالـ OTP |
| **تحويل P2P** | `/transfer/history\|:id` | GET | السجل/التفاصيل |
| **QR** | `/api/user/my-qr` | GET | QR code للمستخدم |
| **مستفيدون** | `/api/user/beneficiaries` | GET/POST/DELETE | إدارة المستفيدين |
| **ضمان Escrow** | `/escrow/create` | POST | إنشاء طلب ضمان |
| **ضمان Escrow** | `/escrow/:id` (accept/pickup/deliver/confirm/reject/cancel) | POST | دورة حياة الضمان |
| **ضمان Escrow** | `/escrow/my-orders\|available` | GET | طلباتي/متاحة |
| **ضمان Escrow** | `/escrow/:id/track` | GET | تتبع الشحنة |
| **إشعارات** | `/api/user/notifications` | GET/POST | إشعارات المستخدم |

### API العام v1 (للتكامل الخارجي)
| المسار | الطريقة | الصلاحية المطلوبة |
|--------|--------|-------------------|
| `/api/v1/orders` | POST/GET | orders.create / orders.read |
| `/api/v1/orders/:id` | GET/PATCH | orders.read / orders.update |
| `/api/v1/orders/:id/cancel` | POST | orders.cancel |
| `/api/v1/tracking/:code` | GET | عام (بدون مصادقة) |
| `/api/v1/drivers` | GET | drivers.read |
| `/api/v1/drivers/:id` | GET | drivers.read |
| `/api/v1/drivers/:id/location` | GET | drivers.location |
| `/api/v1/drivers/:id/ratings` | GET/POST | ratings.read / ratings.create |
| `/api/v1/ratings` | GET | ratings.read |

---

## 7. التوجيه في الواجهة (Client Routes)

### تطبيق المستخدم `/app/*`
| المسار | الصفحة |
|--------|--------|
| `/app` | مصادقة المستخدم (OTP) |
| `/app/register` | تسجيل جديد |
| `/app/home` | الصفحة الرئيسية |
| `/app/transfer` | تحويل أموال |
| `/app/transfer/history` | سجل التحويلات |
| `/app/escrow` | قائمة الضمان |
| `/app/escrow/create` | إنشاء ضمان |
| `/app/escrow/:id` | تفاصيل الضمان |
| `/app/wallet` | المحفظة |
| `/app/profile` | الملف الشخصي |
| `/app/beneficiaries` | المستفيدون |
| `/app/scan` | ماسح QR |

### لوحة السائق `/driver/*`
| المسار | الصفحة |
|--------|--------|
| `/driver` | تسجيل دخول السائق |
| `/driver/dashboard` | لوحة التحكم |
| `/driver/wallet` | محفظة السائق |

### لوحة الأدمن `/admin/*`
| المسار | الصفحة |
|--------|--------|
| `/admin` | تسجيل دخول الأدمن |
| `/admin/dashboard` | لوحة التحكم |
| `/admin/orders` | إدارة الطلبات |
| `/admin/drivers` | إدارة السائقين |
| `/admin/payment-methods` | طرق الدفع |
| `/admin/settings` | الإعدادات |
| `/admin/integrations` | التكاملات (API Keys + Webhooks) |
| `/admin/operations-log` | سجل العمليات |
| `/admin/notifications` | الإشعارات |
| `/admin/change-password` | تغيير كلمة المرور |

---

## 8. المقارنة مع تقرير البحث (deep-research-report.md)

التقرير البحثي كان دراسة جدوى لإضافة ميزة تحويل الأموال. **معظم الميزات المقترحة تم تنفيذها فعلياً**:

| المقترح في التقرير | الحالة في الكود | التفاصيل |
|---------------------|-----------------|----------|
| جدول `Users` | ✅ منفذ | `users` table مع phone, walletBalance, kycStatus |
| جدول `Wallets/Accounts` | ✅ مدمج | walletBalance داخل جدول `users` (ليس جدول منفصل) |
| جدول `Transactions` | ✅ منفذ | `user_wallet_transactions` بـ 8 أنواع معاملات |
| جدول `PaymentProviders` | ✅ منفذ | `payment_providers` مع mockFeeRate |
| تحويل P2P | ✅ منفذ | `p2p_transfers` + OTP + 5 طرق (phone/qr/bank/wallet/instapay) |
| نظام OTP للتأكيد | ✅ منفذ | otpCode + otpVerified في `p2p_transfers` |
| واجهة تحويل | ✅ منفذ | `/app/transfer` + `/transfer/estimate\|create\|confirm` |
| نظام QR | ✅ منفذ | `/api/user/my-qr` + `/app/scan` |
| مستفيدون | ✅ منفذ | `user_beneficiaries` (phone/bank/wallet) |
| نظام Escrow/ضمان | ✅ منفذ | `escrow_orders` كامل مع 11 حالة + tracking |
| KYC | ⚠️ جزئي | `kycStatus` (none/basic/verified) موجود لكن لم يُكتمل التحقق الفعلي |
| تكامل مع Fawry/PayMob | ❌ غير منفذ | `payment_providers` يحتوي mock fees فقط، لا تكامل حقيقي |
| تكامل مع IPN/InstaPay | ❌ غير منفذ | لا يوجد تكامل فعلي مع شبكة IPN |
| AML/CFT monitoring | ❌ غير منفذ | لا يوجد نظام كشف معاملات مشبوهة |
| PCI-DSS compliance | ⚠️ جزئي | لا يتم تخزين بيانات بطاقات، لكن لا يوجد شهادة |
| Webhooks | ✅ منفذ | نظام webhook كامل مع HMAC + retry + auto-disable |
| Rate limiting | ✅ منفذ | per API key (default 100/min) |
| Multi-tenant | ✅ منفذ | pro_admins + tenantDbName + tenantDb.ts |

### الخلاصة
التقرير كان دراسة استكشافية، والكود الفعلي **تجاوز التوصيات** في بعض المجالات (مثل Escrow و QR) لكنه **يفتقر للتكامل الحقيقي** مع مزودي الدفع (Fawry, PayMob, IPN). النظام الحالي يستخدم mock/simulation للرسوم.

---

## 9. متغيرات البيئة

| المتغير | مطلوب | القيمة الافتراضية | الوصف |
|---------|-------|-------------------|-------|
| `DATABASE_URL` | ✅ نعم | - | رابط PostgreSQL |
| `SESSION_SECRET` | ✅ نعم | - | مفتاح الجلسة (min 32 chars) |
| `NODE_ENV` | لا | development | production/development |
| `PORT` | لا | 5000 | منفذ الخادم |
| `POSTGRES_USER` | لا | anaqah | مستخدم DB (Docker) |
| `POSTGRES_DB` | لا | anaqah_store | اسم DB (Docker) |

**الأدمن الافتراضي**: `admin` / `admin123` (من seed.ts)

---

## 10. الأوامر

```bash
# التطوير
npm run dev              # tsx server/index.ts + Vite middleware

# البناء
npm run build            # script/build.ts → Vite (client) + esbuild (server)
npm run start            # node dist/index.cjs (production)

# قاعدة البيانات
npm run db:push          # drizzle-kit push (apply schema)
npm run db:seed           # tsx server/seed.ts (seed data)

# الفحص
npm run check            # tsc (type check)

# أندرويد
npx vite build && npx cap sync android
npx cap open android     # ثم Gradle assembleDebug/assembleRelease
```

---

## 11. Docker

```bash
docker-compose up -d     # تشغيل الكل (db + app + nginx + backup)
# nginx on localhost:5001
```

| الخدمة | المنفذ | الوصف |
|--------|--------|-------|
| nginx | 5001 (host) | Reverse proxy → app:5000 |
| app | 5000 (internal) | Express server |
| db | 5432 (internal) | PostgreSQL 15 |
| backup | - | نسخ احتياطي يومي ~3AM |

---

## 12. نقاط الانتباه للمطور/الوكيل

1. **routes.ts ضخم** (2780 سطر) — استخدم البحث بدلاً من القراءة الكاملة.
2. **storage.ts** هو repository layer — كل عمليات DB تمر عبر `getStorage(req)`.
3. **multi-tenancy**: `getStorage(req)` يرجع storage مختلف حسب `tenantDbName` في الجلسة.
4. **drizzle-kit push** بدون migration files — schema.ts هو المصدر الوحيد.
5. **Google Cloud Storage** يحتاج credentials خارجية (لم يتم فحص وجودها).
6. **session-based auth** ليس JWT — تأكد من إرسال cookies في الطلبات.
7. **OTP في التحويلات**: يُولد لكن قد يكون mock (تحقق من userRoutes.ts).
8. **escrow** له 11 حالة — اقرأ schema.ts بعناية قبل التعديل.
9. **webhooks** تُرسل مع HMAC-SHA256 signature في `X-Webhook-Signature`.
10. **tailwind** يستخدم HSL CSS variables — الألوان في `:root` في `index.css`.

---

## 13. إرشادات التحديث

> ⚠️ **عند تحديث المشروع، حدّث هذا الملف فوراً** بإتباع الخطوات التالية:

### متى تحدّث GRAFTI.md؟
- ✅ إضافة/حذف جدول في `shared/schema.ts`
- ✅ إضافة/حذف API endpoint في `routes.ts` أو `userRoutes.ts`
- ✅ إضافة/حذف صفحة في `client/src/pages/`
- ✅ تغيير في tech stack (مكتبة جديدة، تبديل إطار)
- ✅ تغيير في آلية المصادقة
- ✅ إضافة ميزة كبيرة جديدة
- ✅ تغيير في Docker/infrastructure
- ✅ بعد كل sprint أو release رئيسي

### كيف تحدّث؟
1. اقرأ القسم المراد تحديثه
2. عدّل الأقسام المتأثرة فقط (لا تعيد كتابة الملف كاملاً)
3. حدّث تاريخ "آخر تحديث" في رأس الملف
4. إذا أضفت جدولاً جديداً، ضعه في القسم المناسب من قسم 4
5. إذا أضفت endpoint، ضعه في القسم المناسب من قسم 6
6. احذف أي معلومات أصبحت قديمة

### صيغة التحديث
```markdown
<!-- تحديث: YYYY-MM-DD — وصف موجز للتغيير -->
```

---

## 14. خريطة سريعة للملفات الحرجة

| الملف | الأهمية | اقرأه أولاً إذا... |
|-------|---------|---------------------|
| `shared/schema.ts` | ⭐⭐⭐ | تريد فهم قاعدة البيانات |
| `server/routes.ts` | ⭐⭐⭐ | تعمل على API السائقين/الأدمن |
| `server/userRoutes.ts` | ⭐⭐⭐ | تعمل على نظام المدفوعات |
| `API_DOCUMENTATION.md` | ⭐⭐ | تريد توثيق API العام |
| `server/storage.ts` | ⭐⭐ | تريد فهم repository layer |
| `client/src/App.tsx` | ⭐⭐ | تريد فهم التوجيه |
| `server/index.ts` | ⭐ | تريد فهم إعداد الخادم |
| `docker-compose.yml` | ⭐ | تعمل على infrastructure |
| `tailwind.config.ts` | ⭐ | تعمل على styling |
| `script/build.ts` | ⭐ | تعمل على البناء |
| `server/contractRoutes.ts` | ⭐⭐⭐ | تعمل على نظام العقود المرنة |
| `server/supportRoutes.ts` | ⭐⭐ | تعمل على نظام الدعم الفني |
| `pages/app/ContractCreate.tsx` | ⭐⭐ | تعمل على واجهة إنشاء العقد |
| `pages/app/ContractDetails.tsx` | ⭐⭐ | تعمل على تفاصيل العقد |
| `pages/admin/AdminContracts.tsx` | ⭐⭐ | تعمل على إدارة العقود |
| `pages/admin/AdminDisputes.tsx` | ⭐⭐ | تعمل على إدارة النزاعات |
| `pages/admin/AdminSupport.tsx` | ⭐⭐ | تعمل على إدارة الدعم |
| `pages/admin/AdminUsers.tsx` | ⭐⭐ | تعمل على إدارة المستخدمين |
| `pages/admin/AdminPayments.tsx` | ⭐⭐ | تعمل على التقارير المالية |

---

## 15. نظام العقود المرنة (جديد)

### أنواع العقود
| النوع | الوصف | سير العمل |
|------|-------|-----------|
| `purchase` | شراء/بيع منتجات | pending → accepted → in_progress → completed → released |
| `service` | خدمات بمراحل متعددة | pending → accepted → milestones → completed |
| `rental` | إيجار عين | pending → accepted → in_progress → completed/disputed |
| `custom` | عقد مخصص بشروط حرة | pending → accepted → in_progress → completed |
| `split_cost` | تقاسم تكلفة بين أطراف | pending → accepted → completed |

### حالات العقد
draft, pending, accepted, in_progress, milestone_review, completed, disputed, cancelled, expired, refunded

### الجداول الجديدة
- `flexible_contracts` — العقود الرئيسية
- `contract_milestones` — مراحل العقود (للخدمات)
- `contract_disputes` — النزاعات
- `contract_tracking` — تتبع الأحداث
- `contract_reviews` — التقييمات
- `contract_templates` — قوالب العقود

### API Routes الجديدة
- `/api/user/contracts/*` — إنشاء/عرض/قبول/رفض/إكمال/نزاع/تقييم العقود
- `/api/admin/contracts/*` — إدارة العقود (للأدمن)
- `/api/admin/contracts/:id/resolve` — حل النزاع (release/refund)

---

## 16. نظام الدعم الفني (جديد)

### الجداول
- `support_tickets` — التذاكر
- `support_ticket_messages` — رسائل التذاكر

### API Routes
- `/api/user/support/tickets/*` — إنشاء/عرض/رد/إغلاق/تقييم
- `/api/admin/support/tickets/*` — إدارة التذاكر (للأدمن)

### أقسام الدعم
transfer, contract, wallet, kyc, account, technical, other

---

## 17. نظام KYC (جديد)

### حقول KYC في جدول `users`
fullName, nationalId, nationalIdImageFront, nationalIdImageBack, proofOfAddress, dateOfBirth, email, kycVerifiedAt, kycVerifiedBy, kycRejectionReason

### حالات KYC
- `none` — غير موثق
- `basic` — قيد المراجعة
- `verified` — موثق

### API Routes
- `POST /api/user/kyc/submit` — تقديم طلب
- `GET /api/user/kyc/status` — حالة الطلب
- `POST /api/admin/users/:id/kyc/approve` — اعتماد (أدمن)
- `POST /api/admin/users/:id/kyc/reject` — رفض (أدمن)

---

## 18. نظام النزاعات (جديد)

### أسباب النزاع
non_delivery, wrong_item, quality_issue, service_incomplete, payment_dispute, other

### حالات النزاع
open, under_review, resolved_buyer, resolved_seller, resolved_refund, escalated

### آلية الحل
- أي طرف يفتح نزاع → يتجمد العقد (status = disputed)
- الأدمن يراجع → يقرر: release (تحرير للطرف الآخر) أو refund (استرداد للمنشئ)

---

## 19. لوحة تحكم الأدمن المالية (محدثة)

### الصفحات الجديدة
| المسار | الصفحة | الوظيفة |
|--------|--------|---------|
| `/admin/contracts` | AdminContracts | إدارة جميع العقود |
| `/admin/disputes` | AdminDisputes | إدارة النزاعات |
| `/admin/support` | AdminSupport | إدارة تذاكر الدعم |
| `/admin/users` | AdminUsers | إدارة المستخدمين + KYC |
| `/admin/payments` | AdminPayments | إحصائيات مالية شاملة |

### API الإحصائيات
`GET /api/admin/payments/stats` — returns: totalUsers, activeUsers, verifiedUsers, pendingKyc, totalContracts, activeContracts, completedContracts, disputedContracts, totalTransferVolume, totalContractVolume, platformRevenue, supportStats

---

## 20. صفحات المستخدم الجديدة

| المسار | الصفحة | الوظيفة |
|--------|--------|---------|
| `/app/contracts` | ContractList | قائمة العقود (5 تبويبات) |
| `/app/contracts/create` | ContractCreate | إنشاء عقد (5 خطوات) |
| `/app/contracts/:id` | ContractDetails | تفاصيل + دورة الحياة |
| `/app/support` | SupportTickets | تذاكر الدعم |
| `/app/support/:id` | SupportTicketDetails | محادثة تذكرة |
| `/app/kyc` | KYCVerification | توثيق الهوية |

---

<!--
  ═══════════════════════════════════════════════════════════════
  نهاية ملف GRAFTI — أي وكيل يقرأ هذا الملف يفهم المشروع كاملاً
  ═══════════════════════════════════════════════════════════════
-->
