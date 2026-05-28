import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import GamePage from "./pages/GamePage";
import Leaderboard from "./pages/Leaderboard";
import Riwayat from "./pages/Riwayat";
import Pengaturan from "./pages/Pengaturan";

const NAV_ITEMS = [
  { id: "beranda", label: "Beranda", icon: "🏠", path: "/" },
  { id: "leaderboard", label: "Leaderboard", icon: "🏆", path: "/leaderboard" },
  { id: "riwayat", label: "Riwayat", icon: "📈", path: "/riwayat" },
  { id: "pengaturan", label: "Pengaturan", icon: "⚙️", path: "/pengaturan" },
];

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeId =
    location.pathname === "/"
      ? "beranda"
      : NAV_ITEMS.find(n => location.pathname.startsWith(n.path) && n.path !== "/")?.id ?? "beranda";

  const hideNav = location.pathname === "/game";

  if (hideNav) return null;

  return (
    <div
      className="flex-shrink-0 w-full flex items-center justify-around px-4 py-2.5 z-50"
      style={{ background: "#1a3a6b" }}
    >
      {NAV_ITEMS.map(nav => (
        <button
          key={nav.id}
          onClick={() => navigate(nav.path)}
          className="flex flex-col items-center gap-0.5 min-w-[56px]"
        >
          <span className="text-xl">{nav.icon}</span>
          <span
            className="text-[10px] font-semibold"
            style={{ color: activeId === nav.id ? "#7eb8f5" : "#a0b8d8" }}
          >
            {nav.label}
          </span>
          {activeId === nav.id && (
            <div className="w-1 h-1 rounded-full bg-blue-400" />
          )}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-[#d6eeff] flex items-start justify-center">
      <div
        className="relative w-full max-w-[430px] min-h-screen flex flex-col"
        style={{ fontFamily: "'Inter', 'Nunito', sans-serif" }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/riwayat" element={<Riwayat />} />
          <Route path="/pengaturan" element={<Pengaturan />} />
        </Routes>
        <BottomNav />
      </div>
    </div>
  );
}
