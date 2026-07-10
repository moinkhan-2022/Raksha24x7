import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

const faqs = [
  ['Is Raksha free?', 'Yes. The core safety experience and OpenStreetMap-powered nearby services are designed to work without paid Places billing.'],
  ['How does SOS work?', 'After a protected countdown, Raksha records your current coordinates and sends the emergency alert through the configured SOS service.'],
  ['Is my location secure?', 'Saved locations are protected by authentication and are accessible only through your account.'],
  ['Can I install Raksha as an app?', 'Raksha is responsive and works from a modern browser. Installable PWA packaging can be added as a future enhancement.'],
  ['Does it work offline?', 'Cached nearby information remains available offline, while live alerts and fresh service searches require connectivity.'],
  ['How are emergency contacts notified?', 'Your trusted contacts are stored securely and used by the emergency workflow configured for your Raksha account.']
];

function FAQSection() {
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" className="scroll-mt-20 px-4 py-16 md:px-6" aria-labelledby="faq-heading">
      <div className="mx-auto max-w-3xl">
        <h2 id="faq-heading" className="text-center text-3xl font-bold text-white">Frequently asked questions</h2>
        <div className="mt-8 space-y-3">
          {faqs.map(([question, answer], index) => {
            const expanded = open === index;
            return <div key={question} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"><h3><button type="button" aria-expanded={expanded} aria-controls={`faq-answer-${index}`} onClick={() => setOpen(expanded ? -1 : index)} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-300">{question}<ChevronDown className={`h-4 w-4 shrink-0 transition ${expanded ? 'rotate-180' : ''}`} /></button></h3><AnimatePresence initial={false}>{expanded && <motion.div id={`faq-answer-${index}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}><p className="px-4 pb-4 text-sm leading-relaxed text-slate-300">{answer}</p></motion.div>}</AnimatePresence></div>;
          })}
        </div>
      </div>
    </section>
  );
}

export default FAQSection;
