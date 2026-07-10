import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import CTASection from '../components/CTASection';
import LandingWorkflow from '../components/LandingWorkflow';
import LandingStats from '../components/LandingStats';
import TestimonialsSection from '../components/TestimonialsSection';
import FAQSection from '../components/FAQSection';

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <LandingWorkflow />
      <LandingStats />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}

export default LandingPage;
