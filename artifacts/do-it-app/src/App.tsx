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
        background: "rgba(8,18,36,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        paddingTop: 10, paddingBottom: 14,
      }}>
      {NAV_ITEMS.map(nav => {
        const active = activeId === nav.id;
        return (
          <button key={nav.id} onClick={() => navigate(nav.path)}
            className="flex flex-col items-center gap-1 min-w-[56px] relative">
            {active && (
              <div style={{
                position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
                width: 32, height: 2, borderRadius: 99,
                background: "linear-gradient(90deg,#2478d4,#60a5fa)",
              }}/>
            )}
            <div style={{
              width: 36, height: 36, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center",
              background: active ? "rgba(36,120,212,0.15)" : "transparent",
              border: active ? "1px solid rgba(36,120,212,0.25)" : "1px solid transparent",
              transition: "all 0.2s",
              fontSize: 18,
            }}>{nav.icon}</div>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0.3,
              color: active ? "#60a5fa" : "rgba(255,255,255,0.25)",
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
    <div className="min-h-screen flex items-start justify-center" style={{ background: "#060e1c" }}>
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
