import { useState, useMemo } from "react";

// ── Types ───────────────────────────────────────────────────────────────────

interface KAP {
  kreativitas: number; socialNetworking: number; internalLocus: number;
  toleransiAmbiguitas: number; bersediaRisiko: number;
}
interface SavedPlayer {
  id: string; name: string; boardColor: string;
  money: number; hutang: number;
  kap: KAP; csrKAP: number;
  kapScore?: number; finalKAP?: number;
}
interface SavedSession {
  code: string; date: string; institution?: string;
  players: SavedPlayer[];
}

// ── KAP dimension config ─────────────────────────────────────────────────────

const DIMS = [
  { key: "kreativitas",        label: "Kreativitas",          icon: "🎨", color: "#8b5cf6", max: 7,
    hint: "Terus upgrade produk & layanan cafe" },
  { key: "socialNetworking",   label: "Jaringan Sosial",       icon: "🤝", color: "#2478d4", max: 7,
    hint: "Bangun relasi & komunitas aktif" },
  { key: "internalLocus",      label: "Kendali Internal",      icon: "🎯", color: "#16a34a", max: 7,
    hint: "Percaya hasil bergantung usaha sendiri" },
  { key: "toleransiAmbiguitas",label: "Kemandirian Keputusan", icon: "🧭", color: "#f59e0b", max: 7,
    hint: "Bertindak mandiri, tidak ikut-ikutan", invert: true },
  { key: "bersediaRisiko",     label: "Berani Ambil Risiko",   icon: "⚡", color: "#ef4444", max: 7,
    hint: "Berani hutang demi peluang bisnis" },
  { key: "csr",                label: "Tanggung Jawab Sosial", icon: "🌱", color: "#0d9488", max: 5,
    hint: "Rutin berkontribusi CSR" },
] as const;

// ── Character profiles ───────────────────────────────────────────────────────

const PROFILES = [
  { id:"inovator",   name:"Inovator Kreatif",     emoji:"🎨", color:"#8b5cf6", bg:"#f5f3ff",
    desc:"Mendorong bisnis lewat inovasi produk. Selalu menemukan cara baru menang di pasar.", trait:"Kreativitas & Inovasi" },
  { id:"pemimpin",   name:"Pemimpin Sosial",       emoji:"🤝", color:"#2478d4", bg:"#eff6ff",
    desc:"Unggul membangun jaringan & kepercayaan komunitas. Bisnis tumbuh lewat relasi kuat.", trait:"Jaringan & Kolaborasi" },
  { id:"ekspansi",   name:"Ekspansionis Mandiri",  emoji:"🏗️", color:"#16a34a", bg:"#f0fdf4",
    desc:"Percaya kemampuan diri sendiri, terus perluas usaha tanpa bergantung orang lain.", trait:"Kendali Diri & Ekspansi" },
  { id:"pejuang",    name:"Pejuang Berani",        emoji:"⚡", color:"#ef4444", bg:"#fef2f2",
    desc:"Tidak takut ambil risiko besar. Langkah berani menjadi kunci strategi bisnis.", trait:"Risiko & Keberanian" },
  { id:"csr_hero",   name:"Pelopor CSR",           emoji:"🌱", color:"#0d9488", bg:"#f0fdfa",
    desc:"Memimpin dengan tanggung jawab sosial. Bisnis sukses juga berdampak baik bagi masyarakat.", trait:"Dampak Sosial & Keberlanjutan" },
  { id:"pengikut",   name:"Pengikut Arus",         emoji:"🌊", color:"#f59e0b", bg:"#fffbeb",
    desc:"Cenderung ikut keputusan orang lain. Fokus kembangkan kepercayaan diri lebih baik.", trait:"Perlu Pengembangan Kemandirian" },
  { id:"seimbang",   name:"Wirausahawan Seimbang", emoji:"⚖️", color:"#6366f1", bg:"#eef2ff",
    desc:"Kemampuan merata di semua aspek wirausaha. Fleksibel, adaptif, dan konsisten.", trait:"Keterampilan Menyeluruh" },
  { id:"pemula",     name:"Wirausahawan Pemula",   emoji:"🌱", color:"#94a3b8", bg:"#f8fafc",
    desc:"Masih awal perjalanan wirausaha. Terus berlatih dan tingkatkan setiap aspek!", trait:"Potensi Berkembang" },
];

