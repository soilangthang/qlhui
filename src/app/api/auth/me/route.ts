import { NextResponse } from "next/server";

import { getAuthPayloadFromCookie } from "@/lib/auth";
import {
  chuHuiTrialDaysRemaining,
  chuHuiTrialEndsAt,
  isChuHuiTrialBlocked,
} from "@/lib/chu-hui-trial";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const payload = await getAuthPayloadFromCookie();
    if (!payload?.sub) {
      return NextResponse.json({ message: "Chưa đăng nhập" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        phone: true,
        rule: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        chuHuiAccessUnlocked: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "Người dùng không tồn tại" }, { status: 404 });
    }

    const locked = isChuHuiTrialBlocked(user);
    const access =
      user.rule === "user"
        ? {
            locked,
            unlocked: user.chuHuiAccessUnlocked,
            trialEndsAt: chuHuiTrialEndsAt(user.createdAt).toISOString(),
            trialDaysRemaining: chuHuiTrialDaysRemaining(user.createdAt),
          }
        : {
            locked: false,
            unlocked: true,
            trialEndsAt: null as string | null,
            trialDaysRemaining: null as number | null,
          };

    return NextResponse.json({ ok: true, user, access });
  } catch {
    return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
  }
}
