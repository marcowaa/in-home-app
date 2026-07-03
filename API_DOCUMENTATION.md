# توثيق API — نظام المندوبين

> هذا الملف يشرح كيفية ربط أي نظام خارجي (متجر إلكتروني، تطبيق موبايل، نظام ERP...) مع نظام المندوبين.

---

## الفهرس

1. [نظرة عامة](#نظرة-عامة)
2. [الحصول على مفتاح API](#الحصول-على-مفتاح-api)
3. [المصادقة (Authentication)](#المصادقة)
4. [حدود الاستخدام (Rate Limiting)](#حدود-الاستخدام)
5. [أكواد الحالة والأخطاء](#أكواد-الحالة-والأخطاء)
6. [حالات الطلب](#حالات-الطلب)
7. [الـ Endpoints](#الـ-endpoints)
   - [الطلبات (Orders)](#الطلبات)
   - [التتبع (Tracking)](#التتبع)
   - [المندوبين (Drivers)](#المندوبين)
   - [التقييمات (Ratings)](#التقييمات)
8. [Webhooks — الإشعارات اللحظية](#webhooks)
9. [أمثلة عملية بلغات مختلفة](#أمثلة-عملية)
10. [سيناريوهات الربط](#سيناريوهات-الربط)
11. [الأسئلة الشائعة](#الأسئلة-الشائعة)

---

## نظرة عامة

| البند | القيمة |
|---|---|
| Base URL | `https://YOUR_DOMAIN` |
| API Version | `v1` |
| Content-Type | `application/json` |
| المصادقة | API Key عبر Header |
| Rate Limit | قابل للتعديل لكل مفتاح (افتراضي: 100 طلب/دقيقة) |
| Timeout | لا يوجد timeout من جهة السيرفر |

---

## الحصول على مفتاح API

1. ادخل لوحة تحكم الأدمن → **التكاملات** → تبويب **مفاتيح API**
2. اضغط **"إنشاء مفتاح جديد"**
3. حدد:
   - **الاسم**: اسم وصفي (مثلاً: "متجر شوبيفاي")
   - **الصلاحيات**: اختر الصلاحيات المطلوبة (راجع جدول الصلاحيات)
   - **Rate Limit**: عدد الطلبات المسموحة في الدقيقة
   - **قائمة IP** (اختياري): عناوين IP المسموح لها فقط
   - **تاريخ الانتهاء** (اختياري)
4. سيُنشأ:
   - **API Key**: يبدأ بـ `dk_live_` — هذا هو المفتاح المستخدم في الطلبات
   - **Secret Key**: يبدأ بـ `sk_` — احتفظ به في مكان آمن

### جدول الصلاحيات

| الصلاحية | الوصف | مثال الاستخدام |
|---|---|---|
| `orders.read` | قراءة وعرض الطلبات | استعلام عن حالة طلب |
| `orders.create` | إنشاء طلبات جديدة | متجر يرسل طلبات توصيل |
| `orders.update` | تحديث بيانات الطلب | تعديل ملاحظات أو حالة |
| `orders.cancel` | إلغاء طلبات | إلغاء طلب قبل التسليم |
| `tracking.read` | تتبع الشحنات | صفحة تتبع للعميل |
| `drivers.read` | قراءة بيانات المندوبين | عرض قائمة المندوبين المتاحين |
| `drivers.location` | موقع المندوبين GPS | خريطة تتبع مباشر |
| `ratings.read` | قراءة التقييمات | عرض تقييمات المندوب |
| `ratings.create` | إضافة تقييمات | العميل يقيّم المندوب بعد التسليم |
| `webhooks.manage` | إدارة Webhooks | (للاستخدام المتقدم) |

---

## المصادقة

أرسل مفتاح API في **Header** اسمه `X-API-Key`:

```
X-API-Key: dk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ لا ترسل المفتاح في URL أو في body الطلب. استخدم Header فقط.

### مثال Request:
```http
GET /api/v1/orders HTTP/1.1
Host: YOUR_DOMAIN
X-API-Key: dk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

### أخطاء المصادقة:

| HTTP Status | الرسالة | السبب |
|---|---|---|
| `401` | `API key is required` | لم تُرسل `X-API-Key` |
| `401` | `Invalid API key` | المفتاح غير صحيح |
| `403` | `API key is deactivated` | المفتاح معطّل |
| `403` | `API key has expired` | المفتاح منتهي الصلاحية |
| `403` | `IP address not allowed` | عنوان IP غير مسموح |
| `403` | `Missing required permission` | المفتاح لا يملك الصلاحية المطلوبة |

---

## حدود الاستخدام

كل مفتاح له حد أقصى لعدد الطلبات في الدقيقة (افتراضي: 100).

**Response Headers:**
```
X-RateLimit-Limit: 100          ← الحد الأقصى
X-RateLimit-Remaining: 95       ← المتبقي
X-RateLimit-Reset: 1710000060   ← وقت إعادة التصفير (Unix timestamp)
```

عند تجاوز الحد:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit of 100 requests/minute exceeded."
}
```
**HTTP Status: `429`**

---

## أكواد الحالة والأخطاء

| Status Code | المعنى |
|---|---|
| `200` | نجاح |
| `201` | تم الإنشاء بنجاح |
| `400` | خطأ في البيانات المرسلة |
| `401` | غير مصرّح (مفتاح مفقود أو خاطئ) |
| `403` | ممنوع (صلاحية مفقودة أو IP محظور) |
| `404` | العنصر غير موجود |
| `429` | تجاوز حد الاستخدام |
| `500` | خطأ في السيرفر |

### شكل رسالة الخطأ:
```json
{
  "error": "validation_error",
  "message": "Required fields: customerName, customerPhone, customerAddress, items, total"
}
```

---

## حالات الطلب

| الحالة | الوصف |
|---|---|
| `pending` | جديد — ينتظر تعيين مندوب |
| `processing` | جاري التجهيز — تم تعيين مندوب |
| `shipped` | جاري التوصيل — المندوب في الطريق |
| `delivered` | تم التسليم |
| `cancelled` | ملغي |

**مسار الحالة النموذجي:**
```
pending → processing → shipped → delivered
                                ↘ cancelled (يمكن الإلغاء قبل التسليم فقط)
```

> ملاحظة: الطلبات القادمة من API تُنشأ بحالة `pending` دائماً. الأدمن هو من يعيّن المندوب ويحرّك الحالة.

---

## الـ Endpoints

### الطلبات

#### 1. إنشاء طلب جديد

```
POST /api/v1/orders
```
**الصلاحية:** `orders.create`

**Body (JSON):**

| الحقل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `customerName` | string | ✅ | اسم العميل |
| `customerPhone` | string | ✅ | هاتف العميل |
| `customerAddress` | string | ✅ | عنوان التسليم |
| `customerCity` | string | ❌ | المدينة |
| `customerNotes` | string | ❌ | ملاحظات |
| `items` | array | ✅ | المنتجات (راجع الشكل أدناه) |
| `total` | string | ✅ | الإجمالي (رقم نصي مثل `"150.00"`) |
| `subtotal` | string | ❌ | المجموع الفرعي (يساوي total إن لم يُحدد) |

**شكل عنصر items:**
```json
{
  "productId": "SKU-001",
  "productName": "هاتف سامسونج",
  "productImage": "https://example.com/image.jpg",
  "quantity": 1,
  "price": "5000",
  "total": "5000"
}
```

**مثال Request:**
```json
POST /api/v1/orders
X-API-Key: dk_live_xxx

{
  "customerName": "أحمد محمد",
  "customerPhone": "01012345678",
  "customerAddress": "15 شارع التحرير، الدقي",
  "customerCity": "الجيزة",
  "customerNotes": "الدور الثالث - شقة 5",
  "items": [
    {
      "productId": "PROD-001",
      "productName": "لابتوب HP",
      "productImage": "",
      "quantity": 1,
      "price": "15000",
      "total": "15000"
    },
    {
      "productId": "PROD-002",
      "productName": "ماوس لوجيتك",
      "productImage": "",
      "quantity": 2,
      "price": "250",
      "total": "500"
    }
  ],
  "total": "15500",
  "subtotal": "15500"
}
```

**Response (201):**
```json
{
  "success": true,
  "order": {
    "id": "abc123-def456-...",
    "orderNumber": "API-M1K2N3X4",
    "trackingCode": "A1B2C3D4",
    "deliveryCode": "582917",
    "status": "pending",
    "total": "15500",
    "createdAt": "2026-03-12T10:30:00.000Z"
  }
}
```

> **مهم:** احتفظ بـ `id` و `trackingCode` — ستحتاجهم للاستعلام والتتبع لاحقاً.

---

#### 2. عرض طلب محدد

```
GET /api/v1/orders/:id
```
**الصلاحية:** `orders.read`

**Response (200):**
```json
{
  "id": "abc123-...",
  "orderNumber": "API-M1K2N3X4",
  "trackingCode": "A1B2C3D4",
  "status": "shipped",
  "isPaid": false,
  "customerName": "أحمد محمد",
  "customerPhone": "01012345678",
  "customerAddress": "15 شارع التحرير، الدقي",
  "customerCity": "الجيزة",
  "items": [...],
  "subtotal": "15500",
  "total": "15500",
  "driverName": "محمد علي",
  "driverId": "driver-id-...",
  "createdAt": "2026-03-12T10:30:00.000Z",
  "pickedUpAt": "2026-03-12T11:00:00.000Z",
  "shippedAt": "2026-03-12T11:30:00.000Z",
  "deliveredAt": null
}
```

---

#### 3. عرض قائمة الطلبات

```
GET /api/v1/orders
GET /api/v1/orders?status=pending
GET /api/v1/orders?status=delivered&limit=10&offset=0
```
**الصلاحية:** `orders.read`

**Query Parameters:**

| الحقل | النوع | الوصف |
|---|---|---|
| `status` | string | فلتر بالحالة: `pending`, `processing`, `shipped`, `delivered`, `cancelled` |
| `limit` | number | عدد النتائج (افتراضي: 50) |
| `offset` | number | بداية النتائج للتصفح (افتراضي: 0) |

**Response (200):**
```json
{
  "orders": [
    {
      "id": "abc123-...",
      "orderNumber": "API-M1K2N3X4",
      "trackingCode": "A1B2C3D4",
      "status": "pending",
      "total": "15500",
      "customerName": "أحمد محمد",
      "driverName": null,
      "createdAt": "2026-03-12T10:30:00.000Z"
    }
  ],
  "total": 25,
  "hasMore": true
}
```

---

#### 4. تحديث طلب

```
PATCH /api/v1/orders/:id
```
**الصلاحية:** `orders.update`

**الحقول المسموح تعديلها:**

| الحقل | النوع | الوصف |
|---|---|---|
| `customerNotes` | string | تعديل ملاحظات العميل |
| `status` | string | تغيير حالة الطلب |

**مثال:**
```json
PATCH /api/v1/orders/abc123-...
X-API-Key: dk_live_xxx

{
  "customerNotes": "تم تغيير الموبايل: 01098765432"
}
```

**Response (200):**
```json
{
  "success": true,
  "order": { ... }
}
```

---

#### 5. إلغاء طلب

```
POST /api/v1/orders/:id/cancel
```
**الصلاحية:** `orders.cancel`

> لا يمكن إلغاء طلب بحالة `delivered`.

**Response (200):**
```json
{
  "success": true,
  "order": { ... }
}
```

**خطأ (400) — محاولة إلغاء طلب مُسلَّم:**
```json
{
  "error": "invalid_status",
  "message": "Cannot cancel delivered order"
}
```

---

### التتبع

#### 6. تتبع شحنة بكود التتبع (عام — بدون مصادقة)

```
GET /api/v1/tracking/:code
```

> ⚡ هذا الـ endpoint **لا يحتاج مفتاح API** — يمكن استخدامه مباشرة في صفحة تتبع للعميل.

**مثال:**
```
GET /api/v1/tracking/A1B2C3D4
```

**Response (200):**
```json
{
  "orderNumber": "API-M1K2N3X4",
  "status": "shipped",
  "customerName": "أحمد محمد",
  "total": "15500",
  "driverName": "محمد علي",
  "driverPhone": "01112345678",
  "createdAt": "2026-03-12T10:30:00.000Z",
  "pickedUpAt": "2026-03-12T11:00:00.000Z",
  "shippedAt": "2026-03-12T11:30:00.000Z",
  "deliveredAt": null
}
```

---

### المندوبين

#### 7. قائمة المندوبين المتاحين

```
GET /api/v1/drivers
```
**الصلاحية:** `drivers.read`

> يعرض فقط المندوبين **النشطين والموثقين**.

**Response (200):**
```json
{
  "drivers": [
    {
      "id": "driver-id-...",
      "name": "محمد علي",
      "phone": "01112345678",
      "vehicleType": "سيارة",
      "isAvailable": true,
      "fullyVerified": true,
      "averageRating": "4.5",
      "completedOrders": 150,
      "governorate": "القاهرة",
      "city": "مدينة نصر"
    }
  ],
  "total": 12
}
```

---

#### 8. تفاصيل مندوب

```
GET /api/v1/drivers/:id
```
**الصلاحية:** `drivers.read`

**Response (200):**
```json
{
  "id": "driver-id-...",
  "name": "محمد علي",
  "phone": "01112345678",
  "vehicleType": "سيارة",
  "isAvailable": true,
  "fullyVerified": true,
  "averageRating": "4.5",
  "totalRatings": 45,
  "completedOrders": 150,
  "governorate": "القاهرة",
  "city": "مدينة نصر",
  "village": ""
}
```

---

#### 9. موقع المندوب GPS

```
GET /api/v1/drivers/:id/location
```
**الصلاحية:** `drivers.location`

**Response (200):**
```json
{
  "driverId": "driver-id-...",
  "name": "محمد علي",
  "latitude": "30.0444",
  "longitude": "31.2357",
  "isAvailable": true
}
```

---

### التقييمات

#### 10. عرض تقييمات مندوب

```
GET /api/v1/drivers/:id/ratings
GET /api/v1/drivers/:id/ratings?limit=10&offset=0
```
**الصلاحية:** `ratings.read`

**Response (200):**
```json
{
  "driverId": "driver-id-...",
  "driverName": "محمد علي",
  "averageRating": "4.5",
  "totalRatings": 45,
  "ratings": [
    {
      "id": "rating-id-...",
      "rating": "5",
      "comment": "خدمة ممتازة",
      "customerName": "سارة أحمد",
      "orderId": "order-id-...",
      "createdAt": "2026-03-12T15:00:00.000Z"
    }
  ],
  "total": 45,
  "hasMore": true
}
```

---

#### 11. إضافة تقييم لمندوب

```
POST /api/v1/drivers/:id/ratings
```
**الصلاحية:** `ratings.create`

**Body:**

| الحقل | النوع | مطلوب | الوصف |
|---|---|---|---|
| `rating` | number | ✅ | التقييم (1 إلى 5) |
| `comment` | string | ❌ | تعليق |
| `customerName` | string | ❌ | اسم العميل (افتراضي: "عميل API") |
| `orderId` | string | ❌ | معرّف الطلب المرتبط |

**مثال:**
```json
POST /api/v1/drivers/driver-id-.../ratings
X-API-Key: dk_live_xxx

{
  "rating": 5,
  "comment": "توصيل سريع ومعاملة ممتازة",
  "customerName": "سارة أحمد",
  "orderId": "order-id-..."
}
```

**Response (201):**
```json
{
  "success": true,
  "rating": {
    "id": "rating-id-...",
    "driverId": "driver-id-...",
    "rating": "5",
    "comment": "توصيل سريع ومعاملة ممتازة",
    "customerName": "سارة أحمد",
    "orderId": "order-id-...",
    "createdAt": "2026-03-12T15:30:00.000Z"
  },
  "driverStats": {
    "averageRating": "4.6",
    "totalRatings": 46
  }
}
```

---

## Webhooks

Webhooks تسمح لنظامك باستقبال إشعارات لحظية عند حدوث أحداث في نظام المندوبين (بدلاً من polling متكرر).

### كيفية الإعداد

1. لوحة الأدمن → **التكاملات** → تبويب **Webhooks**
2. اضغط **"إنشاء Webhook جديد"**
3. حدد:
   - **الاسم**: اسم وصفي
   - **URL**: عنوان الـ endpoint في نظامك الذي سيستقبل الإشعارات
   - **الأحداث**: اختر الأحداث التي تريد الاستماع لها
   - **Secret Key** (اختياري): لتأمين والتحقق من صحة الطلبات
   - **Max Retries**: عدد المحاولات قبل التعطيل التلقائي (افتراضي: 3)

### الأحداث المتاحة

| الحدث | متى يُطلق |
|---|---|
| `order.created` | عند إنشاء طلب جديد |
| `order.assigned` | عند تعيين مندوب لطلب |
| `order.picked_up` | عند استلام المندوب للشحنة |
| `order.shipped` | عند بدء التوصيل |
| `order.delivered` | عند تسليم الشحنة |
| `order.cancelled` | عند إلغاء طلب |
| `driver.registered` | عند تسجيل مندوب جديد |
| `driver.verified` | عند توثيق مندوب |
| `driver.location_updated` | عند تحديث موقع المندوب |
| `payment.deposit` | عند إيداع في محفظة مندوب |
| `payment.withdrawal` | عند سحب من محفظة مندوب |
| `rating.created` | عند إضافة تقييم جديد |
| `rating.deleted` | عند حذف تقييم |

### شكل الطلب الذي سيصل لنظامك

```http
POST https://your-system.com/webhook-handler
Content-Type: application/json
X-Webhook-Event: order.created
X-Webhook-Signature: a1b2c3d4e5f6...   ← (فقط إذا حددت Secret)
```

```json
{
  "event": "order.created",
  "timestamp": "2026-03-12T10:30:00.000Z",
  "data": {
    "orderId": "abc123-...",
    "orderNumber": "API-M1K2N3X4",
    "trackingCode": "A1B2C3D4",
    "total": "15500",
    "customerName": "أحمد محمد"
  }
}
```

### التحقق من التوقيع (Signature Verification)

إذا حددت **Secret Key** عند إنشاء الـ Webhook، كل طلب سيحتوي على Header اسمه `X-Webhook-Signature`.

**طريقة التحقق:**
```
HMAC-SHA256(request_body_string, secret_key) === X-Webhook-Signature
```

**مثال بـ Node.js:**
```javascript
const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  return expected === signature;
}

// في الـ endpoint
app.post('/webhook-handler', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  if (!verifyWebhook(req.body, signature, 'YOUR_SECRET')) {
    return res.status(401).send('Invalid signature');
  }
  // معالجة الحدث...
  const { event, data } = req.body;
  console.log(`Event: ${event}`, data);
  res.status(200).send('OK');
});
```

**مثال بـ Python:**
```python
import hmac, hashlib, json

def verify_webhook(body, signature, secret):
    expected = hmac.new(
        secret.encode(),
        json.dumps(body).encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

**مثال بـ PHP:**
```php
function verifyWebhook($body, $signature, $secret) {
    $expected = hash_hmac('sha256', json_encode($body), $secret);
    return hash_equals($expected, $signature);
}
```

### سلوك الـ Webhook

- **Timeout**: 10 ثوانٍ — يجب أن يرد نظامك خلالها
- **نجاح**: أي HTTP status بين 200–299
- **فشل**: أي status آخر أو عدم استجابة → يُسجّل كمحاولة فاشلة
- **تعطيل تلقائي**: بعد فشل عدد = `maxRetries` (افتراضي 3)، يُعطَّل Webhook تلقائياً
- **إعادة التفعيل**: يمكن من لوحة التكاملات بعد إصلاح المشكلة في نظامك
- **الاختبار**: يمكن إرسال طلب اختبار يدوي من لوحة التكاملات (يرسل حدث `test`)

---

## أمثلة عملية

### Node.js (JavaScript)

```javascript
const API_KEY = 'dk_live_xxxxxxxx';
const BASE_URL = 'https://YOUR_DOMAIN';

// إنشاء طلب
async function createOrder(orderData) {
  const response = await fetch(`${BASE_URL}/api/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(orderData),
  });
  return response.json();
}

// استخدام
const result = await createOrder({
  customerName: 'أحمد محمد',
  customerPhone: '01012345678',
  customerAddress: '15 شارع التحرير',
  items: [{ productId: '1', productName: 'منتج', productImage: '', quantity: 1, price: '500', total: '500' }],
  total: '500',
});
console.log('Order ID:', result.order.id);
console.log('Tracking Code:', result.order.trackingCode);
```

### Python

```python
import requests

API_KEY = 'dk_live_xxxxxxxx'
BASE_URL = 'https://YOUR_DOMAIN'

headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
}

# إنشاء طلب
def create_order(order_data):
    response = requests.post(
        f'{BASE_URL}/api/v1/orders',
        json=order_data,
        headers=headers,
    )
    return response.json()

# استخدام
result = create_order({
    'customerName': 'أحمد محمد',
    'customerPhone': '01012345678',
    'customerAddress': '15 شارع التحرير',
    'items': [{'productId': '1', 'productName': 'منتج', 'productImage': '', 'quantity': 1, 'price': '500', 'total': '500'}],
    'total': '500',
})
print('Order ID:', result['order']['id'])
print('Tracking Code:', result['order']['trackingCode'])

# الاستعلام عن طلب
def get_order(order_id):
    response = requests.get(f'{BASE_URL}/api/v1/orders/{order_id}', headers=headers)
    return response.json()

# تتبع شحنة (بدون مفتاح)
def track_order(tracking_code):
    response = requests.get(f'{BASE_URL}/api/v1/tracking/{tracking_code}')
    return response.json()
```

### PHP

```php
<?php
$apiKey = 'dk_live_xxxxxxxx';
$baseUrl = 'https://YOUR_DOMAIN';

// إنشاء طلب
function createOrder($data) {
    global $apiKey, $baseUrl;
    
    $ch = curl_init("$baseUrl/api/v1/orders");
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            "X-API-Key: $apiKey",
        ],
        CURLOPT_POSTFIELDS => json_encode($data),
    ]);
    
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

// استخدام
$result = createOrder([
    'customerName' => 'أحمد محمد',
    'customerPhone' => '01012345678',
    'customerAddress' => '15 شارع التحرير',
    'items' => [['productId' => '1', 'productName' => 'منتج', 'productImage' => '', 'quantity' => 1, 'price' => '500', 'total' => '500']],
    'total' => '500',
]);

echo "Order ID: " . $result['order']['id'] . "\n";
echo "Tracking Code: " . $result['order']['trackingCode'] . "\n";
?>
```

### cURL (لاختبار من Terminal)

```bash
# إنشاء طلب
curl -X POST https://YOUR_DOMAIN/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dk_live_xxxxxxxx" \
  -d '{
    "customerName": "أحمد محمد",
    "customerPhone": "01012345678",
    "customerAddress": "15 شارع التحرير",
    "items": [{"productId":"1","productName":"منتج","productImage":"","quantity":1,"price":"500","total":"500"}],
    "total": "500"
  }'

# عرض طلب
curl https://YOUR_DOMAIN/api/v1/orders/ORDER_ID \
  -H "X-API-Key: dk_live_xxxxxxxx"

# تتبع شحنة (بدون مفتاح)
curl https://YOUR_DOMAIN/api/v1/tracking/TRACKING_CODE

# عرض المندوبين
curl https://YOUR_DOMAIN/api/v1/drivers \
  -H "X-API-Key: dk_live_xxxxxxxx"

# إلغاء طلب
curl -X POST https://YOUR_DOMAIN/api/v1/orders/ORDER_ID/cancel \
  -H "X-API-Key: dk_live_xxxxxxxx"
```

---

## سيناريوهات الربط

### السيناريو 1: متجر إلكتروني يرسل طلبات توصيل

**الصلاحيات المطلوبة:** `orders.create`, `orders.read`, `tracking.read`

**التدفق:**
1. العميل يطلب من المتجر ويختار "توصيل"
2. المتجر يرسل `POST /api/v1/orders` ببيانات العميل والمنتجات
3. النظام يُنشئ الطلب ويرجع `trackingCode`
4. المتجر يعرض كود التتبع للعميل
5. الأدمن يعيّن مندوب من لوحة التحكم
6. العميل يتتبع شحنته عبر `GET /api/v1/tracking/:code` (بدون مفتاح)

**مكمّل بـ Webhooks:**
- `order.shipped` → المتجر يبعت SMS للعميل "شحنتك في الطريق"
- `order.delivered` → المتجر يحدّث حالة الطلب تلقائياً

---

### السيناريو 2: تطبيق تتبع للعملاء

**الصلاحيات المطلوبة:** `tracking.read`, `drivers.location`

**التدفق:**
1. العميل يدخل كود التتبع في التطبيق
2. التطبيق يستعلم `GET /api/v1/tracking/:code`
3. إذا الحالة `shipped` → يعرض موقع المندوب عبر `GET /api/v1/drivers/:id/location`

---

### السيناريو 3: نظام تقييم خارجي

**الصلاحيات المطلوبة:** `ratings.read`, `ratings.create`

**التدفق:**
1. بعد التسليم، النظام الخارجي يستقبل webhook `order.delivered`
2. يرسل للعميل رابط تقييم
3. العميل يقيّم → `POST /api/v1/drivers/:id/ratings`

---

### السيناريو 4: لوحة تحكم BI / تحليلات

**الصلاحيات المطلوبة:** `orders.read`, `drivers.read`, `ratings.read`

**التدفق:**
- سحب دوري لبيانات الطلبات والمندوبين والتقييمات لعرضها في Dashboard خارجي

---

## الأسئلة الشائعة

### هل يمكن تعيين مندوب محدد عبر API؟
لا حالياً. الطلبات القادمة من API تُنشأ بحالة `pending` والأدمن هو من يعيّن المندوب من لوحة التحكم.

### هل API التتبع يحتاج مفتاح؟
لا. `GET /api/v1/tracking/:code` عام ويمكن استخدامه مباشرة في صفحة تتبع للعملاء بدون أي مصادقة.

### ماذا يحصل لو تجاوزت Rate Limit؟
تحصل على خطأ `429`. انتظر حتى نهاية الدقيقة الحالية (راجع Header `X-RateLimit-Reset`) أو اطلب من الأدمن رفع الحد.

### كيف أعرف أن Webhook طلبي وصل فعلاً منكم وليس مزوّر؟
استخدم **Secret Key** عند إنشاء الـ Webhook. كل طلب سيحتوي على `X-Webhook-Signature` يمكنك التحقق منه بـ HMAC-SHA256 (راجع قسم التحقق من التوقيع).

### ماذا لو Webhook فشل؟
بعد فشل عدد المحاولات (افتراضي 3)، يُعطَّل تلقائياً. يمكن إعادة تفعيله من لوحة التكاملات بعد إصلاح المشكلة. كل المحاولات مسجّلة في سجل الـ Webhook.

### هل يمكن إنشاء أكثر من مفتاح API؟
نعم. يمكن إنشاء مفاتيح متعددة بصلاحيات مختلفة (مثلاً: مفتاح للمتجر بصلاحية إنشاء فقط، ومفتاح للتحليلات بصلاحية قراءة فقط).

### هل المفتاح يعمل على Postman / Insomnia؟
نعم. أرسل Header `X-API-Key` بالقيمة، ونوع الـ Body اختره `JSON`.

---

## ملخص سريع للمبرمج

```
Base URL:     https://YOUR_DOMAIN
Auth Header:  X-API-Key: dk_live_xxx
Content-Type: application/json

POST   /api/v1/orders              → إنشاء طلب    (orders.create)
GET    /api/v1/orders              → قائمة طلبات   (orders.read)
GET    /api/v1/orders/:id          → تفاصيل طلب    (orders.read)
PATCH  /api/v1/orders/:id          → تحديث طلب     (orders.update)
POST   /api/v1/orders/:id/cancel   → إلغاء طلب     (orders.cancel)
GET    /api/v1/tracking/:code      → تتبع شحنة     (بدون مصادقة)
GET    /api/v1/drivers             → قائمة مندوبين  (drivers.read)
GET    /api/v1/drivers/:id         → تفاصيل مندوب  (drivers.read)
GET    /api/v1/drivers/:id/location → موقع GPS     (drivers.location)
GET    /api/v1/drivers/:id/ratings → تقييمات مندوب (ratings.read)
POST   /api/v1/drivers/:id/ratings → إضافة تقييم   (ratings.create)
```
