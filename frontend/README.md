# HRIS Frontend (Next.js)

## Environment
Salin template:
- `frontend/.env.example` -> `frontend/.env`

### Variables
- `NEXT_PUBLIC_API_URL` : base URL API backend. Untuk development disarankan `\/api` (via Next.js rewrite ke `http://localhost:8080`).
- `NEXT_PUBLIC_BACKEND_ORIGIN` : origin backend langsung (default `http://localhost:8080`). Dipakai untuk alur redirect OAuth Google agar tidak tergantung rewrite dev server.

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
