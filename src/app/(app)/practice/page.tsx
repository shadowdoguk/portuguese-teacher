import { PracticeSession } from "@/components/practice/PracticeSession";
import { ScenarioWorkspace } from "@/components/practice/ScenarioWorkspace";

export default function PracticePage() {
  return (
    <div className="container-edge space-y-12 py-10">
      <PracticeSession />
      <hr className="hairline" />
      <ScenarioWorkspace />
    </div>
  );
}
