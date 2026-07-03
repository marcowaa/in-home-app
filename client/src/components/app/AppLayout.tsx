import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import BottomNav from "./BottomNav";
import ContractAdvisorButton from "./ContractAdvisorButton";

export default function AppLayout({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const { data: authData, isLoading } = useQuery<any>({
    queryKey: ["/api/user/auth/check"],
    retry: false,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!isLoading && !authData?.loggedIn) {
      navigate("/app");
    }
  }, [authData, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!authData?.loggedIn) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <div className="max-w-[480px] mx-auto min-h-screen bg-white shadow-xl relative pb-20">
        {children}
        <BottomNav />
        <ContractAdvisorButton />
      </div>
    </div>
  );
}
