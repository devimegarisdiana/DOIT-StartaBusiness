interface KAP { kreativitas:number; socialNetworking:number; internalLocus:number; toleransiAmbiguitas:number; bersediaRisiko:number; }
export interface PlayerLike { id:string; name:string; boardColor:string; money:number; hutang:number; kap:KAP; kapScore:number; finalKAP?:number; csrKAP:number; }

const CM: Record<string,{emoji:string;label:string;bg:string;text:string;grad:string}> = {
  merah:  {emoji:"🔴",label:"Merah",  bg:"#fee2e2",text:"#dc2626",grad:"linear-gradient(135deg,#b91c1c,#ef4444)"},
  biru:   {emoji:"🔵",label:"Biru",   bg:"#dbeafe",text:"#1d4ed8",grad:"linear-gradient(135deg,#1e3a8a,#3b82f6)"},
  kuning: {emoji:"🟡",label:"Kuning", bg:"#fef9c3",text:"#a16207",grad:"linear-gradient(135deg,#92400e,#fbbf24)"},
  hijau:  {emoji:"🟢",label:"Hijau",  bg:"#dcfce7",text:"#15803d",grad:"linear-gradient(135deg,#14532d,#22c55e)"},
};
const KM: Record<keyof KAP,{s:string;e:string}> = {
  kreativitas:        {s:"Kreativitas", e:"💡"},
  socialNetworking:   {s:"Social",      e:"🤝"},
  internalLocus:      {s:"Int. Locus",  e:"🎯"},
  toleransiAmbiguitas:{s:"Toleransi",   e:"🌀"},
  bersediaRisiko:     {s:"Brs. Risiko", e:"⚡"},
};
const RANKS=["🥇","🥈","🥉","4️⃣"];

interface Props { player:PlayerLike; rank:number; myId?:string; institution?:string; }

export default function PlayerCard({player,rank,myId,institution}:Props) {
  const c = CM[player.boardColor]??CM.biru;
  const score = player.finalKAP??player.kapScore;
  const moneyKAP = Math.floor(player.money/10);
  const debtPenalty = player.hutang>0?player.kap.bersediaRisiko:0;
  const topKey = (["kreativitas","socialNetworking","internalLocus"] as (keyof KAP)[])
    .sort((a,b)=>player.kap[b]-player.kap[a])[0];

  return (
    <div style={{background:"#fff",borderRadius:24,overflow:"hidden",
      boxShadow:rank===0?"0 10px 40px rgba(245,158,11,0.3)":"0 3px 16px rgba(0,0,0,0.08)",
      border:rank===0?"2.5px solid #f59e0b":"2px solid #f1f5f9"}}>

      <div style={{background:c.grad,padding:"18px 18px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:30}}>{RANKS[rank]??"🎮"}</span>
          <div style={{width:50,height:50,borderRadius:"50%",background:"rgba(255,255,255,0.2)",border:"2px solid rgba(255,255,255,0.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>{c.emoji}</div>
          <div style={{flex:1}}>
            <div style={{color:"#fff",fontWeight:900,fontSize:15,lineHeight:1.2}}>{player.name}{player.id===myId?" (Kamu)":""}</div>
            <div style={{color:"rgba(255,255,255,0.75)",fontSize:11,fontWeight:700,marginTop:1}}>{c.label}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{color:"#fff",fontWeight:900,fontSize:40,lineHeight:1,textShadow:"0 2px 8px rgba(0,0,0,0.2)"}}>{score}</div>
            <div style={{color:"rgba(255,255,255,0.65)",fontSize:9,fontWeight:700,letterSpacing:1}}>KAP SCORE</div>
          </div>
        </div>
      </div>

      <div style={{padding:"14px 18px 18px"}}>
        {(["kreativitas","socialNetworking","internalLocus","toleransiAmbiguitas"] as (keyof KAP)[]).map(key=>(
          <div key={key} style={{marginBottom:7}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:11,color:"#64748b",fontWeight:600}}>{KM[key].e} {KM[key].s}</span>
              <span style={{fontSize:11,fontWeight:900,color:key===topKey?c.text:"#374151"}}>{player.kap[key]}/7</span>
            </div>
            <div style={{height:5,background:"#f1f5f9",borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:99,width:`${(player.kap[key]/7)*100}%`,background:key===topKey?c.text:"#cbd5e1"}}/>
            </div>
          </div>
        ))}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginTop:10,marginBottom:10}}>
          {[{label:"Kas Akhir",value:`Rp.${player.money}`,color:"#16a34a"},{label:"Uang→KAP",value:`+${moneyKAP}`,color:"#2563eb"},{label:"CSR KAP",value:`+${player.csrKAP||0}`,color:"#9b59b6"}].map(s=>(
            <div key={s.label} style={{background:"#f8fafc",borderRadius:12,padding:"8px 4px",textAlign:"center"}}>
              <div style={{fontSize:9,color:"#94a3b8",marginBottom:2}}>{s.label}</div>
              <div style={{fontWeight:900,color:s.color,fontSize:13}}>{s.value}</div>
            </div>
          ))}
        </div>

        {debtPenalty>0&&<div style={{background:"#fef2f2",borderRadius:10,padding:"7px 12px",display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:11,color:"#dc2626"}}>⚠️ Penalty Hutang</span>
          <span style={{fontSize:11,fontWeight:900,color:"#dc2626"}}>−{debtPenalty} KAP</span>
        </div>}

        <div style={{display:"flex",justifyContent:"center"}}>
          <div style={{background:c.bg,borderRadius:99,padding:"5px 14px",display:"inline-flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:12}}>⭐</span>
            <span style={{fontSize:10,fontWeight:800,color:c.text}}>Unggulan: {KM[topKey].s} ({player.kap[topKey]}/7)</span>
          </div>
        </div>
      </div>

      <div style={{textAlign:"center",paddingBottom:10,borderTop:"1px solid #f1f5f9",paddingTop:8}}>
        <span style={{fontSize:9,letterSpacing:2,color:"#cbd5e1",textTransform:"uppercase"}}>
          DO IT · POLINEMA × Comic Cafe{institution?` · ${institution}`:""}
        </span>
      </div>
    </div>
  );
}
