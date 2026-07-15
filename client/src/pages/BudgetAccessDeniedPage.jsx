import { Navigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  RefreshCw,
  ShieldX,
} from "lucide-react";

import PageLoader from "../components/PageLoader";
import { useAuth } from "../context/AuthContext";

const PORTAL_LOGIN_URL = "/login.html";

export default function BudgetAccessDeniedPage() {
  const { loading, isAuthenticated, hasBudgetAccess } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login-required" replace />;
  }

  if (hasBudgetAccess) {
    return <Navigate to="/" replace />;
  }

  function checkAccessAgain() {
    /*
      A full navigation reruns the authentication bootstrap and requests
      the latest Budget System workspace assignments from /auth/me.
    */
    window.location.assign("/");
  }

  function returnToHospitalPortal() {
    window.location.assign(PORTAL_LOGIN_URL);
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-enterprise-bg px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary-50 to-transparent"
      />

      <section className="relative w-full max-w-2xl overflow-hidden rounded-panel border border-enterprise-border bg-white shadow-card">
        <div className="border-b border-enterprise-border bg-slate-50/80 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-danger-50 text-danger-700">
              <ShieldX aria-hidden="true" size={25} />
            </span>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-danger-700">
                Budget System Access
              </p>

              <p className="mt-1 text-sm font-semibold text-enterprise-muted">
                Your hospital portal session is active.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-8 sm:px-8 sm:py-10">
          <h1 className="max-w-xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            You Don&apos;t Have Access to the Budget System
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-enterprise-muted sm:text-base">
            You are signed in through the hospital portal, but your account
            does not currently have an active Budget System role or workspace
            assignment.
          </p>

          <div className="mt-7 rounded-2xl border border-primary-200 bg-primary-50 p-5">
            <div className="flex items-start gap-3">
              <Building2
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-primary-700"
                size={22}
              />

              <div>
                <h2 className="text-sm font-black text-slate-950">
                  Ask the Budget System administrator for access
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Provide your hospital portal username and the role you need,
                  such as HOD, Category Budget Manager, CFO, PO Link Manager,
                  or Budget System Administrator.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Signed in
              </p>

              <p className="mt-2 text-sm font-bold text-slate-900">
                Hospital portal authentication is valid.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                Access missing
              </p>

              <p className="mt-2 text-sm font-bold text-amber-950">
                No active Budget System assignment was found.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={returnToHospitalPortal}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200"
            >
              <ArrowLeft aria-hidden="true" size={17} />
              Return to Hospital Portal
            </button>

            <button
              type="button"
              onClick={checkAccessAgain}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100"
            >
              <RefreshCw aria-hidden="true" size={17} />
              Check Access Again
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}