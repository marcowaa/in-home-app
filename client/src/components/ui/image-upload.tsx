import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, ImagePlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Compress image client-side before upload
async function compressImage(file: File, maxWidth = 1920, quality = 0.85): Promise<File> {
  // Skip non-image or SVG files
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;
  // Skip small files (< 500KB)
  if (file.size < 500 * 1024) return file;
  
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  className?: string;
  previewClassName?: string;
  label?: string;
  /** If true, shows a compact version (smaller preview) */
  compact?: boolean;
  /** Custom endpoint URL for upload */
  uploadUrl?: string;
  /** Field name in FormData */
  fieldName?: string;
  /** Max file size in MB */
  maxSizeMB?: number;
}

const ACCEPTED_TYPES = "image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/bmp,image/tiff,image/heic,image/heif";
const ACCEPTED_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg|bmp|tiff|tif|heic|heif|avif)$/i;

export function ImageUpload({
  value,
  onChange,
  onRemove,
  className,
  previewClassName,
  label,
  compact = false,
  uploadUrl = "/api/upload",
  fieldName = "image",
  maxSizeMB = 15,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file) return;

      // Validate file type
      if (!ACCEPTED_EXTENSIONS.test(file.name) && !file.type.startsWith("image/")) {
        toast({ title: "نوع الملف غير مدعوم", description: "يُسمح بـ JPG, PNG, GIF, WEBP, SVG, BMP, TIFF, HEIC", variant: "destructive" });
        return;
      }

      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({ title: "الملف كبير جداً", description: `الحد الأقصى ${maxSizeMB} ميجابايت`, variant: "destructive" });
        return;
      }

      setIsUploading(true);
      setProgress(10);
      setUploadDone(false);

      try {
        // Compress image
        setProgress(20);
        const compressed = await compressImage(file);
        setProgress(40);

        const formData = new FormData();
        formData.append(fieldName, compressed);

        // Use XMLHttpRequest for progress tracking
        const result = await new Promise<{ url: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", uploadUrl);
          xhr.withCredentials = true;
          
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = 40 + Math.round((e.loaded / e.total) * 50);
              setProgress(pct);
            }
          };
          
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch {
                reject(new Error("استجابة غير صالحة من الخادم"));
              }
            } else {
              try {
                const err = JSON.parse(xhr.responseText);
                reject(new Error(err.message || `فشل الرفع (${xhr.status})`));
              } catch {
                reject(new Error(`فشل الرفع (${xhr.status})`));
              }
            }
          };
          
          xhr.onerror = () => reject(new Error("فشل الاتصال بالخادم"));
          xhr.send(formData);
        });

        setProgress(100);
        setUploadDone(true);
        onChange(result.url);
        
        // Reset success state after a moment
        setTimeout(() => setUploadDone(false), 1500);
      } catch (error: any) {
        console.error("Upload error:", error);
        toast({ title: "فشل رفع الصورة", description: error.message || "حدث خطأ أثناء الرفع", variant: "destructive" });
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [onChange, toast, uploadUrl, fieldName, maxSizeMB]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleRemove = () => {
    if (value && value.startsWith("/uploads/")) {
      fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
        credentials: "include",
      }).catch(() => {});
    }
    onRemove?.();
    onChange("");
  };

  if (value) {
    return (
      <div className={cn("relative inline-block group", className)}>
        <img
          src={value}
          alt={label || "صورة"}
          className={cn(
            "object-cover rounded-lg border transition-all",
            compact ? "h-16 w-16" : "w-full h-32",
            previewClassName
          )}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%23999' font-size='12'%3Eخطأ%3C/text%3E%3C/svg%3E";
          }}
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
          onClick={handleRemove}
          aria-label="حذف الصورة"
        >
          <X className="h-3 w-3" />
        </Button>
        {uploadDone && (
          <div className="absolute inset-0 bg-green-500/20 rounded-lg flex items-center justify-center animate-in fade-in duration-300">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label || "رفع صورة"}
      className={cn(
        "relative border-2 border-dashed rounded-lg transition-all cursor-pointer",
        dragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
        compact ? "h-16 w-16" : "h-32 w-full",
        isUploading && "pointer-events-none",
        className
      )}
      onClick={() => !isUploading && fileInputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileSelect}
      />
      <div className="flex flex-col items-center justify-center h-full gap-1 text-muted-foreground">
        {isUploading ? (
          <div className="flex flex-col items-center gap-2 w-full px-4">
            <Loader2 className={cn("animate-spin text-primary", compact ? "h-5 w-5" : "h-6 w-6")} />
            {!compact && (
              <>
                <Progress value={progress} className="h-1.5 w-full max-w-[120px]" />
                <span className="text-[10px]">{progress}%</span>
              </>
            )}
          </div>
        ) : (
          <>
            <Upload className={cn("transition-transform", compact ? "h-4 w-4" : "h-6 w-6")} />
            {!compact && (
              <span className="text-xs text-center px-2">
                {label || "اضغط أو اسحب صورة هنا"}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface MultiImageUploadProps {
  values: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export function MultiImageUpload({
  values,
  onChange,
  maxImages = 6,
}: MultiImageUploadProps) {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { toast } = useToast();

  const handleUpload = async (file: File, index: number) => {
    if (!file) return;
    if (!ACCEPTED_EXTENSIONS.test(file.name) && !file.type.startsWith("image/")) {
      toast({ title: "نوع الملف غير مدعوم", variant: "destructive" });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast({ title: "الملف كبير جداً (الحد 15MB)", variant: "destructive" });
      return;
    }

    setUploadingIndex(index);
    try {
      // Compress image before upload
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `فشل الرفع (${res.status})`);
      }
      const data = await res.json();

      const newValues = [...values];
      // Ensure array is large enough
      while (newValues.length <= index) newValues.push("");
      newValues[index] = data.url;
      onChange(newValues.filter((v) => v !== ""));
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ title: "فشل رفع الصورة", description: error.message, variant: "destructive" });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemove = (index: number) => {
    const url = values[index];
    if (url && url.startsWith("/uploads/")) {
      fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        credentials: "include",
      }).catch(() => {});
    }
    const newValues = values.filter((_, i) => i !== index);
    onChange(newValues);
  };

  // Build slots: existing images + empty slots up to maxImages
  const slots = [...values];
  while (slots.length < maxImages) slots.push("");

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {slots.map((img, index) => (
        <div key={index} className="space-y-1">
          <div className="relative">
            {img ? (
              <div className="relative">
                <img
                  src={img}
                  alt={`صورة ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-lg border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23f0f0f0' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%23999' font-size='12'%3Eخطأ%3C/text%3E%3C/svg%3E";
                  }}
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 left-1 h-6 w-6"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
                {index === 0 && (
                  <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-md">
                    الرئيسية
                  </span>
                )}
              </div>
            ) : (
              <div
                className="w-full aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center bg-muted/30 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRefs.current[index]?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleUpload(file, index);
                }}
              >
                {uploadingIndex === index ? (
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">رفع صورة</span>
                  </>
                )}
                <input
                  ref={(el) => { fileInputRefs.current[index] = el; }}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, index);
                    e.target.value = "";
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
