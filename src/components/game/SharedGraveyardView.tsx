import { useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import CardView from "../shared/CardView";
import CardActionMenu from "./CardActionMenu";
import type { CardInstance } from "../../types/card";

export default function SharedGraveyardView({ onClose }: { onClose: () => void }) {
  const gameState = useMatchStore((s) => s.gameState);
  const playerId = useMatchStore((s) => s.playerId);
  const [selectedInstance, setSelectedInstance] = useState<CardInstance | null>(null);

  if (!gameState) return null;

  const instances = gameState.sharedGraveyard.cardInstanceIds
    .map((id) => gameState.cardInstances[id])
    .filter(Boolean) as CardInstance[];

  // Accumulated Knowledge用: 共有墓地内のAK枚数
  const akCount = instances.filter((c) => c.name === "Accumulated Knowledge").length;

  return (
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
        <h2>共有墓地 ({instances.length}枚)</h2>
        {akCount > 0 && (
          <p style={{ color: "var(--accent)", fontSize: "13px", marginBottom: "12px" }}>
            💧 Accumulated Knowledge: 墓地に{akCount}枚 → {akCount + 1}枚ドロー
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "60vh", overflowY: "auto" }}>
          {instances.length === 0 && (
            <p style={{ color: "var(--text-muted)" }}>墓地は空です</p>
          )}
          {instances.map((inst) => (
            <div key={inst.instanceId}>
              <CardView instance={inst} size="sm" onClick={() => setSelectedInstance(inst)} />
            </div>
          ))}
        </div>
        <button className="secondary" style={{ width: "100%", marginTop: "12px" }} onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>

    {selectedInstance && (
      <CardActionMenu
        instance={selectedInstance}
        zone="shared-graveyard"
        activePlayerId={playerId}
        onClose={() => setSelectedInstance(null)}
      />
    )}
    </>
  );
}
