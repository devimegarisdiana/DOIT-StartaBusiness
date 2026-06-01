import { useState } from "react";
import { useTheme, THEMES, Theme } from "../contexts/ThemeContext";

export default function Pengaturan() {
  const { theme, setTheme } = useTheme();
  const [institution, setInstitution] = useState(() => localStorage.getItem("doitInstitution") || "");
  const [saved, setSaved] = useState(false);

  function saveInstitution() {
    localStorage.setItem("doitInstitution", institution);
    setSaved(true); setTimeout(()=>setSaved(false), 2000);
  }

  const t = THEMES[theme];

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{background: t.bg}}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4" style={{background: t.header}}>
        <div>
          <h1 className="text-white font-black text-lg leading-tight">⚙️ Pengaturan</h1>
          <p className="text-blue-200 text-xs">Konfigurasi & Premium UI</p>
        </div>
        <div className="ml-auto px-2 py-1 rounded-lg text-xs font-black text-white" style={{background:"rgba(255,255,255,0.2)"}}>
          Premium
        </div>
      </div>

      <div className="px-4 py-4 flex flex-col gap-4">

        {/* Tema */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{background: t.card, border:`1px solid ${t.border}`}}>
          <div className="px-4 py-3 border-b" style={{borderColor: t.border}}>
            <h2 className="font-black text-sm" style={{color: t.text}}>🎨 Tema & Skin</h2>
            <p className="text-xs mt-0.5" style={{color: t.subtext}}>Pilih tampilan visual aplikasi</p>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {(Object.keys(THEMES) as Theme[]).map(k => {
              const th = THEMES[k];
              const active = theme === k;
              return (
                <button key={k} onClick={()=>setTheme(k)}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 active:scale-95 transition-all"
                  style={{
                    background: active ? th.header : th.bg,
                    borderColor: active ? th.accent : th.border,
                  }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{background: th.header}}>
                    <span>{th.emoji}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-black text-sm" style={{color: active?"#fff":t.text}}>{th.label}</div>
                    <div className="text-[11px]" style={{color: active?"rgba(255,255,255,0.7)":t.subtext}}>
                      {k==="default"?"Tampilan biru klasik":k==="dark"?"Mode gelap, nyaman di malam hari":"Warna cerah bergaya komik"}
                    </div>
                  </div>
                  {active&&<div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-black" style={{background:th.accent}}>✓</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nama Institusi */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{background: t.card, border:`1px solid ${t.border}`}}>
          <div className="px-4 py-3 border-b" style={{borderColor: t.border}}>
            <h2 className="font-black text-sm" style={{color: t.text}}>📱 Layar Sambutan Branded</h2>
            <p className="text-xs mt-0.5" style={{color: t.subtext}}>Nama institusi/kelas yang tampil di splash screen</p>
          </div>
          <div className="p-4">
            <label className="text-xs font-bold mb-2 block" style={{color: t.subtext}}>Nama Institusi / Kelas</label>
            <div className="flex gap-2">
              <input
                value={institution} onChange={e=>setInstitution(e.target.value)}
                placeholder="cth: POLINEMA – Kelas A"
                className="flex-1 rounded-xl px-3 py-2.5 text-sm font-bold outline-none border-2"
                style={{background: t.bg, borderColor: t.border, color: t.text}}
              />
              <button onClick={saveInstitution}
                className="px-4 py-2.5 rounded-xl text-white font-black text-sm active:scale-95"
                style={{background: saved?"#16a34a":t.accent}}>
                {saved?"✓":"Simpan"}
              </button>
            </div>
            <p className="text-[10px] mt-2" style={{color: t.subtext}}>
              Nama ini akan muncul di splash screen setiap kali aplikasi dibuka.
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="rounded-2xl overflow-hidden shadow-sm" style={{background: t.card, border:`1px solid ${t.border}`}}>
          <div className="px-4 py-3 border-b" style={{borderColor: t.border}}>
            <h2 className="font-black text-sm" style={{color: t.text}}>ℹ️ Tentang Aplikasi</h2>
          </div>
          {[
            {icon:"🎮", label:"Versi Aplikasi",    value:"2.0 Premium"},
            {icon:"🎂", label:"Dikembangkan oleh", value:"POLINEMA × Comic Cafe"},
            {icon:"📚", label:"Untuk",              value:"Edukasi Kewirausahaan"},
            {icon:"💼", label:"UI Pack",            value:"Software House Edition"},
          ].map((item,i)=>(
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b last:border-0" style={{borderColor: t.border}}>
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{color: t.text}}>{item.label}</div>
              </div>
              <div className="text-xs font-semibold" style={{color: t.subtext}}>{item.value}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
