import { useNavigate } from "react-router-dom";
export default function DashboardStatCard({ item }) {
  const Icon = item.icon;
  const navigate = useNavigate();

  return (
    <div
      onClick={() => item.route && navigate(item.route)}
      className={`
    rounded-card border p-5 shadow-soft
    ${
      item.highlight === "pending"
        ? "border-amber-300 bg-amber-50/60 shadow-md"
        : "border-enterprise-border bg-white"
    }
    ${
      item.route
        ? "cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg"
        : ""
    }
  `}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-enterprise-muted">{item.title}</p>
          {item.highlight === "pending" && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100 px-2 py-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span className="text-[10px] font-bold uppercase text-amber-700">
                Action Required
              </span>
            </div>
          )}
          <div className="mt-3 text-2xl font-semibold tracking-tight text-enterprise-text">
            {item.value}
          </div>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
          <Icon size={22} />
        </div>
      </div>

      <p className="mt-4 text-sm leading-6 text-enterprise-muted">
        {item.description}
      </p>
    </div>
  );
}
