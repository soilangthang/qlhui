import HuiShell from "@/components/hui-shell";

export default function ChuHuiLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <HuiShell>{children}</HuiShell>;
}
