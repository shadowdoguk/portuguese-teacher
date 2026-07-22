import { PrivacyControls } from "@/components/settings/PrivacyControls";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <span className="stage-stamp">Settings</span>
        <h1 className="text-display-lg font-display font-light text-pretty">
          Make it yours.
        </h1>
        <p className="max-w-2xl text-pretty text-ink-soft">
          Voice, feedback timing, accessibility, and privacy — all settings
          travel with your account and apply to the next conversation.
        </p>
      </header>

      <SettingsForm />
      <PrivacyControls />
    </div>
  );
}
