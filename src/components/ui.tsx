import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PLATFORMS } from "@/lib/platforms";
import { PlatformIcon } from "./PlatformIcon";
import type { PlatformId, PostStatus, PlatformPostStatus } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/* Page header                                                                */
/* -------------------------------------------------------------------------- */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* KPI / stat card                                                            */
/* -------------------------------------------------------------------------- */
export function StatCard({
  label,
  value,
  icon,
  hint,
  accent = "brand",
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  hint?: string;
  accent?: "brand" | "emerald" | "amber" | "red" | "slate";
}) {
  const accents: Record<string, string> = {
    brand: "from-brand-500 to-brand-700",
    emerald: "from-emerald-500 to-emerald-700",
    amber: "from-amber-500 to-orange-600",
    red: "from-rose-500 to-red-600",
    slate: "from-slate-500 to-slate-700",
  };
  return (
    <div className="card card-hover flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">
          {value}
        </p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
      {icon && (
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
            accents[accent],
          )}
        >
          {icon}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty state                                                                */
/* -------------------------------------------------------------------------- */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Status badge                                                               */
/* -------------------------------------------------------------------------- */
const POST_STATUS_STYLES: Record<PostStatus | PlatformPostStatus, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  scheduled: "bg-brand-50 text-brand-700 ring-brand-200",
  publishing: "bg-amber-50 text-amber-700 ring-amber-200",
  published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  canceled: "bg-slate-100 text-slate-500 ring-slate-200",
  pending: "bg-slate-100 text-slate-500 ring-slate-200",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  canceled: "Canceled",
  pending: "Pending",
};

export function StatusBadge({ status }: { status: PostStatus | PlatformPostStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        POST_STATUS_STYLES[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Platform badge                                                             */
/* -------------------------------------------------------------------------- */
export function PlatformBadge({
  platform,
  size = "sm",
}: {
  platform: PlatformId;
  size?: "sm" | "md";
}) {
  const def = PLATFORMS[platform];
  if (!def) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "flex items-center justify-center rounded-full text-white",
          size === "md" ? "h-6 w-6" : "h-4 w-4",
        )}
        style={{ backgroundColor: def.color }}
      >
        <PlatformIcon platform={platform} size={size === "md" ? 13 : 10} />
      </span>
      {size === "md" && (
        <span className="text-sm font-medium text-slate-700">{def.name}</span>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Skeleton (loading)                                                         */
/* -------------------------------------------------------------------------- */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}
