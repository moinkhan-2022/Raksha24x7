import { Github, Heart, Instagram, Linkedin, Mail, Shield, Twitter } from 'lucide-react';
import { Link } from 'react-router-dom';

const links = [
  { label: 'About', href: '#how-it-works' }, { label: 'Features', href: '#features' },
  { label: 'Privacy Policy', href: '#privacy' }, { label: 'Terms', href: '#terms' },
  { label: 'Contact', href: 'mailto:support@raksha24x7.com' }
];

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/70 px-4 py-10 md:px-6">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
        <div><Link to="/" className="inline-flex items-center gap-2 text-lg font-bold text-white"><Shield className="h-6 w-6 text-red-500" />Raksha24x7</Link><p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">A calm, practical safety platform connecting people to trusted contacts and emergency resources.</p><p className="mt-3 text-xs text-slate-500">Version 1.0.0</p></div>
        <nav aria-label="Footer navigation"><h2 className="font-semibold text-white">Explore</h2><div className="mt-3 grid grid-cols-2 gap-2 text-sm">{links.map((link) => <a key={link.label} href={link.href} className="text-slate-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">{link.label}</a>)}<a href="https://github.com/moinkhan-2022/Raksha24x7" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">GitHub</a></div></nav>
        <div><h2 className="font-semibold text-white">Connect</h2><div className="mt-3 flex gap-2">{[{ Icon: Github, href: 'https://github.com/moinkhan-2022/Raksha24x7', label: 'GitHub' }, { Icon: Mail, href: 'mailto:support@raksha24x7.com', label: 'Email' }, { Icon: Twitter, href: 'https://twitter.com', label: 'Twitter' }, { Icon: Instagram, href: 'https://instagram.com', label: 'Instagram' }, { Icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' }].map(({ Icon, href, label }) => <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noreferrer' : undefined} aria-label={label} className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:-translate-y-0.5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"><Icon className="h-4 w-4" /></a>)}</div></div>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-2 border-t border-white/10 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Raksha24x7. All rights reserved.</p><p className="flex items-center gap-1">Built with <Heart className="h-3 w-3 fill-red-400 text-red-400" /> for safer communities.</p></div>
    </footer>
  );
}

export default Footer;
