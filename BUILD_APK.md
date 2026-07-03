# 📱 بناء تطبيق الأندرويد (APK)

## المتطلبات
1. **Java JDK 17+** - [تحميل من Oracle](https://www.oracle.com/java/technologies/downloads/)
2. **Android Studio** - [تحميل](https://developer.android.com/studio) (أو Android SDK فقط)

## 🔧 الإعداد لأول مرة

### 1. تثبيت Android SDK
```bash
# بعد تثبيت Android Studio، افتح SDK Manager
# ثبّت: Android SDK Platform 34 + Android SDK Build-Tools
```

### 2. ضبط متغيرات البيئة
```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
```

## 🏗️ بناء APK

### الخطوة 1: بناء الواجهة
```bash
npx vite build
```

### الخطوة 2: مزامنة مع Android
```bash
npx cap sync android
```

### الخطوة 3: فتح في Android Studio
```bash
npx cap open android
```

### الخطوة 4 (بديل): بناء APK مباشرة بدون Android Studio
```bash
cd android
./gradlew assembleDebug      # نسخة تطوير (Debug APK)
./gradlew assembleRelease    # نسخة إنتاج (Release APK) - تحتاج توقيع
```

## 📦 مسار APK بعد البناء
- **Debug**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release**: `android/app/build/outputs/apk/release/app-release.apk`

## 🔐 توقيع APK للنشر على Google Play

### إنشاء Keystore
```bash
keytool -genkey -v -keystore mandoobeen-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias mandoobeen
```

### إضافة معلومات التوقيع
أنشئ ملف `android/keystore.properties`:
```properties
storeFile=../mandoobeen-key.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=mandoobeen
keyPassword=YOUR_KEY_PASSWORD
```

### ثم في `android/app/build.gradle` أضف:
```groovy
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

## 📲 تثبيت على الهاتف مباشرة
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## 🌐 نسخة التحميل المباشر (بدون Google Play)

النسخة Debug أو Release الموقّعة يمكن مشاركتها مباشرة:
1. ابنِ APK باتباع الخطوات أعلاه
2. ارفع الملف على أي خدمة مشاركة ملفات
3. شارك الرابط مع المستخدمين
4. المستخدم يحمّل ويثبّت من "مصادر غير معروفة"

## 📋 Google Play Store

### متطلبات النشر:
1. حساب مطوّر Google Play ($25 رسوم واحدة)
2. APK/AAB موقّعة
3. أيقونة 512×512
4. Screenshots (لقطات شاشة)
5. وصف التطبيق

### لبناء AAB (تنسيق Google Play):
```bash
cd android
./gradlew bundleRelease
```
المسار: `android/app/build/outputs/bundle/release/app-release.aab`

## ⚡ الأوامر السريعة

```bash
# بناء كامل + مزامنة
npx vite build && npx cap sync android

# فتح Android Studio
npx cap open android

# بناء Debug APK مباشرة
cd android && ./gradlew assembleDebug

# تحديث بعد تعديل الكود
npx vite build && npx cap sync android
```
