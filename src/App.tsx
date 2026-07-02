import { Routes, Route } from "react-router-dom";
import TopPage from "./pages/TopPage";
import CreatePage from "./pages/CreatePage";
import JoinPage from "./pages/JoinPage";
import GamePage from "./pages/GamePage";
import LocalGamePage from "./pages/LocalGamePage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TopPage />} />
      <Route path="/create" element={<CreatePage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/game" element={<GamePage />} />
      <Route path="/local" element={<LocalGamePage />} />
    </Routes>
  );
}
