import type { ConnectionStatus } from "../../types/game";

type Props = {
  status: ConnectionStatus;
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  idle: "未接続",
  creating: "作成中...",
  connecting: "接続中...",
  connected: "接続済み",
  reconnecting: "再接続中...",
  disconnected: "切断",
  failed: "接続失敗",
  closed: "終了",
};

const STATUS_CLASS: Record<ConnectionStatus, string> = {
  idle: "idle",
  creating: "connecting",
  connecting: "connecting",
  connected: "connected",
  reconnecting: "connecting",
  disconnected: "disconnected",
  failed: "disconnected",
  closed: "disconnected",
};

export default function ConnectionStatusBadge({ status }: Props) {
  return (
    <span className={`badge ${STATUS_CLASS[status]}`}>
      <span>●</span>
      {STATUS_LABELS[status]}
    </span>
  );
}
