import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

export default function SearchableMultiSelect({
  name,
  value = "",
  values = [],
  onChange,
  options = [],
  error,
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  noResultsText = "No results found",
  getOptionLabel,
  getOptionValue,
  disabled = false,
  maxVisibleBadges = 2,
  disableClear = false,
  multiple = true,

  searchValue,
  onSearchChange,
  onLoadMore,
  hasMore = false,
  loading = false,
}) {
  const [open, setOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const dropdownRef = useRef(null);
  const selectedValues = multiple
    ? values
    : value !== "" && value !== null && value !== undefined
      ? [value]
      : [];

  const actualSearch = searchValue ?? localSearch;

  const optionLabel = (item) => {
    if (getOptionLabel) return getOptionLabel(item);
    return item.label || item.en || item.name || "";
  };

  const optionValue = (item) => {
    if (getOptionValue) return getOptionValue(item);
    return item.value;
  };

  const filteredOptions = useMemo(() => {
    if (onSearchChange) return options;

    const q = actualSearch.trim().toLowerCase();
    if (!q) return options;

    return options.filter((item) => {
      const label = String(optionLabel(item) || "").toLowerCase();
      const val = String(optionValue(item) || "").toLowerCase();
      const en = String(item.en || "").toLowerCase();
      const ar = String(item.ar || "").toLowerCase();

      return (
        label.includes(q) || val.includes(q) || en.includes(q) || ar.includes(q)
      );
    });
  }, [actualSearch, options, onSearchChange]);

  const selectedOptions = useMemo(() => {
    return options.filter((item) => selectedValues.includes(optionValue(item)));
  }, [options, selectedValues]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !wrapperRef.current?.contains(event.target) &&
        !dropdownRef.current?.contains(event.target)
      ) {
        setOpen(false);
        setLocalSearch("");
        onSearchChange?.("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onSearchChange]);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [open]);

  const emitChange = (nextValue) => {
    onChange({
      target: {
        name,
        value: nextValue,
      },
    });
  };

  const handleToggle = (selectedValue) => {
    if (!multiple) {
      // prevent clearing by selecting same value again
      if (disableClear && selectedValues.includes(selectedValue)) {
        setOpen(false);
        return;
      }

      emitChange(selectedValue);
      setOpen(false);
      return;
    }

    const exists = selectedValues.includes(selectedValue);

    if (exists) {
      emitChange(selectedValues.filter((v) => v !== selectedValue));
    } else {
      emitChange([...selectedValues, selectedValue]);
    }
  };

  const handleRemove = (selectedValue, e) => {
    e.stopPropagation();

    if (!multiple) {
      emitChange("");
      return;
    }

    emitChange(selectedValues.filter((v) => v !== selectedValue));
  };

  const clearAll = (e) => {
    e.stopPropagation();
    emitChange(multiple ? [] : "");
  };

  const handleSearchChange = (e) => {
    const nextSearch = e.target.value;

    if (onSearchChange) {
      onSearchChange(nextSearch);
    } else {
      setLocalSearch(nextSearch);
    }
  };

  const handleScroll = (e) => {
    const el = e.currentTarget;

    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;

    if (nearBottom && hasMore && !loading) {
      onLoadMore?.();
    }
  };
  useEffect(() => {
    if (!open || !wrapperRef.current) return;

    const updatePosition = () => {
      const rect = wrapperRef.current.getBoundingClientRect();

      const dropdownHeight = Math.min(
        dropdownRef.current?.offsetHeight || 300,
        300,
      );

      const gap = 8;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      const openUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      setDropdownStyle({
        position: "fixed",
        top: openUp
          ? Math.max(gap, rect.top - dropdownHeight - gap)
          : rect.bottom + gap,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    };
    updatePosition();

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);
  return (
    <div className="relative" ref={wrapperRef}>
      {" "}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`min-h-[46px] w-full rounded-[10px] border border-enterprise-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary-300 focus:ring-4 focus:ring-primary-50 ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        <div className="flex items-center justify-between gap-3 text-center">
          <div className="flex min-w-0 flex-1 items-center justify-center">
            {" "}
            {selectedOptions.length > 0 ? (
              multiple ? (
                <>
                  {selectedOptions.slice(0, maxVisibleBadges).map((item) => {
                    const itemValue = optionValue(item);

                    return (
                      <span
                        key={itemValue}
                        className="inline-flex max-w-full items-center gap-1 rounded-full border border-enterprise-border bg-enterprise-soft px-2.5 py-1 text-xs font-medium text-enterprise-text"
                      >
                        <span className="truncate">{optionLabel(item)}</span>

                        {!disableClear && (
                          <span
                            onClick={(e) => handleRemove(itemValue, e)}
                            className="cursor-pointer rounded-full p-[1px] hover:bg-primary-50"
                          >
                            <X className="h-3 w-3" />
                          </span>
                        )}
                      </span>
                    );
                  })}
                </>
              ) : (
                <span className="w-full text-center font-semibold text-slate-700">
                  {optionLabel(selectedOptions[0])}
                </span>
              )
            ) : (
              <span className="w-full text-center text-enterprise-muted">
                {placeholder}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedOptions.length > 0 && !disableClear && (
              <span
                onClick={clearAll}
                className="cursor-pointer text-xs font-semibold text-primary-700 hover:text-primary-800"
              >
                Clear
              </span>
            )}

            <ChevronDown
              className={`h-4 w-4 shrink-0 text-enterprise-muted transition duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </button>
      {createPortal(
        <AnimatePresence>
          {open && !disabled && (
            <motion.div
              ref={dropdownRef}
              style={dropdownStyle}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="origin-top overflow-hidden rounded-2xl border border-enterprise-border bg-white shadow-card"
            >
              <div className="border-b border-enterprise-border p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-enterprise-muted" />

                  <input
                    ref={searchInputRef}
                    type="text"
                    value={actualSearch}
                    onChange={handleSearchChange}
                    placeholder={searchPlaceholder}
                    className="h-11 w-full rounded-xl border border-enterprise-border bg-enterprise-soft pl-10 pr-3 text-left text-sm outline-none transition focus:border-primary-300 focus:bg-white focus:ring-4 focus:ring-primary-50"
                  />
                </div>
              </div>

              <div
                ref={listRef}
                onScroll={handleScroll}
                className="max-h-72 overflow-y-auto p-2"
              >
                {filteredOptions.length > 0
                  ? filteredOptions.map((item) => {
                      const itemValue = optionValue(item);
                      const isSelected = selectedValues.includes(itemValue);

                      return (
                        <button
                          key={itemValue}
                          type="button"
                          onClick={() => handleToggle(itemValue)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                            isSelected
                              ? "bg-primary-50 text-primary-700"
                              : "text-enterprise-text hover:bg-enterprise-soft"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded border transition ${
                                isSelected
                                  ? "border-primary-600 bg-primary-600 text-white"
                                  : "border-enterprise-border bg-white"
                              }`}
                            >
                              {isSelected && <Check className="h-3 w-3" />}
                            </span>

                            <span
                              className="text-left break-words whitespace-normal"
                              title={optionLabel(item)}
                            >
                              {optionLabel(item)}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  : !loading && (
                      <div className="px-3 py-4 text-sm text-enterprise-muted">
                        {noResultsText}
                      </div>
                    )}

                {loading && (
                  <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-enterprise-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                )}

                {!loading && hasMore && (
                  <div className="px-3 py-3 text-center text-xs text-enterprise-muted">
                    Scroll to load more
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
