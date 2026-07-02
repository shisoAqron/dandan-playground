import { useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import type { CardInstance } from "../../types/card";
import type { CardData } from "../../types/card";
import CardView from "../shared/CardView";
import type { Zone } from "../../types/game";
import dandanCardsRaw from "../../data/dandan-cards.json";

const cardDataMap = new Map((dandanCardsRaw as CardData[]).map((c) => [c.id, c]));

type Props = {
  instance: CardInstance;
  zone: Zone;
  onClose: () => void;
  activePlayerId: string;
};

export default function CardActionMenu({ instance, zone, onClose, activePlayerId: playerId }: Props) {
  const sendCommand = useMatchStore((s) => s.sendCommand);
  const gameState = useMatchStore((s) => s.gameState);
  const [showDetail, setShowDetail] = useState(false);

  const cardData = cardDataMap.get(instance.cardId);



  if (!gameState) return null;

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  const moveCard = (to: Zone, position?: import("../../types/game").ZonePosition) => {
    handleAction(() =>
      sendCommand({
        type: "move-card",
        playerId,
        cardInstanceId: instance.instanceId,
        from: zone,
        to,
        position,
      })
    );
  };

  const handActions = (
    <>
      <h3 style={{ marginBottom: "8px", color: "var(--accent)" }}>手札から</h3>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() =>
        handleAction(() => sendCommand({ type: "play-land", playerId, cardInstanceId: instance.instanceId }))
      }>
        土地としてプレイ
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() =>
        handleAction(() => sendCommand({ type: "cast-spell", playerId, cardInstanceId: instance.instanceId }))
      }>
        呪文として唱える
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("shared-graveyard")}>
        捨てる（墓地へ）
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("exile")}>
        追放する
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("shared-library", "top")}>
        ライブラリートップへ
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("shared-library", "bottom")}>
        ライブラリーボトムへ
      </button>
    </>
  );

  const battlefieldActions = (
    <>
      <h3 style={{ marginBottom: "8px", color: "var(--accent)" }}>戦場から</h3>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() =>
        handleAction(() => sendCommand({ type: "tap-card", playerId, cardInstanceId: instance.instanceId, tapped: !instance.tapped }))
      }>
        {instance.tapped ? "アンタップ" : "タップ"}
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("shared-graveyard")}>
        墓地へ送る
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("exile")}>
        追放する
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("hand")}>
        手札へ戻す
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("shared-library", "top")}>
        ライブラリートップへ
      </button>
      <div style={{ marginBottom: "6px" }}>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>コントロール変更先のプレイヤーID</p>
        {Object.keys(gameState.players).filter(pid => pid !== instance.controllerPlayerId).map(pid => (
          <button key={pid} className="secondary small" style={{ marginBottom: "4px", width: "100%" }} onClick={() =>
            handleAction(() => sendCommand({ type: "set-controller", playerId, cardInstanceId: instance.instanceId, controllerPlayerId: pid }))
          }>
            → {gameState.players[pid].displayName}
          </button>
        ))}
      </div>
    </>
  );

  const stackActions = (
    <>
      <h3 style={{ marginBottom: "8px", color: "var(--accent)" }}>スタックから</h3>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => {
        const stackItem = gameState.stack.find(s => s.cardInstanceId === instance.instanceId);
        if (stackItem) {
          handleAction(() => sendCommand({ type: "resolve-top-of-stack", playerId }));
        }
      }}>
        解決する
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => {
        const stackItem = gameState.stack.find(s => s.cardInstanceId === instance.instanceId);
        if (stackItem) {
          handleAction(() => sendCommand({ type: "counter-spell", playerId, stackItemId: stackItem.stackItemId, toLibraryTop: false }));
        }
      }}>
        打ち消す（墓地へ）
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => {
        const stackItem = gameState.stack.find(s => s.cardInstanceId === instance.instanceId);
        if (stackItem) {
          handleAction(() => sendCommand({ type: "counter-spell", playerId, stackItemId: stackItem.stackItemId, toLibraryTop: true }));
        }
      }}>
        打ち消してライブラリートップへ（Memory Lapse）
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("shared-graveyard")}>
        墓地へ送る
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("hand")}>
        手札へ戻す
      </button>
    </>
  );

  const graveyardActions = (
    <>
      <h3 style={{ marginBottom: "8px", color: "var(--accent)" }}>墓地から</h3>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("shared-library", "top")}>
        ライブラリートップへ
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("hand")}>
        手札へ戻す
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("exile")}>
        追放する
      </button>
    </>
  );

  const exileActions = (
    <>
      <h3 style={{ marginBottom: "8px", color: "var(--accent)" }}>追放ゾーンから</h3>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("hand")}>
        手札へ戻す
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("battlefield")}>
        戦場へ
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("shared-graveyard")}>
        墓地へ
      </button>
      <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("shared-library", "top")}>
        ライブラリートップへ
      </button>
    </>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "480px" }}>
        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
            <CardView instance={instance} size="md" />
            <button className="secondary small" style={{ width: "100%" }} onClick={() => setShowDetail(true)}>
              説明 / 拡大
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ marginBottom: "4px", fontSize: "1rem" }}>{instance.name}</h2>
            {instance.annotations && (
              <p style={{ color: "var(--warning)", fontSize: "12px", marginBottom: "8px" }}>
                メモ: {instance.annotations}
              </p>
            )}
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {zone === "hand" && handActions}
              {zone === "battlefield" && battlefieldActions}
              {zone === "stack" && stackActions}
              {zone === "shared-graveyard" && graveyardActions}
              {zone === "exile" && exileActions}
              {zone === "shared-library" && (
                <>
                  <button className="secondary" style={{ width: "100%", marginBottom: "6px" }} onClick={() => moveCard("hand")}>
                    手札へ（チート）
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <button className="secondary" style={{ width: "100%", marginTop: "10px" }} onClick={onClose}>
          閉じる
        </button>
      </div>

      {showDetail && (
        <div
          className="modal-overlay"
          style={{ zIndex: 2000 }}
          onClick={(e) => { e.stopPropagation(); setShowDetail(false); }}
        >
          <div
            className="modal"
            style={{ maxWidth: "340px", padding: "16px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {cardData?.imageUris?.large ? (
              <img
                src={cardData.imageUris.large}
                alt={instance.name}
                style={{ width: "100%", borderRadius: "10px", display: "block", marginBottom: "10px" }}
              />
            ) : cardData?.imageUris?.normal ? (
              <img
                src={cardData.imageUris.normal}
                alt={instance.name}
                style={{ width: "100%", borderRadius: "10px", display: "block", marginBottom: "10px" }}
              />
            ) : null}
            <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }}>
              {cardData?.printedName ?? instance.name}
              {cardData?.manaCost && (
                <span style={{ color: "var(--accent)", marginLeft: "8px", fontWeight: "normal", fontSize: "13px" }}>{cardData.manaCost}</span>
              )}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
              {cardData?.printedTypeLine ?? cardData?.typeLine ?? ""}
            </div>
            {(cardData?.printedText ?? cardData?.oracleText) && (
              <div style={{ fontSize: "12px", lineHeight: "1.6", whiteSpace: "pre-wrap", marginBottom: "6px" }}>
                {cardData?.printedText ?? cardData?.oracleText}
              </div>
            )}
            {cardData?.power && (
              <div style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "right" }}>
                {cardData.power}/{cardData.toughness}
              </div>
            )}
            <button className="secondary" style={{ width: "100%", marginTop: "12px" }} onClick={() => setShowDetail(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
