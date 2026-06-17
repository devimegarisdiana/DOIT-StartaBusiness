import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useState, useCallback } from "react";
import Home from "./pages/Home";
import GamePage from "./pages/GamePage";
import Leaderboard from "./pages/Leaderboard";
import Riwayat from "./pages/Riwayat";
import Pengaturan from "./pages/Pengaturan";
import AdminDashboard from "./pages/AdminDashboard";
import PanduanViewer from "./pages/PanduanViewer";
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

  const hideNav = location.pathname === "/game" || location.pathname.startsWith("/admin") || location.pathname === "/panduan";
  if (hideNav) return null;

  return (
    <div className="flex-shrink-0 w-full flex items-center justify-around z-50"
      style={{
        background: "rgba(6,14,32,0.96)",
        backdropFilter: "blur(28px)",
        WebkitBackdropFilter: "blur(28px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.28), 0 -1px 0 rgba(255,255,255,0.04)",
        paddingTop: 8, paddingBottom: 14,
      }}>
      {NAV_ITEMS.map(nav => {
        const active = activeId === nav.id;
        return (
          <button key={nav.id} onClick={() => navigate(nav.path)}
            className="flex flex-col items-center gap-1 min-w-[56px] relative">
            {/* Gold top indicator */}
            {active && (
              <div style={{
                position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                width: 24, height: 2.5, borderRadius: 99,
                background: "linear-gradient(90deg,#f59e0b,#fbbf24)",
                boxShadow: "0 0 8px rgba(245,158,11,0.8)",
              }}/>
            )}
            <div style={{
              width: 40, height: 40, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
              background: active
                ? "linear-gradient(135deg,rgba(245,158,11,0.18),rgba(251,191,36,0.1))"
                : "transparent",
              border: active
                ? "1px solid rgba(245,158,11,0.3)"
                : "1px solid transparent",
              transition: "all 0.22s", fontSize: 19,
              boxShadow: active ? "0 0 16px rgba(245,158,11,0.2)" : "none",
            }}>{nav.icon}</div>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 0.5,
              color: active ? "#fbbf24" : "rgba(255,255,255,0.28)",
              transition: "color 0.22s",
            }}>{nav.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function AppContent() {
  const [splashDone, setSplashDone] = useState(() => {
    // Skip splash if: already seen (localStorage persists), or if directly on /game
    return !!localStorage.getItem("doitSplashSeen") || window.location.pathname === "/game";
  });
  const { theme } = useTheme();
  const t = THEMES[theme];

  const handleSplashDone = useCallback(() => {
    localStorage.setItem("doitSplashSeen", "1");
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
          <Route path="/panduan" element={<PanduanViewer />} />
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
