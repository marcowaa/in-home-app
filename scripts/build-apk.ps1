# سكريبت بناء APK - نظام المندوبين
# Build APK Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  بناء تطبيق نظام المندوبين" -ForegroundColor Cyan
Write-Host "  Mandoobeen APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
$javaVersion = java -version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Java غير مثبت. يرجى تثبيت JDK 17+" -ForegroundColor Red
    Write-Host "   https://www.oracle.com/java/technologies/downloads/" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Java found" -ForegroundColor Green

# Check ANDROID_HOME
if (-not $env:ANDROID_HOME) {
    $defaultPath = "$env:LOCALAPPDATA\Android\Sdk"
    if (Test-Path $defaultPath) {
        $env:ANDROID_HOME = $defaultPath
        Write-Host "✅ Android SDK found at $defaultPath" -ForegroundColor Green
    } else {
        Write-Host "❌ ANDROID_HOME غير محدد. يرجى تثبيت Android SDK" -ForegroundColor Red
        Write-Host "   https://developer.android.com/studio" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "✅ Android SDK at $env:ANDROID_HOME" -ForegroundColor Green
}

# Step 1: Build frontend
Write-Host ""
Write-Host "📦 الخطوة 1: بناء الواجهة..." -ForegroundColor Yellow
npx vite build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل بناء الواجهة" -ForegroundColor Red
    exit 1
}
Write-Host "✅ تم بناء الواجهة بنجاح" -ForegroundColor Green

# Step 2: Sync with Capacitor
Write-Host ""
Write-Host "🔄 الخطوة 2: مزامنة مع Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل مزامنة Android" -ForegroundColor Red
    exit 1
}
Write-Host "✅ تمت المزامنة بنجاح" -ForegroundColor Green

# Step 3: Build APK
Write-Host ""
Write-Host "🔨 الخطوة 3: بناء APK..." -ForegroundColor Yellow

$buildType = $args[0]
if ($buildType -eq "release") {
    Write-Host "   نوع البناء: Release (إنتاج)" -ForegroundColor Magenta
    Push-Location android
    .\gradlew.bat assembleRelease
    Pop-Location
    $apkPath = "android\app\build\outputs\apk\release\app-release.apk"
} else {
    Write-Host "   نوع البناء: Debug (تطوير)" -ForegroundColor Magenta  
    Push-Location android
    .\gradlew.bat assembleDebug
    Pop-Location
    $apkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل بناء APK" -ForegroundColor Red
    exit 1
}

# Check output
if (Test-Path $apkPath) {
    $fileSize = (Get-Item $apkPath).Length / 1MB
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  ✅ تم بناء APK بنجاح!" -ForegroundColor Green
    Write-Host "  📁 المسار: $apkPath" -ForegroundColor Green
    Write-Host "  📐 الحجم: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "⚠️ تم البناء لكن لم يتم العثور على APK في المسار المتوقع" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📲 لتثبيت على الهاتف:" -ForegroundColor Cyan
Write-Host "   adb install $apkPath" -ForegroundColor White
