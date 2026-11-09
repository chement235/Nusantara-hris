import { requireSession } from "@/lib/auth";
import { MobileBottomNav, MobileNav, Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();

  return (
    <div className="min-h-screen md:flex">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav user={user} />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
