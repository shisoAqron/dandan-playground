import { useState, useRef } from "react";
import { useMatchStore } from "../../store/matchStore";
import CardView from "../shared/CardView";
import CardActionMenu from "./CardActionMenu";
import type { CardInstance } from "../../types/card";
import type { CardData } from "../../types/card";
import dandanCardsRaw from "../../data/dandan-cards.json";

const cardDataList = dandanCardsRaw as CardData[];
const cardDataMap = new Map(cardDataList.map((c) => [c.id, c]));

/** 土地かどうかを判定 */
function isLand(inst: CardInstance): boolean {
  const data = cardDataMap.get(inst.cardId);
  return !!data?.typeLine?.includes("Land");
}

const LONG_PRESS_MS = 500;

type Props = {
  playerId: string;
  label?: string;
};

export default function BattlefieldView({ playerId, label }: Props) {
  const gameState = useMatchStore((s) => s.gameState);
  const sendCommand = useMatchStore((s) => s.sendCommand);
  const [selectedInstance, setSelectedInstance] = useState<CardInstance | null>(null);
  const localPlayerId = useMatchStore((s) => s.playerId);

  // 長押し検出用（instanceId → timer）
  const longPressTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const longPressFired = useRef<Set<string>>(new Set());

  if (!gameState) return null;

  const allMyCards = gameState.battlefield.filter(
    (c) => c.controllerPlayerId === playerId
  );
  // 非土地（クリーチャー・エンチャント等）を左、土地を右に並べる
  const myCards = [
    ...allMyCards.filter((c) => !isLand(c)),
    ...allMyCards.filter((c) => isLand(c)),
  ];

  const hasIsland = myCards.some((c) => c.name === "Island");

  const handlePointerDown = (e: React.PointerEvent, inst: CardInstance) => {
    if (e.button === 2) return; // 右クリックは contextmenu で処理
    longPressFired.current.delete(inst.instanceId);
    const timer = setTimeout(() => {
      longPressFired.current.add(inst.instanceId);
      setSelectedInstance(inst);
    }, LONG_PRESS_MS);
    longPressTimers.current.set(inst.instanceId, timer);
  };

  const handlePointerUp = (inst: CardInstance) => {
    const timer = longPressTimers.current.get(inst.instanceId);
    if (timer) {
      clearTimeout(timer);
      longPressTimers.current.delete(inst.instanceId);
    }
  };

  const handleClick = (inst: CardInstance) => {
    // 長押しで既にメニューを出していたらスキップ
    if (longPressFired.current.has(inst.instanceId)) {
      longPressFired.current.delete(inst.instanceId);
      return;
    }
    // 短押し → タップ/アンタップ
    sendCommand({ type: "tap-card", playerId: localPlayerId, cardInstanceId: inst.instanceId, tapped: !inst.tapped });
  };

  const handleContextMenu = (e: React.MouseEvent, inst: CardInstance) => {
    e.preventDefault();
    setSelectedInstance(inst);
  };

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
          <div
            key={inst.instanceId}
            style={{ position: "relative", touchAction: "none", userSelect: "none", cursor: "pointer" }}
            onPointerDown={(e) => handlePointerDown(e, inst)}
            onPointerUp={() => handlePointerUp(inst)}
            onPointerLeave={() => handlePointerUp(inst)}
            onPointerCancel={() => handlePointerUp(inst)}
            onClick={() => handleClick(inst)}
            onContextMenu={(e) => handleContextMenu(e, inst)}
          >
            <CardView
              instance={inst}
              size="sm"
              showTapped={true}
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

