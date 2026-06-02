import { useNavigate } from "react-router-dom";

const CARDS = [
  {
    num: "01", icon: "📘", title: "Panduan Permainan",
    desc: "Unduh buku panduan lengkap aturan, komponen, dan cara bermain DO IT.",
    color: "#2478d4", light: "#eff6ff", border: "#bfdbfe",
    badge: "PDF Guide", action: "/panduan.pdf", external: true,
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
      <div style={{
        background: "linear-gradient(160deg, #1a4fa0 0%, #2478d4 50%, #4a9fe8 100%)",
        borderRadius: "0 0 36px 36px",
        padding: "20px 16px 28px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Decorative circles */}
        <div style={{ position:"absolute", top:-40, right:-30, width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }}/>
        <div style={{ position:"absolute", top:20, right:20, width:80, height:80, borderRadius:"50%", background:"rgba(255,255,255,0.06)" }}/>
        <div style={{ position:"absolute", bottom:-20, left:-20, width:120, height:120, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }}/>

        {/* Top bar */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, position:"relative", zIndex:1 }}>
          <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:10, padding:"4px 12px", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.2)" }}>
            <span style={{ color:"#fff", fontSize:9, fontWeight:800, letterSpacing:2 }}>POLINEMA × COMIC CAFE</span>
          </div>
          <div style={{ background:"rgba(255,255,255,0.15)", borderRadius:10, padding:"4px 12px", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.2)" }}>
            <span style={{ color:"#fff", fontSize:9, fontWeight:800, letterSpacing:1.5 }}>v2.0 ✨</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12, position:"relative", zIndex:1 }}>
          <div style={{
            width:72, height:72, borderRadius:22, background:"rgba(255,255,255,0.15)",
            border:"2px solid rgba(255,255,255,0.3)", display:"flex", alignItems:"center",
            justifyContent:"center", fontSize:38, flexShrink:0, backdropFilter:"blur(10px)",
          }}>🎂</div>
          <div>
            <h1 style={{
              fontFamily:"'Nunito','Inter',sans-serif", fontWeight:900,
              fontSize:52, lineHeight:0.95, letterSpacing:-3, color:"#fff",
              margin:0, textShadow:"0 4px 20px rgba(0,0,0,0.2)",
            }}>DO IT</h1>
            <p style={{ color:"#fde68a", fontWeight:900, fontSize:12, letterSpacing:4, margin:"4px 0 0", textTransform:"uppercase" }}>
              START A BUSINESS
            </p>
          </div>
        </div>

        <p style={{ color:"rgba(255,255,255,0.75)", fontSize:12, lineHeight:1.6, margin:"0 0 16px", position:"relative", zIndex:1, maxWidth:300 }}>
          Media pembelajaran kewirausahaan berbasis simulasi mengelola usaha cafe ☕
        </p>

        {/* Stats row */}
        <div style={{ display:"flex", gap:8, position:"relative", zIndex:1 }}>
          {[{val:"4",label:"Pemain",emoji:"👥"},{val:"4",label:"Ronde",emoji:"🔄"},{val:"5",label:"Aspek KAP",emoji:"⭐"}].map(s=>(
            <div key={s.label} style={{
              flex:1, background:"rgba(255,255,255,0.15)", borderRadius:14, padding:"10px 6px",
              textAlign:"center", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,0.2)",
            }}>
              <div style={{ fontSize:16, marginBottom:2 }}>{s.emoji}</div>
              <div style={{ color:"#fff", fontWeight:900, fontSize:18, lineHeight:1 }}>{s.val}</div>
              <div style={{ color:"rgba(255,255,255,0.65)", fontSize:9, marginTop:2, fontWeight:600 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Institution badge */}
        <div style={{ marginTop:14, display:"inline-flex", alignItems:"center", gap:6, position:"relative", zIndex:1,
          background:"rgba(255,255,255,0.15)", borderRadius:20, padding:"6px 14px",
          border:"1px solid rgba(255,255,255,0.25)", backdropFilter:"blur(10px)" }}>
          <span style={{ fontSize:12 }}>🏫</span>
          <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>{institution}</span>
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
