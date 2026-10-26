'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { gitConfig } from '@/lib/shared';
import { GitHubIcon } from './home/primitives';

const themes = [
  { value: 'light', label: 'Light theme', icon: Sun },
  { value: 'dark', label: 'Dark theme', icon: Moon },
] as const;

/** Bottom of the docs sidebar: a repository card with a small theme toggle beside it */
export function SidebarFooter(props: { version: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // The theme is only known in the browser, so nothing is highlighted until mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const repo = `${gitConfig.user}/${gitConfig.repo}`;

  return (
    <div className="flex items-center gap-2">
      <a
        href={`https://github.com/${repo}`}
        target="_blank"
        rel="noreferrer"
        className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border bg-fd-secondary/40 p-2 transition-colors hover:border-fd-primary/40 hover:bg-fd-accent/60 focus-visible:ring-2 focus-visible:ring-fd-ring outline-none"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-fd-background text-fd-foreground">
          <GitHubIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-medium text-fd-foreground group-hover:text-fd-primary">
            {repo}
          </span>
          <span className="block text-xs text-fd-muted-foreground">
            v{props.version} · MIT
          </span>
        </span>
        <span className="sr-only">(opens in a new tab)</span>
      </a>

      {/* Same light/dark pill as the site header; it follows the system until someone picks */}
      <div
        role="group"
        aria-label="Color theme"
        className="flex shrink-0 flex-col gap-0.5 rounded-full border p-0.5"
      >
        {themes.map((option) => {
          const active = mounted && resolvedTheme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-label={option.label}
              aria-pressed={active}
              onClick={() => setTheme(option.value)}
              className={cn(
                'grid size-6 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-fd-ring outline-none',
                active
                  ? 'bg-fd-accent text-fd-accent-foreground'
                  : 'text-fd-muted-foreground hover:text-fd-foreground'
              )}
            >
              <option.icon className="size-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
