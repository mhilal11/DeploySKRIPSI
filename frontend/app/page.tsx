import LandingPage from '@/modules/LandingPage/Index';

type LandingJob = {
  id?: number;
  division: string;
  division_description?: string | null;
  manager_name?: string | null;
  capacity?: number | null;
  current_staff?: number | null;
  title?: string | null;
  location?: string | null;
  type?: string | null;
  salary_min?: number | null;
  work_mode?: string | null;
  description?: string | null;
  requirements?: string[];
  eligibility_criteria?: Record<string, unknown> | null;
  hiring_opened_at?: string | null;
  isHiring: boolean;
  availableSlots?: number | null;
};

type LandingData = {
  canLogin: boolean;
  canRegister: boolean;
  jobs: LandingJob[];
};

export const revalidate = 60;

async function fetchLandingData(): Promise<LandingData> {
  const fallback: LandingData = {
    canLogin: true,
    canRegister: true,
    jobs: [],
  };

  try {
    const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN?.replace(/\/$/, '') ?? '';
    const landingUrl = backendOrigin
      ? `${backendOrigin}/api/public/landing`
      : 'http://localhost:8080/api/public/landing';
    const response = await fetch(landingUrl, {
      next: { revalidate: 60 },
    });
    if (!response.ok) {
      return fallback;
    }
    const data = (await response.json()) as Partial<LandingData>;
    return {
      canLogin: Boolean(data.canLogin),
      canRegister: Boolean(data.canRegister),
      jobs: Array.isArray(data.jobs) ? (data.jobs as LandingJob[]) : [],
    };
  } catch {
    return fallback;
  }
}

export default async function LandingSSRPage() {
  const data = await fetchLandingData();
  return (
    <LandingPage
      canLogin={data.canLogin}
      canRegister={data.canRegister}
      jobs={data.jobs}
    />
  );
}
