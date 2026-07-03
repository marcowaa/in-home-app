# متجر أناقة - Anaqah Store 🛍️

<div dir="rtl">

## 🌟 نظرة عامة

متجر أناقة هو تطبيق ويب تقدمي (PWA) للتجارة الإلكترونية النسائية مصمم بالكامل باللغة العربية مع دعم RTL. المتجر مستوحى من تصميم أمازون مع لمسة أنثوية باستخدام ألوان الوردي والبنفسجي مع لمسات ذهبية.

</div>

## 🌟 Overview

Anaqah Store is a comprehensive Progressive Web Application (PWA) for women's e-commerce. Built with full Arabic RTL support, featuring an Amazon-inspired design with a feminine pink/purple theme and gold accents.

---

## ✨ Features | المميزات

<div dir="rtl">

### المتجر الرئيسي
- ✅ واجهة عربية كاملة مع دعم RTL
- ✅ تصميم أنثوي بألوان الوردي والبنفسجي
- ✅ عرض المنتجات مع دعم 6 صور لكل منتج
- ✅ تصفية المنتجات حسب الفئة والسعر
- ✅ سلة تسوق محفوظة في المتصفح (localStorage)
- ✅ لا يتطلب تسجيل دخول للعملاء
- ✅ طرق دفع مصرية (فودافون كاش، أورانج موني، فوري، الدفع عند الاستلام)
- ✅ مشاركة الفاتورة عبر واتساب
- ✅ تطبيق قابل للتثبيت (PWA)

### لوحة الإدارة
- ✅ لوحة تحكم مع إحصائيات شاملة
- ✅ إدارة المنتجات (إضافة، تعديل، حذف، تفعيل/إلغاء تفعيل)
- ✅ إدارة الأقسام مع صور
- ✅ إدارة الطلبات وتتبع الحالة
- ✅ إدارة طرق الدفع
- ✅ إعدادات المتجر (الاسم، الشعار، SEO، الألوان)
- ✅ تغيير كلمة مرور الأدمن

</div>

### Store Features
- Full Arabic RTL interface with Cairo/Tajawal fonts
- Feminine pink/purple theme with gold accents
- Products with up to 6 images support
- Category and price filtering
- Shopping cart persisted in localStorage
- No customer login required
- Egyptian payment methods integration
- WhatsApp invoice sharing
- Installable PWA

### Admin Panel Features
- Dashboard with comprehensive statistics
- Full CRUD for products, categories, orders, payment methods
- Store settings management (name, logo, SEO, colors)
- Admin password change functionality

---

## 🛠️ Tech Stack | التقنيات المستخدمة

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI Library |
| TypeScript | 5.x | Type Safety |
| Vite | 6.x | Build Tool |
| TailwindCSS | 4.x | Styling |
| shadcn/ui | Latest | UI Components |
| TanStack Query | 5.x | Server State |
| wouter | Latest | Routing |
| Framer Motion | 11.x | Animations |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | Runtime |
| Express.js | 4.x | Web Framework |
| TypeScript | 5.x | Type Safety |
| Drizzle ORM | 0.39.x | Database ORM |
| PostgreSQL | 15.x | Database |
| bcrypt | 6.x | Password Hashing |

### Tools & Libraries
| Library | Purpose |
|---------|---------|
| Zod | Schema Validation |
| React Hook Form | Form Management |
| Lucide React | Icons |
| date-fns | Date Formatting |

---

## 📋 Requirements | المتطلبات

### System Requirements
- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL >= 15.0

### Environment Variables
```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/anaqah_store
SESSION_SECRET=your-super-secret-session-key-min-32-chars

# Optional (defaults shown)
NODE_ENV=development
PORT=5000
```

⚠️ **Security Note:** Always use a strong, unique `SESSION_SECRET` in production (minimum 32 characters).

---

## 🚀 Installation | التثبيت

### Option 1: Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/anaqah-store.git
cd anaqah-store

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The application will be available at `http://localhost:5000`

### Option 2: Docker Deployment

```bash
# Clone the repository
git clone https://github.com/your-username/anaqah-store.git
cd anaqah-store

# Create environment file
cp .env.example .env
# Edit .env with your credentials (especially SESSION_SECRET!)

# Build and start containers (database will be created automatically)
docker-compose up -d --build

# Wait for database to be ready, then view logs
docker-compose logs -f app
```

The application will be available at `http://localhost:5000`

**Important Notes:**
- The database is created automatically by docker-compose
- Database schema is applied on first application start
- Change `SESSION_SECRET` in production for security
- Default admin credentials: `admin` / `admin123`

---

## 📁 Project Structure | بنية المشروع

