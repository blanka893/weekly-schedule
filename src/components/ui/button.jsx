export function Button({ asChild, variant, size, className = '', ...props }) {
  const Cmp = asChild ? 'span' : 'button';
  return (
    <Cmp
      className={`inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm hover:shadow ${className}`}
      {...props}
    />
  );
}
