import {
  Activity,
  BarChart3,
  BookOpenText,
  Boxes,
  Download,
  FlaskConical,
  Gauge,
  Image,
  LayoutDashboard,
  Network,
  ScanEye,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const navigation = [
  { label: "Overview", to: "/", Icon: LayoutDashboard },
  { label: "Text attention", to: "/text-attention", Icon: Network },
  { label: "Token probabilities", to: "/probabilities", Icon: BarChart3 },
  { label: "Model comparison", to: "/comparison", Icon: Boxes },
  { label: "Image attention", to: "/image-attention", Icon: Image },
  { label: "Hook inspector", to: "/hooks", Icon: ScanEye },
  { label: "Bias investigation", to: "/bias", Icon: FlaskConical },
  { label: "Export center", to: "/exports", Icon: Download },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <NavLink className="brand" to="/" aria-label="P17 home">
        <span className="brand-mark"><Activity size={21} strokeWidth={2.2} /></span>
        <span className="brand-copy">
          <strong>P17</strong>
          <span>ATTENTION LAB</span>
        </span>
      </NavLink>

      <div className="nav-caption">WORKSPACE</div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigation.map(({ label, to, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
          >
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="nav-caption">REFERENCE</div>
        <NavLink
          to="/about"
          className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
        >
          <BookOpenText size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>About &amp; limitations</span>
        </NavLink>
        <div className="sidebar-note">
          <Gauge size={16} aria-hidden="true" />
          <span>CPU-first · local inference</span>
        </div>
      </div>
    </aside>
  );
}
