import { requireSession } from "@/lib/session";
import { AppNav, MobileTopBar } from "@/components/layout/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-dvh md:h-dvh">
      <AppNav role={session.user.role} name={session.user.name} />
      <div className="flex min-w-0 flex-1 flex-col bg-background">
        <MobileTopBar />
        <main className="flex-1 overflow-y-auto px-4 py-6 pb-28 sm:px-6 md:pb-8 lg:px-8 lg:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}
