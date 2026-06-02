import { useNavigate } from "react-router-dom";

const CARDS = [
  {
    num: "01", icon: "📘", title: "Panduan Permainan",
    desc: "Baca panduan lengkap aturan, komponen, dan cara bermain DO IT.",
    color: "#2478d4", light: "#eff6ff", border: "#bfdbfe",
    badge: "PDF Guide", action: "/panduan", external: false,
  },
  {
    num: "02", icon: "🎮", title: "Mulai Game",
    desc: "Buat atau gabung room, catat transaksi, dan hitung KAP secara real-time.",
    color: "#16a34a", light: "#f0fdf4", border: "#bbf7d0",
    badge: "Multiplayer", action: "/game", external: false,
  },
  {
    num: "03", icon: "🎯", title: "Intensi Kewirausahaan",
    desc: "Isi kuesioner untuk mengukur KAP sebelum dan sesudah bermain.",
    color: "#d97706", light: "#fffbeb", border: "#fde68a",
    badge: "Kuesioner", action: "/kuesioner", external: false,
  },
];

export default function Home() {
  const navigate = useNavigate();
  const institution = localStorage.getItem("doitInstitution") || "POLINEMA";

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#e8f4ff" }}>

      {/* ── HERO ── */}
      <div style={{ position: "relative", borderRadius: "0 0 28px 28px", overflow: "hidden" }}>
        <img
          src="/hero-bg.png"
          alt="DO IT hero"
          style={{ width: "100%", display: "block" }}
        />
        {/* Gradient fade at bottom */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:56,
          background:"linear-gradient(to bottom, transparent, #e8f4ff)",
        }}/>
        {/* Institution badge */}
        <div style={{
          position:"absolute", bottom:10, left:12,
          display:"inline-flex", alignItems:"center", gap:5,
          background:"rgba(255,255,255,0.88)", borderRadius:18, padding:"4px 12px",
          border:"1.5px solid rgba(36,120,212,0.2)", backdropFilter:"blur(10px)",
          boxShadow:"0 2px 10px rgba(0,0,0,0.1)",
        }}>
          <span style={{ fontSize:11 }}>🏫</span>
          <span style={{ color:"#1a3a6b", fontSize:10, fontWeight:800 }}>{institution}</span>
        </div>
        {/* v2.0 badge */}
        <div style={{
          position:"absolute", bottom:10, right:12,
          background:"rgba(255,255,255,0.88)", borderRadius:18, padding:"4px 11px",
          border:"1.5px solid rgba(36,120,212,0.2)", backdropFilter:"blur(10px)",
          boxShadow:"0 2px 10px rgba(0,0,0,0.1)",
        }}>
          <span style={{ color:"#2478d4", fontSize:9, fontWeight:800, letterSpacing:1.5 }}>v2.0 ✨ PREMIUM</span>
        </div>
      </div>

      {/* ── ACTION CARDS ── */}
      <div style={{ padding:"20px 16px 8px", display:"flex", flexDirection:"column", gap:12 }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
          <span style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:1.5 }}>FITUR UTAMA</span>
          <span style={{ fontSize:16 }}>🚀</span>
        </div>

        {CARDS.map(card => (
          <button key={card.num}
            onClick={() => { if (!card.action) return; if (card.external) window.open(card.action, "_blank"); else navigate(card.action); }}
            style={{
              width:"100%", textAlign:"left", background:"#fff",
              border:`1.5px solid ${card.border}`,
              borderRadius:20, padding:16, cursor:"pointer",
              boxShadow:"0 2px 12px rgba(36,120,212,0.08)",
              transition:"all 0.18s", position:"relative", overflow:"hidden",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow=`0 6px 20px rgba(36,120,212,0.14)`; }}
            onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 12px rgba(36,120,212,0.08)"; }}
          >
            {/* Colored top strip */}
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, borderRadius:"20px 20px 0 0", background:`linear-gradient(90deg,${card.color},${card.color}88)` }}/>

            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{
                width:52, height:52, borderRadius:16, display:"flex", alignItems:"center",
                justifyContent:"center", fontSize:26, flexShrink:0, background:card.light,
                border:`1.5px solid ${card.border}`,
              }}>{card.icon}</div>

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                  <span style={{ fontWeight:900, fontSize:14, color:"#1e293b" }}>{card.title}</span>
                </div>
                <p style={{ fontSize:11, color:"#64748b", lineHeight:1.5, margin:"0 0 8px" }}>{card.desc}</p>
                <div style={{
                  display:"inline-flex", alignItems:"center", gap:4,
                  background:card.light, border:`1px solid ${card.border}`,
                  borderRadius:6, padding:"2px 10px",
                }}>
                  <span style={{ fontSize:9, fontWeight:800, color:card.color, letterSpacing:0.5 }}>{card.badge}</span>
                </div>
              </div>

              <div style={{
                width:36, height:36, borderRadius:12, display:"flex", alignItems:"center",
                justifyContent:"center", background:card.color, flexShrink:0,
                boxShadow:`0 4px 12px ${card.color}40`,
              }}>
                <span style={{ color:"#fff", fontSize:18, lineHeight:1, fontWeight:900 }}>›</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── QUICK LINKS ── */}
      <div style={{ padding:"4px 16px 20px", display:"flex", flexDirection:"column", gap:10 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
          <span style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:1.5 }}>NAVIGASI CEPAT</span>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <button onClick={()=>navigate("/leaderboard")} style={{
            background:"linear-gradient(135deg,#fef3c7,#fde68a)",
            border:"1.5px solid #fbbf24", borderRadius:18, padding:"14px 8px",
            textAlign:"center", cursor:"pointer",
            boxShadow:"0 2px 8px rgba(245,158,11,0.2)", transition:"all 0.18s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 16px rgba(245,158,11,0.3)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 8px rgba(245,158,11,0.2)";}}>
            <div style={{ fontSize:24, marginBottom:5 }}>🏆</div>
            <div style={{ fontSize:12, fontWeight:800, color:"#92400e" }}>Leaderboard</div>
            <div style={{ fontSize:9, color:"#a16207", marginTop:1 }}>Papan Skor Juara</div>
          </button>
          <button onClick={()=>navigate("/pengaturan")} style={{
            background:"linear-gradient(135deg,#eff6ff,#dbeafe)",
            border:"1.5px solid #93c5fd", borderRadius:18, padding:"14px 8px",
            textAlign:"center", cursor:"pointer",
            boxShadow:"0 2px 8px rgba(36,120,212,0.15)", transition:"all 0.18s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 6px 16px rgba(36,120,212,0.25)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="0 2px 8px rgba(36,120,212,0.15)";}}>
            <div style={{ fontSize:24, marginBottom:5 }}>⚙️</div>
            <div style={{ fontSize:12, fontWeight:800, color:"#1e40af" }}>Pengaturan</div>
            <div style={{ fontSize:9, color:"#3b82f6", marginTop:1 }}>Tema & Profil</div>
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign:"center", paddingTop:4 }}>
          <span style={{ fontSize:9, color:"#94a3b8", letterSpacing:2, textTransform:"uppercase" }}>
            POLINEMA × COMIC CAFE © 2025
          </span>
        </div>
      </div>
    </div>
  );
}
