import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface KAP { kreativitas:number; socialNetworking:number; internalLocus:number; toleransiAmbiguitas:number; bersediaRisiko:number; }
interface PlayerLike { id:string; name:string; boardColor:string; money:number; hutang:number; kap:KAP; kapScore:number; finalKAP?:number; csrKAP:number; transactions:{amount:number;type:string;ronde:number}[]; }
interface Session { code:string; date:string; players:PlayerLike[]; }

const CM: Record<string,{emoji:string;text:string;bg:string}> = {
  merah:{emoji:"🔴",text:"#dc2626",bg:"#fee2e2"},
  biru:{emoji:"🔵",text:"#2563eb",bg:"#dbeafe"},
  kuning:{emoji:"🟡",text:"#a16207",bg:"#fef9c3"},
  hijau:{emoji:"🟢",text:"#15803d",bg:"#dcfce7"},
};
const KL: Record<keyof KAP,string> = { kreativitas:"Kreativitas",socialNetworking:"Social",internalLocus:"Int. Locus",toleransiAmbiguitas:"Toleransi",bersediaRisiko:"Brs. Risiko" };

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [session, setSession] = useState<Session|null>(null);
  const institution = localStorage.getItem("doitInstitution")||"";

  useEffect(()=>{
    const raw=localStorage.getItem("doitSessions");
    const list:Session[]=raw?JSON.parse(raw):[];
    const code=params.get("room");
    if(code){ const s=list.find(x=>x.code===code); if(s){setSession(s);return;} }
    if(list.length>0) setSession(list[list.length-1]);
  },[params]);

  if(!session) return (
    <div className="flex flex-col flex-1" style={{background:"#d6eeff"}}>
      <div className="px-4 pt-5 pb-4" style={{background:"#1a3a6b"}}>
        <button onClick={()=>navigate(-1)} className="text-blue-300 text-sm mb-2">‹ Kembali</button>
        <h1 className="text-white font-black text-lg">📊 Dashboard Admin</h1>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <div>
          <div className="text-6xl mb-3">📊</div>
          <h2 className="font-black text-gray-700 text-lg">Belum Ada Data</h2>
          <p className="text-gray-400 text-sm mt-1">Data akan tersedia setelah sesi game selesai.</p>
        </div>
      </div>
    </div>
  );

  const sorted=[...session.players].sort((a,b)=>(b.finalKAP??b.kapScore)-(a.finalKAP??a.kapScore));
  const kapKeys=["kreativitas","socialNetworking","internalLocus","toleransiAmbiguitas"] as (keyof KAP)[];

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{background:"#d6eeff"}}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{background:"linear-gradient(135deg,#1a3a6b,#2478d4)"}}>
        <button onClick={()=>navigate(-1)} className="text-blue-200 text-sm mb-2 flex items-center gap-1">‹ Kembali</button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-black text-lg">📊 Dashboard Admin</h1>
            <p className="text-blue-200 text-xs">Room {session.code} · {session.date}{institution?` · ${institution}`:""}</p>
          </div>
          <button onClick={()=>window.print()} className="px-3 py-1.5 rounded-xl text-xs font-bold text-white border border-white/30 bg-white/15">
            🖨 Cetak
          </button>
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">

        {/* Ringkasan */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {icon:"👥",label:"Pemain",value:session.players.length},
            {icon:"🏆",label:"KAP Tertinggi",value:Math.max(...session.players.map(p=>p.finalKAP??p.kapScore))},
            {icon:"💰",label:"Kas Terbanyak",value:`Rp.${Math.max(...session.players.map(p=>p.money))}`},
            {icon:"📈",label:"Rata-rata KAP",value:Math.round(session.players.reduce((s,p)=>s+(p.finalKAP??p.kapScore),0)/session.players.length)},
          ].map(s=>(
            <div key={s.label} className="bg-white rounded-2xl p-3 shadow-sm text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="font-black text-lg text-gray-800">{s.value}</div>
              <div className="text-[10px] text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>

        {/* KAP Chart per player */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-black text-gray-800 text-sm">📊 KAP Per Pemain</h3>
          </div>
          <div className="p-4 flex flex-col gap-4">
            {sorted.map(p=>{
              const c=CM[p.boardColor]??CM.biru;
              return (
                <div key={p.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{c.emoji}</span>
                    <span className="font-black text-sm text-gray-700">{p.name}</span>
                    <span className="ml-auto font-black text-base" style={{color:c.text}}>{p.finalKAP??p.kapScore} KAP</span>
                  </div>
                  {kapKeys.map(key=>(
                    <div key={key} className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] text-gray-400 w-20 flex-shrink-0">{KL[key]}</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div style={{height:"100%",width:`${(p.kap[key]/7)*100}%`,background:c.text,borderRadius:99,transition:"width 0.6s"}}/>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 w-5 text-right">{p.kap[key]}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Keuangan */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-black text-gray-800 text-sm">💰 Ringkasan Keuangan</h3>
          </div>
          <div className="overflow-x-auto">
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#f8fafc"}}>
                  {["Pemain","Kas Akhir","Hutang","CSR KAP","KAP Final"].map(h=>(
                    <th key={h} style={{padding:"8px 12px",fontSize:10,color:"#94a3b8",fontWeight:700,textAlign:"left",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p,i)=>{
                  const c=CM[p.boardColor]??CM.biru;
                  return (
                    <tr key={p.id} style={{borderTop:"1px solid #f1f5f9",background:i%2===0?"#fff":"#f8fafc"}}>
                      <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span>{c.emoji}</span><span style={{fontSize:12,fontWeight:700,color:"#374151"}}>{p.name}</span></div></td>
                      <td style={{padding:"10px 12px",fontSize:12,fontWeight:700,color:"#16a34a"}}>Rp.{p.money}</td>
                      <td style={{padding:"10px 12px",fontSize:12,fontWeight:700,color:p.hutang>0?"#dc2626":"#16a34a"}}>{p.hutang>0?`Rp.${p.hutang}`:"—"}</td>
                      <td style={{padding:"10px 12px",fontSize:12,fontWeight:700,color:"#9b59b6"}}>+{p.csrKAP||0}</td>
                      <td style={{padding:"10px 12px",fontSize:14,fontWeight:900,color:c.text}}>{p.finalKAP??p.kapScore}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style>{`@media print { .no-print { display:none!important; } body { background:#fff!important; } }`}</style>
    </div>
  );
}
