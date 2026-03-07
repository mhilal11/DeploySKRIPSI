import 'aos/dist/aos.css';

import SplashCursor from '@/shared/components/SplashCursor';
import SplashScreen from '@/shared/components/SplashScreen';
import { Head } from '@/shared/lib/inertia';
import { PageProps } from '@/shared/types';

import { CareersSection } from './CareersSection';
import { ContactSection } from './ContactSection';
import { FeaturesSection } from './FeaturesSection';
import { HeroSection } from './HeroSection';
import { Navbar } from './Navbar';
import { PricingSection } from './PricingSection';

type CareerJob = {
  id?: number;
  division: string;
  division_description?: string | null;
  manager_name?: string | null;
  capacity?: number | null;
  current_staff?: number | null;
  title?: string | null;
  location?: string | null;
  type?: string | null;
  description?: string | null;
  requirements?: string[];
  eligibility_criteria?: Record<string, unknown> | null;
  hiring_opened_at?: string | null;
  isHiring: boolean;
  availableSlots?: number | null;
};

type LandingPageProps = PageProps<{
  canLogin: boolean;
  canRegister: boolean;
  jobs: CareerJob[];
}>;

export default function LandingPage({
  canLogin,
  canRegister,
  jobs = [],
}: LandingPageProps) {
  return (
    <>
      <Head title="Lintas Data Prima" />

      {/* Splash Screen modern */}
      <SplashScreen />

      {/* Cursor efek */}
      <SplashCursor />

      <div className="bg-gradient-to-br from-[#05070f] via-[#0b1024] to-[#050a16] text-white min-h-screen overflow-x-hidden relative">
        <Navbar canLogin={canLogin} canRegister={canRegister} />
        <main>
          <HeroSection />
          <FeaturesSection />
          <PricingSection />
          <CareersSection jobs={jobs} />
          <ContactSection />
        </main>
      </div>
    </>
  );
}
