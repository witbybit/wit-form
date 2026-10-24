'use client';

import { Code2, Eye } from 'lucide-react';
import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { ApplyDemo } from './apply-demo';
import type { HeroDemoKey } from './hero-demo-code';
import { Window } from './primitives';
import { RenderComparison } from './render-comparison';
import { SheetDemo } from './sheet-demo';

const demos: { key: HeroDemoKey; label: string; caption: string }[] = [
  {
    key: 'comparison',
    label: 'Fewer re-renders',
    caption:
      'The same keystrokes in two forms. One state object re-renders every field, Wit Form only the one you typed in.',
  },
  {
    key: 'sheet',
    label: 'Large tables',
    caption:
      'A 500-row sheet of text, selects, numbers and checkboxes. Each edit renders only what depends on it.',
  },
  {
    key: 'complex',
    label: 'Complex forms',
    caption:
      'A three-step job application: text, email, a select, chips, a slider, a list, a file, a date, checkboxes and nested objects.',
  },
];

/** Three demos for three questions. Only the active one mounts, so only it runs */
export function HeroDemos(props: {
  code: Record<HeroDemoKey, { file: string; code: ReactNode }>;
}) {
  const [active, setActive] = useState(0);
  const [showCode, setShowCode] = useState(false);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const demo = demos[active];

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (active + step + demos.length) % demos.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Demos"
          onKeyDown={onKeyDown}
          className="flex gap-1"
        >
          {demos.map((item, i) => (
            <button
              key={item.key}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`${baseId}-tab-${item.key}`}
              role="tab"
              type="button"
              aria-selected={active === i}
              aria-controls={`${baseId}-panel`}
              tabIndex={active === i ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                active === i
                  ? 'bg-fd-accent font-medium text-fd-foreground'
                  : 'text-fd-muted-foreground hover:text-fd-foreground'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={showCode}
          onClick={() => setShowCode(!showCode)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-fd-muted-foreground transition outline-none hover:text-fd-foreground focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {showCode ? <Eye className="size-4" /> : <Code2 className="size-4" />}
          {showCode ? 'View demo' : 'View code'}
        </button>
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${demo.key}`}
      >
        {showCode ? (
          <Window title={props.code[demo.key].file} className="text-left">
            <div className="max-h-[30rem] overflow-auto">
              {props.code[demo.key].code}
            </div>
          </Window>
        ) : demo.key === 'sheet' ? (
          <SheetDemo />
        ) : demo.key === 'comparison' ? (
          <RenderComparison />
        ) : (
          <ApplyDemo />
        )}
      </div>
      <p className="text-center text-sm text-fd-muted-foreground">
        {demo.caption}
      </p>
    </div>
  );
}
