import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import Home from "./pages/Home";
import GamePage from "./pages/GamePage";
import Leaderboard from "./pages/Leaderboard";
import Riwayat from "./pages/Riwayat";
import Pengaturan from "./pages/Pengaturan";
import AdminDashboard from "./pages/AdminDashboard";
import SplashScreen from "./components/SplashScreen";
import { ThemeProvider, useTheme, THEMES } from "./contexts/ThemeContext";

const NAV_ITEMS = [
  { id: "beranda",    label: "Beranda",    icon: "🏠", path: "/" },
  { id: "leaderboard",label: "Leaderboard",icon: "🏆", path: "/leaderboard" },
  { id: "riwayat",    label: "Riwayat",    icon: "📈", path: "/riwayat" },
  { id: "pengaturan", label: "Pengaturan", icon: "⚙️", path: "/pengaturan" },
];

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const t = THEMES[theme];

  const activeId =
    location.pathname === "/"
      ? "beranda"
      : NAV_ITEMS.find(n => location.pathname.startsWith(n.path) && n.path !== "/")?.id ?? "beranda";

  const hideNav = location.pathname === "/game" || location.pathname.startsWith("/admin");
  if (hideNav) return null;

  return (
    <div className="flex-shrink-0 w-full flex items-center justify-around px-4 py-2.5 z-50"
      style={{ background: t.header }}>
      {NAV_ITEMS.map(nav => (
        <button key={nav.id} onClick={() => navigate(nav.path)}
          className="flex flex-col items-center gap-0.5 min-w-[56px]">
          <span className="text-xl">{nav.icon}</span>
          <span className="text-[10px] font-semibold"
            style={{ color: activeId === nav.id ? "#7eb8f5" : "#a0b8d8" }}>
            {nav.label}
          </span>
          {activeId === nav.id && <div className="w-1 h-1 rounded-full bg-blue-400" />}
        </button>
      ))}
    </div>
  );
}

function AppContent() {
  const [splashDone, setSplashDone] = useState(() => {
    return !!sessionStorage.getItem("doitSplashSeen");
  });
  const { theme } = useTheme();
  const t = THEMES[theme];

  const handleSplashDone = useCallback(() => {
    sessionStorage.setItem("doitSplashSeen", "1");
    setSplashDone(true);
  }, []);

  return (
    <div className="min-h-screen flex items-start justify-center" style={{ background: t.bg }}>
      {!splashDone && <SplashScreen onDone={handleSplashDone} />}
      <div className="relative w-full max-w-[430px] min-h-screen flex flex-col"
        style={{ fontFamily: "'Inter', 'Nunito', sans-serif" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/riwayat" element={<Riwayat />} />
          <Route path="/pengaturan" element={<Pengaturan />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
