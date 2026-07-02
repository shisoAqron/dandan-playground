import { useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import type { CardInstance } from "../../types/card";
import CardView from "../shared/CardView";
import CardActionMenu from "./CardActionMenu";

type Props = {
  playerId: string;
  isOpponent?: boolean;
};

export default function HandView({ playerId, isOpponent }: Props) {
  const gameState = useMatchStore((s) => s.gameState);
  const [selectedInstance, setSelectedInstance] = useState<CardInstance | null>(null);

  if (!gameState) return null;

  const handIds = gameState.hands[playerId] ?? [];
  const handInstances = handIds
    .map((id) => gameState.cardInstances[id])
    .filter(Boolean) as CardInstance[];

  return (
    <div>
      <div className="zone-label">手札 ({handInstances.length}枚)</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", minHeight: "80px", padding: "6px", background: "var(--bg-secondary)", borderRadius: "6px", border: "1px solid var(--border)" }}>
        {handInstances.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: "12px", display: "flex", alignItems: "center" }}>手札なし</div>
        )}
        {handInstances.map((inst) => (
          <div key={inst.instanceId} style={{ position: "relative" }}>
            <CardView
              instance={inst}
              size="sm"
              faceDown={isOpponent}
              onClick={isOpponent ? undefined : () => setSelectedInstance(inst)}
            />
          </div>
        ))}
      </div>

      {selectedInstance && !isOpponent && (
        <CardActionMenu
          instance={selectedInstance}
          zone="hand"
          activePlayerId={playerId}
          onClose={() => setSelectedInstance(null)}
        />
      )}
    </div>
  );
}
