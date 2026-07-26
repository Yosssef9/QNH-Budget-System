// import { useNavigate } from "react-router-dom";
// export default function DashboardStatCard({ item }) {
//   const Icon = item.icon;
//   const navigate = useNavigate();

//   return (
//     <div
//       onClick={() => item.route && navigate(item.route)}
//       className={`
//     flex h-full flex-col
//     rounded-card border p-5 shadow-soft
//     ${
//       item.highlight === "pending"
//         ? "border-amber-300 bg-amber-50/60 shadow-md"
//         : "border-blue-200 bg-white"
//     }
//     ${
//       item.route
//         ? "cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg"
//         : ""
//     }
//   `}
//     >
//       <div className="flex items-start justify-between gap-4">
//         <div>
//           <p className="text-sm text-enterprise-muted">{item.title}</p>
//           {item.highlight === "pending" && (
//             <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100 px-2 py-1">
//               <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
//               <span className="text-[10px] font-bold uppercase text-amber-700">
//                 Action Required
//               </span>
//             </div>
//           )}
//           <div className="mt-3 text-2xl font-semibold tracking-tight text-enterprise-text">
//             {item.value}
//           </div>
//         </div>

//         <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
//           <Icon size={22} />
//         </div>
//       </div>

//       <p className="mt-auto pt-4 text-sm leading-6 text-enterprise-muted">
//         {item.description}
//       </p>
//     </div>
//   );
// }

import { useNavigate } from "react-router-dom";

export default function DashboardStatCard({ item }) {
  const Icon = item.icon;
  const navigate = useNavigate();
  const requiresAction = item.highlight === "pending";

  return (
    <div
      onClick={() => item.route && navigate(item.route)}
      className={[
        "flex h-full min-h-[150px] flex-col rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200",
        requiresAction
          ? "border-amber-600 bg-amber-300/30 shadow-md"
          : "border-blue-200 bg-white",
        item.route
          ? requiresAction
            ? "cursor-pointer hover:-translate-y-1 hover:border-amber-700 hover:bg-amber-100 hover:shadow-lg"
            : "cursor-pointer hover:-translate-y-1 hover:border-blue-300 hover:bg-slate-50 hover:shadow-lg"
          : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-bold tracking-tight text-slate-950">
            {item.value}
          </div>

          <h3
            className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-slate-
            700"
          >
            {item.title}
          </h3>
        </div>

        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            requiresAction
              ? "bg-amber-100 text-amber-700"
              : "bg-primary-50 text-primary-700",
          ].join(" ")}
        >
          <Icon size={18} />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            requiresAction ? "bg-amber-600" : "bg-emerald-600",
          ].join(" ")}
        />

        <span
          className={[
            "text-[11px] font-bold uppercase tracking-[0.14em]",
            requiresAction ? "text-amber-700" : "text-slate-500",
          ].join(" ")}
        >
          {requiresAction ? "Action Required" : "Current"}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
        {item.description}
      </p>
    </div>
  );
}

// import { useNavigate } from "react-router-dom";

// export default function DashboardStatCard({ item }) {
//   const Icon = item.icon;
//   const navigate = useNavigate();
//   const requiresAction = item.highlight === "pending";

//   return (
//     <div
//       onClick={() => item.route && navigate(item.route)}
//       className={[
//         "group rounded-2xl border bg-white p-5 shadow-sm transition-colors",
//         requiresAction ? "border-amber-300 bg-amber-50/30" : "border-slate-200",
//         item.route
//           ? "cursor-pointer hover:border-blue-300 hover:bg-slate-50"
//           : "",
//       ].join(" ")}
//     >
//       <div className="flex items-start justify-between gap-4">
//         <div className="min-w-0">
//           <p
//             className="text-xs font-bold uppercase tracking-[0.14em] text-slate-
//             500"
//           >
//             {item.title}
//           </p>

//           <div className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
//             {item.value}
//           </div>
//         </div>

//         <div
//           className={[
//             "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
//             requiresAction
//               ? "border-amber-200 bg-amber-100 text-amber-700"
//               : "border-slate-200 bg-slate-50 text-slate-500",
//           ].join(" ")}
//         >
//           <Icon size={18} />
//         </div>
//       </div>

//       <div className="mt-4 flex items-center gap-2">
//         <span
//           className={[
//             "h-1.5 w-1.5 rounded-full",
//             requiresAction ? "bg-amber-600" : "bg-emerald-600",
//           ].join(" ")}
//         />

//         <p
//           className={[
//             "text-xs font-bold uppercase tracking-[0.12em]",
//             requiresAction ? "text-amber-700" : "text-slate-500",
//           ].join(" ")}
//         >
//           {requiresAction ? "Action Required" : "Current"}
//         </p>
//       </div>

//       <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
//         {item.description}
//       </p>
//     </div>
//   );
// }
