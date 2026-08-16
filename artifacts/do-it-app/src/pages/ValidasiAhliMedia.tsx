import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ── DATA ─────────────────────────────────────────────────────────────────────
const ASPEK = [
  {
    label: "ASPEK REKAYASA PERANGKAT LUNAK",
    items: [
      {
        no: 1,
        indikator: "Efisiensi Algoritma",
        deskripsi: "Ketepatan sistem dalam melakukan skoring otomatis (KAP) secara real-time.",
      },
      {
        no: 2,
        indikator: "Keamanan Data",
        deskripsi: "Keandalan sistem room-code untuk melindungi kerahasiaan data permainan.",
      },
      {
        no: 3,
        indikator: "Responsivitas",
        deskripsi: "Kecepatan dan ketepatan tampilan saat diakses lewat berbagai perangkat (mobile/desktop).",
      },
      {
        no: 4,
        indikator: "Robustness",
        deskripsi: "Kemampuan sistem menangani kesalahan input tanpa menyebabkan aplikasi error/crash.",
      },
    ],
  },
  {
    label: "ASPEK DESAIN ANTARMUKA (UI)",
    items: [
      {
        no: 5,
        indikator: "Tipografi",
        deskripsi: "Penggunaan jenis dan ukuran font yang memudahkan membaca konten aplikasi.",
      },
      {
        no: 6,
        indikator: "Konsistensi Visual",
        deskripsi: "Keselarasan warna, ikon, dan tata letak di seluruh halaman aplikasi.",
      },
      {
        no: 7,
        indikator: "Layouting",
        deskripsi: "Penempatan elemen (tombol navigasi, kartu informasi, formulir) yang proporsional.",
      },
      {
        no: 8,
        indikator: "Kualitas Grafis",
        deskripsi: "Ketajaman gambar, ikon, dan aset visual yang digunakan dalam aplikasi.",
      },
    ],
  },
  {
    label: "ASPEK PENGALAMAN PENGGUNA (UX)",
    items: [
      {
        no: 9,
        indikator: "Kemudahan Navigasi",
        deskripsi: "Kejelasan alur penggunaan dari membuat room hingga melihat skor akhir.",
      },
      {
        no: 10,
        indikator: "User Control",
        deskripsi: "Kejelasan fungsi tombol aksi (simpan, edit, hapus transaksi) bagi pemain dan fasilitator.",
      },
      {
        no: 11,
        indikator: "Feedback Sistem",
        deskripsi: "Kecepatan sistem memberikan konfirmasi setelah pengguna melakukan aksi.",
      },
      {
        no: 12,
        indikator: "Affordance",
        deskripsi: "Desain elemen interaktif yang secara intuitif memberi tahu pengguna cara penggunaannya.",
      },
    ],
  },
  {
    label: "ASPEK KOMUNIKASI VISUAL & KONTEN",
    items: [
      {
        no: 13,
        indikator: "Struktur Menu",
        deskripsi: "Pengorganisasian menu fitur (Panduan, Game, Kompetensi, Kuesioner) yang logis dan mudah ditemukan.",
      },
      {
        no: 14,
        indikator: "Visualisasi Skor",
        deskripsi: "Efektivitas tampilan KAP real-time dan papan skor akhir dalam membantu pemain memahami posisi mereka.",
      },
      {
        no: 15,
        indikator: "Kejelasan Instruksi",
        deskripsi: "Penggunaan bahasa visual/teks yang sederhana untuk memandu penggunaan setiap fitur.",
      },
    ],
  },
  {
    label: "ASPEK KEMANFAATAN TEKNIS",
    items: [
      {
        no: 16,
        indikator: "Self-Explanatory",
        deskripsi: "Kemampuan aplikasi menjelaskan dirinya sendiri sehingga pengguna dapat mandiri tanpa bantuan manual.",
      },
      {
        no: 17,
        indikator: "Accessibility",
        deskripsi: "Kemudahan akses URL dan kelancaran proses pemuatan halaman.",
      },
    ],
  },
];

const SKOR_LABEL: Record<number, string> = {
  1: "Sangat Tidak Baik",
  2: "Tidak Baik",
  3: "Cukup Baik",
  4: "Baik",
  5: "Sangat Baik",
};

const TOTAL_MAX = ASPEK.flatMap(a => a.items).length * 5; // 85

