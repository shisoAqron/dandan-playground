import { useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import type { PlayerState } from "../../types/game";

type Props = {
  player: PlayerState;
  isLocal: boolean;
  handCount: number;
  battlefieldCount: number;
  isActive: boolean;
  hasPriority: boolean;
};

export default function PlayerInfo({ player, isLocal, handCount, battlefieldCount, isActive, hasPriority }: Props) {
  const sendCommand = useMatchStore((s) => s.sendCommand);
  const [lifeInput, setLifeInput] = useState("");
  const [showLifeEdit, setShowLifeEdit] = useState(false);

  const handleSetLife = (delta: number) => {
    sendCommand({ type: "set-life", playerId: player.playerId, life: player.life + delta });
  };

  const handleSetLifeExact = () => {
    const n = parseInt(lifeInput);
    if (!isNaN(n)) {
      sendCommand({ type: "set-life", playerId: player.playerId, life: n });
      setShowLifeEdit(false);
      setLifeInput("");
    }
  };

  return (
    <div style={{
      padding: "10px 14px",
      background: "var(--bg-secondary)",
      border: `1px solid ${hasPriority ? "var(--priority)" : "var(--border)"}`,
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
        <button className="secondary small" onClick={() => handleSetLife(-1)}>−1</button>
        <span style={{ fontSize: "22px", fontWeight: "bold", minWidth: "50px", textAlign: "center", color: player.life <= 0 ? "var(--danger)" : player.life <= 5 ? "var(--warning)" : "var(--text)" }}>
          {player.life}
        </span>
        <button className="secondary small" onClick={() => handleSetLife(+1)}>+1</button>
        <button className="secondary small" onClick={() => handleSetLife(-4)}>−4</button>
        <button className="secondary small" onClick={() => handleSetLife(+4)}>+4</button>
        <button className="secondary small" onClick={() => setShowLifeEdit(!showLifeEdit)}>指定</button>
      </div>

      {showLifeEdit && (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <input
            type="number"
            value={lifeInput}
            onChange={(e) => setLifeInput(e.target.value)}
            style={{ width: "60px", padding: "4px 8px" }}
            placeholder={String(player.life)}
          />
          <button className="primary small" onClick={handleSetLifeExact}>決定</button>
        </div>
      )}

      <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
        <span>手札: {handCount}</span>
        <span>戦場: {battlefieldCount}</span>
        <span>土地/T: {player.landsPlayedThisTurn}</span>
      </div>
    </div>
  );
}
