import { VoiceLoopLatencyDashboard } from "@/components/observability/VoiceLoopLatencyDashboard";

export const metadata = {
  title: "Voice Loop latency · Dashboards",
  description:
    "Per-stage SLI dashboard for the Conversational Practice pipeline (ADR-0002 latency budget).",
};

export default function VoiceLoopLatencyDashboardPage() {
  return <VoiceLoopLatencyDashboard initialWindow="1h" />;
}