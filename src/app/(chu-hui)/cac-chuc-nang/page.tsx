import MobileChucNangMenu from "@/components/mobile-chuc-nang-menu";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";

export default async function CacChucNangPage() {
  await assertChuHuiUserId();

  return (
    <div className="flex min-h-[calc(100dvh-10.5rem)] flex-col lg:min-h-[calc(100vh-9rem)]">
      <header className="border-b border-neutral-200 pb-4">
        <h1 className="text-lg font-bold text-slate-900 sm:text-xl">Các chức năng</h1>
        <p className="mt-1 text-sm text-[#7f8c8d]">Theo dõi, báo cáo và cài đặt hệ thống</p>
      </header>
      <MobileChucNangMenu className="flex-1 pt-4" />
    </div>
  );
}
