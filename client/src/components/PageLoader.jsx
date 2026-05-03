// src/components/PageLoader.jsx
import { Loader2 } from "lucide-react";

export default function PageLoader({
  title = "Loading workspace",
  description = "Preparing your budget system data...",
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center font-sans">
      <div className="flex flex-col items-center text-center">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary-50" />

          <Loader2 className="relative h-8 w-8 animate-spin text-primary-700" />
        </div>

        <h2 className="mt-5 text-base font-medium tracking-tight text-enterprise-text">
          {title}
        </h2>

        <p className="mt-2 max-w-xs text-sm leading-6 text-enterprise-muted">
          {description}
        </p>
      </div>
    </div>
  );
}
