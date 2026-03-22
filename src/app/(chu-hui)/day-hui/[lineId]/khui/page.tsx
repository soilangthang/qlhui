import KhuiPagePanel from "@/components/khui-page-panel";

export default async function KhuiLinePage({
  params,
}: {
  params: Promise<{ lineId: string }>;
}) {
  const { lineId } = await params;
  return <KhuiPagePanel lineId={lineId} />;
}
