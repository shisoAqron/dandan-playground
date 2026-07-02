import { useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import CardView from "../shared/CardView";
import type { CardInstance } from "../../types/card";

export default function LibraryTopModal({ onClose }: { onClose: () => void }) {
  const gameState = useMatchStore((s) => s.gameState);
  const sendCommand = useMatchStore((s) => s.sendCommand);
  const playerId = useMatchStore((s) => s.playerId);
  const [revealCount, setRevealCount] = useState(3);
  const [reorderIds, setReorderIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"reveal" | "reorder">("reveal");

  if (!gameState) return null;

  const libraryIds = gameState.sharedLibrary.cardInstanceIds;
  const revealedIds = gameState.revealedLibraryTop;
  const libraryIdSet = new Set(libraryIds);
  // ライブラリーにまだ存在するカードだけを表示（移動済みは除外）
  const revealedInstances = revealedIds
    .filter((id) => libraryIdSet.has(id))
    .map((id) => gameState.cardInstances[id])
    .filter(Boolean) as CardInstance[];

  const handleReveal = () => {
    sendCommand({ type: "reveal-library-top", playerId, count: revealCount });
  };

  const handleReorderMode = () => {
    setMode("reorder");
    const topIds = libraryIds.slice(0, revealCount);
    setReorderIds(topIds);
    sendCommand({ type: "reveal-library-top", playerId, count: revealCount });
  };

  const moveInReorder = (idx: number, direction: -1 | 1) => {
    const newIds = [...reorderIds];
    const target = idx + direction;
    if (target < 0 || target >= newIds.length) return;
    [newIds[idx], newIds[target]] = [newIds[target], newIds[idx]];
    setReorderIds(newIds);
  };

  const handleConfirmReorder = () => {
    sendCommand({ type: "reorder-library-top", playerId, cardInstanceIds: reorderIds });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>ライブラリートップ操作</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "12px" }}>
          ライブラリー残り: {libraryIds.length}枚
        </p>

        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
          <span style={{ fontSize: "13px" }}>枚数:</span>
          <input
            type="number"
            value={revealCount}
            min={1}
            max={Math.min(10, libraryIds.length)}
            onChange={(e) => setRevealCount(Number(e.target.value))}
            style={{ width: "60px" }}
          />
          <button className="secondary" onClick={handleReveal}>
            公開
          </button>
          <button className="secondary" onClick={handleReorderMode}>
            並び替え
          </button>
          <button className="secondary" onClick={() => {
            const targets = libraryIds.slice(0, revealCount);
            for (const id of targets) {
              sendCommand({ type: "move-card", playerId, cardInstanceId: id, from: "shared-library", to: "shared-graveyard" });
            }
          }}>
            墓地へ
          </button>
          <button className="secondary" onClick={() => {
            const targets = libraryIds.slice(0, revealCount);
            for (const id of targets) {
              sendCommand({ type: "move-card", playerId, cardInstanceId: id, from: "shared-library", to: "exile" });
            }
          }}>
            追放
          </button>
        </div>

        {mode === "reveal" && revealedInstances.length > 0 && (
          <div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
              公開中（トップから順）:
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {revealedInstances.map((inst, i) => (
                <div key={inst.instanceId} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>
                    {i === 0 ? "トップ" : `+${i}`}
                  </div>
                  <CardView instance={inst} size="sm" />
                  <button
                    className="secondary small"
                    style={{ width: "100%", marginTop: "2px" }}
                    onClick={() => {
                      sendCommand({
                        type: "move-card",
                        playerId,
                        cardInstanceId: inst.instanceId,
                        from: "shared-library",
                        to: "hand",
                      });
                    }}
                  >
                    手札へ
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "reorder" && (
          <div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
              並び替え（左がトップ）:
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {reorderIds.map((id, i) => {
                const inst = gameState.cardInstances[id];
                if (!inst) return null;
                return (
                  <div key={id} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>
                      {i === 0 ? "トップ" : `+${i}`}
                    </div>
                    <CardView instance={inst} size="sm" />
                    <div style={{ display: "flex", gap: "2px", marginTop: "2px" }}>
                      <button className="secondary small" onClick={() => moveInReorder(i, -1)} disabled={i === 0} style={{ flex: 1 }}>←</button>
                      <button className="secondary small" onClick={() => moveInReorder(i, 1)} disabled={i === reorderIds.length - 1} style={{ flex: 1 }}>→</button>
                    </div>
                    <button className="secondary small" style={{ width: "100%", marginTop: "2px" }} onClick={() => {
                      sendCommand({ type: "move-card", playerId, cardInstanceId: id, from: "shared-library", to: "hand" });
                      setReorderIds(reorderIds.filter(x => x !== id));
                    }}>手札へ</button>
                    <button className="secondary small" style={{ width: "100%", marginTop: "2px" }} onClick={() => {
                      sendCommand({ type: "move-card", playerId, cardInstanceId: id, from: "shared-library", to: "shared-graveyard" });
                      setReorderIds(reorderIds.filter(x => x !== id));
                    }}>墓地へ</button>
                  </div>
                );
              })}
            </div>
            <button className="primary" style={{ width: "100%", marginTop: "8px" }} onClick={handleConfirmReorder}>
              この順番で確定
            </button>
          </div>
        )}

        <button className="secondary" style={{ width: "100%", marginTop: "12px" }} onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}
