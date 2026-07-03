import { createContext, useContext, useEffect } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AppSettings } from "@shared/schema";

interface SettingsContextType {
  settings: AppSettings | null;
  isLoading: boolean;
  currency: string;
  storeName: string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ["/api/settings"],
    staleTime: 1000 * 60 * 5,
  });

  const currency = settings?.currency || "ج.م";
  const storeName = settings?.storeName || "نظام المندوبين";

  // Dynamically update browser tab title
  useEffect(() => {
    if (settings?.siteTitle) {
      document.title = settings.siteTitle;
    }
  }, [settings?.siteTitle]);

  // Dynamically update favicon
  useEffect(() => {
    if (settings?.favicon) {
      // Update all favicon links
      const existingLinks = document.querySelectorAll("link[rel='icon'], link[rel='apple-touch-icon']");
      existingLinks.forEach((link) => {
        (link as HTMLLinkElement).href = settings.favicon!;
      });
      // Update og:image meta if desired
    }
  }, [settings?.favicon]);

  // Dynamically update meta description
  useEffect(() => {
    if (settings?.siteDescription) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", settings.siteDescription);
      }
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) {
        ogDesc.setAttribute("content", settings.siteDescription);
      }
    }
    if (settings?.siteTitle) {
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute("content", settings.siteTitle);
      }
    }
  }, [settings?.siteTitle, settings?.siteDescription]);

  return (
    <SettingsContext.Provider
      value={{
        settings: settings || null,
        isLoading,
        currency,
        storeName,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
