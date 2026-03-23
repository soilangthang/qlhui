import BaoCaoPanel from "@/components/bao-cao-panel";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { loadThuTienChiTietPanelData } from "@/lib/thu-tien-chi-tiet-data";

export const metadata = {
  title: "Báo cáo",
};

export default async function BaoCaoPage() {
  const userId = await assertChuHuiUserId();
  // Báo cáo không cần header phiếu/ảnh QR/logo -> bỏ query cài đặt để giảm thời gian tab switch.
  const { members, rows } = await loadThuTienChiTietPanelData(userId, { includeReceiptSetting: false });

  return <BaoCaoPanel members={members} rows={rows} />;
}
