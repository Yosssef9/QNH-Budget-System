import { formatCompactSAR, formatSAR } from "../utils/formatters";

export default function CurrencyText({
  value,
  compact = false,
  className = "",
  currencyClassName = "",
  valueClassName = "",
}) {
  return (
    <span
      className={`inline-flex min-w-0 max-w-full flex-wrap items-baseline gap-x-1 ${className}`}
    >
      <span
        className={`text-[9px] font-semibold uppercase text-slate-400 ${currencyClassName}`}
      >
        SAR
      </span>

      <span className={`min-w-0 break-words [overflow-wrap:anywhere] ${valueClassName}`}>
        {compact ? formatCompactSAR(value) : formatSAR(value)}
      </span>
    </span>
  );
}
