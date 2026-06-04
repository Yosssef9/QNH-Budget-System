import { forwardRef } from "react";
import { formatNumber } from "../utils/formatters";

const Input = forwardRef(
  (
    {
      label,
      error,
      type = "text",
      numberFormat = false,
      className = "",
      containerClassName = "",
      required = false,
      leftIcon,
      rightIcon,
      value,
      onChange,
      ...props
    },
    ref,
  ) => {
    const displayValue =
      numberFormat && value !== "" ? formatNumber(value) : value;

    return (
      <div className={containerClassName}>
        {label && (
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            {label}

            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={numberFormat ? "text" : type}
            value={displayValue ?? ""}
            onChange={(e) => {
              if (!numberFormat) {
                onChange?.(e);
                return;
              }

              const raw = e.target.value.replace(/,/g, "");

              onChange?.({
                ...e,
                target: {
                  ...e.target,
                  value: raw,
                },
              });
            }}
            {...props}
            className={`
              w-full
              rounded-2xl
              border
              bg-white
              p-3
              outline-none
              transition
              focus:ring-4
              focus:ring-blue-50
              ${
                error
                  ? "border-red-400"
                  : "border-slate-200 focus:border-blue-400"
              }
              ${leftIcon ? "pl-10" : ""}
              ${rightIcon ? "pr-10" : ""}
              ${className}
            `}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>

        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
