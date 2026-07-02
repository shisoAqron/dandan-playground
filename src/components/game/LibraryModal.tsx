import { useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import CardView from "../shared/CardView";
import type { CardInstance } from "../../types/card";

export default function LibraryModal({ onClose }: { onClose: () => void }) {
  const gameState = useMatchStore((s) => s.gameState);
  const sendCommand = useMatchStore((s) => s.sendCommand);
  const playerId = useMatchStore((s) => s.playerId);
  const [revealCount, setRevealCount] = useState(3);
  const [viewIds, setViewIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"reveal" | "view">("reveal");

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

  const handleViewMode = () => {
    setMode("view");
    const topIds = libraryIds.slice(0, revealCount);
    setViewIds(topIds);
    sendCommand({ type: "reveal-library-top", playerId, count: revealCount });
  };

  const moveInView = (idx: number, direction: -1 | 1) => {
    const newIds = [...viewIds];
    const target = idx + direction;
    if (target < 0 || target >= newIds.length) return;
    [newIds[idx], newIds[target]] = [newIds[target], newIds[idx]];
    setViewIds(newIds);
  };

  const handleShuffle = () => {
    const shuffled = [...libraryIds];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    sendCommand({ type: "reorder-library-top", playerId, cardInstanceIds: shuffled });
  };

  const handleConfirmView = () => {
    sendCommand({ type: "reorder-library-top", playerId, cardInstanceIds: viewIds });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
          <h2 style={{ margin: 0 }}>ライブラリー操作</h2>
          <button
            onClick={handleShuffle}
            disabled={libraryIds.length === 0}
            style={{ padding: "4px 10px", fontSize: "13px", borderRadius: "4px", border: "1px solid var(--warning)", background: "transparent", color: "var(--warning)", cursor: libraryIds.length === 0 ? "not-allowed" : "pointer", opacity: libraryIds.length === 0 ? 0.5 : 1 }}
          >
            シャッフル
          </button>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "12px" }}>
          ライブラリー残り: {libraryIds.length}枚
        </p>

        <div style={{ marginBottom: "12px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px" }}>上から</span>
            <input
              type="number"
              value={revealCount}
              min={1}
              max={Math.min(10, libraryIds.length)}
              onChange={(e) => setRevealCount(Number(e.target.value))}
              style={{ width: "60px" }}
            />
            <span style={{ fontSize: "13px" }}>枚を</span>
            <button className="secondary" onClick={handleReveal}>
              公開
            </button>
            <button className="secondary" onClick={handleViewMode}>
              見る
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
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px", alignItems: "stretch" }}>
                    <button className="secondary small" style={{ padding: "2px 4px", fontSize: "10px" }} onClick={() => {
                      sendCommand({ type: "move-card", playerId, cardInstanceId: inst.instanceId, from: "shared-library", to: "hand" });
                    }}>手札へ</button>
                    <button className="secondary small" style={{ padding: "2px 4px", fontSize: "10px" }} onClick={() => {
                      sendCommand({ type: "move-card", playerId, cardInstanceId: inst.instanceId, from: "shared-library", to: "shared-graveyard" });
                    }}>墓地へ</button>
                    <button className="secondary small" style={{ padding: "2px 4px", fontSize: "10px" }} onClick={() => {
                      sendCommand({ type: "move-card", playerId, cardInstanceId: inst.instanceId, from: "shared-library", to: "shared-library", position: "bottom" });
                    }}>ボトムへ</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {mode === "view" && (
          <div>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
              確認・並び替え（左がトップ）:
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {viewIds.map((id, i) => {
                const inst = gameState.cardInstances[id];
                if (!inst) return null;
                return (
                  <div key={id} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>
                      {i === 0 ? "トップ" : `+${i}`}
                    </div>
                    <CardView instance={inst} size="sm" />
                    <div style={{ display: "flex", gap: "2px", marginTop: "2px" }}>
                      <button className="secondary small" onClick={() => moveInView(i, -1)} disabled={i === 0} style={{ flex: 1 }}>←</button>
                      <button className="secondary small" onClick={() => moveInView(i, 1)} disabled={i === viewIds.length - 1} style={{ flex: 1 }}>→</button>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px", alignItems: "stretch" }}>
                      <button className="secondary small" style={{ padding: "2px 4px", fontSize: "10px" }} onClick={() => {
                        sendCommand({ type: "move-card", playerId, cardInstanceId: id, from: "shared-library", to: "hand" });
                        setViewIds(viewIds.filter(x => x !== id));
                      }}>手札へ</button>
                      <button className="secondary small" style={{ padding: "2px 4px", fontSize: "10px" }} onClick={() => {
                        sendCommand({ type: "move-card", playerId, cardInstanceId: id, from: "shared-library", to: "shared-graveyard" });
                        setViewIds(viewIds.filter(x => x !== id));
                      }}>墓地へ</button>
                      <button className="secondary small" style={{ padding: "2px 4px", fontSize: "10px" }} onClick={() => {
                        sendCommand({ type: "move-card", playerId, cardInstanceId: id, from: "shared-library", to: "shared-library", position: "bottom" });
                        setViewIds(viewIds.filter(x => x !== id));
                      }}>ボトムへ</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="primary" style={{ width: "100%", marginTop: "8px" }} onClick={handleConfirmView}>
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
