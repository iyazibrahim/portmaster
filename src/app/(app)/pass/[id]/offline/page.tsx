import { OfflinePassWalletView } from "@/components/pass/pass-wallet-cache";

/** Client-only offline wallet when the app shell falls back while offline. */
export default async function OfflinePassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-lg space-y-6 p-4 lg:max-w-xl">
      <OfflinePassWalletView passId={id} />
    </div>
  );
}
