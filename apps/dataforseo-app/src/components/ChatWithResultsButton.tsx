import toast from "react-hot-toast";

import { formatError } from "../lib/errors";
import { useNavigate } from "react-router-dom";

import { tauriApi } from "../lib/tauri";

interface Props<T> {
  rows: T[];
  /// Short human-readable summary like "1000 keywords from /keywords/volume".
  summary: string;
  disabled?: boolean;
}

export default function ChatWithResultsButton<T>({ rows, summary, disabled }: Props<T>) {
  const navigate = useNavigate();

  async function onClick() {
    try {
      const id = await tauriApi.chatNewSession({
        attachmentSummary: summary,
        attachmentJson: rows,
      });
      navigate(`/chat/${id}`);
    } catch (e) {
      toast.error(formatError(e));
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || rows.length === 0}
      className="rounded border px-2 py-1 text-xs disabled:opacity-50"
      title="Open a new chat session with this table attached"
    >
      💬 Chat
    </button>
  );
}
