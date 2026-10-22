import { Search } from "lucide-react";

/**
 * Shared CFO search field. Put focus styles on the outer label, rather than
 * the borderless input, so the whole search control receives the focus ring.
 */
export default function CfoSearchField({
  label,
  placeholder,
  value,
  onChange,
  className = "",
}) {
  return (
    <label
      className={`group flex min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-[border-color,box-shadow] duration-150 hover:border-slate-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 ${className}`}
    >
      <Search
        size={17}
        aria-hidden="true"
        className="shrink-0 text-slate-400 transition-colors group-focus-within:text-blue-600"
      />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="min-w-0 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
      />
    </label>
  );
}
