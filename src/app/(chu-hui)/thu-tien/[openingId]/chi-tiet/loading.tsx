/** Skeleton khi chờ RSC + Prisma — trang chi tiết thu tiền / phiếu giao. */
export default function ThuTienChiTietLoading() {
  return (
    <section className="min-h-[calc(100vh-140px)] w-full min-w-0 max-w-full animate-pulse rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
      <div className="mb-6 h-6 w-40 rounded bg-slate-200" />
      <div className="mb-4 h-48 max-w-[720px] rounded-xl border border-amber-200/80 bg-amber-50/50" />
      <div className="h-10 w-full max-w-md rounded-lg bg-slate-100" />
      <div className="mt-6 h-64 w-full rounded-lg border border-slate-200 bg-slate-50" />
    </section>
  );
}
