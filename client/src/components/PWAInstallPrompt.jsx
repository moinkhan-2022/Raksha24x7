import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'raksha_pwa_install_later';
const INSTALLED_KEY = 'raksha_pwa_installed';

const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(INSTALLED_KEY) === '1' || localStorage.getItem(DISMISS_KEY) === '1') return undefined;

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      setVisible(true);
    };

    const handleInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
      localStorage.setItem(INSTALLED_KEY, '1');
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice.catch(() => undefined);
    setVisible(false);
    setInstallEvent(null);
  };

  const later = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!visible || !installEvent) return null;

  return (
    <section className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[70] mx-auto max-w-md rounded-3xl border border-white/10 bg-slate-950/95 p-4 text-white shadow-2xl shadow-black/40 backdrop-blur-xl" aria-label="Install Raksha24x7">
      <button type="button" aria-label="Dismiss install prompt" onClick={later} className="absolute right-3 top-3 rounded-full p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-8">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-orange-500/15 text-orange-300">
          <Download className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-base font-bold">Install Raksha24x7</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">Install the app for faster emergency access.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={install} className="rounded-2xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500">
          Install
        </button>
        <button type="button" onClick={later} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
          Maybe Later
        </button>
      </div>
    </section>
  );
}

export default PWAInstallPrompt;
