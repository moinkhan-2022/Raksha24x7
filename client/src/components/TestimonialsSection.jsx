import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

const testimonials = [
  { name: 'Ayesha Khan', initials: 'AK', comment: 'The simple SOS flow makes me feel prepared when travelling alone.' },
  { name: 'Priya Sharma', initials: 'PS', comment: 'Live location and nearby services are thoughtfully placed and easy to use.' },
  { name: 'Neha Verma', initials: 'NV', comment: 'I added my family contacts in minutes. The interface feels calm and reliable.' }
];

function TestimonialsSection() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((index) => (index + 1) % testimonials.length), 4500);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section className="px-4 py-16 md:px-6" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-7xl">
        <h2 id="testimonials-heading" className="text-center text-3xl font-bold text-white">Trusted for everyday confidence</h2>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {testimonials.map((item, index) => <motion.article key={item.name} animate={{ opacity: active === index ? 1 : 0.72, scale: active === index ? 1 : 0.98 }} whileHover={{ y: -5 }} className={`${active === index ? 'block' : 'hidden'} rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl md:block`}><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-red-500 to-blue-600 font-bold text-white">{item.initials}</span><div><h3 className="font-semibold text-white">{item.name}</h3><div className="mt-1 flex text-amber-300" aria-label="5 out of 5 stars">{Array.from({ length: 5 }).map((_, star) => <Star key={star} className="h-3.5 w-3.5 fill-current" />)}</div></div></div><p className="mt-4 text-sm leading-relaxed text-slate-300">“{item.comment}”</p></motion.article>)}
        </div>
        <div className="mt-4 flex justify-center gap-2 md:hidden">{testimonials.map((item, index) => <button key={item.name} type="button" aria-label={`Show testimonial ${index + 1}`} onClick={() => setActive(index)} className={`h-2.5 rounded-full transition-all ${active === index ? 'w-7 bg-red-400' : 'w-2.5 bg-white/20'}`} />)}</div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
