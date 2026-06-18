import { formatCompactSAR, formatSAR } from "../utils/formatters";

export default function CurrencyText({
  value,
  compact = false,
  className = "",
  currencyClassName = "",
  valueClassName = "",
}) {
  return (
    <span className={`inline-flex items-baseline gap-1 ${className}`}>
      <span
        className={`text-[9px] font-semibold uppercase text-slate-400 ${currencyClassName}`}
      >
        SAR
      </span>

      <span className={valueClassName}>
        {compact ? formatCompactSAR(value) : formatSAR(value)}
      </span>
    </span>
  );
}
