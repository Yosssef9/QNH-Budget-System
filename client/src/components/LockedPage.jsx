import { Lock } from "lucide-react";

export default function LockedPage({
  title = "Page Locked",
  message = "You cannot access this page right now.",
  reasons = [],
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
        <div className="flex gap-4">
          <div className="h-fit rounded-2xl bg-amber-100 p-3">
            <Lock size={26} className="text-amber-700" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-amber-900">{title}</h1>

            <p className="mt-2 text-amber-800">{message}</p>

            {reasons.length > 0 && (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-amber-800">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
