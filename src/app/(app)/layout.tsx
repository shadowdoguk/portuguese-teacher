import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { SettingsProvider } from "@/lib/settings";
import { AffectiveProvider } from "@/lib/affective";

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <AffectiveProvider>
        <AppShell>{children}</AppShell>
      </AffectiveProvider>
    </SettingsProvider>
  );
}
