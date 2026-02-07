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
```

## Run Server
```
go run ./cmd/server
```
