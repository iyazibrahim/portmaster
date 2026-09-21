import { requireSession } from "@/lib/session";
import { AppNav, MobileTopBar } from "@/components/layout/app-nav";
import { getLocale } from "@/i18n";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const locale = await getLocale();

  return (
    <div className="flex min-h-dvh lg:h-dvh lg:overflow-hidden">
      <AppNav
        role={session.user.role}
        name={session.user.name}
        locale={locale}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <MobileTopBar locale={locale} />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 pb-28 sm:px-6 lg:px-8 lg:py-7 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
