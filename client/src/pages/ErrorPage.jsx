import {
  AlertTriangle,
  ArrowLeft,
  Home,
  RefreshCcw,
} from "lucide-react";
import { Link, useNavigate, useRouteError } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  const status = error?.status || 404;

  const title =
    status === 404
      ? "Page Not Found"
      : status === 403
        ? "Access Denied"
        : "Something Went Wrong";

  const description =
    status === 404
      ? "The page you are looking for does not exist or may have been moved."
      : status === 403
        ? "You do not have permission to access this page."
        : error?.statusText ||
          error?.message ||
          "An unexpected error occurred.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl sm:p-12">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-red-50 text-red-600 shadow-sm">
            <AlertTriangle size={42} />
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-red-600">
            Error {status}
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">
            {title}
          </h1>

          <p className="mt-4 max-w-lg text-base leading-7 text-slate-500">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
              Go Back
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
            >
              <RefreshCcw size={18} />
              Refresh
            </button>

            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              <Home size={18} />
              Dashboard
            </Link>
          </div>

          {import.meta.env.DEV && error && (
            <div className="enterprise-scrollbar mt-10 w-full overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-5 text-left">
              <pre className="text-xs leading-6 text-red-300">
                {JSON.stringify(error, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}