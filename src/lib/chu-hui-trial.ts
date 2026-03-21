/** Số ngày dùng thử cho tài khoản chủ hụi (kể từ createdAt). */
export const CHU_HUI_TRIAL_DAYS = 10;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function chuHuiTrialEndsAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + CHU_HUI_TRIAL_DAYS * MS_PER_DAY);
}

/** Chủ hụi bị chặn: hết thời gian dùng thử và chưa được admin mở khóa. */
export function isChuHuiTrialBlocked(u: {
  rule: string;
  createdAt: Date;
  chuHuiAccessUnlocked: boolean;
}): boolean {
  if (u.rule !== "user") return false;
  if (u.chuHuiAccessUnlocked) return false;
  return Date.now() > chuHuiTrialEndsAt(u.createdAt).getTime();
}

export function chuHuiTrialDaysRemaining(createdAt: Date): number {
  const end = chuHuiTrialEndsAt(createdAt).getTime();
  const left = Math.ceil((end - Date.now()) / MS_PER_DAY);
  return Math.max(0, left);
}
