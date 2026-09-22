import { Suspense } from "react";
import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center p-8">
          <Skeleton className="h-64 w-full max-w-sm" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
