import { Loader2, Wallet, Calculator } from "lucide-react";

export default function LoadingSpinner({
  title = "Loading...",
  subtitle = "Please wait",
  fullPage = false,
  fill = false,
}) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-blue-100" />

        <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-blue-100 bg-white shadow-sm">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="rounded-xl bg-blue-50 p-3">
          <Wallet size={18} className="text-blue-600" />
        </div>

        <div className="rounded-xl bg-emerald-50 p-3">
          <Calculator size={18} className="text-emerald-600" />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>

        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        {content}
      </div>
    );
  }

  if (fill) {
    return (
      <div className="flex h-full min-h-[320px] w-full items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      {content}
    </div>
  );
}
