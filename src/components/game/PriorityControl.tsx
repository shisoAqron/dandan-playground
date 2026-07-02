import { useMatchStore } from "../../store/matchStore";
import type { Phase } from "../../types/game";

const PHASES: Phase[] = [
  "beginning",
  "precombat-main",
  "combat",
  "postcombat-main",
  "ending",
];

const PHASE_LABELS: Record<Phase, string> = {
  beginning: "開始",
  "precombat-main": "メイン1",
  combat: "戦闘",
  "postcombat-main": "メイン2",
  ending: "終了",
};

export default function PriorityControl() {
  const gameState = useMatchStore((s) => s.gameState);
  const sendCommand = useMatchStore((s) => s.sendCommand);
  const playerId = useMatchStore((s) => s.playerId);
  const storeOpponentId = useMatchStore((s) => s.opponentId);

  if (!gameState) return null;

  const { priority, players, turnPlayerId, phase, playerOrder, stack } = gameState;
  const holder = priority.holderPlayerId
    ? players[priority.holderPlayerId]?.displayName ?? priority.holderPlayerId
    : "なし";

  const isMyPriority = priority.holderPlayerId === playerId;

  // storeのIDを優先し、gameStateのplayerOrderはフォールバックとして使う
  const knownPlayerIds = storeOpponentId
    ? [playerId, storeOpponentId]
    : playerOrder.filter((pid) => players[pid]);

  const handlePassPriority = () => {
    sendCommand({ type: "pass-priority", playerId });
  };

  const handleSetPhase = (p: Phase) => {
    sendCommand({ type: "set-phase", playerId, phase: p });
  };

  const handleEndTurn = () => {
    if (turnPlayerId) {
      sendCommand({ type: "end-turn", playerId: turnPlayerId });
    }
  };

  const handleSetPriority = (targetPlayerId: string) => {
    sendCommand({ type: "set-priority", playerId, holderPlayerId: targetPlayerId });
  };

  // 両者パス時の提案
  const bothPassed = stack.length > 0 && priority.consecutivePasses >= 2;
  const bothPassedEmpty = stack.length === 0 && priority.consecutivePasses >= 2;

  return (
    <div className="panel" style={{ fontSize: "13px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
        <div>
          <span style={{ color: "var(--text-muted)" }}>優先権: </span>
          <span style={{ color: isMyPriority ? "var(--priority)" : "var(--text)", fontWeight: "bold" }}>
            {holder}
          </span>
        </div>
        <div>
          <span style={{ color: "var(--text-muted)" }}>連続パス: </span>
          <span>{priority.consecutivePasses}回</span>
        </div>
      </div>

      {bothPassed && (
        <div style={{ padding: "8px", background: "#2a3a1a", border: "1px solid var(--success)", borderRadius: "6px", marginBottom: "8px" }}>
          <p style={{ color: "var(--success)", fontSize: "12px", marginBottom: "6px" }}>
            両者パス → スタックトップを解決しますか？
          </p>
          <button className="primary small" onClick={() => sendCommand({ type: "resolve-top-of-stack", playerId })}>
            解決する
          </button>
        </div>
      )}

      {bothPassedEmpty && (
        <div style={{ padding: "8px", background: "#1a2a3a", border: "1px solid var(--accent)", borderRadius: "6px", marginBottom: "8px" }}>
          <p style={{ color: "var(--accent)", fontSize: "12px", marginBottom: "6px" }}>
            スタック空で両者パス → 次フェイズへ進みますか？
          </p>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {PHASES.map((p) => (
              <button key={p} className={`secondary small ${phase === p ? "primary" : ""}`} onClick={() => handleSetPhase(p)}>
                {PHASE_LABELS[p]}
              </button>
            ))}
            <button className="danger small" onClick={handleEndTurn} disabled={playerId !== turnPlayerId}>
              ターン終了
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {isMyPriority && (
          <button className="primary small" onClick={handlePassPriority}>
            優先権をパス
          </button>
        )}
        <span style={{ color: "var(--text-muted)", fontSize: "11px", alignSelf: "center" }}>手動設定:</span>
        {knownPlayerIds.map((pid) => (
          <button key={pid} className="secondary small" onClick={() => handleSetPriority(pid)}>
            → {players[pid]?.displayName ?? pid}
          </button>
        ))}
        <button className="secondary small" onClick={() => sendCommand({ type: "reset-priority-passes", playerId })}>
          パスリセット
        </button>
      </div>
    </div>
  );
}
