import { Navigate } from "react-router-dom";
import { LogIn, ShieldAlert } from "lucide-react";

import PageLoader from "../components/PageLoader";
import { useAuth } from "../context/AuthContext";

const PORTAL_LOGIN_URL = "/login.html";

export default function LoginRequiredPage() {
  const { loading, isAuthenticated, hasBudgetAccess } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (isAuthenticated && !hasBudgetAccess) {
    return <Navigate to="/budget-access-denied" replace />;
  }

  if (isAuthenticated && hasBudgetAccess) {
    return <Navigate to="/" replace />;
  }

  function goToPortalLogin() {
    window.location.assign(PORTAL_LOGIN_URL);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-enterprise-bg px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary-50 to-transparent"
      />

      <section className="relative w-full max-w-lg overflow-hidden rounded-panel border border-enterprise-border bg-white shadow-card">
        <div className="border-b border-enterprise-border bg-slate-50/80 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-danger-50 text-danger-700">
              <ShieldAlert aria-hidden="true" size={25} />
            </span>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-danger-700">
                Authentication Required
              </p>

              <p className="mt-1 text-sm font-semibold text-enterprise-muted">
                Hospital portal login is required.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 text-center sm:px-8 sm:py-10">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Login Required
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-enterprise-muted sm:text-base">
            You must sign in through the hospital portal before you can access
            the Budget System.
          </p>

          <button
            type="button"
            onClick={goToPortalLogin}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100"
          >
            <LogIn aria-hidden="true" size={18} />
            Go to Portal Login
          </button>

          <p className="mt-5 text-xs font-semibold text-slate-400">
            After signing in, reopen the Budget System from the hospital portal.
          </p>
        </div>
      </section>
    </main>
  );
}