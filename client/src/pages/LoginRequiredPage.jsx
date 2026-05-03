import { ShieldAlert } from "lucide-react";

export default function LoginRequiredPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-enterprise-bg px-4">
      <div className="w-full max-w-md rounded-panel border border-enterprise-border bg-white p-8 text-center shadow-card">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-50 text-danger-700">
          <ShieldAlert size={28} />
        </div>

        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Login Required
        </h1>

        <p className="mt-3 text-sm leading-6 text-enterprise-muted">
          You must login from the hospital portal first before accessing the
          Budget System.
        </p>

        <button
          onClick={() => {
            window.location.href = "/login.html";
          }}
          className="mt-6 w-full rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-700"
        >
          Go to Portal Login
        </button>
      </div>
    </div>
  );
}
