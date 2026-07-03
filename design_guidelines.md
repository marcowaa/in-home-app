# تصميم متجر نسائي إلكتروني احترافي - Design Guidelines

## Design Approach
**Reference-Based Design** inspired by **Amazon's e-commerce interface** with feminine elegance tailored for Arabic RTL audiences. Draw from Amazon's proven patterns: clean product grids, prominent search, hierarchical navigation, and trust indicators - while infusing sophisticated feminine aesthetics.

## Typography System

**Arabic Font Stack:**
- Primary: 'Cairo', 'Tajawal' (Google Fonts) - Modern, highly readable Arabic fonts
- Weights: 400 (Regular), 600 (SemiBold), 700 (Bold)

**Hierarchy:**
- Hero/Store Name: text-4xl to text-5xl, font-bold
- Section Headers: text-2xl to text-3xl, font-semibold  
- Product Titles: text-lg, font-semibold
- Body/Descriptions: text-base, font-normal
- Prices: text-xl to text-2xl, font-bold
- Admin Panel Headers: text-3xl, font-bold
- Button Text: text-base, font-semibold

**RTL Implementation:** Consistent `dir="rtl"` throughout with proper text-right alignment for Arabic content.

## Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistent rhythm (p-4, m-8, gap-6, etc.)

**Container Strategy:**
- Main content: max-w-7xl mx-auto px-4
- Product grids: max-w-screen-2xl
- Forms/Settings: max-w-4xl
- Admin panels: Full width with max-w-7xl inner containers

**Grid Patterns:**
- Products: grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5
- Categories: grid-cols-2 md:grid-cols-4 lg:grid-cols-6
- Admin tables: Full-width responsive tables
- Dashboard stats: grid-cols-1 md:grid-cols-2 lg:grid-cols-4

## Component Library

### Navigation (Amazon-inspired)
**Top Bar:**
- Store logo (right side for RTL) - editable from admin
- Search bar (prominent, center-aligned) with category dropdown
- Shopping cart icon with item count badge
- Language toggle if needed

**Category Navigation:**
- Horizontal scrollable category pills below header
- Active category highlighted with accent color
- Mega menu on desktop showing subcategories

### Product Cards
**Structure:**
- Single product image (first of 6) - aspect-ratio-square
- Product name (2 lines max with ellipsis)
- Price prominently displayed
- Stock indicator ("متوفر" / "نفذت الكمية")
- Quick "أضف للسلة" button on hover (desktop)
- Subtle border with hover elevation (shadow-md)

### Shopping Cart
- Slide-in panel from left (RTL consideration)
- Line items with thumbnail, name, quantity controls, price
- Subtotal, tax, total prominently displayed
- Selected payment method indicator
- "إتمام الشراء" CTA button (large, accent color)

### Admin Dashboard Components

**Sidebar Navigation:**
- Fixed right sidebar (RTL)
- Icons + text for each section
- Active state highlighting
- Sections: لوحة التحكم، المنتجات، الأقسام، الطلبات، وسائل الدفع، الإعدادات

**Data Tables:**
- Striped rows for readability
- Action buttons (تعديل، حذف، تفعيل/إيقاف) in leftmost column
- Sort indicators on headers
- Status badges (مفعل/متوقف) with color coding
- Search and filter controls above table

**Product Management Form:**
- Multi-step or sectioned single form
- 6-image uploader with drag-n-drop
- Show all 6 thumbnails in admin with "الصورة الأولى" indicator
- Rich text editor for descriptions
- Stock quantity input with visual indicators
- Category dropdown (shows active categories only)

**Settings Panel:**
- Organized in cards/sections
- Store name input
- Logo uploader (with preview)
- App icon uploader (192x192, 512x512 for PWA)
- WhatsApp number input with validation
- SEO meta description textarea
- Keywords tag input

### Forms & Inputs
- Floating labels for elegant feel
- Input backgrounds with subtle fill
- Focus states with accent color ring
- Error states in soft red with Arabic error messages
- Multi-image upload with preview grid showing 2x3 layout

### Buttons
**Primary CTA:** Full width on mobile, auto on desktop, rounded-lg, py-3, px-6
**Secondary:** Outlined variant with hover fill
**Danger (Delete):** Soft red background
**Success (Activate):** Soft green background

### Order Display
**Customer View (WhatsApp Message):**
- Clean, formatted text message
- Order number, date
- Line items with quantities and prices
- Selected payment method
- Customer details (name, phone, address)
- Total amount

**Admin Order Management:**
- Card-based layout for each order
- Status badges (قيد المعالجة، جاري التوصيل، تم التوصيل)
- Timeline/progress indicator
- Customer information panel
- Payment method highlighted
- Status update dropdown

## Images

### Hero Section
**Large hero banner** showcasing featured women's products or seasonal collections:
- Full-width, height: 60vh on desktop, 40vh on mobile
- Overlay text with store tagline in Arabic
- CTA button "تسوقي الآن" with blur background overlay
- Professional lifestyle photography of women's fashion

### Product Images
- Square aspect ratio (1:1) for grid consistency
- Clean white or subtle gradient backgrounds
- High-quality product photography
- First image shown in listings, all 6 available in product details modal

### Category Images
- Icon or representative product image for each category
- Circular cropped images for modern feel

### Admin Uploaded Assets
- Logo: Transparent PNG, optimized for header (max 200px width)
- App Icon: 512x512px PNG for PWA manifest
- Product images: Auto-compressed by Sharp, max 1200px width

## Special Considerations

**RTL Optimization:**
- All layouts mirror for right-to-left
- Icons that indicate direction (arrows, chevrons) flip appropriately
- Text-right alignment default
- Margins/padding reversed (mr becomes ml in RTL context)

**PWA Features:**
- Install prompt overlay with feminine design
- Splash screen using app icon and accent colors
- Offline fallback page with elegant messaging

**Admin Security:**
- Login page with feminine, professional aesthetic
- Session timeout warning
- Secure indicators throughout admin panel

**SEO Elements:**
- Dynamic page titles: "{Product Name} - {Store Name}"
- Meta descriptions from admin settings
- Structured data displayed invisibly (JSON-LD)
- Arabic-optimized sitemap

This design creates a **trustworthy, elegant e-commerce experience** that respects cultural context while maintaining modern usability standards inspired by Amazon's proven interface patterns.