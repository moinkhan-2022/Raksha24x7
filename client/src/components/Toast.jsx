function Toast({ message, type = 'error' }) {
  if (!message) return null;
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
      {message}
    </div>
  );
}

export default Toast;
