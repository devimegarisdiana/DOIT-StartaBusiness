export default function Pengaturan() {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4" style={{ background: "#1a3a6b" }}>
        <div>
          <h1 className="text-white font-black text-lg leading-tight">Pengaturan</h1>
          <p className="text-blue-300 text-xs">Konfigurasi aplikasi</p>
        </div>
        <span className="ml-auto text-3xl">⚙️</span>
      </div>
      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          {[
            { icon: "🎮", label: "Versi Aplikasi", value: "1.0.0" },
            { icon: "🎂", label: "Dikembangkan oleh", value: "POLINEMA × Comic Cafe" },
            { icon: "📚", label: "Untuk", value: "Edukasi Kewirausahaan" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50 last:border-0">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-bold text-gray-700">{item.label}</div>
              </div>
              <div className="text-xs text-gray-400 font-semibold">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
