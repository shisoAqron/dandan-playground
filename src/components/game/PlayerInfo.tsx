import { useMatchStore } from "../../store/matchStore";
import type { PlayerState } from "../../types/game";

type Props = {
  player: PlayerState;
  isLocal: boolean;
  handCount: number;
  battlefieldCount: number;
  isActive: boolean;
  hasPriority: boolean;
  mulliganPending?: boolean;
  onMulligan?: () => void;
  onKeepHand?: () => void;
};

export default function PlayerInfo({ player, isLocal, handCount, battlefieldCount, isActive, hasPriority, mulliganPending, onMulligan, onKeepHand }: Props) {
  const sendCommand = useMatchStore((s) => s.sendCommand);

  const handleSetLife = (delta: number) => {
    sendCommand({ type: "set-life", playerId: player.playerId, life: player.life + delta });
  };

  return (
    <div style={{
      padding: "10px 14px",
      background: mulliganPending ? "#2a1a3a" : "var(--bg-secondary)",
      border: `1px solid ${mulliganPending ? "var(--warning)" : hasPriority ? "var(--priority)" : "var(--border)"}`,
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      flexWrap: "wrap",
    }}>
      {hasPriority && (
        <span style={{ color: "var(--priority)", fontSize: "16px" }}>⭐</span>
      )}
      <div>
        <div style={{ fontWeight: "bold", fontSize: "14px" }}>
          {player.displayName}
          {isLocal && <span style={{ color: "var(--text-muted)", fontSize: "11px", marginLeft: "4px" }}>(あなた)</span>}
          {isActive && <span style={{ color: "var(--success)", fontSize: "11px", marginLeft: "4px" }}>アクティブ</span>}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <button className="secondary small" onClick={() => handleSetLife(-4)}>−4</button>
        <span style={{ fontSize: "22px", fontWeight: "bold", minWidth: "50px", textAlign: "center", color: player.life <= 0 ? "var(--danger)" : player.life <= 5 ? "var(--warning)" : "var(--text)" }}>
          {player.life}
        </span>
        <button className="secondary small" onClick={() => handleSetLife(+4)}>+4</button>
      </div>

      <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--text-muted)", alignItems: "center", flexWrap: "wrap" }}>
        <span>手札: {handCount}</span>
        <span>戦場: {battlefieldCount}</span>
        <span>土地/T: {player.landsPlayedThisTurn}</span>
        {mulliganPending && (
          <>
            <span style={{ color: "var(--warning)", fontWeight: "bold" }}>マリガン?</span>
            {onMulligan && onKeepHand ? (
              <>
                <button className="danger small" onClick={onMulligan}>マリガン</button>
                <button className="primary small" onClick={onKeepHand}>キープ</button>
              </>
            ) : (
              <span style={{ color: "var(--warning)" }}>検討中…</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
