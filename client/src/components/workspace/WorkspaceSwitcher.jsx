import { BriefcaseBusiness } from "lucide-react";

export default function WorkspaceSwitcher({
  workspaces = [],
  activeWorkspace,
  onChange,
}) {
  if (!workspaces.length) return null;

  if (workspaces.length === 1) {
    return (
      <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm md:flex">
        <BriefcaseBusiness size={16} className="text-primary-700" />
        <span className="max-w-[260px] truncate">{activeWorkspace?.title}</span>
      </div>
    );
  }

  return (
    <label className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm md:flex">
      <BriefcaseBusiness size={16} className="text-primary-700" />
      <span className="whitespace-nowrap text-slate-500">Acting as</span>
      <select
        value={activeWorkspace?.id || ""}
        onChange={(event) => onChange(event.target.value)}
        className="max-w-[280px] bg-transparent text-sm font-bold text-slate-900 outline-none"
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.title}
          </option>
        ))}
      </select>
    </label>
  );
}

