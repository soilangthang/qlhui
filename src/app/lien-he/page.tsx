import LienHePanel from "@/components/lien-he-panel";
import HuiShell from "@/components/hui-shell";

export const metadata = {
  title: "Liên hệ",
};

export default function LienHePage() {
  const zaloPhoneRaw = process.env.NEXT_PUBLIC_ZALO_ADMIN_PHONE ?? "";

  return (
    <HuiShell>
      <LienHePanel zaloPhoneRaw={zaloPhoneRaw} />
    </HuiShell>
  );
}
