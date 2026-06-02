import { useNavigate } from "react-router-dom";

export default function PanduanViewer() {
  const navigate = useNavigate();

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "#0f1e36",
      display: "flex", flexDirection: "column",
    }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px",
        background: "rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        flexShrink: 0,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 38, height: 38, borderRadius: 12,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff", fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >‹</button>

        <div style={{ flex: 1 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>
            📘 Panduan Permainan
          </div>
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 2 }}>
            DO IT: Start a Business — Board Game Edukasi
          </div>
        </div>

        <a
          href="/panduan.pdf"
          download="Panduan-DO-IT.pdf"
          style={{
            padding: "8px 14px", borderRadius: 10,
            background: "rgba(36,120,212,0.3)",
            border: "1px solid rgba(36,120,212,0.5)",
            color: "#60a5fa", fontSize: 11, fontWeight: 700,
            textDecoration: "none", flexShrink: 0,
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          ⬇ Unduh
        </a>
      </div>

      {/* PDF embed */}
      <iframe
        src="/panduan.pdf#toolbar=1&navpanes=0&scrollbar=1"
        title="Panduan Permainan DO IT"
        style={{
          flex: 1, width: "100%", border: "none",
          background: "#fff",
        }}
      />
    </div>
  );
}
