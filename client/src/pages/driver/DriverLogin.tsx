import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Truck, LogIn, Loader2, UserPlus, Phone, KeyRound, ArrowRight, MapPin, Search, ChevronDown, X, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getGovernorates, getCenters, getVillages } from "@shared/egyptLocations";

export default function DriverLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);

  // Login
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Register
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regGovernorate, setRegGovernorate] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regVillage, setRegVillage] = useState("");
  const [govSearch, setGovSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [villageSearch, setVillageSearch] = useState("");
  const [govOpen, setGovOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [villageOpen, setVillageOpen] = useState(false);
  const [regMaxWeight, setRegMaxWeight] = useState("");
  const [regStep, setRegStep] = useState<"form" | "verify">("form");
  const [regDriverId, setRegDriverId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  const governorates = useMemo(() => {
    const all = getGovernorates();
    return govSearch ? all.filter(g => g.includes(govSearch)) : all;
  }, [govSearch]);

  const cities = useMemo(() => {
    if (!regGovernorate) return [];
    const all = getCenters(regGovernorate);
    return citySearch ? all.filter(c => c.includes(citySearch)) : all;
  }, [regGovernorate, citySearch]);

  const villages = useMemo(() => {
    if (!regGovernorate || !regCity) return [];
    const all = getVillages(regGovernorate, regCity);
    return villageSearch ? all.filter(v => v.includes(villageSearch)) : all;
  }, [regGovernorate, regCity, villageSearch]);

  // Login verification
  const [loginStep, setLoginStep] = useState<"credentials" | "verify">("credentials");
  const [loginVerifyCode, setLoginVerifyCode] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: any = { username, password };
      if (loginStep === "verify") {
        body.verificationCode = loginVerifyCode;
      }
      const res = await fetch("/api/driver/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (data.requireVerification) {
        setLoginStep("verify");
        toast({ title: "تم إرسال رمز التحقق", description: "اطلب الرمز من الإدارة المسؤولة عنك" });
      } else {
        toast({ title: "تم تسجيل الدخول بنجاح" });
        navigate("/driver/dashboard");
      }
    } catch (error: any) {
      toast({ title: "فشل تسجيل الدخول", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regPhone || !regUsername || !regPassword) {
      toast({ title: "جميع الحقول مطلوبة", variant: "destructive" });
      return;
    }
    if (!regGovernorate) {
      toast({ title: "يرجى اختيار المحافظة", variant: "destructive" });
      return;
    }
    if (!regCity) {
      toast({ title: "يرجى اختيار المركز/المدينة", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/driver/register/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          whatsappPhone: regPhone,
          username: regUsername,
          password: regPassword,
          governorate: regGovernorate,
          city: regCity,
          village: regVillage || null,
          maxWeight: regMaxWeight || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setRegDriverId(data.driverId);
      setRegStep("verify");
      toast({ title: "تم إرسال رمز التحقق", description: "انتظر رمز التحقق على الواتساب" });
    } catch (error: any) {
      toast({ title: "فشل التسجيل", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      toast({ title: "أدخل الرمز المكون من 6 أرقام", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/driver/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: regDriverId, code: verifyCode }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "تم تفعيل الحساب بنجاح!" });
      navigate("/driver/dashboard");
    } catch (error: any) {
      toast({ title: "فشل التحقق", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">بوابة مندوب الشحن</CardTitle>
          <CardDescription>سجل دخولك أو أنشئ حساب جديد</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" className="gap-1"><LogIn className="h-3 w-3" /> تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="register" className="gap-1"><UserPlus className="h-3 w-3" /> حساب جديد</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                {loginStep === "credentials" ? (
                  <>
                    <div className="space-y-2">
                      <Label>اسم المستخدم</Label>
                      <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="أدخل اسم المستخدم" dir="ltr" required />
                    </div>
                    <div className="space-y-2">
                      <Label>كلمة المرور</Label>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة المرور" dir="ltr" required />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center">
                      <KeyRound className="h-10 w-10 mx-auto text-primary mb-2" />
                      <p className="text-sm text-muted-foreground">تم إرسال رمز التحقق إلى الإدارة المسؤولة عنك</p>
                      <p className="text-xs text-muted-foreground mt-1">اطلب الرمز من الأدمن ثم أدخله هنا</p>
                    </div>
                    <div className="flex justify-center" dir="ltr">
                      <InputOTP maxLength={6} value={loginVerifyCode} onChange={(val) => setLoginVerifyCode(val)}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => { setLoginStep("credentials"); setLoginVerifyCode(""); }}
                    >
                      <ArrowRight className="h-3 w-3 ml-1" /> العودة لتسجيل الدخول
                    </Button>
                  </div>
                )}
                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                  {loginStep === "verify" ? "تأكيد الرمز" : "تسجيل الدخول"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              {regStep === "form" ? (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div className="space-y-2">
                    <Label>الاسم الكامل</Label>
                    <Input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="أحمد محمد" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Phone className="h-3 w-3" /> رقم الواتساب</Label>
                    <Input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" required />
                    <p className="text-xs text-muted-foreground">سيتم إرسال رمز التحقق على هذا الرقم عبر الواتساب</p>
                  </div>

                  {/* Location Picker */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> المحافظة <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <div
                        className="flex items-center justify-between w-full h-10 px-3 border rounded-md cursor-pointer bg-background hover:bg-muted/50 transition-colors"
                        onClick={() => { setGovOpen(!govOpen); setCityOpen(false); setVillageOpen(false); }}
                      >
                        <span className={regGovernorate ? "text-foreground" : "text-muted-foreground text-sm"}>
                          {regGovernorate || "اختر المحافظة"}
                        </span>
                        <div className="flex items-center gap-1">
                          {regGovernorate && (
                            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" onClick={(e) => {
                              e.stopPropagation();
                              setRegGovernorate(""); setRegCity(""); setRegVillage("");
                              setGovSearch(""); setCitySearch(""); setVillageSearch("");
                            }} />
                          )}
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      {govOpen && (
                        <div className="absolute z-50 top-full mt-1 w-full bg-background border rounded-md shadow-lg">
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="ابحث عن المحافظة..."
                                value={govSearch}
                                onChange={(e) => setGovSearch(e.target.value)}
                                className="h-8 pr-7 text-sm"
                                autoFocus
                              />
                            </div>
                          </div>
                          <ScrollArea className="max-h-48">
                            {governorates.length === 0 ? (
                              <div className="p-3 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
                            ) : (
                              governorates.map(g => (
                                <div
                                  key={g}
                                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted/80 transition-colors ${g === regGovernorate ? "bg-primary/10 text-primary font-medium" : ""}`}
                                  onClick={() => {
                                    setRegGovernorate(g);
                                    setRegCity(""); setRegVillage("");
                                    setCitySearch(""); setVillageSearch("");
                                    setGovOpen(false); setGovSearch("");
                                  }}
                                >
                                  {g}
                                </div>
                              ))
                            )}
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> المركز / المدينة <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <div
                        className={`flex items-center justify-between w-full h-10 px-3 border rounded-md bg-background transition-colors ${regGovernorate ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"}`}
                        onClick={() => { if (regGovernorate) { setCityOpen(!cityOpen); setGovOpen(false); setVillageOpen(false); } }}
                      >
                        <span className={regCity ? "text-foreground" : "text-muted-foreground text-sm"}>
                          {regCity || "اختر المركز / المدينة"}
                        </span>
                        <div className="flex items-center gap-1">
                          {regCity && (
                            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" onClick={(e) => {
                              e.stopPropagation();
                              setRegCity(""); setRegVillage(""); setCitySearch(""); setVillageSearch("");
                            }} />
                          )}
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      {cityOpen && (
                        <div className="absolute z-50 top-full mt-1 w-full bg-background border rounded-md shadow-lg">
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="ابحث عن المركز..."
                                value={citySearch}
                                onChange={(e) => setCitySearch(e.target.value)}
                                className="h-8 pr-7 text-sm"
                                autoFocus
                              />
                            </div>
                          </div>
                          <ScrollArea className="max-h-48">
                            {cities.length === 0 ? (
                              <div className="p-3 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
                            ) : (
                              cities.map(c => (
                                <div
                                  key={c}
                                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted/80 transition-colors ${c === regCity ? "bg-primary/10 text-primary font-medium" : ""}`}
                                  onClick={() => {
                                    setRegCity(c);
                                    setRegVillage(""); setVillageSearch("");
                                    setCityOpen(false); setCitySearch("");
                                  }}
                                >
                                  {c}
                                </div>
                              ))
                            )}
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><MapPin className="h-3 w-3" /> القرية / الحي <span className="text-xs text-muted-foreground">(اختياري)</span></Label>
                    <div className="relative">
                      <div
                        className={`flex items-center justify-between w-full h-10 px-3 border rounded-md bg-background transition-colors ${regCity ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"}`}
                        onClick={() => { if (regCity) { setVillageOpen(!villageOpen); setGovOpen(false); setCityOpen(false); } }}
                      >
                        <span className={regVillage ? "text-foreground" : "text-muted-foreground text-sm"}>
                          {regVillage || "اختر القرية / الحي"}
                        </span>
                        <div className="flex items-center gap-1">
                          {regVillage && (
                            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" onClick={(e) => {
                              e.stopPropagation();
                              setRegVillage(""); setVillageSearch("");
                            }} />
                          )}
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                      {villageOpen && (
                        <div className="absolute z-50 top-full mt-1 w-full bg-background border rounded-md shadow-lg">
                          <div className="p-2 border-b">
                            <div className="relative">
                              <Search className="absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                              <Input
                                placeholder="ابحث عن القرية..."
                                value={villageSearch}
                                onChange={(e) => setVillageSearch(e.target.value)}
                                className="h-8 pr-7 text-sm"
                                autoFocus
                              />
                            </div>
                          </div>
                          <ScrollArea className="max-h-48">
                            {villages.length === 0 ? (
                              <div className="p-3 text-center text-sm text-muted-foreground">لا توجد نتائج</div>
                            ) : (
                              villages.map(v => (
                                <div
                                  key={v}
                                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-muted/80 transition-colors ${v === regVillage ? "bg-primary/10 text-primary font-medium" : ""}`}
                                  onClick={() => {
                                    setRegVillage(v);
                                    setVillageOpen(false); setVillageSearch("");
                                  }}
                                >
                                  {v}
                                </div>
                              ))
                            )}
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Selected location summary */}
                  {regGovernorate && (
                    <div className="bg-muted/50 rounded-md p-2 text-xs text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{regGovernorate}{regCity ? ` - ${regCity}` : ""}{regVillage ? ` - ${regVillage}` : ""}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>اسم المستخدم</Label>
                    <Input value={regUsername} onChange={(e) => setRegUsername(e.target.value)} placeholder="ahmed123" dir="ltr" required />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور</Label>
                    <Input type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} placeholder="كلمة مرور قوية" dir="ltr" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Weight className="h-3 w-3" /> أقصى وزن للشحن (كجم)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={regMaxWeight}
                      onChange={(e) => setRegMaxWeight(e.target.value)}
                      placeholder="مثال: 25"
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">حدد أقصى وزن يمكنك نقله بالكيلوجرام</p>
                  </div>
                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                    إنشاء الحساب
                  </Button>
                </form>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="space-y-2">
                    <KeyRound className="h-12 w-12 mx-auto text-primary" />
                    <h3 className="font-bold text-lg">رمز التحقق</h3>
                    <p className="text-sm text-muted-foreground">
                      أدخل الرمز المكون من 6 أرقام الذي سيصلك على الواتساب
                    </p>
                  </div>
                  <div className="flex justify-center" dir="ltr">
                    <InputOTP maxLength={6} value={verifyCode} onChange={setVerifyCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button onClick={handleVerify} className="w-full gap-2" disabled={loading || verifyCode.length !== 6}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    تأكيد الرمز
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setRegStep("form")}>
                    العودة
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
