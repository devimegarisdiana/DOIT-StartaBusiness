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

  const activeId =
    location.pathname === "/"
      ? "beranda"
      : NAV_ITEMS.find(n => location.pathname.startsWith(n.path) && n.path !== "/")?.id ?? "beranda";

  const hideNav = location.pathname === "/game" || location.pathname.startsWith("/admin");
  if (hideNav) return null;

  return (
    <div className="flex-shrink-0 w-full flex items-center justify-around z-50"
      style={{
        background: "#fff",
        borderTop: "1.5px solid #e2eeff",
        boxShadow: "0 -4px 20px rgba(36,120,212,0.08)",
        paddingTop: 8, paddingBottom: 12,
      }}>
      {NAV_ITEMS.map(nav => {
        const active = activeId === nav.id;
        return (
          <button key={nav.id} onClick={() => navigate(nav.path)}
            className="flex flex-col items-center gap-1 min-w-[56px] relative">
            {active && (
              <div style={{
                position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                width: 28, height: 3, borderRadius: 99,
                background: "linear-gradient(90deg,#1a3a6b,#2478d4)",
              }}/>
            )}
            <div style={{
              width: 38, height: 38, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
              background: active ? "#eff6ff" : "transparent",
              border: active ? "1.5px solid #bfdbfe" : "1.5px solid transparent",
              transition: "all 0.2s", fontSize: 18,
            }}>{nav.icon}</div>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0.3,
              color: active ? "#2478d4" : "#94a3b8",
              transition: "color 0.2s",
            }}>{nav.label}</span>
          </button>
        );
      })}
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
    <div className="min-h-screen flex items-start justify-center" style={{ background: "#c8e6ff" }}>
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
