import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";

export type ConnectionState = "loading" | "connected" | "unavailable";

const stateContent = {
  loading: { label: "Checking backend", className: "status-loading", Icon: LoaderCircle },
  connected: { label: "Backend connected", className: "status-connected", Icon: CheckCircle2 },
  unavailable: { label: "Backend unavailable", className: "status-unavailable", Icon: CircleAlert },
} satisfies Record<ConnectionState, { label: string; className: string; Icon: typeof LoaderCircle }>;

export function StatusIndicator({
  state,
  detail,
}: {
  state: ConnectionState;
  detail?: string;
}) {
  const { label, className, Icon } = stateContent[state];

  return (
    <span className={`status-indicator ${className}`} role="status" aria-live="polite">
      <Icon aria-hidden="true" size={15} />
      <span>{detail ?? label}</span>
    </span>
  );
}
