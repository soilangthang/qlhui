export type HuiLine = {
  id: string;
  name: string;
  members: number;
  monthlyAmount: string;
  nextOpen: string;
  status: "Đang chạy" | "Sắp mở" | "Chờ góp";
};

export type CollectItem = {
  id: string;
  member: string;
  huiLine: string;
  paidAt: string;
  amount: string;
  status: "Đã góp" | "Chưa góp";
};

export type Activity = {
  id: string;
  title: string;
  note: string;
  amount: string;
  type: "in" | "out";
};

export const huiLines: HuiLine[] = [
  { id: "H01", name: "Dây hụi 2 triệu", members: 20, monthlyAmount: "2.000.000đ", nextOpen: "25/03/2026", status: "Đang chạy" },
  { id: "H02", name: "Dây hụi 5 triệu", members: 15, monthlyAmount: "5.000.000đ", nextOpen: "28/03/2026", status: "Chờ góp" },
  { id: "H03", name: "Dây hụi 1 triệu", members: 25, monthlyAmount: "1.000.000đ", nextOpen: "02/04/2026", status: "Sắp mở" },
];

export const collectList: CollectItem[] = [
  { id: "C01", member: "Hùng", huiLine: "Dây hụi 2 triệu", paidAt: "22/03/2026", amount: "2.000.000đ", status: "Đã góp" },
  { id: "C02", member: "Lan", huiLine: "Dây hụi 2 triệu", paidAt: "-", amount: "2.000.000đ", status: "Chưa góp" },
  { id: "C03", member: "Minh", huiLine: "Dây hụi 5 triệu", paidAt: "21/03/2026", amount: "5.000.000đ", status: "Đã góp" },
];

export const activities: Activity[] = [
  { id: "A01", title: "Thu tiền góp kỳ 03", note: "Dây hụi 2 triệu", amount: "+14.000.000đ", type: "in" },
  { id: "A02", title: "Chi hoa hồng đầu thảo", note: "Kỳ mở ngày 20/03", amount: "-1.200.000đ", type: "out" },
  { id: "A03", title: "Thu phí quản lý hụi", note: "Tổng 3 dây hụi", amount: "+850.000đ", type: "in" },
];
