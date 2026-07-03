import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, TrendingUp, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface SuggestionInputProps {
  field: string;
  contractType?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}

export default function SuggestionInput({
  field,
  contractType,
  value,
  onChange,
  placeholder,
  className,
  multiline,
}: SuggestionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(value), 200);
    return () => clearTimeout(timer);
  }, [value]);

  const { data: suggestionsData, isLoading } = useQuery<any>({
    queryKey: ["suggestions", field, debouncedQuery, contractType],
    queryFn: async () => {
      const params = new URLSearchParams({ field, q: debouncedQuery });
      if (contractType) params.set("type", contractType);
      const res = await apiRequest("GET", `/api/user/contracts/suggestions?${params}`);
      return res.json();
    },
    enabled: showSuggestions,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { field: string; value: string; contractType: string }) =>
      apiRequest("POST", "/api/user/contracts/suggestions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
    },
  });

  const allSuggestions = suggestionsData?.suggestions || [];

  // Filter: show suggestions that match the typed text
  const filteredSuggestions = allSuggestions.filter((s: any) => {
    if (!value || value.trim().length === 0) return true; // Show all when empty
    const sLower = s.value.toLowerCase();
    const vLower = value.toLowerCase();
    return sLower.includes(vLower);
  }).filter((s: any) => s.value.toLowerCase() !== value.toLowerCase());

  // Check if current value is NOT in suggestions (will be added as new)
  const isNewValue = value.trim().length >= 3 && 
    !allSuggestions.some((s: any) => s.value.toLowerCase() === value.toLowerCase());

  const handleBlur = () => {
    if (value.trim().length >= 3) {
      saveMutation.mutate({ field, value: value.trim(), contractType: contractType || "all" });
    }
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSuggestionClick = (suggestionValue: string) => {
    onChange(suggestionValue);
    setShowSuggestions(false);
    setHasInteracted(true);
  };

  const shouldShowDropdown = showSuggestions && (filteredSuggestions.length > 0 || isNewValue);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <div className="relative">
          {multiline ? (
            <textarea
              className={cn(
                "flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
              )}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => { setShowSuggestions(true); setHasInteracted(true); }}
              onBlur={handleBlur}
            />
          ) : (
            <>
              <Input
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => { setShowSuggestions(true); setHasInteracted(true); }}
                onBlur={handleBlur}
                className={cn(className)}
              />
              {shouldShowDropdown && (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 pointer-events-none" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {shouldShowDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {/* New value option (what user typed but doesn't exist) */}
          {isNewValue && value.trim().length >= 3 && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionClick(value.trim());
              }}
              className="w-full text-right px-3 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 border-b border-gray-100"
            >
              <Plus className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-green-600 font-medium">إضافة: "{value.trim()}"</span>
            </button>
          )}

          {/* Existing suggestions */}
          {filteredSuggestions.slice(0, 10).map((s: any, i: number) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionClick(s.value);
              }}
              className="w-full text-right px-3 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center justify-between gap-2"
            >
              <span className="text-gray-700 truncate flex-1">{s.value}</span>
              {s.usageCount > 50 ? (
                <span className="text-xs flex-shrink-0 flex items-center gap-0.5 text-orange-500">
                  <TrendingUp className="h-3 w-3" /> شائع
                </span>
              ) : s.usageCount > 10 ? (
                <span className="text-xs flex-shrink-0 text-green-500">✓ مستخدم</span>
              ) : null}
            </button>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="px-3 py-2 text-xs text-gray-400 text-center">جاري البحث...</div>
          )}
        </div>
      )}
    </div>
  );
}
