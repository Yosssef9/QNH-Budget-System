import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

export default function CollapsiblePanelToggle({
  isOpen,
  onToggle,
  openLabel = "Show Panel",
  closeLabel = "Hide Panel",
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="
        inline-flex items-center gap-2
        rounded-xl
        border border-primary-200
        bg-primary-50
        px-3 py-2
        text-sm font-semibold
        text-primary-700
        transition-all
        hover:bg-primary-100
        hover:shadow-soft
      "
    >
      {isOpen ? (
        <>
          <PanelLeftClose size={18} />
          <span>{closeLabel}</span>
        </>
      ) : (
        <>
          <PanelLeftOpen size={18} />
          <span>{openLabel}</span>
        </>
      )}
    </button>
  );
}
