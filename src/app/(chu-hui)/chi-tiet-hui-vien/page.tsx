import ChiTietHuiVienPanel from "@/components/chi-tiet-hui-vien-panel";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { loadThuTienChiTietPanelData } from "@/lib/thu-tien-chi-tiet-data";

export default async function ChiTietHuiVienPage() {
  const userId = await assertChuHuiUserId();
  const { members, rows, receiptSettingForClient } = await loadThuTienChiTietPanelData(userId);

  return (
    <ChiTietHuiVienPanel
      members={members}
      rows={rows}
      defaultMemberId={members[0]?.id ?? ""}
      receiptSetting={receiptSettingForClient}
    />
  );
}
