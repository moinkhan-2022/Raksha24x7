import { motion } from 'framer-motion';
import { BellRing, ContactRound, LocateFixed, Radio, ShieldCheck, UserPlus } from 'lucide-react';

const steps = [
  { icon: UserPlus, title: 'Register', text: 'Create your secure Raksha24x7 account.' },
  { icon: ContactRound, title: 'Add Emergency Contacts', text: 'Choose the people you trust most.' },
  { icon: LocateFixed, title: 'Enable Location', text: 'Allow accurate emergency positioning.' },
  { icon: BellRing, title: 'Press SOS', text: 'Start the protected countdown when unsafe.' },
  { icon: Radio, title: 'Contacts Receive Alert', text: 'Your emergency details and location are shared.' },
  { icon: ShieldCheck, title: 'Emergency Response', text: 'Use nearby services and helplines immediately.' }
];

function LandingWorkflow() {
  return (
    <section id="how-it-works" className="scroll-mt-20 px-4 py-16 md:px-6" aria-labelledby="workflow-heading">
      <div className="mx-auto max-w-7xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">Simple when seconds matter</p>
        <h2 id="workflow-heading" className="mt-2 text-center text-3xl font-bold text-white">How Raksha Works</h2>
        <ol className="relative mt-10 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <motion.li key={title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: index * 0.07 }} className="relative rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-xl">
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-blue-500/15 text-blue-200"><Icon className="h-5 w-5" /></span>
              <span className="mt-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-xs font-bold text-red-200">{index + 1}</span>
              <h3 className="mt-2 text-sm font-semibold text-white">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">{text}</p>
              {index < steps.length - 1 && <span aria-hidden="true" className="absolute -right-3 top-1/2 z-10 hidden text-slate-600 xl:block">→</span>}
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default LandingWorkflow;
