
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
const appBaseUrl = import.meta.env.BASE_URL;
export default function CompanySelectionPage() {
  const handleSelectCompany = (company) => {
    localStorage.setItem("selectedCompany", JSON.stringify(company));
    window.location.reload();
  };

  const companies = [
    {
      id: "qnh",
      name: "Qassim National Hospital",
      subtitle: "Hospital Budget Management System",
     logo: `${appBaseUrl}companies/qnh-logo.png`,
      badge: "Healthcare",
    },
    {
      id: "qh",
      name: "Al-Qassim Medical Services Company",
      subtitle: "Corporate Budget Management System",
     logo: `${appBaseUrl}companies/qc-logo-removebg-preview.png`,
      badge: "Corporate",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_35%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,#e0e7ff,transparent_35%)]" />

      <div className="relative mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <img
            src={`${appBaseUrl}images/logo.png`}
            alt="QNH"
            className="mx-auto h-24 w-auto"
          />

          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2">
            <ShieldCheck size={16} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              Secure Multi-Company Platform
            </span>
          </div>

          <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-700">
            Budget Management Platform
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            Select the organization you want to manage and continue to your
            workspace.
          </p>
        </div>

        {/* Company Cards */}
        <div className="mx-auto mt-14 grid max-w-6xl gap-8 lg:grid-cols-2">
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => handleSelectCompany(company)}
              className="
                group
                relative
                overflow-hidden
                rounded-3xl
                border
                border-slate-200
                bg-white
                text-left
                shadow-sm
                transition-all
                duration-300
                hover:-translate-y-2
                hover:border-blue-200
                hover:shadow-2xl
              "
            >
              {/* Hover Accent */}
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              {/* Logo Section */}
              <div className="flex h-56 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-10">
                <img
                  src={company.logo}
                  alt={company.name}
                  className="
                    max-h-36
                    w-auto
                    object-contain
                    transition-transform
                    duration-300
                    group-hover:scale-105
                  "
                />
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    <Building2 size={14} />
                    {company.badge}
                  </div>
                </div>

                <h2 className="mt-5 text-2xl font-bold text-slate-900">
                  {company.name}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {company.subtitle}
                </p>

                <div className="mt-8 flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Click to access workspace
                  </span>

                  <div
                    className="
                      flex
                      items-center
                      gap-2
                      rounded-xl
                      bg-blue-600
                      px-4
                      py-2
                      text-sm
                      font-semibold
                      text-white
                      transition-all
                      duration-300
                      group-hover:bg-blue-700
                    "
                  >
                    Enter Workspace
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Bottom Trust Section */}
        <div className="mt-16 rounded-3xl border border-slate-200 bg-white/70 p-6 backdrop-blur">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div>
              <h3 className="font-semibold text-slate-800">
                Budget Management Platform
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Unified budgeting, approvals, transfers and procurement
                management.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

              <span className="text-sm font-medium text-emerald-700">
                Developed by Information Technology Department
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
