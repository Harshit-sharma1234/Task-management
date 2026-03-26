export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Dashboard sidebar and navigation headers will go here */}
      <nav className="border-b bg-white p-4">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </nav>
      <main className="flex-1 flex flex-col p-6 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
