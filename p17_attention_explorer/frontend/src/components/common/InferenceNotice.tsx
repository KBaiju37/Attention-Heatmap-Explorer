import { AlertTriangle, LoaderCircle } from "lucide-react";

export function InferenceNotice({
  loading,
  error,
  message,
}: {
  loading: boolean;
  error: string | null;
  message?: string;
}) {
  if (loading) {
    return (
      <div className="inference-notice notice-loading" role="status">
        <LoaderCircle size={16} className="spin-icon" />
        <span>{message ?? "Loading model and running CPU inference. First use may download model weights."}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="inference-notice notice-error" role="alert">
        <AlertTriangle size={16} />
        <div>
          <span>{error}</span>
          {error.includes("Application Control policy has blocked") && (
            <p className="form-hint">
              Windows policy blocked a required native dependency. Model inference cannot run until your administrator approves it; no security settings were changed.
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
}
