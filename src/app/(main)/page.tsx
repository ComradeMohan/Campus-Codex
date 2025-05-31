import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      {/* Potentially add more sections like Testimonials, Pricing (if any), etc. */}
    </>
  );
}
