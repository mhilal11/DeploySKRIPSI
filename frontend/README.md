# HRIS Frontend (Next.js)

## Environment
Salin template:
- `frontend/.env.example` -> `frontend/.env`

### Variables
- `NEXT_PUBLIC_API_URL` : base URL API yang dipakai browser. Untuk development dan production Safari-friendly disarankan `\/api`.
- `NEXT_PUBLIC_BACKEND_ORIGIN` : origin backend langsung, misalnya `https://<railway-domain>`. Dipakai untuk URL asset/file backend.
- `BACKEND_API_ORIGIN` : origin backend untuk Next.js rewrite/proxy, misalnya `https://<railway-domain>`.

### Deployment note
- Untuk deployment Vercel + Railway, gunakan:
  - `NEXT_PUBLIC_API_URL=/api`
  - `NEXT_PUBLIC_BACKEND_ORIGIN=https://<domain-backend-railway>`
  - `BACKEND_API_ORIGIN=https://<domain-backend-railway>`
- Dengan konfigurasi ini, request login dari browser tetap menuju origin frontend (`/api/...`) lalu diproxy server-side ke Railway, sehingga Safari/iPhone tidak terkena third-party cookie blocking saat autentikasi session-cookie.

## Run
```
npm install
npm run dev
npm run lint
npm run build
```

Catatan:
- `npm run dev` menjalankan Next.js 16 dengan Turbopack.
- `npm run build` menggunakan Turbopack production build.

Default development server port tetap `5173` agar tetap kompatibel dengan konfigurasi backend saat ini.

## Struktur Folder (Clean)
```
frontend/
  app/                    # Next.js App Router entry
  src/
    runtime/              # bootstrap + custom router runtime
    modules/              # halaman/fitur per domain bisnis
    shared/
      components/         # reusable UI components
      layouts/            # reusable layout wrappers
      lib/                # helper/core runtime (api, route, inertia wrapper)
      data/               # static datasets/constants
      styles/             # global stylesheet
      types/              # global/shared types
      config/             # shared configs (ziggy, dll)
```

## Konvensi Import
- Gunakan `@/runtime/*` untuk runtime app.
- Gunakan `@/modules/*` untuk modul fitur/halaman.
- Gunakan `@/shared/*` untuk kode reusable lintas modul.

## Barrel Exports
- `src/shared/components/index.ts`
- `src/shared/layouts/index.ts`
- `src/shared/lib/index.ts`
- `src/shared/data/index.ts`
- `src/shared/config/index.ts`
