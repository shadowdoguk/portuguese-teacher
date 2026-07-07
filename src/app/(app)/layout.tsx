import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { LearnerStateProvider } from "@/lib/learner/LearnerStateProvider";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <LearnerStateProvider>
      <AppShell>{children}</AppShell>
    </LearnerStateProvider>
  );
}
