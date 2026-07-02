import { useState, useCallback, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import type { CardInstance } from "../../types/card";
import dandanCardsRaw from "../../data/dandan-cards.json";
import type { CardData } from "../../types/card";

const cardDataList = dandanCardsRaw as CardData[];
const cardDataMap = new Map(cardDataList.map((c) => [c.id, c]));

type Props = {
  instance: CardInstance;
  size?: "xs" | "sm" | "md" | "lg";
  selected?: boolean;
  onClick?: () => void;
  showTapped?: boolean;
  faceDown?: boolean;
};

const SIZES = {
  xs: 50,
  sm: 70,
  md: 100,
  lg: 140,
};

// ツールチップの幅（px）
const TOOLTIP_WIDTH = 220;
const TOOLTIP_OFFSET = 12;

type TooltipState = {
  x: number;
  y: number;
};

function CardTooltip({ instance, cardData, pos }: { instance: CardInstance; cardData: CardData | undefined; pos: TooltipState }) {
  const ref = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState<{ left: number; top: number } | null>(null);
  const imgUrl = cardData?.imageUris?.large ?? cardData?.imageUris?.normal;

  // 実際のレンダリングサイズを測定してからビューポート内に収まる位置を確定する
  useLayoutEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // まずカーソルの右下に置く
    let left = pos.x + TOOLTIP_OFFSET;
    let top = pos.y + TOOLTIP_OFFSET;

    // 右端をはみ出すなら左側に表示
    if (left + rect.width > vw - 8) {
      left = pos.x - rect.width - TOOLTIP_OFFSET;
    }
    // それでも左端をはみ出すなら左端に寄せる
    if (left < 8) {
      left = 8;
    }
    // 下端をはみ出すなら上側に表示
    if (top + rect.height > vh - 8) {
      top = pos.y - rect.height - TOOLTIP_OFFSET;
    }
    // それでも上端をはみ出すなら上端に寄せる
    if (top < 8) {
      top = 8;
    }

    setAdjustedPos({ left, top });
  }, [pos.x, pos.y]);

  // 位置確定前は非表示にしてレイアウトが一度だけ見えるのを防ぐ
  const style = adjustedPos
    ? { left: adjustedPos.left, top: adjustedPos.top, width: TOOLTIP_WIDTH, visibility: "visible" as const }
    : { left: pos.x + TOOLTIP_OFFSET, top: pos.y + TOOLTIP_OFFSET, width: TOOLTIP_WIDTH, visibility: "hidden" as const };

  return createPortal(
    <div ref={ref} className="card-tooltip" style={style}>
      {imgUrl ? (
        <img
          src={imgUrl}
          alt={instance.name}
          style={{ width: "100%", borderRadius: "8px", display: "block" }}
        />
      ) : (
        <div className="card-tooltip-text-body">
          <div className="card-tooltip-name">{cardData?.printedName ?? instance.name}</div>
          {cardData?.manaCost && (
            <div className="card-tooltip-mana">{cardData.manaCost}</div>
          )}
          <div className="card-tooltip-type">{cardData?.printedTypeLine ?? cardData?.typeLine ?? ""}</div>
          {(cardData?.printedText ?? cardData?.oracleText) && (
            <div className="card-tooltip-oracle">{cardData?.printedText ?? cardData?.oracleText}</div>
          )}
          {cardData?.power && (
            <div className="card-tooltip-pt">
              {cardData.power}/{cardData.toughness}
            </div>
          )}
        </div>
      )}
      {/* 画像がある場合でもテキストを下に表示 */}
      {imgUrl && (
        <div className="card-tooltip-text-body" style={{ marginTop: "6px" }}>
          <div className="card-tooltip-name">{cardData?.printedName ?? instance.name}</div>
          {cardData?.manaCost && (
            <div className="card-tooltip-mana">{cardData.manaCost}</div>
          )}
          <div className="card-tooltip-type">{cardData?.printedTypeLine ?? cardData?.typeLine ?? ""}</div>
          {(cardData?.printedText ?? cardData?.oracleText) && (
            <div className="card-tooltip-oracle">{cardData?.printedText ?? cardData?.oracleText}</div>
          )}
          {cardData?.power && (
            <div className="card-tooltip-pt">
              {cardData.power}/{cardData.toughness}
            </div>
          )}
        </div>
      )}
    </div>,
    document.body
  );
}

export default function CardView({ instance, size = "md", selected, onClick, showTapped = true, faceDown }: Props) {
  const cardData = cardDataMap.get(instance.cardId);
  const width = SIZES[size];
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setTooltip({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setTooltip(null), 80);
  }, []);

  const classes = [
    "card-view",
    showTapped && instance.tapped ? "tapped" : "",
    selected ? "selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (faceDown || instance.faceDown) {
    return (
      <div
        className={classes}
        style={{ width, cursor: onClick ? "pointer" : "default" }}
        onClick={onClick}
        title="裏向き"
      >
        <div className="card-placeholder">
          <div style={{ color: "var(--text-muted)", fontSize: "20px" }}>🂠</div>
        </div>
      </div>
    );
  }

  const imgUrl = cardData?.imageUris?.normal;

  return (
    <div
      className={classes}
      style={{ width, cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      title={instance.name}
    >
      {imgUrl ? (
        <img
          className="card-image"
          src={imgUrl}
          alt={instance.name}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <div className="card-placeholder">
          <div className="card-name">{instance.name}</div>
          <div className="card-type">{cardData?.typeLine ?? ""}</div>
          {cardData?.manaCost && (
            <div style={{ fontSize: "10px", color: "var(--accent)" }}>{cardData.manaCost}</div>
          )}
          {cardData?.power && (
            <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
              {cardData.power}/{cardData.toughness}
            </div>
          )}
        </div>
      )}
      {instance.counters.length > 0 && (
        <div style={{ position: "absolute", bottom: 2, right: 2, display: "flex", gap: "2px", flexWrap: "wrap" }}>
          {instance.counters.map((c, i) => (
            <span key={i} style={{ background: "var(--accent)", color: "#fff", fontSize: "10px", padding: "1px 4px", borderRadius: "4px" }}>
              {c.type}: {c.count}
            </span>
          ))}
        </div>
      )}
      {tooltip && <CardTooltip instance={instance} cardData={cardData} pos={tooltip} />}
    </div>
  );
}
