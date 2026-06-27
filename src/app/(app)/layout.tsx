import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsProvider } from "@/lib/settings";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <AppShell>{children}</AppShell>
    </SettingsProvider>
  );
}
