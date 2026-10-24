'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
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
  title: string;
  body: string;
  href: string;
  file: string;
  code: ReactNode;
}

/** A vertical list of features; the active one expands and drives the code window beside it */
export function CodeTabs(props: { tabs: CodeTab[] }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern
  const onKeyDown = (e: KeyboardEvent) => {
    const last = props.tabs.length - 1;
    const next =
      e.key === 'ArrowDown'
        ? active === last
          ? 0
          : active + 1
        : e.key === 'ArrowUp'
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
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_1.6fr] lg:gap-12">
      <div
        role="tablist"
        aria-label="Code examples"
        aria-orientation="vertical"
        onKeyDown={onKeyDown}
        className="flex flex-col border-l"
      >
        {props.tabs.map((tab, i) => {
          const selected = active === i;
          return (
            <div
              key={tab.id}
              className={cn(
                '-ml-px border-l-2 py-4 pl-5 transition-colors',
                selected ? 'border-emerald-500' : 'border-transparent'
              )}
            >
              <button
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                id={`${baseId}-tab-${tab.id}`}
                role="tab"
                type="button"
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(i)}
                className={cn(
                  'flex w-full items-baseline gap-3 rounded text-left text-lg font-semibold tracking-tight transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                  selected
                    ? 'text-fd-foreground'
                    : 'text-fd-muted-foreground hover:text-fd-foreground'
                )}
              >
                <span className="font-mono text-xs font-normal text-fd-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                {tab.title}
              </button>
              {selected && (
                <div className="mt-2 flex flex-col gap-3 pl-8">
                  <p className="text-fd-muted-foreground">{tab.body}</p>
                  <Link
                    href={tab.href}
                    className="group inline-flex w-fit items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200"
                  >
                    Read the guide
                    <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {props.tabs.map((tab, i) => (
        <div
          key={tab.id}
          id={`${baseId}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={active !== i}
          className="min-w-0"
        >
          <Window title={tab.file} className="shadow-xl">
            <div className="max-h-[420px] overflow-y-auto lg:h-[400px] lg:max-h-none">
              {tab.code}
            </div>
          </Window>
        </div>
      ))}
    </div>
  );
}
