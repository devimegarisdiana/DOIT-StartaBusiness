import { useNavigate } from "react-router-dom";

const CARDS = [
  {
    num: "01",
    icon: "📘",
    title: "Panduan Permainan",
    desc: "Unduh buku panduan lengkap aturan, komponen, dan cara bermain DO IT.",
    color: "#2478d4",
    grad: "linear-gradient(135deg,#1e3a8a,#2478d4)",
    badge: "PDF Guide",
    action: "/panduan.pdf",
    external: true,
  },
  {
    num: "02",
    icon: "🎮",
    title: "Mulai Game",
    desc: "Buat atau gabung room, catat transaksi keuangan, dan hitung KAP secara real-time.",
    color: "#16a34a",
    grad: "linear-gradient(135deg,#14532d,#16a34a)",
    badge: "Multiplayer",
    action: "/game",
  },
  {
    num: "03",
    icon: "🎯",
    title: "Intensi Kewirausahaan",
    desc: "Isi kuesioner untuk mengukur KAP sebelum dan sesudah bermain.",
    color: "#d97706",
    grad: "linear-gradient(135deg,#78350f,#d97706)",
    badge: "Kuesioner",
    action: "/kuesioner",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const institution = localStorage.getItem("doitInstitution") || "POLINEMA";

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#0a1628" }}>

      {/* ── HERO ── */}
      <div className="relative overflow-hidden" style={{
        background: "linear-gradient(160deg,#05111f 0%,#0d1f3c 40%,#1a3a6b 80%,#1e4d8c 100%)",
        minHeight: 260,
      }}>
        {/* Subtle grid pattern */}
        <div style={{
          position:"absolute", inset:0, opacity:0.04,
          backgroundImage:"linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
          backgroundSize:"32px 32px",
        }}/>

        {/* Glowing orbs */}
        <div style={{position:"absolute",top:-60,right:-40,width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,rgba(36,120,212,0.25) 0%,transparent 70%)"}}/>
        <div style={{position:"absolute",bottom:-30,left:-20,width:160,height:160,borderRadius:"50%",background:"radial-gradient(circle,rgba(245,158,11,0.12) 0%,transparent 70%)"}}/>

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-0">
          <div className="flex items-center gap-2">
            <div style={{
              background:"rgba(245,158,11,0.15)",border:"1px solid rgba(245,158,11,0.3)",
              borderRadius:8,padding:"3px 10px",
            }}>
              <span style={{color:"#fbbf24",fontSize:9,fontWeight:800,letterSpacing:2}}>POLINEMA × COMIC CAFE</span>
            </div>
          </div>
          <div style={{
            background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",
            borderRadius:10,padding:"4px 12px",
          }}>
            <span style={{color:"rgba(255,255,255,0.5)",fontSize:9,fontWeight:700,letterSpacing:1.5}}>v2.0 PREMIUM</span>
          </div>
        </div>

        {/* Main title */}
        <div className="relative z-10 px-4 pt-5 pb-6">
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
            <span style={{fontSize:42}}>🎂</span>
            <div>
              <h1 style={{
                fontFamily:"'Nunito','Inter',sans-serif",fontWeight:900,
                fontSize:54,lineHeight:1,letterSpacing:-3,color:"#fff",
                textShadow:"0 4px 24px rgba(36,120,212,0.5)",
                margin:0,
              }}>DO IT</h1>
              <p style={{
                color:"#f97316",fontWeight:900,fontSize:12,letterSpacing:4,
                margin:"2px 0 0",textTransform:"uppercase",
              }}>START A BUSINESS</p>
            </div>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <div style={{flex:1,height:1,background:"rgba(255,255,255,0.08)"}}/>
            <span style={{color:"rgba(255,255,255,0.2)",fontSize:8}}>◆</span>
            <div style={{flex:1,height:1,background:"rgba(255,255,255,0.08)"}}/>
          </div>

          <p style={{color:"rgba(255,255,255,0.45)",fontSize:11,lineHeight:1.6,maxWidth:280}}>
            Media pembelajaran kewirausahaan berbasis board game simulasi usaha cafe.
          </p>

          {/* Stats row */}
          <div style={{display:"flex",gap:8,marginTop:16}}>
            {[
              {val:"4",label:"Pemain"},
              {val:"4",label:"Ronde"},
              {val:"5",label:"Aspek KAP"},
            ].map(s=>(
              <div key={s.label} style={{
                flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",
                borderRadius:12,padding:"8px 6px",textAlign:"center",
              }}>
                <div style={{color:"#60a5fa",fontWeight:900,fontSize:20,lineHeight:1}}>{s.val}</div>
                <div style={{color:"rgba(255,255,255,0.35)",fontSize:9,marginTop:2,fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Institution badge */}
          <div style={{
            marginTop:14,display:"inline-flex",alignItems:"center",gap:6,
            background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.2)",
            borderRadius:20,padding:"5px 14px",
          }}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"#fbbf24"}}/>
            <span style={{color:"#fbbf24",fontSize:10,fontWeight:700}}>{institution}</span>
          </div>
        </div>
      </div>

      {/* ── ACTION CARDS ── */}
      <div style={{flex:1,padding:"20px 16px 24px",background:"#0d1626",display:"flex",flexDirection:"column",gap:12}}>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
          <span style={{color:"rgba(255,255,255,0.25)",fontSize:10,fontWeight:700,letterSpacing:2}}>FITUR UTAMA</span>
          <span style={{color:"rgba(255,255,255,0.15)",fontSize:9}}>● ● ●</span>
        </div>

        {CARDS.map(card=>(
          <button key={card.num}
            onClick={()=>{ if(!card.action) return; if((card as {external?:boolean}).external) window.open(card.action,"_blank"); else navigate(card.action); }}
            style={{
              width:"100%",textAlign:"left",background:"rgba(255,255,255,0.03)",
              border:"1px solid rgba(255,255,255,0.07)",borderRadius:20,
              padding:16,cursor:card.action?"pointer":"default",
              transition:"all 0.2s",position:"relative",overflow:"hidden",
            }}
            onMouseEnter={e=>{if(card.action)(e.currentTarget.style.background="rgba(255,255,255,0.06)");}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,0.03)";}}
          >
            {/* Left accent line */}
            <div style={{position:"absolute",left:0,top:16,bottom:16,width:3,borderRadius:99,background:card.color}}/>

            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {/* Icon */}
              <div style={{
                width:48,height:48,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:22,flexShrink:0,background:`${card.color}18`,border:`1px solid ${card.color}30`,
              }}>{card.icon}</div>

              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                  <span style={{color:"rgba(255,255,255,0.2)",fontSize:10,fontWeight:700}}>{card.num}</span>
                  <span style={{fontWeight:900,fontSize:14,color:"#f1f5f9",letterSpacing:-0.3}}>{card.title}</span>
                </div>
                <p style={{fontSize:11,color:"rgba(255,255,255,0.35)",lineHeight:1.5,margin:0}}>{card.desc}</p>
                <div style={{
                  marginTop:8,display:"inline-flex",alignItems:"center",gap:4,
                  background:`${card.color}15`,border:`1px solid ${card.color}25`,
                  borderRadius:6,padding:"2px 8px",
                }}>
                  <span style={{fontSize:9,fontWeight:800,color:card.color,letterSpacing:0.5}}>{card.badge}</span>
                </div>
              </div>

              {card.action&&(
                <div style={{
                  width:32,height:32,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",
                  background:card.grad,flexShrink:0,
                }}>
                  <span style={{color:"#fff",fontSize:16,lineHeight:1}}>›</span>
                </div>
              )}
            </div>
          </button>
        ))}

        {/* Quick links */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:4}}>
          <button onClick={()=>navigate("/leaderboard")} style={{
            background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",
            borderRadius:16,padding:"12px 8px",textAlign:"center",
          }}>
            <div style={{fontSize:20,marginBottom:4}}>🏆</div>
            <div style={{fontSize:11,fontWeight:800,color:"#fbbf24"}}>Leaderboard</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:1}}>Papan Skor</div>
          </button>
          <button onClick={()=>navigate("/pengaturan")} style={{
            background:"rgba(96,165,250,0.08)",border:"1px solid rgba(96,165,250,0.2)",
            borderRadius:16,padding:"12px 8px",textAlign:"center",
          }}>
            <div style={{fontSize:20,marginBottom:4}}>⚙️</div>
            <div style={{fontSize:11,fontWeight:800,color:"#60a5fa"}}>Pengaturan</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:1}}>Tema & Profil</div>
          </button>
        </div>

        {/* Footer */}
        <div style={{textAlign:"center",paddingTop:8}}>
          <span style={{fontSize:9,color:"rgba(255,255,255,0.12)",letterSpacing:2.5,textTransform:"uppercase"}}>
            POLINEMA × COMIC CAFE © 2025
          </span>
        </div>
      </div>
    </div>
  );
}
