# One‑Punch Effort Calculator ⚡️🧮

> “Satu Sprint, Seribu Drama.”
>
> Hai kalian developer developer lemah klo pas ngitung effort — santai. Kalkulator ini jadi sparring partner kalian. Hitung effort per task, masukin ke daftar sprint, terus cek kapasitas: kalau pas, **Saitama Approved™**; kalau jebol, ya… **Genos Overheat**.

---

## 🎯 Kenapa ada alat ini?
Karena estimasi bukan ramalan langit. Ini alat buat ngobrol objektif soal effort, bukan buat adu tebak‑tebakan. Bawa ke grooming, planning, bahkan ke retro kalau perlu—biar diskusinya ada *angka* bukan *aura*.

---

## ✨ Fitur Singkat
- **Neon Dark/Light**: toggle “Neon Mode” biar mata aman.
- **Savage Mode**: versi *ketat* buat tim yang doyan ngeles—base complexity diturunin biar disiplin.
- **Complexity Chips**: Serigala → Harimau → Iblis → Naga → Dewa, plus tooltip contoh nyata.
- **Modifiers fleksibel**: API, DB/CRUD, Redis, Type Integration, API Integration, Tests, Observability, NFR.
- **Multipliers**: Seniority (S/SS/SSS), Fight Class (Prof/Amatir/Newbie/Bulu), Environment (Dev/Stg/Prod).
- **Sprint Board**: tambah task, totalin hari fokus, cek **Capacity** = devs × days × focus.
- **Status**:
  - ✅ **Saitama Approved** kalau muat.
  - **Genos Overheat** kalau jebol.
- **Import/Export**: JSON & CSV siap tempel ke Notion/Jira.
- **Config Modal**: ubah nilai base/weights/multipliers via JSON, auto‑persist di `localStorage`.
- **Samples**: 15 contoh task Food‑Order (5×S, 5×SS, 5×SSS) biar langsung bisa *playtest*.
- **Trademark Console**: `BABITAMPAN AND FREN'S` muncul kece di devtools.

---

## 🧩 Skema Kompleksitas
| Level | Emoji | Base (Normal) | Base (Savage) | Gambaran |
|---|---:|---:|---:|---|
| Serigala | 🐺 | 3 | 2 | Bug/minor change, refactor kecil |
| Harimau | 🐯 | 8 | 6 | CRUD ringan + 1 migration |
| Iblis | 😈 | 13 | 10 | Multi‑module, backfill, webhook/OAuth |
| Naga | 🐉 | 21 | 16 | Cross‑service, payment flow, idempotency kuat |
| Dewa | 🛐 | 34 | 24 | ISO8583/Banking, compliance, kill‑switch |

> Savage Mode menurunkan base biar estimasi makin realistis. Sisanya sama.

---

## 🧮 Cara Hitung (singkat)
```
score = round( (Base + ΣModifiers) × Seniority × FightClass × (1 + 0.05×risk) × Env )
Est. Days = ceil(score / 8)
Capacity = round(devs × sprintDays × focus)
```
Status sprint:
- **Saitama Approved** jika total Est. Days ≤ Capacity
- **Genos Overheat** jika total Est. Days > Capacity

---

## 🚀 Quick Start
### 1) Buka langsung
Cukup buka `index.html` di browser modern. Selesai.

### 2) Jalankan lewat Docker
Buat `Dockerfile`:
```dockerfile
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
```
Build & run:
```bash
docker build -t onepunch-effort .
docker run --rm -p 8080:80 onepunch-effort
```
Akses: http://localhost:8080

> Bonus: bisa juga serve lokal via `python -m http.server` kalau tanpa Docker.

---

## ⚙️ Konfigurasi (GUI)
Klik tombol **Config** → edit JSON → Apply. Disimpan ke `localStorage` key `onepunch_config`.

Contoh struktur:
```json
{
  "base": {
    "normal": {"Serigala":3, "Harimau":8, "Iblis":13, "Naga":21, "Dewa":34},
    "savage": {"Serigala":2, "Harimau":6, "Iblis":10, "Naga":16, "Dewa":24}
  },
  "weights": {
    "api": {"get":2, "mutate":4, "complex":6},
    "db": {"new":6, "alter":10, "crud":3},
    "redis": {"none":0, "simple":2, "invalidation":4, "lock":5},
    "type": {"none":0, "internal":2, "cross":4, "compat":6},
    "integ": {"none":0, "internal":4, "oauth":6, "payment":8, "iso8583":12},
    "tests": {"unit":2, "integ":4, "contract":3},
    "obs": {"logging":1, "metrics":2, "tracing":3},
    "nfr": {"perf":5, "security":5, "compliance":5}
  },
  "multipliers": {
    "seniority": {"S":1.15, "SS":1.00, "SSS":0.90},
    "fight": {"prof":0.85, "amatir":1.00, "newbie":1.20, "bulu":1.35},
    "env": {"dev":1.00, "stg":1.10, "prod":1.25}
  }
}
```

Reset ke default lewat tombol **Reset Default**.

---

## 📥 Import / Export
- **Export JSON/CSV**: klik tombol di bagian “Sprint Tasks”.
- **Import JSON**: klik **Import JSON** lalu pilih file. Format yang didukung:

Contoh berkas `onepunch-sprint.json`:
```json
{
  "meta": {"devs":4, "sprintDays":10, "focus":0.7, "savage":false, "theme":"dark"},
  "tasks": [
    {"id":"abc123", "task":"CRUD Menu", "complexity":"Harimau", "score":32, "days":4, "owner":"SS"}
  ]
}
```

> Kolom **owner** otomatis diisi dengan nilai **Seniority** saat task ditambahkan. Bisa diganti manual kalau mau.

---

## 🛠️ Dev Notes
- Semua state config disimpan di `localStorage` (`onepunch_config`).
- Single‑file HTML, tanpa build‑step. Commit → push → host.
- Trademark banner nongol di console saat load: **BABITAMPAN AND FREN'S**.

---

## 🧑‍⚖️ Lisensi
MIT. Silakan fork, remix, dan bantai *bug* tanpa ampun.

---

## 💌 Kredit
Dibuat dengan cinta dan sedikit garam oleh **BABITAMPAN AND FREN'S**. Kalau tool ini bantu kamu menolak estimasi halu, jangan lupa kasih ⭐ di repo kamu sendiri. 😎