function klasifikasi(pct: number) {
  if (pct >= 81) return { label: "Sangat Layak", sub: "Tanpa Revisi", color: "#059669" };
  if (pct >= 61) return { label: "Layak", sub: "Revisi Minor", color: "#d97706" };
  if (pct >= 41) return { label: "Cukup Layak", sub: "Revisi Mayor", color: "#dc2626" };
  return { label: "Tidak Layak", sub: "Tinjau Ulang Total", color: "#7c3aed" };
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function ValidasiAhliMedia() {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [nama, setNama] = useState("");
  const [keahlian, setKeahlian] = useState("");
  const [instansi, setInstansi] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [komentar, setKomentar] = useState("");

  // skor[no] = 1..5
  const [skor, setSkor] = useState<Record<number, number>>({});
  // catatan[no] = string
  const [catatan, setCatatan] = useState<Record<number, string>>({});

  const allItems = ASPEK.flatMap(a => a.items);
  const totalSkor = allItems.reduce((s, it) => s + (skor[it.no] ?? 0), 0);
  const filledCount = allItems.filter(it => skor[it.no]).length;
  const pct = filledCount === allItems.length ? Math.round((totalSkor / TOTAL_MAX) * 100) : null;
  const kel = pct !== null ? klasifikasi(pct) : null;

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "linear-gradient(175deg,#d6ebff,#e8f4ff 40%,#f0f8ff)" }}>

      {/* ── HEADER ── */}
      <div style={{
        background: "linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6)",
        padding: "20px 16px 18px",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <button onClick={() => navigate(-1)} style={{
          background: "rgba(255,255,255,0.18)", border: "none", borderRadius: 10,
          color: "#fff", fontSize: 13, fontWeight: 700, padding: "5px 12px", cursor: "pointer",
          marginBottom: 12, display: "inline-flex", alignItems: "center", gap: 6,
        }}>‹ Kembali</button>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", letterSpacing: 2, fontWeight: 800, marginBottom: 4 }}>FORM UJI VALIDASI</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: -0.4, lineHeight: 1.25 }}>Ahli Media</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Aplikasi Companion DO IT: Start a Business</div>
      </div>

      <div style={{ padding: "16px 14px 32px" }}>

        {/* ── TUJUAN ── */}
        <div style={{
          background: "#fff", borderRadius: 14, padding: "13px 14px", marginBottom: 14,
          border: "1px solid rgba(200,225,255,0.7)", boxShadow: "0 2px 12px rgba(15,42,92,0.06)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#2563eb", letterSpacing: 1.5, marginBottom: 6 }}>TUJUAN PENILAIAN</div>
          <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, margin: 0 }}>
            Menilai kualitas antarmuka (UI), pengalaman pengguna (UX), fungsionalitas teknis,
            dan kemudahan navigasi aplikasi companion game DO IT: Start a Business.
          </p>
          <div style={{ marginTop: 10, padding: "8px 11px", background: "#eff6ff", borderRadius: 9, border: "1px solid #bfdbfe" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#1d4ed8", marginBottom: 4 }}>SKALA PENILAIAN</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[1,2,3,4,5].map(n => (
                <div key={n} style={{ fontSize: 10, color: "#374151" }}>
                  <b>{n}</b> = {SKOR_LABEL[n]}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── IDENTITAS ── */}
        <div style={{
          background: "#fff", borderRadius: 14, padding: "14px", marginBottom: 14,
          border: "1px solid rgba(200,225,255,0.7)", boxShadow: "0 2px 12px rgba(15,42,92,0.06)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#2563eb", letterSpacing: 1.5, marginBottom: 12 }}>IDENTITAS VALIDATOR</div>
          {[
            { label: "Nama Lengkap & Gelar", val: nama, set: setNama, placeholder: "Dr. ..." },
            { label: "Keahlian / Bidang Ilmu", val: keahlian, set: setKeahlian, placeholder: "Teknologi Informasi / Desain UI-UX" },
            { label: "Instansi / Perguruan Tinggi", val: instansi, set: setInstansi, placeholder: "Universitas ..." },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>{f.label}</div>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                style={{
                  width: "100%", padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0",
                  fontSize: 12, color: "#0f172a", outline: "none", background: "#f8fafc", boxSizing: "border-box",
                }} />
            </div>
          ))}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>Tanggal Penilaian</div>
            <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)}
              style={{
                padding: "9px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0",
                fontSize: 12, color: "#0f172a", outline: "none", background: "#f8fafc",
              }} />
          </div>
        </div>

        {/* ── INDIKATOR PENILAIAN ── */}
        {ASPEK.map((asp, ai) => (
          <div key={ai} style={{
            background: "#fff", borderRadius: 14, marginBottom: 12,
            border: "1px solid rgba(200,225,255,0.7)", boxShadow: "0 2px 12px rgba(15,42,92,0.06)",
            overflow: "hidden",
          }}>
            {/* Aspek header */}
            <div style={{
              background: "linear-gradient(135deg,#1e3a8a,#1d4ed8)",
              padding: "10px 14px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: "#fbbf24", letterSpacing: 1.5 }}>ASPEK {["I","II","III","IV","V"][ai]}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginTop: 2 }}>{asp.label}</div>
            </div>

            {/* Items */}
            {asp.items.map((item, ii) => (
              <div key={item.no} style={{
                padding: "13px 14px",
                borderBottom: ii < asp.items.length - 1 ? "1px solid #f1f5f9" : "none",
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{
                    minWidth: 22, height: 22, borderRadius: 7, background: "#eff6ff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 900, color: "#2563eb",
                  }}>{item.no}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{item.indikator}</div>
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, lineHeight: 1.55 }}>{item.deskripsi}</div>
                  </div>
                </div>

                {/* Score buttons */}
                <div style={{ display: "flex", gap: 7, marginBottom: 8, flexWrap: "wrap" }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} onClick={() => setSkor(p => ({ ...p, [item.no]: n }))}
                      style={{
                        width: 44, height: 44, borderRadius: 11,
                        border: skor[item.no] === n ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                        background: skor[item.no] === n ? "linear-gradient(135deg,#1d4ed8,#3b82f6)" : "#f8fafc",
                        color: skor[item.no] === n ? "#fff" : "#64748b",
                        fontSize: 14, fontWeight: 900, cursor: "pointer",
                        boxShadow: skor[item.no] === n ? "0 3px 10px rgba(29,78,216,0.35)" : "none",
                        transition: "all 0.15s",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0,
                      }}>
                      {n}
                    </button>
                  ))}
                  {skor[item.no] && (
                    <div style={{ display: "flex", alignItems: "center", fontSize: 10, color: "#2563eb", fontWeight: 700 }}>
                      {SKOR_LABEL[skor[item.no]]}
                    </div>
                  )}
                </div>

                {/* Catatan */}
                <input
                  value={catatan[item.no] ?? ""}
                  onChange={e => setCatatan(p => ({ ...p, [item.no]: e.target.value }))}
                  placeholder="Catatan / saran perbaikan (opsional)..."
                  style={{
                    width: "100%", padding: "8px 11px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                    fontSize: 11, color: "#374151", background: "#f8fafc", outline: "none", boxSizing: "border-box",
                  }} />
              </div>
            ))}
          </div>
        ))}

        {/* ── HASIL PENILAIAN ── */}
        <div style={{
          background: "#fff", borderRadius: 14, padding: "16px 14px", marginBottom: 14,
          border: "1px solid rgba(200,225,255,0.7)", boxShadow: "0 2px 12px rgba(15,42,92,0.06)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#2563eb", letterSpacing: 1.5, marginBottom: 14 }}>HASIL PENILAIAN KUANTITATIF</div>

          {/* Progress */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginBottom: 5 }}>
              <span>Progres pengisian</span>
              <span>{filledCount}/{allItems.length} indikator</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "#e2e8f0" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                background: "linear-gradient(90deg,#1d4ed8,#3b82f6)",
                width: `${(filledCount / allItems.length) * 100}%`,
                transition: "width 0.3s",
              }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            {[
              { label: "Total Skor", val: `${totalSkor}`, sub: `dari ${TOTAL_MAX}` },
              { label: "Rata-rata", val: filledCount ? (totalSkor / filledCount).toFixed(1) : "-", sub: "per indikator" },
              { label: "Persentase", val: pct !== null ? `${pct}%` : "-", sub: "kelayakan" },
            ].map(s => (
              <div key={s.label} style={{
                background: "#f8fafc", borderRadius: 11, padding: "11px 10px", textAlign: "center",
                border: "1px solid #e2e8f0",
              }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#1d4ed8" }}>{s.val}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", marginTop: 2 }}>{s.label}</div>
                <div style={{ fontSize: 9, color: "#cbd5e1" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Klasifikasi table */}
          <div style={{ fontSize: 10, fontWeight: 900, color: "#475569", letterSpacing: 1, marginBottom: 8 }}>TABEL KLASIFIKASI</div>
          {[
            { range: "81% - 100%", label: "Sangat Layak", sub: "Tanpa Revisi", min: 81 },
            { range: "61% - 80%", label: "Layak", sub: "Revisi Minor", min: 61 },
            { range: "41% - 60%", label: "Cukup Layak", sub: "Revisi Mayor", min: 41 },
            { range: "< 40%", label: "Tidak Layak", sub: "Tinjau Ulang Total", min: 0 },
          ].map(row => {
            const active = kel && kel.label === row.label;
            return (
              <div key={row.label} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
                borderRadius: 9, marginBottom: 5,
                background: active ? "#eff6ff" : "transparent",
                border: active ? "1.5px solid #93c5fd" : "1px solid transparent",
              }}>
                {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563eb", flexShrink: 0 }} />}
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", minWidth: 70 }}>{row.range}</span>
                <span style={{ fontSize: 11, fontWeight: active ? 900 : 600, color: active ? "#1d4ed8" : "#94a3b8" }}>
                  {row.label} — {row.sub}
                </span>
              </div>
            );
          })}

          {kel && (
            <div style={{
              marginTop: 12, padding: "12px 14px", borderRadius: 11,
              background: `${kel.color}12`, border: `1.5px solid ${kel.color}40`,
            }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: kel.color }}>
                ✓ KESIMPULAN: {kel.label} ({kel.sub})
              </div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>
                Persentase kelayakan: {pct}% ({totalSkor}/{TOTAL_MAX})
              </div>
            </div>
          )}
        </div>

        {/* ── KOMENTAR ── */}
        <div style={{
          background: "#fff", borderRadius: 14, padding: "14px", marginBottom: 14,
          border: "1px solid rgba(200,225,255,0.7)", boxShadow: "0 2px 12px rgba(15,42,92,0.06)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#2563eb", letterSpacing: 1.5, marginBottom: 10 }}>
            KOMENTAR UMUM & SARAN PERBAIKAN
          </div>
          <textarea value={komentar} onChange={e => setKomentar(e.target.value)}
            placeholder="Tuliskan komentar umum dan saran perbaikan di sini..."
            rows={5}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid #e2e8f0",
              fontSize: 12, color: "#374151", background: "#f8fafc", outline: "none",
              resize: "vertical", boxSizing: "border-box", lineHeight: 1.7,
            }} />
        </div>

        {/* ── TANDA TANGAN ── */}
        <div style={{
          background: "#fff", borderRadius: 14, padding: "14px", marginBottom: 14,
          border: "1px solid rgba(200,225,255,0.7)", boxShadow: "0 2px 12px rgba(15,42,92,0.06)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#2563eb", letterSpacing: 1.5, marginBottom: 10 }}>TANDA TANGAN VALIDATOR</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#475569" }}>
              Malang, {tanggal ? new Date(tanggal + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "..."}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Validator,</div>
            <div style={{ height: 56, borderBottom: "1px dashed #cbd5e1", marginTop: 4, marginBottom: 6 }} />
            <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{nama || "( Nama Validator )"}</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>{keahlian || "Keahlian / Bidang Ilmu"}</div>
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handlePrint}
            style={{
              flex: 1, padding: "13px", borderRadius: 13, border: "none",
              background: "linear-gradient(135deg,#1d4ed8,#3b82f6)",
              color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(29,78,216,0.35)",
            }}>
            🖨️ Cetak / Simpan PDF
          </button>
        </div>

        <p style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", marginTop: 10 }}>
          Gunakan "Cetak ke PDF" di browser untuk menyimpan sebagai dokumen
        </p>
      </div>

      {/* ── PRINT STYLES ── */}
      <style>{`
        @media print {
          body { background: white !important; }
          nav, button, .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
