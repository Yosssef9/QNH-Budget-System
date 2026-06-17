import { Link } from "react-router-dom";

export default function DashboardQuickActionCard({ action }) {
  const Icon = action.icon;

  return (
    <Link
      to={action.path}
      className="group rounded-xl border border-blue-200 bg-enterprise-soft p-5 transition hover:border-primary-200 hover:bg-primary-50"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary-700 shadow-soft">
          <Icon size={20} />
        </div>

        <div>
          <h4 className="text-sm font-medium text-enterprise-text group-hover:text-primary-700">
            {action.title}
          </h4>

          <p className="mt-1 text-sm leading-6 text-enterprise-muted">
            {action.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
