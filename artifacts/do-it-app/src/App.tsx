import { useState } from "react";

function App() {
  const [activeNav, setActiveNav] = useState("beranda");

  return (
    <div className="min-h-screen bg-[#d6eeff] flex items-start justify-center">
      <div
        className="relative w-full max-w-[430px] min-h-screen flex flex-col"
        style={{ fontFamily: "'Inter', 'Nunito', sans-serif" }}
      >
        {/* ── HERO SECTION (compact) ── */}
        <div
          className="relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #87CEEB 0%, #5BB8F5 55%, #3da8e8 100%)",
          }}
        >
          {/* Clouds */}
          <div className="absolute top-8 left-3 w-16 h-5 bg-white rounded-full opacity-80" />
          <div className="absolute top-5 left-10 w-10 h-4 bg-white rounded-full opacity-70" />
          <div className="absolute top-7 right-6 w-18 h-5 bg-white rounded-full opacity-80" style={{ width: "72px" }} />
          <div className="absolute top-4 right-14 w-12 h-4 bg-white rounded-full opacity-70" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-3 pt-3 pb-1">
            <button className="bg-white rounded-xl px-2.5 py-1.5 flex flex-col items-center shadow-sm min-w-[52px]">
              <div className="flex flex-col gap-[3px]">
                <div className="w-4 h-0.5 bg-gray-700 rounded" />
                <div className="w-4 h-0.5 bg-gray-700 rounded" />
                <div className="w-4 h-0.5 bg-gray-700 rounded" />
              </div>
              <span className="text-[9px] font-semibold text-gray-700 mt-0.5">Menu</span>
            </button>

            <div className="flex flex-col items-center">
              <span className="text-lg">🎂</span>
              <span className="text-[10px] font-bold text-gray-800 tracking-widest">POLINEMA × COMIC CAFE</span>
            </div>

            <button className="bg-white rounded-xl px-2.5 py-1.5 flex flex-col items-center shadow-sm min-w-[52px]">
              <div className="w-4 h-4 rounded-full border-2 border-gray-600 flex items-center justify-center">
                <span className="text-gray-600 text-[9px] font-bold leading-none">i</span>
              </div>
              <span className="text-[9px] font-semibold text-gray-700 mt-0.5">Tentang</span>
            </button>
          </div>

          {/* Title + Scene side by side */}
          <div className="relative z-10 flex items-center px-3 pt-1 pb-2 gap-2">
            {/* Left: title block */}
            <div className="flex flex-col items-start flex-shrink-0">
              <h1
                className="font-black leading-none tracking-tight"
                style={{
                  fontSize: "56px",
                  color: "#1a3a6b",
                  WebkitTextStroke: "2.5px #fff",
                  textShadow: "0 3px 0 rgba(0,0,0,0.15)",
                  fontFamily: "'Nunito', 'Inter', sans-serif",
                  letterSpacing: "-2px",
                }}
              >
                DO IT
              </h1>
              <h2
                className="font-black tracking-wider"
                style={{
                  fontSize: "15px",
                  color: "#e03030",
                  fontFamily: "'Nunito', 'Inter', sans-serif",
                  marginTop: "-4px",
                }}
              >
                START A BUSINESS
              </h2>
              <div className="mt-1.5 px-3 py-1 rounded-md" style={{ background: "#1a3a6b" }}>
                <span className="text-white font-bold" style={{ fontSize: "9px", letterSpacing: "1.5px" }}>
                  BOARD GAME EDUKASI
                </span>
              </div>
              <p className="text-[10px] text-gray-800 leading-snug font-medium mt-2" style={{ maxWidth: "190px" }}>
                Media pembelajaran kewirausahaan berbasis simulasi mengelola usaha cafe.
              </p>
            </div>

            {/* Right: scene illustration */}
            <div className="relative flex-1" style={{ height: "130px" }}>
              {/* Ground */}
              <div className="absolute bottom-0 left-0 right-0 h-6" style={{ background: "#5a9a6a" }} />
              <div className="absolute bottom-5 left-0 right-0 h-2" style={{ background: "#888" }} />

              {/* Bakery building */}
              <div className="absolute bottom-6 left-0" style={{ width: "90px", height: "90px" }}>
                <div className="absolute bottom-0 left-0" style={{ width: "85px", height: "68px", background: "#e8c080", borderRadius: "3px 3px 0 0" }} />
                <div className="absolute bottom-14 left-0" style={{ width: "88px", height: "24px", background: "#7bb8e8", borderRadius: "3px 3px 0 0" }} />
                <div className="absolute bottom-10 left-0" style={{ width: "85px", height: "12px", background: "#e05050" }} />
                <div className="absolute bottom-8 left-2" style={{ width: "52px", background: "#8B4513", borderRadius: "2px", padding: "1px 3px" }}>
                  <span className="text-white font-black" style={{ fontSize: "7px", letterSpacing: "0.5px" }}>ETU BAKERY</span>
                </div>
                <div className="absolute bottom-0 left-8" style={{ width: "18px", height: "28px", background: "#8B4513", borderRadius: "2px 2px 0 0" }} />
                <div className="absolute bottom-0 left-1" style={{ width: "16px", background: "#4a9a4a", borderRadius: "2px", padding: "1px 2px" }}>
                  <div className="text-white font-bold text-center" style={{ fontSize: "6px" }}>☕<br />open</div>
                </div>
              </div>

              {/* Tree */}
              <div className="absolute bottom-6" style={{ left: "90px" }}>
                <div style={{ width: "14px", height: "28px", background: "#5a8a5a", borderRadius: "50% 50% 30% 30%", marginLeft: "2px" }} />
                <div style={{ width: "6px", height: "10px", background: "#8B4513", margin: "0 auto" }} />
              </div>

              {/* Chef character */}
              <div className="absolute bottom-6 right-0" style={{ fontSize: "44px", lineHeight: 1 }}>
                👨‍🍳
              </div>
            </div>
          </div>
        </div>

        {/* ── ACTION CARDS ── */}
        <div className="flex-1 px-3 py-3 flex flex-col gap-3" style={{ background: "#d6eeff" }}>
          {/* Card 1 – Download Panduan */}
          <div className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-base"
                style={{ background: "#2478d4" }}
              >
                1
              </div>
              <div className="text-4xl">📘</div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-gray-800 text-sm leading-tight">Download Panduan</h3>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                Unduh buku panduan permainan DO IT: Start a Business untuk memahami aturan, komponen, dan cara bermain.
              </p>
            </div>
            <button
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md"
              style={{ background: "#2478d4" }}
            >
              ›
            </button>
          </div>

          {/* Card 2 – Memulai Game */}
          <div className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-base"
                style={{ background: "#28a745" }}
              >
                2
              </div>
              <div className="text-4xl">🧮</div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-gray-800 text-sm leading-tight">Memulai Game &<br />Hitung Keuangan</h3>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                Mulai permainan dan catat semua transaksi keuangan usahamu selama bermain secara real-time.
              </p>
            </div>
            <button
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md"
              style={{ background: "#28a745" }}
            >
              ›
            </button>
          </div>

          {/* Card 3 – Hitung Intensi */}
          <div className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm">
            <div className="flex-shrink-0 flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-base"
                style={{ background: "#f0a020" }}
              >
                3
              </div>
              <div className="text-4xl">🎯</div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-gray-800 text-sm leading-tight">Hitung Intensi<br />Kewirausahaan</h3>
              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                Isi kuesioner untuk mengukur tingkat intensi kewirausahaan sebelum dan sesudah bermain.
              </p>
            </div>
            <button
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md"
              style={{ background: "#f0a020" }}
            >
              ›
            </button>
          </div>
        </div>

        {/* ── BOTTOM NAVIGATION ── */}
        <div
          className="sticky bottom-0 w-full flex items-center justify-around px-4 py-2.5 z-50"
          style={{ background: "#1a3a6b" }}
        >
          {[
            { id: "beranda", label: "Beranda", icon: "🏠" },
            { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
            { id: "riwayat", label: "Riwayat", icon: "📈" },
            { id: "pengaturan", label: "Pengaturan", icon: "⚙️" },
          ].map((nav) => (
            <button
              key={nav.id}
              onClick={() => setActiveNav(nav.id)}
              className="flex flex-col items-center gap-0.5 min-w-[56px]"
            >
              <span className="text-xl">{nav.icon}</span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: activeNav === nav.id ? "#7eb8f5" : "#a0b8d8" }}
              >
                {nav.label}
              </span>
              {activeNav === nav.id && (
                <div className="w-1 h-1 rounded-full bg-blue-400" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
