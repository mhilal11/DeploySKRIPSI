# HRIS Backend (Gin + sqlx)

## Environment
Backend membaca konfigurasi dari environment OS dan otomatis memuat file `.env` bila ada (via `godotenv`).

Salin template:
- `backend/.env.example` -> `backend/.env`

### Variables
- `APP_ENV` : `development` | `production`
- `APP_ADDR` : alamat bind server, contoh `:8080`
- `APP_URL` : base URL backend, contoh `http://localhost:8080`
- `FRONTEND_URL` : origin frontend yang diizinkan CORS. Bisa lebih dari satu origin dipisah koma, contoh `http://localhost:5173,http://127.0.0.1:5173`
- `EDUCATION_REFERENCE_PATH` : path file snapshot referensi universitas/prodi (default `./data/education_reference_id.json`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `SESSION_SECRET` : rahasia session cookie
- `CSRF_SECRET` : rahasia CSRF token
- `STORAGE_PATH` : lokasi penyimpanan file (default `./storage`)
- `COOKIE_SECURE` : `true` jika pakai HTTPS

### SMTP (opsional)
Jika SMTP tidak diisi, email akan disimpan ke outbox lokal `storage/mail_outbox`.
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `SMTP_TLS`

## Setup Database Baru
1. Jalankan migration:
```
go run ./cmd/migrate up
```
2. Jalankan seeder user:
```
go run ./cmd/seed users
```
   (Opsional) Jalankan seeder 20 data staff:
```
go run ./cmd/seed staff
```
3. Jalankan server:
```
go run ./cmd/server
```

## Migration Commands
```
go run ./cmd/migrate up
go run ./cmd/migrate status
```

Catatan: rollback (`down`) belum disupport. Strategi saat ini `up-only`.

## Seeder Commands
```
go run ./cmd/seed users
go run ./cmd/seed staff
```

## Run Server
```
go run ./cmd/server
```

## Hot Reload (Air)
Install Air:
```
go install github.com/air-verse/air@latest
```

Jalankan dari folder `backend`:
```
air
```

Konfigurasi Air ada di `backend/.air.toml`.

## Referensi Universitas & Program Studi (Role Pelamar)
- Endpoint: `GET /api/pelamar/references/education`
- Endpoint ini dipakai autocomplete pada form pendidikan pelamar.
- Data dibaca dari file snapshot di `EDUCATION_REFERENCE_PATH`.
- Contoh snapshot default: `backend/data/education_reference_id.json`
- Untuk sinkronisasi dataset nasional terbaru (institusi + prodi) dari sumber resmi BAN-PT:
```
go run ./cmd/educationrefsync -out ./data/education_reference_id.json
```

### Format Snapshot
```json
{
  "source": "BAN-PT Direktori Prodi (sumber resmi)",
  "source_url": "https://www.banpt.or.id/direktori/model/dir_prodi/get_hasil_pencariannew.php",
  "last_updated": "2026-02-09",
  "institutions": [
    {
      "institution": "Universitas Indonesia",
      "programs": ["Teknik Informatika", "Sistem Informasi"]
    }
  ]
}
```

### Query Parameter Endpoint
- `q` : filter nama institusi/prodi (opsional)
- `limit` : batas data per list (default `300`, max `20000`)
