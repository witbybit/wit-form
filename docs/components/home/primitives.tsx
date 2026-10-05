import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Horizontal page width shared by every landing section */
export function Container(props: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', props.className)}
    >
      {props.children}
    </div>
  );
}

export function SectionHeading(props: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
}) {
  const centered = props.align === 'center';
  return (
    <div
      className={cn(
        'flex max-w-2xl flex-col gap-3',
        centered && 'mx-auto items-center text-center'
      )}
    >
      <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">
        {props.eyebrow}
      </p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
        {props.title}
      </h2>
      {props.description && (
        <p className="text-base text-pretty text-fd-muted-foreground sm:text-lg">
          {props.description}
        </p>
      )}
    </div>
  );
}

const buttonStyles = {
  primary: 'bg-fd-foreground text-fd-background shadow-sm hover:opacity-90',
  secondary:
    'border bg-fd-background/60 text-fd-foreground backdrop-blur hover:bg-fd-accent',
};

export function ButtonLink({
  variant = 'primary',
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonStyles }) {
  return (
    <Link
      className={cn(
        'group inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-medium transition outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background active:scale-[0.98]',
        buttonStyles[variant],
        className
      )}
      {...rest}
    />
  );
}

export function GitHubIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={props.className}
    >
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

/** Editor-style window chrome used around code and the live demo */
export function Window(props: {
  title: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-white/10 bg-zinc-950 text-zinc-100 shadow-2xl shadow-indigo-950/20 [color-scheme:dark]',
        props.className
      )}
    >
      <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
        </div>
        <span className="truncate font-mono text-xs text-zinc-400">
          {props.title}
        </span>
        {props.badge && <span className="ml-auto">{props.badge}</span>}
      </div>
      {props.children}
    </div>
  );
}
