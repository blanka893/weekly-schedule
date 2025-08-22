import React, { useState, useMemo, cloneElement } from 'react'

export function Select({ value, onValueChange, children }) {
  const [open, setOpen] = useState(false);

  // Extract items from <SelectContent><SelectItem/></SelectContent>
  const items = [];
  React.Children.forEach(children, (child) => {
    if (child && child.type && child.type.displayName === 'SelectContent') {
      React.Children.forEach(child.props.children, (it) => {
        if (it && it.type && it.type.displayName === 'SelectItem') {
          items.push({ value: it.props.value, label: it.props.children });
        }
      });
    }
  });

  const label = useMemo(() => {
    const match = items.find(i => String(i.value) === String(value));
    return match ? match.label : '';
  }, [items, value]);

  return (
    <div className="relative">
      {React.Children.map(children, (child) => {
        if (!child) return child;
        if (child.type && child.type.displayName === 'SelectTrigger') {
          return cloneElement(child, {
            onClick: () => setOpen((o) => !o),
            children: child.props.children || <span>{label}</span>
          });
        }
        if (child.type && child.type.displayName === 'SelectContent') {
          return open ? cloneElement(child, {
            children: React.Children.map(child.props.children, (it) => {
              if (it && it.type && it.type.displayName === 'SelectItem') {
                return cloneElement(it, {
                  onClick: () => { onValueChange?.(it.props.value); setOpen(false); }
                });
              }
              return it;
            })
          }) : null;
        }
        return child;
      })}
    </div>
  );
}
Select.displayName = 'Select';

export function SelectTrigger({ className = '', children, ...p }) {
  return <button className={`rounded-md border px-2 py-1 w-full text-left ${className}`} {...p}>{children}</button>;
}
SelectTrigger.displayName = 'SelectTrigger';

export function SelectValue(props) { return <span {...props} /> }
SelectValue.displayName = 'SelectValue';

export function SelectContent({ className = '', children }) {
  return <div className={`absolute z-50 mt-1 w-full rounded-md border bg-white p-1 shadow ${className}`}>{children}</div>;
}
SelectContent.displayName = 'SelectContent';

export function SelectItem({ value, children, onClick }) {
  return <div className="px-2 py-1 hover:bg-slate-100 cursor-pointer" onClick={onClick} data-value={value}>{children}</div>;
}
SelectItem.displayName = 'SelectItem';
