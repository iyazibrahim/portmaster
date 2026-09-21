import { requireSession } from "@/lib/session";
import { AppNav, MobileTopBar, MobileBottomNav } from "@/components/layout/app-nav";
import { getLocale } from "@/i18n";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const locale = await getLocale();

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden">
      <AppNav
        role={session.user.role}
        name={session.user.name}
        locale={locale}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <MobileTopBar locale={locale} />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </main>
        <MobileBottomNav role={session.user.role} locale={locale} />
      </div>
    </div>
  );
}