function getScores(p: SavedPlayer) {
  return {
    kreativitas:         p.kap.kreativitas,
    socialNetworking:    p.kap.socialNetworking,
    internalLocus:       p.kap.internalLocus,
    toleransiAmbiguitas: p.kap.toleransiAmbiguitas,
    bersediaRisiko:      p.kap.bersediaRisiko,
    csr:                 Math.min(p.csrKAP || 0, 5),
  };
}

function classifyPlayer(p: SavedPlayer) {
  const s = getScores(p);
  const independence = 7 - s.toleransiAmbiguitas; // invert
  const vals = [s.kreativitas, s.socialNetworking, s.internalLocus, independence, s.bersediaRisiko, s.csr];
  const total = vals.reduce((a,b)=>a+b,0);
  if (total < 5) return PROFILES.find(p => p.id === "pemula")!;
  if (s.toleransiAmbiguitas >= 5 && independence <= 2) return PROFILES.find(p => p.id === "pengikut")!;
  const avg = total / 6;
  const variance = vals.reduce((acc,v)=>acc+Math.pow(v-avg,2),0)/6;
  if (variance < 1.5 && avg >= 2.5) return PROFILES.find(p => p.id === "seimbang")!;
  const maxVal = Math.max(s.kreativitas, s.socialNetworking, s.internalLocus, independence, s.bersediaRisiko, s.csr);
  if (s.kreativitas === maxVal && s.kreativitas >= 3)       return PROFILES.find(p => p.id === "inovator")!;
  if (s.socialNetworking === maxVal && s.socialNetworking >= 3) return PROFILES.find(p => p.id === "pemimpin")!;
  if (s.internalLocus === maxVal && s.internalLocus >= 3)   return PROFILES.find(p => p.id === "ekspansi")!;
  if (s.bersediaRisiko === maxVal && s.bersediaRisiko >= 3) return PROFILES.find(p => p.id === "pejuang")!;
  if (s.csr === maxVal && s.csr >= 3)                       return PROFILES.find(p => p.id === "csr_hero")!;
  return PROFILES.find(p => p.id === "seimbang")!;
}

// ── Radar chart ──────────────────────────────────────────────────────────────

