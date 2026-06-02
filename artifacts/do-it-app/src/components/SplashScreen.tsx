import { useEffect, useState } from "react";

interface Props { onDone: () => void; }

export default function SplashScreen({ onDone }: Props) {
  const [phase, setPhase] = useState<"in"|"hold"|"out">("in");
  const institution = localStorage.getItem("doitInstitution") || "POLINEMA";

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 300);
    const t2 = setTimeout(() => setPhase("out"), 2400);
    const t3 = setTimeout(() => onDone(), 2900);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const visible = phase === "hold";

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:999,
      background:"linear-gradient(160deg,#0f1f3d 0%,#1a3a6b 45%,#2478d4 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      opacity: phase==="out" ? 0 : 1, transition:"opacity 0.55s ease",
    }}>
      {[...Array(20)].map((_,i)=>(
        <div key={i} style={{
          position:"absolute", borderRadius:"50%", background:"#fff",
          width: i%4===0?3:2, height: i%4===0?3:2,
          top:`${5+(i*37)%75}%`, left:`${(i*53)%100}%`,
          opacity: visible ? 0.4+(i%3)*0.15 : 0,
          transition:`opacity 0.8s ease ${i*0.04}s`,
        }}/>
      ))}

      <div style={{
        textAlign:"center",
        transform: phase==="in" ? "scale(0.75) translateY(30px)" : phase==="out" ? "scale(1.04) translateY(-12px)" : "scale(1) translateY(0)",
        opacity: visible ? 1 : 0,
        transition:"all 0.55s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <div style={{ fontSize:72, lineHeight:1, marginBottom:6 }}>🎂</div>
        <div style={{
          fontSize:72, fontFamily:"'Nunito','Inter',sans-serif", fontWeight:900,
          color:"#fff", letterSpacing:-3, lineHeight:1,
          textShadow:"0 6px 24px rgba(0,0,0,0.4)",
        }}>DO IT</div>
        <div style={{ color:"#ff8a80", fontWeight:900, fontSize:13, letterSpacing:3, marginTop:2 }}>
          START A BUSINESS
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8, margin:"18px auto 14px", width:220 }}>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.2)" }}/>
          <span style={{ color:"rgba(255,255,255,0.35)", fontSize:10 }}>✦</span>
          <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.2)" }}/>
        </div>

        <div style={{ color:"rgba(255,255,255,0.45)", fontSize:9, letterSpacing:3, textTransform:"uppercase", marginBottom:6 }}>
          Dipersembahkan oleh
        </div>
        <div style={{ color:"#fff", fontWeight:900, fontSize:18, letterSpacing:0.5 }}>{institution}</div>

        <div style={{ display:"flex", gap:7, justifyContent:"center", marginTop:32 }}>
          {[0,1,2].map(i=>(
            <div key={i} style={{
              width:7, height:7, borderRadius:"50%", background:"rgba(255,255,255,0.6)",
              transform: visible?"scale(1)":"scale(0)", opacity: visible?1:0,
              transition:`all 0.4s ease ${0.12+i*0.13}s`,
            }}/>
          ))}
        </div>
      </div>

      <div style={{ position:"absolute", bottom:28, textAlign:"center",
        opacity: visible?0.4:0, transition:"opacity 0.6s ease 0.6s" }}>
        <span style={{ color:"#fff", fontSize:9, letterSpacing:2.5, textTransform:"uppercase" }}>
          POLINEMA × COMIC CAFE · BOARD GAME EDUKASI
        </span>
      </div>
    </div>
  );
}
