export default function Riwayat() {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4" style={{ background: "#1a3a6b" }}>
        <div>
          <h1 className="text-white font-black text-lg leading-tight">Riwayat</h1>
          <p className="text-blue-300 text-xs">Sesi game sebelumnya</p>
        </div>
        <span className="ml-auto text-3xl">📈</span>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="font-black text-gray-700 text-lg">Belum Ada Riwayat</h2>
          <p className="text-gray-400 text-sm mt-1">Riwayat sesi game akan muncul di sini.</p>
        </div>
      </div>
    </div>
  );
}
