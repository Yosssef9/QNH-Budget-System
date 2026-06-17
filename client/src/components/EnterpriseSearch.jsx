import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

export default function EnterpriseSearch({
  value = "",
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  className = "",
  autoFocus = false,
  showClear = true,
  size = "md",
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (localValue === value) return;

    const timer = setTimeout(() => {
      onChange?.(localValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, value, debounceMs, onChange]);

  const sizeClasses = {
    sm: {
      container: "h-9",
      input: "text-sm",
      icon: 16,
      clear: 14,
    },
    md: {
      container: "h-11",
      input: "text-sm",
      icon: 18,
      clear: 16,
    },
    lg: {
      container: "h-12",
      input: "text-base",
      icon: 20,
      clear: 18,
    },
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`relative w-full ${className}`}>
      <Search
        size={currentSize.icon}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        autoFocus={autoFocus}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setLocalValue("");
          }
        }}
        placeholder={placeholder}
        className={`
          ${currentSize.container}
          ${currentSize.input}
          w-full
          rounded-xl
          border
          border-slate-300
          bg-white
          pl-10
          ${showClear ? "pr-10" : "pr-3"}
          outline-none
          transition
          focus:border-blue-400
          focus:ring-4
          focus:ring-blue-50
        `}
      />

      {showClear && localValue && (
        <button
          type="button"
          onClick={() => setLocalValue("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
        >
          <X size={currentSize.clear} />
        </button>
      )}
    </div>
  );
}