```
anaqah-store/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── admin/         # Admin panel components
│   │   │   ├── store/         # Store components (Header, Footer, etc.)
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── contexts/          # React contexts (Cart, Settings)
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utility functions
│   │   └── pages/             # Page components
│   │       ├── admin/         # Admin panel pages
│   │       └── *.tsx          # Store pages
│   └── index.html             # HTML entry point
├── server/                    # Backend Express application
│   ├── db.ts                  # Database connection
│   ├── index.ts               # Server entry point
│   ├── routes.ts              # API routes
│   ├── storage.ts             # Database operations
│   └── vite.ts                # Vite integration
├── shared/                    # Shared code between frontend & backend
│   └── schema.ts              # Database schema & types
├── Dockerfile                 # Docker build instructions
├── docker-compose.yml         # Docker Compose configuration
├── drizzle.config.ts          # Drizzle ORM configuration
├── package.json               # Node.js dependencies
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Vite configuration
```

---

## 🗄️ Database Schema | مخطط قاعدة البيانات

### Tables

| Table | Description |
|-------|-------------|
| `categories` | Product categories with images |
| `products` | Products with 6 image support, pricing, stock |
| `payment_methods` | Egyptian payment options |
| `orders` | Customer orders with items and status |
| `app_settings` | Store configuration, SEO, WhatsApp |
| `admin_users` | Admin authentication |

### Key Fields

**Products:**
- Up to 6 images per product (array)
- Price and sale price
- Stock quantity
- Category relationship
- Active/inactive status

**Orders:**
- Customer info (name, phone, address)
- Order items (JSON)
- Payment method
- Status (pending, processing, shipped, delivered, cancelled)

---

## 🔐 Admin Panel | لوحة الإدارة

<div dir="rtl">

### بيانات الدخول الافتراضية
- **الرابط:** `/admin`
- **اسم المستخدم:** `admin`
- **كلمة المرور:** `admin123`

⚠️ **مهم:** قم بتغيير كلمة المرور من صفحة "تغيير كلمة المرور" بعد أول تسجيل دخول!

</div>

### Default Credentials
- **URL:** `/admin`
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **Important:** Change the password from "Change Password" page after first login!

---

## 🔌 API Endpoints | نقاط الوصول

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories |
| GET | `/api/products` | List all products |
| GET | `/api/payment-methods` | List active payment methods |
| GET | `/api/settings` | Get store settings |
| POST | `/api/orders` | Create new order |

### Admin Endpoints (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| POST | `/api/admin/logout` | Admin logout |
| GET | `/api/admin/check` | Check auth status |
| POST | `/api/admin/change-password` | Change admin password |
| GET/POST/PATCH/DELETE | `/api/admin/categories/:id` | Category CRUD |
| GET/POST/PATCH/DELETE | `/api/admin/products/:id` | Product CRUD |
| GET/PATCH | `/api/admin/orders/:id` | Order management |
| GET/POST/PATCH/DELETE | `/api/admin/payment-methods/:id` | Payment methods CRUD |
| PATCH | `/api/admin/settings` | Update store settings |

---

## 💳 Payment Methods | طرق الدفع

<div dir="rtl">

الطرق المتاحة (مصر):
1. **فودافون كاش** - Vodafone Cash
2. **أورانج موني** - Orange Money  
3. **فوري** - Fawry
4. **الدفع عند الاستلام** - Cash on Delivery

</div>

---

## 📱 PWA Support | دعم التطبيق التقدمي

The application is a Progressive Web App (PWA) that can be installed on:
- Android devices
- iOS devices
- Desktop (Chrome, Edge)

The manifest and service worker are automatically configured.

---

## 🔧 Development Commands | أوامر التطوير

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Push database schema changes
npm run db:push

# Type check
npm run check
```

---

## 🐳 Docker Commands | أوامر Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Rebuild after changes
docker-compose up -d --build

# Remove all data (including database)
docker-compose down -v
```

---

## 🌐 Deployment | النشر

### Replit Deployment
1. Import the repository to Replit
2. The application will auto-configure
3. Click "Run" to start
4. Use Replit's deployment feature to publish

### Docker Deployment (VPS/Cloud)
1. Clone the repository
2. Configure `.env` file
3. Run `docker-compose up -d`
4. Configure reverse proxy (nginx) if needed

---

## 📄 License | الرخصة

This project is licensed under the MIT License.

---

## 👨‍💻 Author | المطور

Built with ❤️ for Arabic e-commerce

---

## 🤝 Contributing | المساهمة

<div dir="rtl">

نرحب بمساهماتكم! يرجى:
1. عمل Fork للمشروع
2. إنشاء فرع جديد للميزة
3. إرسال Pull Request

</div>

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a Pull Request

---

## 📞 Support | الدعم

For support and questions, please open an issue on GitHub.
