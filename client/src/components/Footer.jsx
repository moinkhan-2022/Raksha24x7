import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-8 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-sm text-slate-400">
        <p>© {new Date().getFullYear()} Raksha24x7</p>
        <div className="flex flex-wrap gap-4">
          <Link to="/about" className="hover:text-white">About</Link>
          <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
          <Link to="/emergency-numbers" className="hover:text-white">Emergency Numbers</Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-white">GitHub</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
