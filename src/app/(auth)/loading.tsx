import { PageSkeleton } from "@/components/ux/skeleton-list";

export default function AuthLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      <PageSkeleton className="max-w-md" />
    </div>
  );
}
