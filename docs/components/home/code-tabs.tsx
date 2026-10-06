'use client';

import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { Window } from './primitives';

export interface CodeTab {
  id: string;
  label: string;
  file: string;
  code: ReactNode;
  aside: ReactNode;
}

export function CodeTabs(props: { tabs: CodeTab[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern
  const onKeyDown = (e: KeyboardEvent) => {
    const last = props.tabs.length - 1;
    const next =
      e.key === 'ArrowRight'
        ? active === last
          ? 0
          : active + 1
        : e.key === 'ArrowLeft'
          ? active === 0
            ? last
            : active - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-8">
      <div
        role="tablist"
        aria-label="Code examples"
        onKeyDown={onKeyDown}
        className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        {props.tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            id={`${baseId}-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={active === i}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
              active === i
                ? 'border-emerald-500/40 bg-emerald-500/10 text-fd-foreground'
                : 'border-transparent text-fd-muted-foreground hover:text-fd-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {props.tabs.map((tab, i) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={active !== i}
          className="grid items-start gap-8 lg:grid-cols-[1fr_2fr]"
        >
          <div className="lg:pt-6">{tab.aside}</div>
          <Window title={tab.file} className="min-w-0 shadow-xl">
            {tab.code}
          </Window>
        </div>
      ))}
    </div>
  );
}
