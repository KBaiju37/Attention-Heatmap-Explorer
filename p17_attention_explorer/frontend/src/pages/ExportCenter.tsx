import { Download } from "lucide-react";
import { AttentionWorkbench } from "../components/common/AttentionWorkbench";
import { PageLayout } from "../components/layout/PageLayout";

export function ExportCenter() {
  return (
    <PageLayout eyebrow="RESULTS & REPORTS" title="Attention export center" description="Create reproducible image and JSON exports from an actual model inference result.">
      <div className="research-caveat"><Download size={16} /><span>Exports are enabled only after attention has been extracted from a real model run. JSON includes token and experiment metadata.</span></div>
      <AttentionWorkbench allowModelChoice />
    </PageLayout>
  );
}
