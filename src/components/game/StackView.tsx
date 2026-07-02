import { useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import CardView from "../shared/CardView";
import CardActionMenu from "./CardActionMenu";
import type { CardInstance } from "../../types/card";

export default function StackView() {
  const gameState = useMatchStore((s) => s.gameState);
  const sendCommand = useMatchStore((s) => s.sendCommand);
  const playerId = useMatchStore((s) => s.playerId);
  const [selectedInstance, setSelectedInstance] = useState<CardInstance | null>(null);

  if (!gameState) return null;

  const stackItems = gameState.stack;

  const handleResolveTop = () => {
    sendCommand({ type: "resolve-top-of-stack", playerId });
  };

  return (
    <div className="panel">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div className="zone-label">スタック ({stackItems.length}枚)</div>
        {stackItems.length > 0 && (
          <button className="primary small" onClick={handleResolveTop}>
            スタックトップを解決
          </button>
        )}
      </div>
      {stackItems.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>スタックは空</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {[...stackItems].reverse().map((item, i) => {
            const inst = gameState.cardInstances[item.cardInstanceId];
            if (!inst) return null;
            const controller = gameState.players[item.controllerPlayerId];
            return (
              <div key={item.stackItemId} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px", background: "var(--bg-card)", borderRadius: "6px", cursor: "pointer" }}
                onClick={() => setSelectedInstance(inst)}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", width: "30px", flexShrink: 0 }}>
                  {i === 0 ? "Top" : `+${i}`}
                </span>
                <CardView instance={inst} size="xs" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px" }}>{inst.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    by {controller?.displayName ?? item.controllerPlayerId}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedInstance && (
        <CardActionMenu
          instance={selectedInstance}
          zone="stack"
          activePlayerId={playerId}
          onClose={() => setSelectedInstance(null)}
        />
      )}
    </div>
  );
}
