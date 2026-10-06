import type { ReactNode } from 'react';

/**
 * Frames a live example. Examples are designed on a light surface, so the frame
 * stays light in dark mode too.
 */
export function Preview({ children }: { children: ReactNode }) {
  return (
    <div
      data-example-preview
      className="not-prose rounded-xl border bg-slate-50 p-4 text-slate-800 [color-scheme:light] sm:p-6"
    >
      {children}
    </div>
  );
}
