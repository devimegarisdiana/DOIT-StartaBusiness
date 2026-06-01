import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PlayerCard, { PlayerLike } from "../components/PlayerCard";

interface Session { code:string; date:string; players:PlayerLike[]; }

export default function Leaderboard() {
  const [params] = useSearchParams();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [active, setActive] = useState<Session|null>(null);
  const institution = localStorage.getItem("doitInstitution") || undefined;

  useEffect(() => {
    const raw = localStorage.getItem("doitSessions");
    const list: Session[] = raw ? JSON.parse(raw) : [];
    setSessions(list);
    const code = params.get("room");
    if (code) { const s = list.find(x=>x.code===code); if(s) setActive(s); }
    else if (list.length>0) setActive(list[list.length-1]);
  }, [params]);

  const sorted = active ? [...active.players].sort((a,b)=>(b.finalKAP??b.kapScore)-(a.finalKAP??a.kapScore)) : [];
  const [first,second,third,...rest] = sorted;

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{background:"#d6eeff"}}>
      {/* Header */}
      <div className="px-4 pt-5 pb-4" style={{background:"linear-gradient(135deg,#1a3a6b,#2478d4)"}}>
        <div className="flex items-center gap-3 mb-3">
          <div>
            <h1 className="text-white font-black text-lg leading-tight">🏆 Leaderboard</h1>
            <p className="text-blue-200 text-xs">{institution||"DO IT: Start a Business"}</p>
          </div>
          <div className="ml-auto text-3xl">🏆</div>
        </div>
        {sessions.length>1&&(
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sessions.map((s,i)=>(
              <button key={i} onClick={()=>setActive(s)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border"
                style={{background:active?.code===s.code?"#fff":"rgba(255,255,255,0.15)",
                  color:active?.code===s.code?"#1a3a6b":"#fff",
                  borderColor:active?.code===s.code?"#fff":"rgba(255,255,255,0.3)"}}>
                {s.code} · {s.date}
              </button>
            ))}
          </div>
        )}
      </div>

      {!active ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="font-black text-gray-700 text-lg">Belum Ada Sesi</h2>
            <p className="text-gray-400 text-sm mt-1">Leaderboard muncul otomatis setelah sesi game selesai.</p>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 flex flex-col gap-3">
          {/* Podium */}
          {sorted.length>=2&&(
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-1">
              <p className="text-xs font-black text-gray-400 text-center mb-3 tracking-wider">PODIUM</p>
              <div className="flex items-end justify-center gap-2">
                {/* 2nd */}
                {second&&<div className="flex flex-col items-center gap-1 flex-1">
                  <div className="text-2xl">🥈</div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 border-gray-200">
                    {{merah:"🔴",biru:"🔵",kuning:"🟡",hijau:"🟢"}[second.boardColor]??"🎮"}
                  </div>
                  <div className="font-black text-xs text-center truncate w-full text-center" style={{maxWidth:70}}>{second.name}</div>
                  <div className="font-black text-lg text-gray-700">{second.finalKAP??second.kapScore}</div>
                  <div className="w-full rounded-t-xl flex items-end justify-center py-2 font-black text-white text-sm" style={{background:"#94a3b8",height:56}}>2</div>
                </div>}
                {/* 1st */}
                {first&&<div className="flex flex-col items-center gap-1 flex-1">
                  <div className="text-3xl">🥇</div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 border-yellow-400 shadow-md">
                    {{merah:"🔴",biru:"🔵",kuning:"🟡",hijau:"🟢"}[first.boardColor]??"🎮"}
                  </div>
                  <div className="font-black text-sm text-center truncate w-full text-center" style={{maxWidth:80}}>{first.name}</div>
                  <div className="font-black text-2xl" style={{color:"#f59e0b"}}>{first.finalKAP??first.kapScore}</div>
                  <div className="w-full rounded-t-xl flex items-end justify-center py-2 font-black text-white text-sm" style={{background:"linear-gradient(135deg,#f59e0b,#f97316)",height:80}}>1</div>
                </div>}
                {/* 3rd */}
                {third&&<div className="flex flex-col items-center gap-1 flex-1">
                  <div className="text-2xl">🥉</div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 border-orange-200">
                    {{merah:"🔴",biru:"🔵",kuning:"🟡",hijau:"🟢"}[third.boardColor]??"🎮"}
                  </div>
                  <div className="font-black text-xs text-center truncate w-full text-center" style={{maxWidth:70}}>{third.name}</div>
                  <div className="font-black text-lg text-gray-700">{third.finalKAP??third.kapScore}</div>
                  <div className="w-full rounded-t-xl flex items-end justify-center py-2 font-black text-white text-sm" style={{background:"#cd7c3a",height:40}}>3</div>
                </div>}
              </div>
            </div>
          )}

          {/* Player Cards */}
          {sorted.map((p,i)=>(
            <PlayerCard key={p.id} player={p} rank={i} institution={institution}/>
          ))}

          {rest.length>0&&rest.map((p,i)=>(
            <PlayerCard key={p.id} player={p} rank={i+3} institution={institution}/>
          ))}

          <div className="text-center py-2">
            <p className="text-xs text-gray-400">Sesi: {active.code} · {active.date}</p>
          </div>
        </div>
      )}
    </div>
  );
}
