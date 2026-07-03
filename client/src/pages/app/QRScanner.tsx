import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, Scan, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function QRScanner() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [manualId, setManualId] = useState("");

  const { data: qrData, isLoading } = useQuery<{ qrData: string; userId: string; name: string; phone: string }>({
    queryKey: ["/api/user/my-qr"],
  });

  const copyQr = () => {
    if (qrData?.qrData) {
      navigator.clipboard.writeText(qrData.qrData);
      setCopied(true);
      toast({ title: "تم نسخ الكود" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startTransfer = (userId: string, name: string) => {
    navigate(`/app/transfer?receiverId=${userId}&receiverName=${encodeURIComponent(name)}`);
  };

  return (
    <div dir="rtl" className="p-4 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/home")}>
          <ArrowRight className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">كود QR</h1>
      </div>

        <Tabs defaultValue="my">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my">كودي</TabsTrigger>
            <TabsTrigger value="scan">مسح</TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 flex flex-col items-center gap-4">
                {isLoading ? (
                  <div className="w-48 h-48 bg-gray-100 rounded-lg animate-pulse" />
                ) : (
                  <>
                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                      <QRCodeSVG value={qrData?.qrData || ""} size={180} level="M" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-lg">{qrData?.name || "مستخدم"}</p>
                      <p className="text-sm text-gray-500">{qrData?.phone}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={copyQr} className="gap-2">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "تم النسخ" : "نسخ الكود"}
                    </Button>
                    <p className="text-xs text-gray-400 text-center">
                      اعرض هذا الكود للمسح والتحويل السريع
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scan" className="space-y-4">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 flex flex-col items-center gap-4">
                <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center">
                  <Scan className="h-16 w-16 text-gray-300" />
                </div>
                <p className="text-sm text-gray-500 text-center">
                  وجه الكاميرا لكود QR للتحويل السريع
                </p>
                <Button className="w-full" disabled>
                  فتح الكاميرا
                </Button>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="text-sm text-gray-500">أو أدخل معرف المستخدم يدوياً:</p>
              <div className="flex gap-2">
                <Input
                  placeholder="معرف المستخدم"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                />
                <Button
                  onClick={() => startTransfer(manualId, "مستخدم")}
                  disabled={!manualId}
                >
                  تحويل
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
    </div>
  );
}
