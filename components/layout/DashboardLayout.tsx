import Sidebar from "./Sidebar";
import { DarkBackground } from "./DarkBackground";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-[var(--background)] relative">
      <DarkBackground />
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto relative z-10">
        {children}
      </main>
    </div>
  );
}
