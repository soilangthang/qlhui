import { z } from "zod";

const phoneRegex = /^(0|\+84)[0-9]{9,10}$/;

export const registerSchema = z.object({
  name: z.string().min(2, "Tên phải từ 2 ký tự"),
  phone: z.string().regex(phoneRegex, "Số điện thoại không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export const loginSchema = z.object({
  phone: z.string().regex(phoneRegex, "Số điện thoại không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});
