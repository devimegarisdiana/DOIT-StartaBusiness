import { useNavigate } from "react-router-dom";

const CARDS = [
  {
    num: "01", icon: "📘", title: "Panduan Permainan",
    desc: "Baca panduan lengkap aturan, komponen, dan cara bermain DO IT.",
    color: "#2563eb", grad: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
    badge: "PDF Guide", action: "/panduan",
  },
  {
    num: "02", icon: "🎮", title: "Mulai Game",
    desc: "Buat atau gabung room, catat transaksi, dan hitung KAP secara real-time.",
    color: "#059669", grad: "linear-gradient(135deg,#047857,#10b981)",
    badge: "Multiplayer", action: "/game",
  },
  {
    num: "03", icon: "🎯", title: "Intensi Kewirausahaan",
    desc: "Isi kuesioner untuk mengukur KAP sebelum dan sesudah bermain.",
    color: "#d97706", grad: "linear-gradient(135deg,#b45309,#f59e0b)",
    badge: "Kuesioner", action: "/kuesioner",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const institution = localStorage.getItem("doitInstitution") || "POLINEMA";

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{
      background: "linear-gradient(175deg, #d6ebff 0%, #e8f4ff 40%, #f0f8ff 100%)",
    }}>

      {/* ── HERO ── */}
      <div className="anim-hero" style={{ position:"relative", overflow:"hidden" }}>
        <img src="/hero-bg.png" alt="DO IT hero" style={{ width:"100%", display:"block" }}/>

        {/* Bottom gradient fade */}
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:64,
          background:"linear-gradient(to bottom, transparent, #e8f4ff)",
        }}/>

        {/* Institution pill — floats */}
        <div className="anim-float-slow" style={{
          position:"absolute", bottom:12, left:14,
          display:"inline-flex", alignItems:"center", gap:5,
          background:"rgba(255,255,255,0.92)", borderRadius:20, padding:"5px 13px",
          boxShadow:"0 4px 16px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,1)",
          border:"1px solid rgba(255,255,255,0.9)",
          backdropFilter:"blur(12px)",
        }}>
          <span style={{ fontSize:11 }}>🏫</span>
          <span style={{ color:"#0f2a5c", fontSize:10, fontWeight:800, letterSpacing:0.3 }}>{institution}</span>
        </div>

        {/* Premium badge — glows + floats offset */}
        <div className="anim-glow-pulse" style={{
          position:"absolute", bottom:12, right:14,
          background:"linear-gradient(135deg,#1e3a8a,#1d4ed8)",
          borderRadius:20, padding:"5px 12px",
          border:"1px solid rgba(99,160,255,0.3)",
          animationDelay: "0.8s",
        }}>
          <span style={{ color:"#fbbf24", fontSize:9, fontWeight:900, letterSpacing:1.8 }}>✦ v2.0 PREMIUM</span>
        </div>
      </div>

      {/* ── MAIN CARDS ── */}
      <div style={{ padding:"18px 16px 6px" }}>

        {/* Section header — slides in */}
        <div className="anim-slide-up" style={{
          display:"flex", alignItems:"center", gap:8, marginBottom:14, paddingLeft:2,
          animationDelay: "0.1s",
        }}>
          {/* Shimmer gold bar */}
          <div style={{
            width:3, height:16, borderRadius:2, flexShrink:0,
            background:"linear-gradient(180deg,#f59e0b,#fbbf24)",
            boxShadow:"0 0 6px rgba(245,158,11,0.6)",
          }}/>
          <span style={{ color:"#0f2a5c", fontSize:11, fontWeight:900, letterSpacing:2 }}>FITUR UTAMA</span>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {CARDS.map((card, i) => (
            <button key={card.num}
              className={`anim-slide-up tap-scale`}
              onClick={() => navigate(card.action)}
              style={{
                width:"100%", textAlign:"left", cursor:"pointer",
                background:"linear-gradient(160deg, #ffffff 0%, #f5f9ff 100%)",
                borderRadius:22, padding:"15px 14px",
                border:"1px solid rgba(200,225,255,0.8)",
                boxShadow:"0 4px 6px -1px rgba(0,0,0,0.06), 0 12px 32px rgba(15,42,92,0.1), inset 0 1px 0 rgba(255,255,255,0.9)",
                transition:"transform 0.18s, box-shadow 0.18s",
                position:"relative", overflow:"hidden",
                animationDelay: `${0.15 + i * 0.08}s`,
              }}
              onMouseEnter={e=>{
                e.currentTarget.style.transform="translateY(-2px)";
                e.currentTarget.style.boxShadow="0 8px 12px -2px rgba(0,0,0,0.08), 0 20px 40px rgba(15,42,92,0.16), inset 0 1px 0 rgba(255,255,255,0.9)";
              }}
              onMouseLeave={e=>{
                e.currentTarget.style.transform="translateY(0)";
                e.currentTarget.style.boxShadow="0 4px 6px -1px rgba(0,0,0,0.06), 0 12px 32px rgba(15,42,92,0.1), inset 0 1px 0 rgba(255,255,255,0.9)";
              }}
            >
              {/* Left accent bar */}
              <div style={{
                position:"absolute", top:12, left:0, width:3, height:"calc(100% - 24px)",
                borderRadius:"0 3px 3px 0", background:card.grad,
              }}/>

              <div style={{ display:"flex", alignItems:"center", gap:13, paddingLeft:6 }}>
                {/* Icon container */}
                <div style={{
                  width:52, height:52, borderRadius:17, display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:26, flexShrink:0,
                  background:card.grad,
                  boxShadow:`0 6px 18px ${card.color}45`,
                }}>
                  {card.icon}
                </div>

                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
                    <span style={{
                      fontSize:8, fontWeight:900, color:"#fff",
                      background:`linear-gradient(135deg,${card.color},${card.color}cc)`,
                      padding:"1px 6px", borderRadius:5, letterSpacing:0.5,
                    }}>{card.num}</span>
                    <span style={{ fontWeight:900, fontSize:14, color:"#0f1e36", letterSpacing:-0.3 }}>{card.title}</span>
                  </div>
                  <p style={{ fontSize:11, color:"#475569", lineHeight:1.55, margin:"0 0 7px" }}>{card.desc}</p>
                  <div style={{
                    display:"inline-flex", alignItems:"center", gap:4,
                    background:"rgba(15,42,92,0.06)", borderRadius:7, padding:"2px 9px",
                    border:"1px solid rgba(15,42,92,0.08)",
                  }}>
                    <span style={{ fontSize:9, fontWeight:800, color:card.color, letterSpacing:0.5 }}>{card.badge}</span>
                  </div>
                </div>

                {/* Arrow */}
                <div style={{
                  width:34, height:34, borderRadius:11, display:"flex", alignItems:"center",
                  justifyContent:"center", flexShrink:0,
                  background:card.grad,
                  boxShadow:`0 4px 12px ${card.color}40`,
                }}>
                  <span style={{ color:"#fff", fontSize:17, fontWeight:900, lineHeight:1 }}>›</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── QUICK LINKS ── */}
      <div style={{ padding:"14px 16px 24px" }}>

        <div className="anim-slide-up" style={{
          display:"flex", alignItems:"center", gap:8, marginBottom:14, paddingLeft:2,
          animationDelay: "0.38s",
        }}>
          <div style={{
            width:3, height:16, borderRadius:2, flexShrink:0,
            background:"linear-gradient(180deg,#f59e0b,#fbbf24)",
            boxShadow:"0 0 6px rgba(245,158,11,0.6)",
          }}/>
          <span style={{ color:"#0f2a5c", fontSize:11, fontWeight:900, letterSpacing:2 }}>NAVIGASI CEPAT</span>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            { icon:"🏆", label:"Leaderboard", sub:"Papan Skor Juara", path:"/leaderboard",
              grad:"linear-gradient(145deg,#78350f,#b45309,#f59e0b)", shadow:"rgba(180,83,9,0.4)", delay:"0.42s" },
            { icon:"⚙️", label:"Pengaturan", sub:"Tema & Profil", path:"/pengaturan",
              grad:"linear-gradient(145deg,#0f2a5c,#1d4ed8,#3b82f6)", shadow:"rgba(29,78,216,0.4)", delay:"0.48s" },
          ].map(q=>(
            <button key={q.path} onClick={()=>navigate(q.path)}
              className="anim-scale-in tap-scale"
              style={{
                background:q.grad, borderRadius:20, padding:"16px 10px",
                textAlign:"center", cursor:"pointer", border:"none",
                boxShadow:`0 6px 20px ${q.shadow}, 0 2px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.15)`,
                transition:"transform 0.18s, box-shadow 0.18s",
                animationDelay: q.delay,
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px) scale(1.02)"; e.currentTarget.style.boxShadow=`0 10px 28px ${q.shadow}, 0 4px 10px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0) scale(1)"; e.currentTarget.style.boxShadow=`0 6px 20px ${q.shadow}, 0 2px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.15)`;}}
            >
              <div style={{ fontSize:26, marginBottom:6 }}>{q.icon}</div>
              <div style={{ fontSize:12, fontWeight:900, color:"#fff", letterSpacing:0.2 }}>{q.label}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.65)", marginTop:2 }}>{q.sub}</div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="anim-fade-in" style={{
          textAlign:"center", marginTop:20, paddingBottom:4,
          animationDelay: "0.55s",
        }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            background:"rgba(15,42,92,0.05)", borderRadius:20, padding:"6px 16px",
            border:"1px solid rgba(15,42,92,0.08)",
          }}>
            <span style={{ fontSize:9, color:"#94a3b8", letterSpacing:2, textTransform:"uppercase", fontWeight:700 }}>
              POLINEMA × COMIC CAFE
            </span>
            <span style={{ color:"#cbd5e1", fontSize:9 }}>·</span>
            <span style={{ fontSize:9, color:"#f59e0b", letterSpacing:1, fontWeight:800 }}>© 2025</span>
          </div>
        </div>
      </div>
    </div>
  );
}
