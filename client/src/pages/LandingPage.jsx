import { Ambulance, Hospital, LocateFixed, PhoneCall, ShieldAlert, Siren, Users } from 'lucide-react';
import Hero from '../components/Hero';
import FeatureCard from '../components/FeatureCard';
import Footer from '../components/Footer';

const features = [
  { icon: Siren, title: 'One Tap SOS', description: 'Instantly trigger SOS in critical situations.' },
  { icon: LocateFixed, title: 'Live Location', description: 'Share your location with trusted responders.' },
  { icon: Users, title: 'Emergency Contacts', description: 'Reach family and guardians quickly.' },
  { icon: Hospital, title: 'Nearby Hospitals', description: 'Find nearest healthcare facilities fast.' },
  { icon: ShieldAlert, title: 'Police Helpline', description: 'Connect to police support instantly.' },
  { icon: Ambulance, title: 'Ambulance', description: 'Request medical emergency help without delay.' }
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950">
      <Hero />
      <section className="px-4 pb-16 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center gap-2 text-white"><PhoneCall className="h-5 w-5 text-red-400" /><h2 className="text-2xl font-bold">Core Features</h2></div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => <FeatureCard key={f.title} {...f} />)}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}

export default LandingPage;
