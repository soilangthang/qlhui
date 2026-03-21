export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 via-white to-indigo-50 px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
