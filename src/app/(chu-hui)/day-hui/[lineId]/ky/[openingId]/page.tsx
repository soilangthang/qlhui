import { notFound } from "next/navigation";

import { assertChuHuiUserId } from "@/lib/chu-hui-scope";
import { prisma } from "@/lib/prisma";

function formatDateDisplay(date: Date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatMoneyVN(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export default async function OpeningDetailPage({
  params,
}: {
  params: Promise<{ lineId: string; openingId: string }>;
}) {
  const { lineId, openingId } = await params;

  const userId = await assertChuHuiUserId();

  const opening = await prisma.huiOpening.findFirst({
    where: { id: openingId, huiLineId: lineId, huiLine: { userId } },
    select: {
      kyThu: true,
      ngayKhui: true,
      winnerName: true,
      finalPayout: true,
      status: true,
      huiLine: { select: { name: true } },
    },
  });

  if (!opening) {
    notFound();
  }

  return (
      <section className="min-h-[calc(100vh-140px)] rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Chi tiết kỳ khui</h2>
        <p className="mt-1 text-sm text-slate-600">Dây hụi: {opening.huiLine.name}</p>

        <div className="mt-4 overflow-hidden rounded-xl border border-slate-300">
          <table className="min-w-full table-fixed text-[15px]">
            <thead className="bg-slate-50 text-slate-700">
              <tr className="border-b border-slate-300">
                <th className="border-r border-slate-300 px-3 py-3 text-center">Hụi viên</th>
                <th className="border-r border-slate-300 px-3 py-3 text-center">Hốt kỳ</th>
                <th className="border-r border-slate-300 px-3 py-3 text-center">Ngày hốt</th>
                <th className="border-r border-slate-300 px-3 py-3 text-center">Số tiền được nhận</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="bg-white text-center font-medium text-slate-700">
              <tr>
                <td className="border-r border-slate-300 px-3 py-3">{opening.winnerName}</td>
                <td className="border-r border-slate-300 px-3 py-3">Kỳ {opening.kyThu}</td>
                <td className="border-r border-slate-300 px-3 py-3">{formatDateDisplay(opening.ngayKhui)}</td>
                <td className="border-r border-slate-300 px-3 py-3">{formatMoneyVN(opening.finalPayout)}</td>
                <td className="px-3 py-3">
                  {opening.status === "CHO_GIAO_TIEN" ? "Chờ giao tiền" : "Đã giao tiền"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
  );
}
