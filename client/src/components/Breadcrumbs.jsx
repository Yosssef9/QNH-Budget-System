import { ChevronRight, Home } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useUnsavedChanges } from "../context/UnsavedChangesContext";

const routeLabels = {
  "/": "Dashboard",

  "/budgets": "Budgets",
  "/budgets/entry": "Budget Entry",
  "/budgets/import": "Import Excel",
  "/budgets/history": "Budget History",
  "/budgets/returned": "Returned Budgets",
  "/budgets/my": "My Budgets",
  "/budget-approval": "Budget Approvals",

  "/transfers/requests": "Transfer Requests",
  "/transfers/approvals": "Transfer Approvals",

  "/reports": "Reports",

  "/admin/users": "User Access",
  "/admin/budget-setup": "Budget Configuration",
  "/financial-years": "Financial Years",
};

function buildBreadcrumbs(pathname) {
  if (pathname === "/") {
    return [{ label: "Dashboard", path: "/" }];
  }

  const parts = pathname.split("/").filter(Boolean);

  const crumbs = [
    {
      label: "Dashboard",
      path: "/",
    },
  ];

  let currentPath = "";

  parts.forEach((part) => {
    currentPath += `/${part}`;

    crumbs.push({
      label:
        routeLabels[currentPath] ||
        part
          .replaceAll("-", " ")
          .replace(/\b\w/g, (char) => char.toUpperCase()),
      path: currentPath,
    });
  });

  return crumbs;
}

export default function Breadcrumbs({ items, rightContent }) {
  const location = useLocation();
  const { safeNavigate } = useUnsavedChanges();

  const breadcrumbs = items || buildBreadcrumbs(location.pathname);

  if (!breadcrumbs.length) return null;

  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1 text-sm"
      >
        {breadcrumbs.map((item, index) => {
          const isFirst = index === 0;
          const isLast = index === breadcrumbs.length - 1;

          return (
            <div
              key={item.path || item.label}
              className="flex items-center gap-1"
            >
              {index > 0 && (
                <ChevronRight size={15} className="text-enterprise-muted" />
              )}

              {isLast ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 font-semibold text-primary-700">
                  {isFirst && <Home size={14} />}
                  {item.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => safeNavigate(item.path)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-enterprise-muted transition hover:bg-enterprise-soft hover:text-primary-700"
                >
                  {isFirst && <Home size={14} />}
                  {item.label}
                </button>
              )}
            </div>
          );
        })}
      </nav>

      {rightContent}
    </div>
  );
}
