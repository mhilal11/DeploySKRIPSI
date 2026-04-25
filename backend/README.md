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
- `APP_TIMEZONE` : timezone tampilan tanggal/jam di API response (default `Asia/Jakarta`)
- `EDUCATION_REFERENCE_PATH` : path file snapshot referensi universitas/prodi (default `./data/education_reference_id.json`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `SESSION_SECRET` : rahasia session cookie
- `CSRF_SECRET` : rahasia CSRF token
- `MAX_REQUEST_BODY_MB` : batas ukuran request body dalam MB (default `25`)
- `STORAGE_PATH` : lokasi penyimpanan file (default `./storage`)
- `STORAGE_ENCRYPTION_KEY` : key enkripsi at-rest file storage (minimal 32 karakter atau base64 key 32-byte)
- `STORAGE_ENCRYPT_UPLOADS` : `true|false` untuk aktifkan enkripsi file upload (default otomatis `true` jika key tersedia)
- `REDIS_URL` : URL Redis (opsional), contoh `redis://localhost:6379/0`
- `REDIS_ADDR` : host:port Redis alternatif jika tidak pakai `REDIS_URL`
- `REDIS_PASSWORD` : password Redis (opsional)
- `REDIS_DB` : index database Redis (default `0`)
- `DISABLE_BACKGROUND_WORKERS` : `true|false` untuk menonaktifkan worker background (berguna untuk test/integration environment)
- `GROQ_TPM_LIMIT` : budget token per minute untuk worker AI CV screening (default `8000`, dipakai untuk memberi jeda aman antar job)
- `COOKIE_SECURE` : `true` jika pakai HTTPS
- `GOOGLE_OAUTH_CLIENT_ID` : Client ID OAuth 2.0 dari Google Cloud Console (opsional, untuk Daftar via Google)
- `GOOGLE_OAUTH_CLIENT_SECRET` : Client Secret OAuth 2.0 (opsional)
- `GOOGLE_OAUTH_REDIRECT_URL` : callback URL Google OAuth (default `http://localhost:5173/api/auth/google/register/callback`)

Catatan:
- Koneksi database backend dijalankan dengan timezone `UTC` (`loc=UTC`) untuk mencegah mismatch tanggal lintas timezone server.
- Timestamp disimpan dalam UTC, lalu dikonversi ke `APP_TIMEZONE` saat diformat ke response API.
- Verifikasi email menggunakan random token yang disimpan di tabel `email_verification_tokens` dengan masa berlaku 60 menit.

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

## Deploy ke Railway
- Buat service backend terpisah di Railway dari repo ini.
- Karena repo ini monorepo, set **Root Directory** service backend ke `/backend`.
- Set **Config File Path** ke `/backend/railway.toml`.
- Backend sekarang otomatis memakai `PORT` dari Railway jika `APP_ADDR` tidak diisi.
- Untuk database Railway MySQL, backend juga menerima alias env `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, dan `MYSQLDATABASE` selain `DB_*`.

Environment minimum yang perlu diisi di service backend:
- `APP_ENV=production`
- `APP_URL=https://<domain-backend-railway>`
- `FRONTEND_URL=https://<domain-frontend>`
- `COOKIE_SECURE=true`
- `SESSION_SECRET=<secret-minimal-32-karakter>`
- `CSRF_SECRET=<secret-minimal-32-karakter>`

Jika memakai MySQL Railway, Anda bisa:
- tetap mengisi `DB_*`, atau
- langsung menambahkan env alias Railway `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`.

## API Documentation
- OpenAPI spec: `GET /openapi.yaml`
- Swagger UI: `GET /docs`

## Background Job Queue
- AI CV Screening otomatis dijalankan melalui tabel `jobs` (`queue = recruitment_ai_screening`).
- Worker dipanggil saat server berjalan dan akan retry dengan backoff jika proses gagal.
- Worker screening memakai lock database lintas instance, jadi job CV diproses serial satu per satu.
- Setelah request Groq sukses atau terkena rate limit, worker menahan job berikutnya sesuai budget `GROQ_TPM_LIMIT` atau `retry-after` dari Groq agar tidak menembak serentak.

## Caching
- Endpoint `GET /api/public/landing` menggunakan cache Redis (jika dikonfigurasi) dengan fallback cache in-memory TTL 30 detik.

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
