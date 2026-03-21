import TheoDoiPanel from "@/components/theo-doi-panel";
import HuiShell from "@/components/hui-shell";
import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { loadTheoDoiData } from "@/lib/theo-doi-data";

export default async function TheoDoiPage() {
  const userId = await assertChuHuiUserId();
  const lines = await loadTheoDoiData(userId);

  return (
    <HuiShell>
      <TheoDoiPanel initialLines={lines} />
    </HuiShell>
  );
}
