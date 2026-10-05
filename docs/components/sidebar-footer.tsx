'use client';

import { ArrowUpRight, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { gitConfig } from '@/lib/shared';
import { GitHubIcon } from './home/primitives';

const themes = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

/** Bottom of the docs sidebar: a repository card and a labeled theme switch */
export function SidebarFooter(props: { version: string }) {
  const { theme, setTheme } = useTheme();
  // The theme is only known in the browser, so nothing is highlighted until mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const repo = `${gitConfig.user}/${gitConfig.repo}`;

  return (
    <div className="flex flex-col gap-2">
      <a
        href={`https://github.com/${repo}`}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center gap-3 rounded-lg border bg-fd-secondary/40 p-2 transition-colors hover:border-fd-primary/40 hover:bg-fd-accent/60 focus-visible:ring-2 focus-visible:ring-fd-ring outline-none"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-fd-background text-fd-foreground">
          <GitHubIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-medium text-fd-foreground">
            {repo}
          </span>
          <span className="block text-xs text-fd-muted-foreground">
            v{props.version} · MIT
          </span>
        </span>
        <ArrowUpRight className="size-4 shrink-0 text-fd-muted-foreground transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fd-primary" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>

      <div
        role="group"
        aria-label="Color theme"
        className="grid grid-cols-3 gap-0.5 rounded-lg border bg-fd-secondary/40 p-0.5"
      >
        {themes.map((option) => {
          const active = mounted && theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setTheme(option.value)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-fd-ring outline-none',
                active
                  ? 'bg-fd-background text-fd-foreground shadow-sm ring-1 ring-fd-border'
                  : 'text-fd-muted-foreground hover:text-fd-foreground'
              )}
            >
              <option.icon
                className={cn('size-3.5', active && 'text-fd-primary')}
              />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
