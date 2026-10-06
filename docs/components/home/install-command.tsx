'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

const managers = {
  pnpm: 'pnpm add wit-form jotai',
  npm: 'npm install wit-form jotai',
  yarn: 'yarn add wit-form jotai',
  bun: 'bun add wit-form jotai',
};

type Manager = keyof typeof managers;

export function InstallCommand(props: { className?: string }) {
  const [manager, setManager] = useState<Manager>('pnpm');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(managers[manager]);
      setCopied(true);
    } catch {
      // Clipboard can be blocked, e.g. on insecure origins. The command is still selectable.
    }
  };

  return (
    <div
      className={cn(
        'w-full max-w-md overflow-hidden rounded-xl border bg-fd-card/80 backdrop-blur',
        props.className
      )}
    >
      <div
        role="tablist"
        aria-label="Package manager"
        className="flex border-b px-1.5"
      >
        {(Object.keys(managers) as Manager[]).map((name) => (
          <button
            key={name}
            role="tab"
            type="button"
            aria-selected={manager === name}
            onClick={() => setManager(name)}
            className={cn(
              'relative px-3 py-2 font-mono text-xs transition-colors outline-none focus-visible:text-fd-foreground',
              manager === name
                ? 'text-fd-foreground after:absolute after:inset-x-2 after:-bottom-px after:h-px after:bg-emerald-500'
                : 'text-fd-muted-foreground hover:text-fd-foreground'
            )}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 py-2.5 pr-2 pl-4">
        <code className="flex-1 truncate font-mono text-sm">
          <span className="select-none text-emerald-700 dark:text-emerald-400">
            ${' '}
          </span>
          {managers[manager]}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? 'Copied' : 'Copy install command'}
          className="grid size-8 place-items-center rounded-md text-fd-muted-foreground transition hover:bg-fd-accent hover:text-fd-foreground focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none"
        >
          {copied ? (
            <Check className="size-4 text-emerald-500" />
          ) : (
            <Copy className="size-4" />
          )}
        </button>
        <span aria-live="polite" className="sr-only">
          {copied ? 'Copied to clipboard' : ''}
        </span>
      </div>
    </div>
  );
}
