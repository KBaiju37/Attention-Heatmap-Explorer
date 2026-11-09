import { BookOpenText } from "lucide-react";
import { ModulePage } from "./ModulePage";

export function About() {
  return (
    <ModulePage
      eyebrow="PROJECT & SCIENCE"
      title="About and limitations"
      description="P17 is an educational research workspace for observing real transformer attention."
      icon={<BookOpenText size={20} />}
      planned={[
        "Attention weights are not automatically faithful explanations.",
        "High attention does not establish causality; heads can differ and averages can hide patterns.",
        "Tokenization affects what a token-level visualization appears to show.",
        "BERT's masked prediction and GPT-2's next-token prediction are different tasks.",
        "CLIP's image and text encoders are separate; image self-attention is not cross-attention.",
        "Pronoun-and-occupation examples alone cannot establish model bias.",
      ]}
    />
  );
}
