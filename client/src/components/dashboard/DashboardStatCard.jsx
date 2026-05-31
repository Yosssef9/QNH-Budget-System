import { useNavigate } from "react-router-dom";
export default function DashboardStatCard({ item }) {
  const Icon = item.icon;
  const navigate = useNavigate();

  return (
    <div
      onClick={() => item.route && navigate(item.route)}
      className={`rounded-card border border-enterprise-border bg-white p-5 shadow-soft ${
        item.route
          ? "cursor-pointer transition-all hover:-translate-y-1 hover:border-primary-300 hover:shadow-lg"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-enterprise-muted">{item.title}</p>

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
