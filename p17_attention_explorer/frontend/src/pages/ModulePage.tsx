import type { ReactNode } from "react";
import { ArrowLeft, CircleDashed, FlaskConical } from "lucide-react";
import { Link } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";

export function ModulePage({
  eyebrow,
  title,
  description,
  icon,
  planned,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: ReactNode;
  planned: string[];
  children?: ReactNode;
}) {
  return (
    <PageLayout eyebrow={eyebrow} title={title} description={description}>
      <section className="module-intro-panel">
        <div className="module-intro-icon">{icon}</div>
        <div className="module-intro-copy">
          <div className="eyebrow">COMING IN A FUTURE PHASE</div>
          <h2>This module is planned, not active yet.</h2>
          <p>
            Phase 0 establishes the application foundation and live backend connection.
            No model inference is available here, and no sample outputs are shown.
          </p>
        </div>
        <span className="planned-pill"><CircleDashed size={13} /> Planned</span>
      </section>
      <div className="planned-details">
        <h3>Planned capabilities</h3>
        <ul>{planned.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      {children}
      <Link to="/" className="back-link"><ArrowLeft size={15} /> Return to overview</Link>
    </PageLayout>
  );
}

export function PlannedExperiment({ children }: { children: ReactNode }) {
  return (
    <div className="planned-experiment">
      <FlaskConical size={17} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}
