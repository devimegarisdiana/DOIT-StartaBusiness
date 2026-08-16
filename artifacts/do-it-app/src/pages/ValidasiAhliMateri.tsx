import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ── DATA ─────────────────────────────────────────────────────────────────────
const ASPEK = [
  {
    label: "ASPEK KELAYAKAN ISI / MATERI",
    items: [
      {
        no: 1,
        indikator: "Kesesuaian Materi dengan Capaian Pembelajaran",
        deskripsi:
          "Materi yang disajikan dalam game DO IT relevan dengan kompetensi kewirausahaan yang ingin dicapai.",
      },
      {
        no: 2,
        indikator: "Kedalaman Materi",
        deskripsi:
          "Keluasan dan kedalaman materi kewirausahaan yang dicakup dalam mekanisme permainan.",
      },
      {
        no: 3,
        indikator: "Keakuratan Konsep",
        deskripsi:
          "Ketepatan konsep-konsep kewirausahaan (perencanaan bisnis, CSR, manajemen risiko) yang digunakan dalam game.",
      },
      {
        no: 4,
        indikator: "Kemutakhiran Materi",
        deskripsi:
          "Kesesuaian materi dengan perkembangan ilmu kewirausahaan dan konteks bisnis masa kini.",
      },
    ],
  },
  {
    label: "ASPEK KEBENARAN KONSEP KEWIRAUSAHAAN",
    items: [
      {
        no: 5,
        indikator: "Kebenaran Konsep KAP (Kecerdasan Aksi Pengusaha)",
        deskripsi:
          "Ketepatan penggunaan KAP sebagai indikator kompetensi kewirausahaan dalam mekanisme skoring game.",
      },
      {
        no: 6,
        indikator: "Kebenaran Konsep Trofi Kompetensi",
        deskripsi:
          "Kesesuaian trofi (Kreativitas, Social Networking, Internal Locus of Control) dengan dimensi kompetensi kewirausahaan yang diakui.",
      },
      {
        no: 7,
        indikator: "Kebenaran Konsep FOMO dan Toleransi Ambiguitas",
        deskripsi:
          "Ketepatan konsep FOMO (Fear of Missing Out) dan toleransi ambiguitas sebagai faktor penghambat kewirausahaan.",
      },
      {
        no: 8,
        indikator: "Kebenaran Konsep Simulasi Bisnis",
        deskripsi:
          "Ketepatan simulasi aktivitas bisnis (buka cafe, CSR, hutang, pendapatan) dalam merepresentasikan realitas kewirausahaan.",
      },
    ],
  },
  {
    label: "ASPEK KELAYAKAN PENYAJIAN",
    items: [
      {
        no: 9,
        indikator: "Keruntutan Penyajian",
        deskripsi:
          "Urutan penyajian materi dan mekanisme game yang logis dan mudah diikuti dari awal hingga akhir permainan.",
      },
      {
        no: 10,
        indikator: "Keterlibatan Aktif Pemain",
        deskripsi:
          "Kemampuan game mendorong pemain untuk aktif berpikir, mengambil keputusan, dan belajar dari proses bermain.",
      },
      {
        no: 11,
        indikator: "Kesesuaian Skenario Permainan",
        deskripsi:
          "Kerealistisan skenario (mendirikan cafe, mengelola keuangan, berinteraksi sosial) dalam mencerminkan dunia wirausaha.",
      },
      {
        no: 12,
        indikator: "Integrasi Refleksi Pembelajaran",
        deskripsi:
          "Kemampuan game memfasilitasi refleksi pembelajaran melalui fitur Pengukuran Kompetensi dan Kuesioner Intensi.",
      },
    ],
  },
  {
    label: "ASPEK KEBAHASAAN",
    items: [
      {
        no: 13,
        indikator: "Ketepatan Penggunaan Istilah",
        deskripsi:
          "Penggunaan istilah kewirausahaan yang tepat dan konsisten dalam panduan, label UI, dan narasi game.",
      },
      {
        no: 14,
        indikator: "Kejelasan Instruksi",
        deskripsi:
          "Kejelasan bahasa yang digunakan dalam panduan bermain, instruksi fasilitator, dan petunjuk aplikasi.",
      },
      {
        no: 15,
        indikator: "Kesesuaian Bahasa dengan Pengguna",
        deskripsi:
          "Tingkat kemudahan bahasa yang digunakan sesuai dengan tingkat pemahaman mahasiswa/peserta didik.",
      },
    ],
  },
  {
    label: "ASPEK KESESUAIAN DENGAN TUJUAN PEMBELAJARAN",
    items: [
      {
        no: 16,
        indikator: "Peningkatan Pengetahuan Kewirausahaan",
        deskripsi:
          "Potensi game dalam meningkatkan pengetahuan mahasiswa tentang proses dan konsep kewirausahaan.",
      },
      {
        no: 17,
        indikator: "Pengembangan Sikap Wirausaha",
        deskripsi:
          "Kemampuan game dalam mengembangkan sikap dan karakter wirausaha (kreativitas, keberanian mengambil risiko, jiwa sosial).",
      },
      {
        no: 18,
        indikator: "Pengembangan Keterampilan Bisnis",
        deskripsi:
          "Kemampuan game dalam melatih keterampilan praktis berwirausaha melalui simulasi pengambilan keputusan bisnis.",
      },
      {
        no: 19,
        indikator: "Kelayakan sebagai Media Pembelajaran",
        deskripsi:
          "Kesesuaian game DO IT sebagai media pembelajaran kewirausahaan di perguruan tinggi secara keseluruhan.",
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

const TOTAL_MAX = ASPEK.flatMap(a => a.items).length * 5; // 95

function klasifikasi(pct: number) {
  if (pct >= 81) return { label: "Sangat Layak", sub: "Tanpa Revisi", color: "#059669" };
  if (pct >= 61) return { label: "Layak", sub: "Revisi Minor", color: "#d97706" };
  if (pct >= 41) return { label: "Cukup Layak", sub: "Revisi Mayor", color: "#dc2626" };
  return { label: "Tidak Layak", sub: "Tinjau Ulang Total", color: "#7c3aed" };
}

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function ValidasiAhliMateri() {
  const navigate = useNavigate();

  const [nama, setNama] = useState("");
  const [keahlian, setKeahlian] = useState("");
  const [instansi, setInstansi] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().split("T")[0]);
  const [komentar, setKomentar] = useState("");

  const [skor, setSkor] = useState<Record<number, number>>({});
  const [catatan, setCatatan] = useState<Record<number, string>>({});

  const allItems = ASPEK.flatMap(a => a.items);
  const totalSkor = allItems.reduce((s, it) => s + (skor[it.no] ?? 0), 0);
  const filledCount = allItems.filter(it => skor[it.no]).length;
  const pct = filledCount === allItems.length ? Math.round((totalSkor / TOTAL_MAX) * 100) : null;
  const kel = pct !== null ? klasifikasi(pct) : null;

  return (
    <div className="flex flex-col flex-1 overflow-y-auto" style={{ background: "linear-gradient(175deg,#fef9ec,#fffbf0 40%,#f0f8ff)" }}>

      {/* ── HEADER ── */}
      <div style={{
        background: "linear-gradient(135deg,#92400e,#b45309,#d97706)",
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
        <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: -0.4, lineHeight: 1.25 }}>Ahli Materi</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>Game Edukasi DO IT: Start a Business</div>
      </div>

      <div style={{ padding: "16px 14px 32px" }}>

        {/* ── TUJUAN ── */}
        <div style={{
          background: "#fff", borderRadius: 14, padding: "13px 14px", marginBottom: 14,
          border: "1px solid rgba(251,191,36,0.3)", boxShadow: "0 2px 12px rgba(180,83,9,0.06)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#b45309", letterSpacing: 1.5, marginBottom: 6 }}>TUJUAN PENILAIAN</div>
          <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.7, margin: 0 }}>
            Menilai kesesuaian materi, kebenaran konsep kewirausahaan, kelayakan penyajian,
            dan kesesuaian game DO IT: Start a Business dengan tujuan pembelajaran kewirausahaan.
          </p>
          <div style={{ marginTop: 10, padding: "8px 11px", background: "#fffbeb", borderRadius: 9, border: "1px solid #fde68a" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#b45309", marginBottom: 4 }}>SKALA PENILAIAN</div>
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
          border: "1px solid rgba(251,191,36,0.3)", boxShadow: "0 2px 12px rgba(180,83,9,0.06)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#b45309", letterSpacing: 1.5, marginBottom: 12 }}>IDENTITAS VALIDATOR</div>
          {[
            { label: "Nama Lengkap & Gelar", val: nama, set: setNama, placeholder: "Dr. ..." },
            { label: "Keahlian / Bidang Ilmu", val: keahlian, set: setKeahlian, placeholder: "Kewirausahaan / Manajemen Bisnis / Pendidikan Ekonomi" },
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

        {/* ── INDIKATOR ── */}
        {ASPEK.map((asp, ai) => (
          <div key={ai} style={{
            background: "#fff", borderRadius: 14, marginBottom: 12,
            border: "1px solid rgba(251,191,36,0.3)", boxShadow: "0 2px 12px rgba(180,83,9,0.06)",
            overflow: "hidden",
          }}>
            <div style={{
              background: "linear-gradient(135deg,#78350f,#b45309,#d97706)",
              padding: "10px 14px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: "#fef3c7", letterSpacing: 1.5 }}>ASPEK {["I","II","III","IV","V"][ai]}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginTop: 2 }}>{asp.label}</div>
            </div>

            {asp.items.map((item, ii) => (
              <div key={item.no} style={{
                padding: "13px 14px",
                borderBottom: ii < asp.items.length - 1 ? "1px solid #fef3c7" : "none",
              }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{
                    minWidth: 22, height: 22, borderRadius: 7, background: "#fffbeb",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 900, color: "#b45309",
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
                        border: skor[item.no] === n ? "2px solid #b45309" : "1.5px solid #e2e8f0",
                        background: skor[item.no] === n ? "linear-gradient(135deg,#92400e,#d97706)" : "#f8fafc",
                        color: skor[item.no] === n ? "#fff" : "#64748b",
                        fontSize: 14, fontWeight: 900, cursor: "pointer",
                        boxShadow: skor[item.no] === n ? "0 3px 10px rgba(180,83,9,0.35)" : "none",
                        transition: "all 0.15s",
                      }}>
                      {n}
                    </button>
                  ))}
                  {skor[item.no] && (
                    <div style={{ display: "flex", alignItems: "center", fontSize: 10, color: "#b45309", fontWeight: 700 }}>
                      {SKOR_LABEL[skor[item.no]]}
                    </div>
                  )}
                </div>

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
          border: "1px solid rgba(251,191,36,0.3)", boxShadow: "0 2px 12px rgba(180,83,9,0.06)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#b45309", letterSpacing: 1.5, marginBottom: 14 }}>HASIL PENILAIAN KUANTITATIF</div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginBottom: 5 }}>
              <span>Progres pengisian</span>
              <span>{filledCount}/{allItems.length} indikator</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "#e2e8f0" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                background: "linear-gradient(90deg,#b45309,#f59e0b)",
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
                background: "#fffbeb", borderRadius: 11, padding: "11px 10px", textAlign: "center",
                border: "1px solid #fde68a",
              }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#b45309" }}>{s.val}</div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", marginTop: 2 }}>{s.label}</div>
                <div style={{ fontSize: 9, color: "#cbd5e1" }}>{s.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, fontWeight: 900, color: "#475569", letterSpacing: 1, marginBottom: 8 }}>TABEL KLASIFIKASI</div>
          {[
            { label: "Sangat Layak", sub: "Tanpa Revisi" },
            { label: "Layak", sub: "Revisi Minor" },
            { label: "Cukup Layak", sub: "Revisi Mayor" },
            { label: "Tidak Layak", sub: "Tinjau Ulang Total" },
          ].map((row, ri) => {
            const ranges = ["81% - 100%", "61% - 80%", "41% - 60%", "< 40%"];
            const active = kel && kel.label === row.label;
            return (
              <div key={row.label} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 11px",
                borderRadius: 9, marginBottom: 5,
                background: active ? "#fffbeb" : "transparent",
                border: active ? "1.5px solid #fbbf24" : "1px solid transparent",
              }}>
                {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#d97706", flexShrink: 0 }} />}
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", minWidth: 70 }}>{ranges[ri]}</span>
                <span style={{ fontSize: 11, fontWeight: active ? 900 : 600, color: active ? "#b45309" : "#94a3b8" }}>
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
          border: "1px solid rgba(251,191,36,0.3)", boxShadow: "0 2px 12px rgba(180,83,9,0.06)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#b45309", letterSpacing: 1.5, marginBottom: 10 }}>
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
          border: "1px solid rgba(251,191,36,0.3)", boxShadow: "0 2px 12px rgba(180,83,9,0.06)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#b45309", letterSpacing: 1.5, marginBottom: 10 }}>TANDA TANGAN VALIDATOR</div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#475569" }}>
              Malang, {tanggal ? new Date(tanggal + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "..."}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Validator,</div>
            <div style={{ height: 56, borderBottom: "1px dashed #fde68a", marginTop: 4, marginBottom: 6 }} />
            <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{nama || "( Nama Validator )"}</div>
            <div style={{ fontSize: 10, color: "#64748b" }}>{keahlian || "Keahlian / Bidang Ilmu"}</div>
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => window.print()}
            style={{
              flex: 1, padding: "13px", borderRadius: 13, border: "none",
              background: "linear-gradient(135deg,#92400e,#d97706)",
              color: "#fff", fontSize: 13, fontWeight: 900, cursor: "pointer",
              boxShadow: "0 4px 16px rgba(180,83,9,0.35)",
            }}>
            🖨️ Cetak / Simpan PDF
          </button>
        </div>

        <p style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", marginTop: 10 }}>
          Gunakan "Cetak ke PDF" di browser untuk menyimpan sebagai dokumen
        </p>
      </div>

      <style>{`
        @media print {
          body { background: white !important; }
          nav, button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
