export default function Leaderboard() {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
      <div className="flex items-center gap-3 px-4 pt-5 pb-4" style={{ background: "#1a3a6b" }}>
        <div>
          <h1 className="text-white font-black text-lg leading-tight">Leaderboard</h1>
          <p className="text-blue-300 text-xs">Peringkat pemain terbaik</p>
        </div>
        <span className="ml-auto text-3xl">🏆</span>
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="font-black text-gray-700 text-lg">Segera Hadir</h2>
          <p className="text-gray-400 text-sm mt-1">Leaderboard akan tersedia setelah sesi game selesai.</p>
        </div>
      </div>
    </div>
  );
}
