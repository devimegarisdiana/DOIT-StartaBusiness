import { useNavigate } from "react-router-dom";
import { useState } from "react";

const URL = "https://app.kusmintarti-akuntansi-polinema.com/login";

export default function KompetensiPage() {
  const navigate = useNavigate();
  const [blocked, setBlocked] = useState(false);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 50, background: "#f0f8ff" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 flex-shrink-0" style={{ background: "#1a3a6b" }}>
        <button onClick={() => navigate("/")} className="text-white text-2xl w-9 h-9 flex items-center justify-center rounded-xl" style={{ background: "rgba(255,255,255,0.12)" }}>
          ‹
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-white font-black text-sm truncate">Pengukuran Kompetensi</div>
          <div className="text-blue-300 text-[10px] truncate">app.kusmintarti-akuntansi-polinema.com</div>
        </div>
        <a href={URL} target="_blank" rel="noopener noreferrer"
          className="text-xs font-black text-blue-200 px-2.5 py-1.5 rounded-xl flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.1)" }}>
          🔗 Buka
        </a>
      </div>

      {/* Iframe or fallback */}
      {blocked ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
          <div className="text-5xl">🔒</div>
          <div className="font-black text-gray-700 text-lg">Tidak bisa dimuat di sini</div>
          <p className="text-sm text-gray-500">Website ini tidak mengizinkan tampil di dalam frame. Buka langsung di browser.</p>
          <a href={URL} target="_blank" rel="noopener noreferrer"
            className="w-full py-4 rounded-2xl text-white font-black text-base text-center"
            style={{ background: "linear-gradient(135deg,#d97706,#f59e0b)" }}>
            🎯 Buka di Browser
          </a>
          <button onClick={() => navigate("/")} className="text-sm text-gray-400 font-bold">← Kembali ke Beranda</button>
        </div>
      ) : (
        <iframe
          src={URL}
          className="flex-1 w-full border-0"
          title="Pengukuran Kompetensi Kewirausahaan"
          onError={() => setBlocked(true)}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
          style={{ minHeight: 0 }}
        />
      )}
    </div>
  );
}
