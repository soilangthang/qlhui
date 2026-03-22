/** Fallback khi segment đang tải — tránh màn hình trống tuyệt đối khi chờ RSC/stream. */
export default function RootLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] px-4 text-sm text-slate-600">
      Đang tải…
    </div>
  );
}
