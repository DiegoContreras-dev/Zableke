import Link from "next/link";

type TutorPlaceholderPageProps = {
  sectionLabel: string;
};

export function TutorPlaceholderPage({ sectionLabel }: TutorPlaceholderPageProps) {
  return (
    <div className="flex h-full min-h-[60vh] items-center justify-center">
      <section className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white/95 px-6 py-8 text-center shadow-[0_12px_30px_-25px_rgba(35,65,91,0.6)]">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Vista en construccion</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{sectionLabel}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Esta seccion queda delegada al sidebar y la implementaremos en la siguiente iteracion.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/tutor"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-[#23415B]/35 hover:text-[#23415B]"
          >
            Volver al Home
          </Link>
          <Link
            href="/tutor/asistencia"
            className="rounded-lg bg-[#23415B] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1d354c]"
          >
            Ir a Rellenar asistencia
          </Link>
        </div>
      </section>
    </div>
  );
}
