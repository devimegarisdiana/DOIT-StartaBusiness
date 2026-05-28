import { useState } from "react";

function App() {
  const [activeNav, setActiveNav] = useState("beranda");

  return (
    <div className="min-h-screen bg-[#e8f4ff] flex items-start justify-center">
      <div
        className="relative w-full max-w-[430px] min-h-screen flex flex-col bg-[#e8f4ff]"
        style={{ fontFamily: "'Inter', 'Nunito', sans-serif" }}
      >
        {/* ── HERO SECTION ── */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #87CEEB 0%, #5BB8F5 35%, #3da8e8 60%, #29a0e0 100%)" }}>
          {/* Clouds */}
          <div className="absolute top-14 left-4 w-20 h-8 bg-white rounded-full opacity-80" />
          <div className="absolute top-10 left-10 w-14 h-6 bg-white rounded-full opacity-70" />
          <div className="absolute top-12 right-8 w-24 h-8 bg-white rounded-full opacity-80" />
          <div className="absolute top-8 right-16 w-16 h-6 bg-white rounded-full opacity-70" />
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-32 h-7 bg-white rounded-full opacity-60" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-4 pt-5 pb-2">
            <button className="bg-white rounded-xl px-3 py-2 flex flex-col items-center shadow-sm min-w-[60px]">
              <div className="flex flex-col gap-1">
                <div className="w-5 h-0.5 bg-gray-700 rounded" />
                <div className="w-5 h-0.5 bg-gray-700 rounded" />
                <div className="w-5 h-0.5 bg-gray-700 rounded" />
              </div>
              <span className="text-[10px] font-semibold text-gray-700 mt-1">Menu</span>
            </button>

            <div className="flex flex-col items-center">
              <span className="text-2xl">🎂</span>
              <span className="text-[11px] font-bold text-gray-800 tracking-widest mt-0.5">POLINEMA × COMIC CAFE</span>
            </div>

            <button className="bg-white rounded-xl px-3 py-2 flex flex-col items-center shadow-sm min-w-[60px]">
              <div className="w-5 h-5 rounded-full border-2 border-gray-600 flex items-center justify-center">
                <span className="text-gray-600 text-[11px] font-bold leading-none">i</span>
              </div>
              <span className="text-[10px] font-semibold text-gray-700 mt-1">Tentang</span>
            </button>
          </div>

          {/* Title */}
          <div className="relative z-10 flex flex-col items-center px-4 pt-2 pb-0">
            <h1
              className="text-[80px] font-black leading-none tracking-tight text-center"
              style={{
                color: "#1a3a6b",
                WebkitTextStroke: "3px #fff",
                textShadow: "0 4px 0 rgba(0,0,0,0.18), 0 0 0 4px #fff",
                fontFamily: "'Nunito', 'Inter', sans-serif",
                letterSpacing: "-2px",
              }}
            >
              DO IT
            </h1>
            <h2
              className="text-[26px] font-black tracking-wider -mt-2"
              style={{ color: "#e03030", fontFamily: "'Nunito', 'Inter', sans-serif" }}
            >
              START A BUSINESS
            </h2>
            <div className="mt-2 px-5 py-1.5 rounded-md" style={{ background: "#1a3a6b" }}>
              <span className="text-white font-bold text-sm tracking-widest">BOARD GAME EDUKASI</span>
            </div>
          </div>

          {/* Scene illustration */}
          <div className="relative z-10 w-full" style={{ height: "200px" }}>
            {/* Ground / road */}
            <div className="absolute bottom-0 left-0 right-0 h-10" style={{ background: "#5a9a6a" }} />
            <div className="absolute bottom-8 left-0 right-0 h-3" style={{ background: "#888" }} />

            {/* Bakery building (left) */}
            <div className="absolute left-0 bottom-10" style={{ width: "160px", height: "160px" }}>
              {/* Building body */}
              <div className="absolute bottom-0 left-0" style={{ width: "150px", height: "120px", background: "#e8c080", borderRadius: "4px 4px 0 0" }} />
              {/* Roof */}
              <div className="absolute bottom-20 left-0" style={{ width: "155px", height: "40px", background: "#7bb8e8", borderRadius: "4px 4px 0 0" }} />
              {/* Awning */}
              <div className="absolute bottom-16 left-1" style={{ width: "148px", height: "18px", background: "#e05050", borderRadius: "2px" }} />
              {/* Sign ETU BAKERY */}
              <div className="absolute bottom-10 left-4" style={{ width: "90px", background: "#8B4513", borderRadius: "3px", padding: "2px 4px" }}>
                <span className="text-white font-black text-[9px] tracking-wider">ETU BAKERY</span>
              </div>
              {/* Door */}
              <div className="absolute bottom-0 left-12" style={{ width: "28px", height: "45px", background: "#8B4513", borderRadius: "3px 3px 0 0" }} />
              {/* Window */}
              <div className="absolute bottom-16 left-4" style={{ width: "35px", height: "30px", background: "#add8e6", border: "3px solid #8B4513", borderRadius: "2px" }} />
              <div className="absolute bottom-16 left-50 right-4" style={{ width: "35px", height: "30px", background: "#add8e6", border: "3px solid #8B4513", borderRadius: "2px", right: "8px" }} />
              {/* Open sign */}
              <div className="absolute bottom-4 left-0" style={{ width: "28px", background: "#4a9a4a", borderRadius: "3px", padding: "2px 3px" }}>
                <div className="text-white font-bold text-[7px]">☕</div>
                <div className="text-white font-bold text-[5px] text-center">open</div>
              </div>
            </div>

            {/* Trees */}
            <div className="absolute bottom-10" style={{ left: "160px" }}>
              <div style={{ width: "20px", height: "40px", background: "#5a8a5a", borderRadius: "50% 50% 30% 30%" }} />
              <div style={{ width: "8px", height: "15px", background: "#8B4513", margin: "0 auto" }} />
            </div>

            {/* Buildings in background */}
            <div className="absolute bottom-10 right-16" style={{ width: "50px", height: "90px", background: "#c8d8e8", borderRadius: "2px 2px 0 0" }}>
              <div className="grid grid-cols-2 gap-1 p-1 mt-2">
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} style={{ width: "18px", height: "12px", background: "#87CEEB", border: "1px solid #aaa", borderRadius: "1px" }} />
                ))}
              </div>
            </div>
            <div className="absolute bottom-10 right-4" style={{ width: "40px", height: "110px", background: "#d8e8d8", borderRadius: "2px 2px 0 0" }}>
              <div className="grid grid-cols-2 gap-1 p-1 mt-2">
                {[0,1,2,3,4,5,6,7].map(i => (
                  <div key={i} style={{ width: "14px", height: "10px", background: "#87CEEB", border: "1px solid #aaa", borderRadius: "1px" }} />
                ))}
              </div>
            </div>

            {/* Chef character (right side) */}
            <div className="absolute bottom-10 right-2" style={{ fontSize: "64px", lineHeight: 1 }}>
              👨‍🍳
            </div>

            {/* Trash can */}
            <div className="absolute bottom-10 right-28">
              <div style={{ width: "16px", height: "22px", background: "#666", borderRadius: "2px 2px 0 0", border: "1px solid #444" }} />
              <div style={{ width: "18px", height: "4px", background: "#555", borderRadius: "1px", marginLeft: "-1px" }} />
            </div>

            {/* Bottle */}
            <div className="absolute bottom-10 right-36">
              <div style={{ width: "10px", height: "24px", background: "#cc4444", borderRadius: "3px 3px 0 0" }} />
            </div>
          </div>

          {/* Description */}
          <div className="relative z-10 px-8 py-4 text-center" style={{ background: "rgba(255,255,255,0.15)" }}>
            <p className="text-[13px] text-gray-800 leading-relaxed font-medium">
              Media pembelajaran kewirausahaan berbasis simulasi mengelola usaha cafe. Cocok untuk kelas kecil, komunitas, pelatihan, dan program penguatan karakter wirausaha.
            </p>
          </div>
        </div>

        {/* ── ACTION CARDS ── */}
        <div className="flex-1 px-4 py-4 flex flex-col gap-4" style={{ background: "#d6eeff" }}>
          {/* Card 1 – Download Panduan */}
          <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-lg" style={{ background: "#2478d4" }}>
                1
              </div>
              <div className="w-16 h-16 flex items-center justify-center text-5xl">
                📘
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-gray-800 text-base leading-tight">Download Panduan</h3>
              <p className="text-[12px] text-gray-500 mt-1 leading-snug">
                Unduh buku panduan permainan DO IT: Start a Business untuk memahami aturan, komponen, dan cara bermain.
              </p>
            </div>
            <button
              className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md"
              style={{ background: "#2478d4" }}
            >
              ›
            </button>
          </div>

          {/* Card 2 – Memulai Game */}
          <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-lg" style={{ background: "#28a745" }}>
                2
              </div>
              <div className="w-16 h-16 flex items-center justify-center text-5xl">
                🧮
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-gray-800 text-base leading-tight">Memulai Game &<br />Hitung Keuangan</h3>
              <p className="text-[12px] text-gray-500 mt-1 leading-snug">
                Mulai permainan dan catat semua transaksi keuangan usahamu selama bermain secara real-time.
              </p>
            </div>
            <button
              className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md"
              style={{ background: "#28a745" }}
            >
              ›
            </button>
          </div>

          {/* Card 3 – Hitung Intensi */}
          <div className="bg-white rounded-2xl p-4 flex items-center gap-4 shadow-sm">
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-lg" style={{ background: "#f0a020" }}>
                3
              </div>
              <div className="w-16 h-16 flex items-center justify-center text-5xl">
                🎯
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-gray-800 text-base leading-tight">Hitung Intensi<br />Kewirausahaan</h3>
              <p className="text-[12px] text-gray-500 mt-1 leading-snug">
                Isi kuesioner untuk mengukur tingkat intensi kewirausahaan sebelum dan sesudah bermain.
              </p>
            </div>
            <button
              className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md"
              style={{ background: "#f0a020" }}
            >
              ›
            </button>
          </div>
        </div>

        {/* ── BOTTOM NAVIGATION ── */}
        <div
          className="sticky bottom-0 w-full flex items-center justify-around px-4 py-3 z-50"
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
              className="flex flex-col items-center gap-1 min-w-[56px]"
            >
              <span className="text-2xl">{nav.icon}</span>
              <span
                className="text-[11px] font-semibold"
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
