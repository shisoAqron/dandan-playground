import { useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import CardView from "../shared/CardView";
import CardActionMenu from "./CardActionMenu";
import type { CardInstance } from "../../types/card";

type Props = {
  playerId: string;
  label?: string;
};

export default function BattlefieldView({ playerId, label }: Props) {
  const gameState = useMatchStore((s) => s.gameState);
  const [selectedInstance, setSelectedInstance] = useState<CardInstance | null>(null);
  const localPlayerId = useMatchStore((s) => s.playerId);

  if (!gameState) return null;

  const myCards = gameState.battlefield.filter(
    (c) => c.controllerPlayerId === playerId
  );

  // Islandをコントロールしているか確認
  const hasIsland = myCards.some((c) => c.name === "Island");

  return (
    <div>
      <div className="zone-label" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {label ?? "戦場"} ({myCards.length}枚)
        {hasIsland && <span style={{ color: "var(--accent)", fontSize: "10px" }}>🏝️ Island有</span>}
        {!hasIsland && myCards.length > 0 && <span style={{ color: "var(--warning)", fontSize: "10px" }}>⚠️ Island無</span>}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          minHeight: "100px",
          padding: "8px",
          background: "var(--bg-secondary)",
          borderRadius: "6px",
          border: "1px solid var(--border)",
        }}
      >
        {myCards.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontSize: "12px", display: "flex", alignItems: "center" }}>
            戦場なし
          </div>
        )}
        {myCards.map((inst) => (
          <div key={inst.instanceId} style={{ position: "relative" }}>
            <CardView
              instance={inst}
              size="sm"
              showTapped={true}
              onClick={() => setSelectedInstance(inst)}
            />
            {inst.annotations && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", fontSize: "9px", padding: "2px", textAlign: "center", color: "var(--warning)", borderRadius: "0 0 4px 4px" }}>
                {inst.annotations}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedInstance && (
        <CardActionMenu
          instance={selectedInstance}
          zone="battlefield"
          activePlayerId={localPlayerId}
          onClose={() => setSelectedInstance(null)}
        />
      )}
    </div>
  );
}
