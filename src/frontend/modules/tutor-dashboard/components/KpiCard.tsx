type KpiCardProps = {
  label: string;
  value: string;
  detail: string;
  trend: string;
};

export function KpiCard({ label, value, detail, trend }: KpiCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-transform duration-150 hover:-translate-y-0.5">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
      <p className="mt-3 inline-flex items-center rounded-full bg-[#E5742A]/10 px-2.5 py-1 text-xs font-semibold text-[#E5742A]">
        {trend}
      </p>
    </article>
  );
}
