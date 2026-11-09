import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export function ModuleCard({
  title,
  description,
  to,
  Icon,
  index,
}: {
  title: string;
  description: string;
  to: string;
  Icon: LucideIcon;
  index: string;
}) {
  return (
    <Link className="module-card" to={to}>
      <div className="module-card-top">
        <span className="module-icon"><Icon size={18} strokeWidth={1.8} /></span>
        <span className="module-index">{index}</span>
      </div>
      <div className="module-card-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="module-card-link">
        Explore module <ArrowUpRight size={15} />
      </span>
    </Link>
  );
}
