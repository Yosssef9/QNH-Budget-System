import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, X } from "lucide-react";
import {
  getWorkspaceRoleLabel,
  getWorkspaceScopeLabel,
} from "../helpers/workspaceLabels";

const workspaceGroups = [
  { type: "DEPARTMENT", title: "Department Workspaces" },
  { type: "CATEGORY", title: "Category Workspaces" },
  { type: "GLOBAL", title: "Global Workspaces" },
];

function getFocusableElements(container) {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export default function WorkspaceSelectionDialog({
  open,
  workspaces = [],
  selectedWorkspaceId,
  switching = false,
  requireSelection = false,
  onSelect,
  onClose,
  returnFocusRef,
}) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const groupedWorkspaces = useMemo(() => {
    return workspaceGroups.map((group) => ({
      ...group,
      items: workspaces.filter((workspace) => workspace.type === group.type),
    }));
  }, [workspaces]);

  useEffect(() => {
    if (!open) return undefined;

    const previousActiveElement = document.activeElement;
    const returnFocusElement = returnFocusRef?.current;
    const timerId = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
      const target = returnFocusElement || previousActiveElement;
      target?.focus?.();
    };
  }, [open, returnFocusRef]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape" && !requireSelection && !switching) {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(dialogRef.current);
      if (!focusableElements.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open, requireSelection, switching]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999]">
      <button
        type="button"
        aria-label="Close workspace selection"
        className="absolute inset-0 h-full w-full bg-slate-950/45 backdrop-blur-[2px]"
        onClick={() => {
          if (!requireSelection && !switching) {
            onClose?.();
          }
        }}
      />

      <div className="relative flex min-h-full items-stretch justify-center p-0 sm:items-center sm:p-4">
        <section
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="workspace-selection-title"
          className="relative flex h-screen w-full flex-col bg-white shadow-2xl sm:h-auto sm:max-h-[86vh] sm:max-w-2xl sm:rounded-2xl"
        >
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <h2
                id="workspace-selection-title"
                className="text-lg font-bold text-slate-950"
              >
                Switch Workspace
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500">
                Choose the role and scope for this session.
              </p>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              disabled={requireSelection || switching}
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Close workspace selection"
            >
              <X size={20} />
            </button>
          </header>

          <div className="enterprise-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="space-y-6">
              {groupedWorkspaces.map((group) =>
                group.items.length ? (
                  <section key={group.type}>
                    <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      {group.title}
                    </h3>

                    <div className="mt-3 space-y-2">
                      {group.items.map((workspace) => {
                        const isSelected =
                          Number(workspace.userRoleId) ===
                          Number(selectedWorkspaceId);

                        return (
                          <button
                            key={workspace.userRoleId}
                            type="button"
                            disabled={switching || isSelected}
                            aria-selected={isSelected}
                            onClick={() => onSelect?.(workspace.userRoleId)}
                            className={[
                              "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition",
                              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
                              isSelected
                                ? "border-primary-300 bg-primary-50"
                                : "border-slate-200 bg-white hover:border-primary-200 hover:bg-primary-50/60",
                              switching ? "cursor-wait opacity-70" : "",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                                isSelected
                                  ? "text-primary-700"
                                  : "text-slate-300",
                              ].join(" ")}
                              aria-hidden="true"
                            >
                              {isSelected ? <CheckCircle2 size={20} /> : null}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold text-slate-950">
                                {getWorkspaceRoleLabel(workspace)}
                              </span>
                              <span className="mt-1 block break-words text-sm font-medium text-slate-600">
                                {getWorkspaceScopeLabel(workspace)}
                              </span>
                              {isSelected && (
                                <span className="mt-2 block text-xs font-bold text-primary-700">
                                  Currently selected
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null,
              )}
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
