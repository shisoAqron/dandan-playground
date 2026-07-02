import { useMatchStore } from "../../store/matchStore";
import type { Phase } from "../../types/game";

// 表示するフェイズ（アップキープ・ドロー・メイン1・戦闘・メイン2・エンド）
const PHASES: Phase[] = [
  "upkeep",
  "draw",
  "precombat-main",
  "combat",
  "postcombat-main",
  "ending",
];

const PHASE_LABELS: Record<Phase, string> = {
  upkeep: "アップキープ",
  draw: "ドロー",
  "precombat-main": "メイン1",
  combat: "戦闘",
  "postcombat-main": "メイン2",
  ending: "エンド",
};

export default function PriorityControl({ isLocal = false }: { isLocal?: boolean }) {
  const gameState = useMatchStore((s) => s.gameState);
  const sendCommand = useMatchStore((s) => s.sendCommand);
  const playerId = useMatchStore((s) => s.playerId);

  if (!gameState) return null;

  const { turnPlayerId, phase } = gameState;

  const canEndTurn = isLocal || playerId === turnPlayerId;

  const handleSetPhase = (p: Phase) => {
    sendCommand({ type: "set-phase", playerId, phase: p });
  };

  const handleEndTurn = () => {
    if (turnPlayerId) {
      sendCommand({ type: "end-turn", playerId: turnPlayerId });
    }
  };

  return (
    <div style={{
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      padding: "8px 12px",
      fontSize: "13px",
    }}>
      {/* フェイズボタン（中央）+ ターン終了（右） */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "4px" }}>
        <div />
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "center" }}>
          {PHASES.map((p) => {
            const isCurrent = phase === p;
            return (
              <button
                key={p}
                className={isCurrent ? "primary small" : "secondary small"}
                onClick={() => handleSetPhase(p)}
                style={isCurrent ? { boxShadow: "0 0 0 2px var(--priority)" } : {}}
              >
                {PHASE_LABELS[p]}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            className="danger small"
            onClick={handleEndTurn}
            disabled={!canEndTurn}
            title={!canEndTurn ? "ターンプレイヤーのみ操作可能" : undefined}
          >
            ターン終了
          </button>
        </div>
      </div>
    </div>
  );
}
