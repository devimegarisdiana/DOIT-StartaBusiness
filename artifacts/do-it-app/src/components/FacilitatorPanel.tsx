import { useState } from "react";
interface Props { roomCode:string; myId:string; onClose:()=>void; }

const API=import.meta.env.BASE_URL.replace(/\/$/, "")+"/api";
async function postRoom(code:string,path:string,body:object) {
  const r=await fetch(`${API}/rooms/${code}${path}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
  const d=await r.json(); if(!r.ok) throw new Error(d.error||"Error"); return d;
}

export default function FacilitatorPanel({roomCode,myId,onClose}:Props) {
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState<{text:string;ok:boolean}|null>(null);
  const [rondeNum,setRondeNum]=useState("1");
  const [rondeCard,setRondeCard]=useState("");
  const [showReset,setShowReset]=useState(false);

  async function act(path:string,body:object,label:string) {
    setLoading(true); setMsg(null);
    try { await postRoom(roomCode,path,{...body,playerId:myId}); setMsg({text:`✅ ${label} berhasil`,ok:true}); }
    catch(e:unknown) { setMsg({text:e instanceof Error?e.message:"Error",ok:false}); }
    finally { setLoading(false); }
  }

  async function handleSetRondeCard() {
    const r = parseInt(rondeNum);
    if (!rondeCard.trim()) return setMsg({text:"Isi teks kartu ronde",ok:false});
    await act("/set-ronde-card",{ronde:r,card:rondeCard.trim()},`Kartu Ronde ${r} disimpan`);
  }

  async function handleReset() {
    await act("/reset-game",{},"Game direset");
    setShowReset(false);
  }

  const ACTIONS=[
    {icon:"⏭",label:"Paksa Maju Fase",desc:"Skip ke fase berikutnya secara manual",color:"#2478d4",path:"/facilitator-advance",body:{}},
    {icon:"🔄",label:"Reset Giliran Ini",desc:"Kembalikan giliran ke awal putaran ini",color:"#f0a020",path:"/facilitator-reset-turn",body:{}},
    {icon:"🏁",label:"Akhiri Game Sekarang",desc:"Langsung ke layar hasil akhir",color:"#dc2626",path:"/finish-early",body:{}},
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" style={{background:"rgba(0,0,0,0.65)"}} onClick={onClose}>
      <div className="w-full max-w-[430px] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3"/>
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl text-xl flex items-center justify-center text-white" style={{background:"#1a3a6b"}}>🎛</div>
          <div className="flex-1">
            <h3 className="font-black text-gray-800 text-base">Panel Fasilitator</h3>
            <p className="text-[11px] text-gray-400">Host eksklusif · Room {roomCode}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl w-9 h-9 flex items-center justify-center">×</button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          {msg&&<div className={`text-xs rounded-xl px-3 py-2 font-bold ${msg.ok?"bg-green-50 text-green-700":"bg-red-50 text-red-600"}`}>{msg.text}</div>}

          {/* ── Kartu Ronde ── */}
          <div className="rounded-2xl p-4" style={{background:"#fef9c3",border:"1.5px solid #f59e0b"}}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🃏</span>
              <div className="font-black text-amber-800 text-sm">Set Kartu Ronde</div>
            </div>
            <div className="flex gap-2 mb-2">
              {[1,2,3,4].map(n=>(
                <button key={n} onClick={()=>setRondeNum(String(n))}
                  className="flex-1 py-2 rounded-xl text-xs font-black transition-all"
                  style={{background:rondeNum===String(n)?"#f59e0b":"#fde68a",color:rondeNum===String(n)?"#fff":"#92400e",border:`1.5px solid ${rondeNum===String(n)?"#d97706":"#fcd34d"}`}}>
                  R{n}
                </button>
              ))}
            </div>
            <textarea value={rondeCard} onChange={e=>setRondeCard(e.target.value)}
              placeholder="Ketik isi kartu ronde di sini..."
              rows={2}
              className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-400 resize-none mb-2"
              style={{background:"#fffbeb"}}/>
            <button onClick={handleSetRondeCard} disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-50 active:scale-95"
              style={{background:"#f59e0b"}}>
              {loading?"Menyimpan...":"💾 Simpan Kartu Ronde"}
            </button>
          </div>

          {/* ── Standard actions ── */}
          {ACTIONS.map(a=>(
            <button key={a.label} onClick={()=>act(a.path,a.body,a.label)} disabled={loading}
              className="w-full p-4 rounded-2xl flex items-center gap-3 active:scale-95 disabled:opacity-50 text-left"
              style={{background:`${a.color}12`,border:`1.5px solid ${a.color}30`}}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 text-white" style={{background:a.color}}>{a.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm" style={{color:a.color}}>{a.label}</div>
                <div className="text-[11px] text-gray-500">{a.desc}</div>
              </div>
              <span className="text-lg" style={{color:a.color}}>›</span>
            </button>
          ))}

          {/* ── Reset Game ── */}
          {!showReset?(
            <button onClick={()=>setShowReset(true)} disabled={loading}
              className="w-full p-4 rounded-2xl flex items-center gap-3 active:scale-95 disabled:opacity-50 text-left"
              style={{background:"#7f1d1d18",border:"1.5px solid #7f1d1d30"}}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 text-white" style={{background:"#7f1d1d"}}>🔁</div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-sm" style={{color:"#7f1d1d"}}>Reset Seluruh Game</div>
                <div className="text-[11px] text-gray-500">Kembali ke ruang tunggu, data game dihapus</div>
              </div>
              <span className="text-lg" style={{color:"#7f1d1d"}}>›</span>
            </button>
          ):(
            <div className="rounded-2xl p-4" style={{background:"#fef2f2",border:"1.5px solid #fca5a5"}}>
              <p className="text-sm font-black text-red-700 mb-1">⚠️ Yakin reset seluruh game?</p>
              <p className="text-xs text-red-500 mb-3">Semua progress (uang, KAP, transaksi) akan dihapus. Pemain tetap di room.</p>
              <div className="flex gap-2">
                <button onClick={()=>setShowReset(false)} className="flex-1 py-2.5 rounded-xl text-sm font-black border border-gray-200 text-gray-600 active:scale-95">Batal</button>
                <button onClick={handleReset} disabled={loading} className="flex-1 py-2.5 rounded-xl text-sm font-black text-white active:scale-95 disabled:opacity-50" style={{background:"#dc2626"}}>
                  {loading?"Mereset...":"🔁 Ya, Reset!"}
                </button>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-700 font-bold">⚠️ Panel hanya terlihat oleh Host.</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Aksi ini tidak dapat dibatalkan.</p>
          </div>
        </div>
        <div className="h-5"/>
      </div>
    </div>
  );
}
