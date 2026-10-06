import { requireSession } from "@/lib/session";
import { AppNav, MobileTopBar, MobileBottomNav } from "@/components/layout/app-nav";
import { OfflineBanner } from "@/components/ux/offline-banner";
import { PersistentHandlerScanner } from "@/components/handler/persistent-handler-scanner";
import { getLivePassIdForUser, isJettyGeofenceRequired } from "@/lib/pass";
import { getLocale } from "@/i18n";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const locale = await getLocale();
  const showPersistentScan =
    session.user.role === "HANDLER" || session.user.role === "ADMIN";
  const requireJettyGps = showPersistentScan
    ? await isJettyGeofenceRequired()
    : true;

  const livePassId =
    session.user.role === "USER" || session.user.role === "ADMIN"
      ? await getLivePassIdForUser(session.user.id)
      : null;
  const myPassesHref = livePassId ? `/pass/${livePassId}` : "/trips";

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden">
      <AppNav
        role={session.user.role}
        name={session.user.name}
        locale={locale}
        myPassesHref={myPassesHref}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <MobileTopBar locale={locale} />
        <OfflineBanner className="lg:hidden" />
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          {children}
          {showPersistentScan ? (
            <PersistentHandlerScanner
              isAdmin={session.user.role === "ADMIN"}
              requireJettyGps={requireJettyGps}
            />
          ) : null}
        </main>
        <MobileBottomNav
          role={session.user.role}
          locale={locale}
          myPassesHref={myPassesHref}
        />
      </div>
    </div>
  );
}
