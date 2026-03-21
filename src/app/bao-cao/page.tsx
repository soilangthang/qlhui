import BaoCaoPanel from "@/components/bao-cao-panel";
import HuiShell from "@/components/hui-shell";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { loadThuTienChiTietPanelData } from "@/lib/thu-tien-chi-tiet-data";

export const metadata = {
  title: "Báo cáo",
};

export default async function BaoCaoPage() {
  const userId = await assertChuHuiUserId();
  const { members, rows } = await loadThuTienChiTietPanelData(userId);

  return (
    <HuiShell>
      <BaoCaoPanel members={members} rows={rows} />
    </HuiShell>
  );
}
