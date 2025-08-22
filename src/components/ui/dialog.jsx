export function Dialog({ open, onOpenChange, children }) {
  return open ? (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30" onClick={() => onOpenChange?.(false)}>
      <div onClick={(e)=>e.stopPropagation()}>{children}</div>
    </div>
  ) : null;
}
export function DialogTrigger({ asChild, children }) { return children }
export function DialogContent({ className = '', ...p }) {
  return <div className={`w-[90vw] max-w-2xl rounded-2xl bg-white p-4 shadow-xl ${className}`} {...p} />;
}
export function DialogHeader(p){ return <div className="mb-2" {...p}/> }
export function DialogTitle(p){ return <h2 className="text-lg font-semibold" {...p}/> }
