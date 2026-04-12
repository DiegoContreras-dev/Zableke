import { type ReactNode } from "react";

type DashboardPanelProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DashboardPanel({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: DashboardPanelProps) {
  return (
    <section
      className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 lg:px-5">
        <div>
          <h2 className="text-[1.03rem] font-semibold tracking-tight text-slate-900">{title}</h2>
          {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}
