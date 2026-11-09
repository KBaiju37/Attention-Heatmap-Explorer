import { Network } from "lucide-react";
import { AttentionWorkbench } from "../components/common/AttentionWorkbench";
import { PageLayout } from "../components/layout/PageLayout";

export function TextAttention() {
  return (
    <PageLayout
      eyebrow="TEXT ANALYSIS"
      title="Text attention explorer"
      description="Extract actual BERT or GPT-2 attention values and inspect them by token, layer, and head."
    >
      <div className="research-caveat"><Network size={16} /><span>Attention weights are observations of a forward pass, not proof of causal reasoning.</span></div>
      <AttentionWorkbench />
    </PageLayout>
  );
}
