/** Skeleton khi chờ RSC + Prisma — giảm cảm giác “đơ” khi vào Theo dõi. */
export default function TheoDoiLoading() {
  return (
    <section className="min-h-[calc(100vh-140px)] w-full min-w-0 max-w-full animate-pulse rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
      <div className="h-7 w-48 rounded bg-slate-200" />
      <div className="mt-3 h-4 max-w-2xl rounded bg-slate-100" />
      <div className="mt-3 h-4 max-w-xl rounded bg-slate-100" />
      <div className="mt-6 flex min-h-[320px] flex-col gap-4 lg:flex-row lg:gap-0 lg:rounded-xl lg:border lg:border-slate-200">
        <aside className="h-48 w-full rounded-xl border border-slate-200 bg-slate-50 lg:h-auto lg:w-[min(100%,300px)] lg:shrink-0" />
        <div className="min-h-[200px] flex-1 rounded-xl border border-slate-200 bg-slate-50/80 lg:rounded-none lg:border-0" />
      </div>
    </section>
  );
}
