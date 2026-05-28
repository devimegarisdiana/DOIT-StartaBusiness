import { useState } from "react";
import { useNavigate } from "react-router-dom";

type TxType = "pemasukan" | "pengeluaran";

interface Transaction {
  id: number;
  keterangan: string;
  jumlah: number;
  tipe: TxType;
  waktu: string;
}

interface Team {
  id: number;
  nama: string;
  modal: number;
  transaksi: Transaction[];
}

type Phase = "setup" | "playing";

export default function GamePage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("setup");

  // Setup state
  const [jumlahTim, setJumlahTim] = useState(2);
  const [modalAwal, setModalAwal] = useState("500000");

  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTim, setActiveTim] = useState(0);

  // Input state
  const [keterangan, setKeterangan] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [tipe, setTipe] = useState<TxType>("pemasukan");
  const [showForm, setShowForm] = useState(false);

  function mulaiGame() {
    const modal = parseInt(modalAwal) || 500000;
    const newTeams: Team[] = Array.from({ length: jumlahTim }, (_, i) => ({
      id: i,
      nama: `Tim ${i + 1}`,
      modal,
      transaksi: [],
    }));
    setTeams(newTeams);
    setPhase("playing");
  }

  function tambahTransaksi() {
    if (!keterangan.trim() || !jumlah) return;
    const nominal = parseInt(jumlah) || 0;
    const waktu = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const tx: Transaction = {
      id: Date.now(),
      keterangan: keterangan.trim(),
      jumlah: nominal,
      tipe,
      waktu,
    };
    setTeams(prev =>
      prev.map(t =>
        t.id === activeTim ? { ...t, transaksi: [tx, ...t.transaksi] } : t
      )
    );
    setKeterangan("");
    setJumlah("");
    setShowForm(false);
  }

  function hapusTransaksi(txId: number) {
    setTeams(prev =>
      prev.map(t =>
        t.id === activeTim
          ? { ...t, transaksi: t.transaksi.filter(tx => tx.id !== txId) }
          : t
      )
    );
  }

  function getSaldo(team: Team) {
    return team.transaksi.reduce(
      (acc, tx) => acc + (tx.tipe === "pemasukan" ? tx.jumlah : -tx.jumlah),
      team.modal
    );
  }

  function formatRp(n: number) {
    return "Rp " + n.toLocaleString("id-ID");
  }

  const activeTeam = teams[activeTim];

  if (phase === "setup") {
    return (
      <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "#d6eeff" }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-5 pb-4" style={{ background: "#1a3a6b" }}>
          <button onClick={() => navigate("/")} className="text-white text-2xl leading-none">‹</button>
          <div>
            <h1 className="text-white font-black text-lg leading-tight">Mulai Game</h1>
            <p className="text-blue-300 text-xs">Setup sesi permainan</p>
          </div>
          <span className="ml-auto text-3xl">🧮</span>
        </div>

        <div className="px-4 py-5 flex flex-col gap-5">
          {/* Jumlah Tim */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-black text-gray-800 text-sm mb-3">Jumlah Tim Bermain</h2>
            <div className="flex gap-2 flex-wrap">
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setJumlahTim(n)}
                  className="w-12 h-12 rounded-xl font-black text-lg transition-all"
                  style={{
                    background: jumlahTim === n ? "#1a3a6b" : "#f0f4ff",
                    color: jumlahTim === n ? "#fff" : "#1a3a6b",
                    border: jumlahTim === n ? "none" : "2px solid #d0dcf0",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Modal Awal */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-black text-gray-800 text-sm mb-1">Modal Awal per Tim</h2>
            <p className="text-xs text-gray-400 mb-3">Sesuaikan dengan kartu modal dalam game</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {["250000", "500000", "750000", "1000000"].map(v => (
                <button
                  key={v}
                  onClick={() => setModalAwal(v)}
                  className="px-3 py-2 rounded-xl font-bold text-xs transition-all"
                  style={{
                    background: modalAwal === v ? "#28a745" : "#f0f4ff",
                    color: modalAwal === v ? "#fff" : "#28a745",
                    border: modalAwal === v ? "none" : "2px solid #c8e8d0",
                  }}
                >
                  {formatRp(parseInt(v))}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm font-semibold">Rp</span>
              <input
                type="number"
                value={modalAwal}
                onChange={e => setModalAwal(e.target.value)}
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:border-green-400"
                placeholder="Nominal lain..."
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h2 className="font-black text-gray-800 text-sm mb-2">Ringkasan Sesi</h2>
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: jumlahTim }, (_, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-bold text-gray-700">Tim {i + 1}</span>
                  <span className="text-sm font-black text-green-600">{formatRp(parseInt(modalAwal) || 0)}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={mulaiGame}
            className="w-full py-4 rounded-2xl text-white font-black text-base shadow-lg active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #28a745, #20c058)" }}
          >
            🎮 Mulai Permainan!
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden" style={{ background: "#d6eeff" }}>
      {/* Header */}
      <div className="flex-shrink-0" style={{ background: "#1a3a6b" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button onClick={() => { if (confirm("Keluar dari game?")) navigate("/"); }} className="text-white text-2xl leading-none">‹</button>
          <div className="flex-1">
            <h1 className="text-white font-black text-base leading-tight">Hitung Keuangan</h1>
            <p className="text-blue-300 text-[10px]">Catat transaksi real-time</p>
          </div>
          <div className="text-right">
            <div className="text-white font-black text-xs">{activeTeam?.nama}</div>
            <div className="font-black text-sm" style={{ color: getSaldo(activeTeam) >= activeTeam?.modal ? "#4ade80" : "#f87171" }}>
              {formatRp(getSaldo(activeTeam ?? { modal: 0, transaksi: [] } as unknown as Team))}
            </div>
          </div>
        </div>

        {/* Team tabs */}
        <div className="flex gap-1 px-3 pb-3 overflow-x-auto scrollbar-hide">
          {teams.map(t => {
            const saldo = getSaldo(t);
            const untung = saldo > t.modal;
            const rugi = saldo < t.modal;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTim(t.id)}
                className="flex-shrink-0 px-3 py-2 rounded-xl text-center transition-all min-w-[70px]"
                style={{
                  background: activeTim === t.id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
                  border: activeTim === t.id ? "2px solid rgba(255,255,255,0.5)" : "2px solid transparent",
                }}
              >
                <div className="text-white font-black text-xs">{t.nama}</div>
                <div className="font-bold text-[10px]" style={{ color: untung ? "#4ade80" : rugi ? "#f87171" : "#93c5fd" }}>
                  {formatRp(saldo)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        {/* Saldo card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Saldo {activeTeam.nama}</span>
            <span className="text-xs text-gray-400">{activeTeam.transaksi.length} transaksi</span>
          </div>
          <div className="text-3xl font-black text-center mb-1" style={{ color: getSaldo(activeTeam) >= activeTeam.modal ? "#16a34a" : "#dc2626" }}>
            {formatRp(getSaldo(activeTeam))}
          </div>
          <div className="flex justify-around mt-3">
            <div className="text-center">
              <div className="text-xs text-gray-400">Modal Awal</div>
              <div className="font-black text-sm text-gray-700">{formatRp(activeTeam.modal)}</div>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <div className="text-xs text-gray-400 ">Total Masuk</div>
              <div className="font-black text-sm text-green-600">
                +{formatRp(activeTeam.transaksi.filter(t => t.tipe === "pemasukan").reduce((a, t) => a + t.jumlah, 0))}
              </div>
            </div>
            <div className="w-px bg-gray-100" />
            <div className="text-center">
              <div className="text-xs text-gray-400">Total Keluar</div>
              <div className="font-black text-sm text-red-500">
                -{formatRp(activeTeam.transaksi.filter(t => t.tipe === "pengeluaran").reduce((a, t) => a + t.jumlah, 0))}
              </div>
            </div>
          </div>
        </div>

        {/* Form tambah transaksi */}
        {showForm ? (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 text-sm mb-3">Tambah Transaksi</h3>

            {/* Tipe toggle */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setTipe("pemasukan")}
                className="flex-1 py-2 rounded-xl font-black text-sm transition-all"
                style={{ background: tipe === "pemasukan" ? "#16a34a" : "#f0fdf4", color: tipe === "pemasukan" ? "#fff" : "#16a34a", border: tipe === "pemasukan" ? "none" : "2px solid #bbf7d0" }}
              >
                ↑ Pemasukan
              </button>
              <button
                onClick={() => setTipe("pengeluaran")}
                className="flex-1 py-2 rounded-xl font-black text-sm transition-all"
                style={{ background: tipe === "pengeluaran" ? "#dc2626" : "#fff5f5", color: tipe === "pengeluaran" ? "#fff" : "#dc2626", border: tipe === "pengeluaran" ? "none" : "2px solid #fecaca" }}
              >
                ↓ Pengeluaran
              </button>
            </div>

            {/* Keterangan */}
            <input
              type="text"
              value={keterangan}
              onChange={e => setKeterangan(e.target.value)}
              placeholder="Keterangan (mis: Jual kopi, Beli bahan...)"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-blue-400 mb-2"
            />

            {/* Nominal */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-500 font-semibold text-sm">Rp</span>
              <input
                type="number"
                value={jumlah}
                onChange={e => setJumlah(e.target.value)}
                placeholder="Nominal..."
                className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-800 outline-none focus:border-blue-400"
              />
            </div>

            {/* Quick amounts */}
            <div className="flex gap-1.5 flex-wrap mb-3">
              {["5000","10000","25000","50000","100000"].map(v => (
                <button key={v} onClick={() => setJumlah(v)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-600 active:bg-gray-200">
                  {parseInt(v) >= 1000 ? (parseInt(v)/1000)+"rb" : v}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-600">
                Batal
              </button>
              <button
                onClick={tambahTransaksi}
                disabled={!keterangan.trim() || !jumlah}
                className="flex-[2] py-3 rounded-xl font-black text-sm text-white transition-all disabled:opacity-50"
                style={{ background: tipe === "pemasukan" ? "#16a34a" : "#dc2626" }}
              >
                Simpan Transaksi
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3.5 rounded-2xl text-white font-black text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg, #2478d4, #1a5fb0)" }}
          >
            <span className="text-lg">+</span> Catat Transaksi Baru
          </button>
        )}

        {/* Riwayat transaksi */}
        {activeTeam.transaksi.length > 0 ? (
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <h3 className="font-black text-gray-700 text-sm">Riwayat Transaksi</h3>
            </div>
            {activeTeam.transaksi.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-base flex-shrink-0"
                  style={{ background: tx.tipe === "pemasukan" ? "#16a34a" : "#dc2626" }}
                >
                  {tx.tipe === "pemasukan" ? "↑" : "↓"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 text-sm truncate">{tx.keterangan}</div>
                  <div className="text-[10px] text-gray-400">{tx.waktu}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-black text-sm" style={{ color: tx.tipe === "pemasukan" ? "#16a34a" : "#dc2626" }}>
                    {tx.tipe === "pemasukan" ? "+" : "-"}{formatRp(tx.jumlah)}
                  </div>
                  <button onClick={() => hapusTransaksi(tx.id)} className="text-[10px] text-gray-300 hover:text-red-400 mt-0.5">hapus</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-gray-400 text-sm font-semibold">Belum ada transaksi</p>
            <p className="text-gray-300 text-xs mt-0.5">Ketuk tombol di atas untuk mencatat</p>
          </div>
        )}
      </div>
    </div>
  );
}
