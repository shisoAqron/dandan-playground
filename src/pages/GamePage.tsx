import { useNavigate } from "react-router-dom";
import { useMatchStore } from "../store/matchStore";
import GameBoard from "../components/game/GameBoard";

export default function GamePage() {
  const navigate = useNavigate();
  const gameState = useMatchStore((s) => s.gameState);

  if (!gameState) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
        <p style={{ color: "var(--text-muted)" }}>ゲームが見つかりません</p>
        <button className="secondary" onClick={() => navigate("/")}>トップへ戻る</button>
      </div>
    );
  }

  return <GameBoard isLocal={false} />;
}
