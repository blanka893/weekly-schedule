export function Label({ className = '', ...p }) {
  return <label className={`text-sm text-slate-700 ${className}`} {...p} />;
}
