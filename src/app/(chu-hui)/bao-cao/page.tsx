import BaoCaoPanel from "@/components/bao-cao-panel";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { loadThuTienChiTietPanelData } from "@/lib/thu-tien-chi-tiet-data";

export const metadata = {
  title: "Báo cáo",
};

export default async function BaoCaoPage() {
  const userId = await assertChuHuiUserId();
  const { members, rows } = await loadThuTienChiTietPanelData(userId);

  return <BaoCaoPanel members={members} rows={rows} />;
}