function RadarChart({ p, color }: { p: SavedPlayer; color: string }) {
  const s = getScores(p);
  const CX = 110, CY = 110, R = 80;
  // 6 axes: top → clockwise (kreativitas, socialNetworking, internalLocus, toleransiAmbiguitas, bersediaRisiko, csr)
  const angles = Array.from({length:6},(_,i)=> (Math.PI/2) - (2*Math.PI*i/6));
  const maxes  = [7,7,7,7,7,5];
  const rawVals= [s.kreativitas, s.socialNetworking, s.internalLocus, 7-s.toleransiAmbiguitas, s.bersediaRisiko, s.csr];
  const norm   = rawVals.map((v,i)=>Math.min(v/maxes[i],1));

  const pt = (angle: number, frac: number) => ({
    x: CX + R * frac * Math.cos(angle),
    y: CY - R * frac * Math.sin(angle),
  });

  const gridLevels = [0.25,0.5,0.75,1];
  const dataPoints = angles.map((a,i)=>pt(a, norm[i]));
  const polyPoints = dataPoints.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const axisEnds   = angles.map(a=>pt(a,1));
  const iconPos    = angles.map(a=>pt(a,1.22));
  const dimColors  = DIMS.map(d=>d.color);

  return (
    <svg width={220} height={220} viewBox="0 0 220 220" style={{overflow:"visible"}}>
      {gridLevels.map(lv=>(
        <polygon key={lv}
          points={angles.map(a=>{ const p=pt(a,lv); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(" ")}
          fill={lv===1?"rgba(36,120,212,0.03)":"none"}
          stroke="rgba(0,0,0,0.1)" strokeWidth={lv===1?1.5:0.8}/>
      ))}
      {axisEnds.map((ep,i)=>(
        <line key={i} x1={CX} y1={CY} x2={ep.x} y2={ep.y} stroke="rgba(0,0,0,0.12)" strokeWidth={1}/>
      ))}
      <polygon points={polyPoints}
        fill={`${color}28`} stroke={color} strokeWidth={2.5} strokeLinejoin="round"/>
      {dataPoints.map((dp,i)=>(
        <circle key={i} cx={dp.x} cy={dp.y} r={5} fill={dimColors[i]} stroke="#fff" strokeWidth={2}/>
      ))}
      {iconPos.map((ip,i)=>(
        <text key={i} x={ip.x} y={ip.y} textAnchor="middle" dominantBaseline="middle" fontSize={16}>{DIMS[i].icon}</text>
      ))}
    </svg>
  );
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const BC_COLORS: Record<string,{bg:string;text:string}> = {
  merah:  {bg:"#fef2f2",text:"#dc2626"},
  biru:   {bg:"#eff6ff",text:"#2563eb"},
  kuning: {bg:"#fffbeb",text:"#d97706"},
  hijau:  {bg:"#f0fdf4",text:"#16a34a"},
};

// ── Riwayat tab ───────────────────────────────────────────────────────────────

function RiwayatTab({ sessions }: { sessions: SavedSession[] }) {
  const [expanded, setExpanded] = useState<string|null>(null);

  if (!sessions.length) return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div>
        <div style={{fontSize:56,marginBottom:12}}>📋</div>
        <div style={{fontWeight:800,fontSize:16,color:"#374151"}}>Belum Ada Riwayat</div>
        <div style={{color:"#9ca3af",fontSize:12,marginTop:6}}>Riwayat sesi game akan muncul di sini setelah permainan selesai.</div>
      </div>
    </div>
  );

  return (
    <div style={{padding:"16px 16px 24px",display:"flex",flexDirection:"column",gap:10}}>
      {[...sessions].reverse().map(s=>{
        const isOpen = expanded === s.code;
        const winner = s.players[0];
        return (
          <div key={s.code}
            style={{background:"#fff",borderRadius:18,border:"1.5px solid #e2eeff",overflow:"hidden",
              boxShadow:"0 2px 10px rgba(36,120,212,0.07)"}}>
            <button onClick={()=>setExpanded(isOpen?null:s.code)}
              style={{width:"100%",padding:"14px 16px",display:"flex",alignItems:"center",gap:12,
                background:"none",border:"none",cursor:"pointer",textAlign:"left"}}>
              <div style={{width:44,height:44,borderRadius:14,background:"linear-gradient(135deg,#1a3a6b,#2478d4)",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🎮</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontWeight:800,fontSize:13,color:"#1a3a6b"}}>Room {s.code}</span>
                  {s.institution&&<span style={{fontSize:9,background:"#eff6ff",color:"#2478d4",padding:"2px 8px",borderRadius:8,fontWeight:700}}>{s.institution}</span>}
                </div>
                <div style={{color:"#6b7280",fontSize:11,marginTop:2}}>
                  📅 {s.date} · 👥 {s.players.length} pemain
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:11,color:"#f59e0b",fontWeight:800}}>🏆 {winner?.name}</div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:1}}>KAP {winner?.finalKAP??winner?.kapScore??"-"}</div>
              </div>
              <div style={{color:"#9ca3af",fontSize:16,marginLeft:4}}>{isOpen?"▲":"▼"}</div>
            </button>

            {isOpen&&(
              <div style={{padding:"0 14px 14px",display:"flex",flexDirection:"column",gap:6,
                borderTop:"1px solid #f0f6ff"}}>
                {s.players.map((pl,i)=>{
                  const bc=BC_COLORS[pl.boardColor]||{bg:"#f8fafc",text:"#64748b"};
                  const profile=classifyPlayer(pl);
                  return (
                    <div key={pl.id} style={{display:"flex",alignItems:"center",gap:10,
                      background:i===0?"#fffbeb":"#f8fafc",borderRadius:12,padding:"10px 12px",
                      border:i===0?"1.5px solid #fde68a":"1.5px solid #e2e8f0"}}>
                      <div style={{width:28,height:28,borderRadius:9,background:bc.bg,border:`1.5px solid ${bc.text}40`,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                        {i===0?"🥇":i===1?"🥈":"🥉"}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:800,fontSize:12,color:"#1a3a6b",display:"flex",alignItems:"center",gap:6}}>
                          {pl.name}
                          <span style={{fontSize:9,background:profile.bg,color:profile.color,padding:"1px 6px",
                            borderRadius:6,fontWeight:700,border:`1px solid ${profile.color}30`}}>{profile.emoji} {profile.name}</span>
                        </div>
                        <div style={{fontSize:10,color:"#6b7280",marginTop:2}}>
                          💰 Rp.{pl.money} · 🏦 Hutang {pl.hutang} · KAP {pl.finalKAP??pl.kapScore??0}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Profil tab ─────────────────────────────────────────────────────────────────

function ProfilTab({ sessions }: { sessions: SavedSession[] }) {
  // Collect unique player names
  const allPlayers = useMemo(()=>{
    const map = new Map<string, SavedPlayer[]>();
    sessions.forEach(s=>{
      s.players.forEach(p=>{
        const key = p.name.trim();
        if (!map.has(key)) map.set(key,[]);
        map.get(key)!.push(p);
      });
    });
    return map;
  },[sessions]);

  const playerNames = useMemo(()=>Array.from(allPlayers.keys()).sort(),[allPlayers]);
  const [selectedName, setSelectedName] = useState<string>(playerNames[0]||"");

  if (!sessions.length) return (
    <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:32,textAlign:"center"}}>
      <div>
        <div style={{fontSize:56,marginBottom:12}}>🧭</div>
        <div style={{fontWeight:800,fontSize:16,color:"#374151"}}>Profil Belum Tersedia</div>
        <div style={{color:"#9ca3af",fontSize:12,marginTop:6}}>Selesaikan minimal satu sesi game untuk melihat analisis karakter wirausahawan.</div>
      </div>
    </div>
  );

  const games = allPlayers.get(selectedName)||[];
  // Aggregate: average across all games
  const avg = (fn: (p:SavedPlayer)=>number) => games.reduce((s,p)=>s+fn(p),0)/games.length;
  const avgKAP = { kreativitas: avg(p=>p.kap.kreativitas), socialNetworking: avg(p=>p.kap.socialNetworking),
    internalLocus: avg(p=>p.kap.internalLocus), toleransiAmbiguitas: avg(p=>p.kap.toleransiAmbiguitas),
    bersediaRisiko: avg(p=>p.kap.bersediaRisiko) };
  const avgCSR = avg(p=>p.csrKAP||0);
  const avgMoney = avg(p=>p.money);
  const avgFinalKAP = avg(p=>p.finalKAP??p.kapScore??0);
  const bestKAP = Math.max(...games.map(p=>p.finalKAP??p.kapScore??0));

  // Representative player (best game or last)
  const repPlayer = games.reduce((best,cur)=>
    (cur.finalKAP??cur.kapScore??0)>(best.finalKAP??best.kapScore??0)?cur:best, games[0]);
  const profile = classifyPlayer(repPlayer);

  // Dimension display values (averaged)
  const dimVals: Record<string,number> = {
    kreativitas: avgKAP.kreativitas,
    socialNetworking: avgKAP.socialNetworking,
    internalLocus: avgKAP.internalLocus,
    toleransiAmbiguitas: avgKAP.toleransiAmbiguitas,
    bersediaRisiko: avgKAP.bersediaRisiko,
    csr: Math.min(avgCSR, 5),
  };

  const displayPlayer: SavedPlayer = {
    ...repPlayer,
    kap: { kreativitas: avgKAP.kreativitas, socialNetworking: avgKAP.socialNetworking,
      internalLocus: avgKAP.internalLocus, toleransiAmbiguitas: avgKAP.toleransiAmbiguitas,
      bersediaRisiko: avgKAP.bersediaRisiko },
    csrKAP: avgCSR,
  };

  return (
    <div style={{padding:"16px 16px 32px",display:"flex",flexDirection:"column",gap:14}}>

      {/* Player selector */}
      {playerNames.length > 1 && (
        <div>
          <div style={{fontSize:10,fontWeight:800,color:"#6b7280",letterSpacing:1,marginBottom:6}}>PILIH PEMAIN</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {playerNames.map(n=>(
              <button key={n} onClick={()=>setSelectedName(n)}
                style={{padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:700,
                  background:n===selectedName?"linear-gradient(135deg,#1a3a6b,#2478d4)":"#fff",
                  color:n===selectedName?"#fff":"#374151",
                  border:n===selectedName?"none":"1.5px solid #e2eeff",cursor:"pointer"}}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats row */}
      <div style={{display:"flex",gap:8}}>
        {[
          {icon:"🎮",val:games.length,label:"Sesi"},
          {icon:"⭐",val:avgFinalKAP.toFixed(1),label:"Rata KAP"},
          {icon:"🏆",val:bestKAP,label:"KAP Terbaik"},
          {icon:"💰",val:`${avgMoney.toFixed(0)}`,label:"Rata Uang"},
        ].map(s=>(
          <div key={s.label} style={{flex:1,background:"#fff",borderRadius:14,padding:"10px 6px",textAlign:"center",
            border:"1.5px solid #e2eeff",boxShadow:"0 2px 8px rgba(36,120,212,0.06)"}}>
            <div style={{fontSize:16}}>{s.icon}</div>
            <div style={{fontWeight:900,fontSize:15,color:"#1a3a6b",lineHeight:1.1}}>{s.val}</div>
            <div style={{fontSize:9,color:"#9ca3af",marginTop:1,fontWeight:600}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Character type card */}
      <div style={{background:profile.bg,borderRadius:22,padding:"18px 18px 16px",
        border:`2px solid ${profile.color}30`,
        boxShadow:`0 4px 20px ${profile.color}18`}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{width:68,height:68,borderRadius:20,background:`${profile.color}18`,
            border:`2px solid ${profile.color}30`,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:36,flexShrink:0}}>
            {profile.emoji}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:10,fontWeight:800,color:profile.color,letterSpacing:1.5,textTransform:"uppercase",marginBottom:2}}>
              Tipe Wirausahawan
            </div>
            <div style={{fontWeight:900,fontSize:18,color:"#1a3a6b",lineHeight:1.2}}>{profile.name}</div>
            <div style={{fontSize:10,background:profile.color,color:"#fff",borderRadius:8,
              padding:"2px 10px",marginTop:6,display:"inline-block",fontWeight:700}}>
              🔑 {profile.trait}
            </div>
          </div>
        </div>
        <p style={{color:"#374151",fontSize:12,lineHeight:1.65,margin:"12px 0 0",
          padding:"10px 12px",background:"rgba(255,255,255,0.6)",borderRadius:12,
          border:`1px solid ${profile.color}20`}}>
          {profile.desc}
        </p>
      </div>

      {/* Radar chart */}
      <div style={{background:"#fff",borderRadius:22,border:"1.5px solid #e2eeff",
        padding:"18px 12px 12px",boxShadow:"0 2px 12px rgba(36,120,212,0.07)"}}>
        <div style={{fontSize:12,fontWeight:800,color:"#1a3a6b",marginBottom:12,textAlign:"center"}}>
          📊 Profil 6 Papan Prestasi
        </div>
        <div style={{display:"flex",justifyContent:"center"}}>
          <RadarChart p={displayPlayer} color={profile.color}/>
        </div>
        {/* Legend */}
        <div style={{display:"flex",flexWrap:"wrap",gap:6,justifyContent:"center",marginTop:8}}>
          {DIMS.map(d=>(
            <div key={d.key} style={{display:"flex",alignItems:"center",gap:4,
              background:`${d.color}10`,borderRadius:8,padding:"3px 8px",border:`1px solid ${d.color}25`}}>
              <span style={{fontSize:11}}>{d.icon}</span>
              <span style={{fontSize:9,fontWeight:700,color:d.color}}>{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 6 Dimension breakdown */}
      <div style={{background:"#fff",borderRadius:22,border:"1.5px solid #e2eeff",padding:"18px 16px",
        boxShadow:"0 2px 12px rgba(36,120,212,0.07)"}}>
        <div style={{fontSize:12,fontWeight:800,color:"#1a3a6b",marginBottom:14}}>
          🎯 Analisis Per Dimensi
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {DIMS.map(d=>{
            const rawVal = dimVals[d.key as keyof typeof dimVals];
            const displayVal = d.invert ? d.max - rawVal : rawVal;
            const pct = Math.min((displayVal / d.max) * 100, 100);
            const level = pct >= 70 ? "Tinggi" : pct >= 40 ? "Sedang" : "Rendah";
            const levelColor = pct >= 70 ? "#16a34a" : pct >= 40 ? "#d97706" : "#dc2626";
            const levelBg   = pct >= 70 ? "#f0fdf4" : pct >= 40 ? "#fffbeb" : "#fef2f2";
            return (
              <div key={d.key}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:15}}>{d.icon}</span>
                    <span style={{fontWeight:700,fontSize:12,color:"#374151"}}>{d.label}</span>
                    {d.invert&&<span style={{fontSize:9,color:"#9ca3af"}}>(dibalik)</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontWeight:900,fontSize:12,color:d.color}}>{displayVal.toFixed(1)}/{d.max}</span>
                    <span style={{fontSize:9,fontWeight:800,color:levelColor,background:levelBg,
                      padding:"1px 7px",borderRadius:6}}>{level}</span>
                  </div>
                </div>
                <div style={{height:7,background:"#f1f5f9",borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${d.color}99,${d.color})`,
                    borderRadius:99,transition:"width 0.5s"}}/>
                </div>
                <div style={{fontSize:10,color:"#9ca3af",marginTop:3}}>{d.hint}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decision pattern insight */}
      <div style={{background:"linear-gradient(135deg,#1a3a6b,#2478d4)",borderRadius:22,padding:"18px 16px"}}>
        <div style={{fontSize:12,fontWeight:800,color:"#fff",marginBottom:12}}>💡 Pola Keputusan</div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            { cond: avgKAP.kreativitas >= 3,      icon:"🎨", text:"Aktif melakukan upgrade produk & menu cafe" },
            { cond: avgKAP.socialNetworking >= 3, icon:"🤝", text:"Konsisten membangun jaringan sosial di papan" },
            { cond: avgKAP.internalLocus >= 3,    icon:"🏗️", text:"Agresif memperluas kepemilikan cafe baru" },
            { cond: avgKAP.toleransiAmbiguitas < 3, icon:"🧭", text:"Mandiri dalam pengambilan keputusan" },
            { cond: avgKAP.bersediaRisiko >= 3,   icon:"⚡", text:"Berani menggunakan hutang sebagai modal" },
            { cond: avgCSR >= 2,                   icon:"🌱", text:"Rutin berkontribusi ke program CSR" },
          ].filter(x=>x.cond).map((x,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,
              background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"8px 12px"}}>
              <span style={{fontSize:14}}>{x.icon}</span>
              <span style={{color:"#e2f0ff",fontSize:11,fontWeight:600}}>{x.text}</span>
            </div>
          ))}
          {[avgKAP.kreativitas,avgKAP.socialNetworking,avgKAP.internalLocus,avgKAP.bersediaRisiko,avgCSR].every(v=>v<2)&&(
            <div style={{display:"flex",alignItems:"center",gap:8,
              background:"rgba(255,255,255,0.12)",borderRadius:10,padding:"8px 12px"}}>
              <span style={{fontSize:14}}>🌱</span>
              <span style={{color:"#e2f0ff",fontSize:11,fontWeight:600}}>Masih mengembangkan strategi bermain</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Riwayat() {
  const [tab, setTab] = useState<"riwayat"|"profil">("riwayat");

  const sessions: SavedSession[] = useMemo(()=>{
    try { return JSON.parse(localStorage.getItem("doitSessions")||"[]"); }
    catch { return []; }
  },[]);

  const totalPlayers = useMemo(()=>{
    const names = new Set<string>();
    sessions.forEach(s=>s.players.forEach(p=>names.add(p.name)));
    return names.size;
  },[sessions]);

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{background:"#e8f4ff"}}>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#1a3a6b,#2478d4)",padding:"18px 16px 0",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div>
            <h1 style={{color:"#fff",fontWeight:900,fontSize:18,margin:0}}>Riwayat & Profil</h1>
            <p style={{color:"rgba(255,255,255,0.55)",fontSize:11,margin:"2px 0 0"}}>
              {sessions.length} sesi · {totalPlayers} pemain unik
            </p>
          </div>
          <span style={{marginLeft:"auto",fontSize:28}}>📈</span>
        </div>
        {/* Tabs */}
        <div style={{display:"flex",gap:0,background:"rgba(255,255,255,0.1)",borderRadius:"14px 14px 0 0",overflow:"hidden"}}>
          {(["riwayat","profil"] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              style={{flex:1,padding:"10px 0",fontWeight:800,fontSize:12,
                background:tab===t?"#fff":"transparent",
                color:tab===t?"#1a3a6b":"rgba(255,255,255,0.7)",
                border:"none",cursor:"pointer",
                borderRadius:tab===t?"14px 14px 0 0":"0",
                transition:"all 0.2s"}}>
              {t==="riwayat"?"🎮 Riwayat Sesi":"🧭 Profil Wirausaha"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab==="riwayat" ? <RiwayatTab sessions={sessions}/> : <ProfilTab sessions={sessions}/>}
    </div>
  );
}
