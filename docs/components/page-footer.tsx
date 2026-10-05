'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { FooterProps } from 'fumadocs-ui/layouts/docs/page';
import { cn } from '@/lib/cn';

type Item = NonNullable<NonNullable<FooterProps['items']>['next']>;

/** Previous/next page links, showing only the page titles */
export function PageFooter({ items, className, ...props }: FooterProps) {
  const { previous, next } = items ?? {};
  if (!previous && !next) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        '@container grid gap-4',
        previous && next ? 'grid-cols-2' : 'grid-cols-1',
        className
      )}
      {...props}
    >
      {previous && <FooterLink item={previous} direction="previous" />}
      {next && <FooterLink item={next} direction="next" />}
    </nav>
  );
}

function FooterLink(props: { item: Item; direction: 'previous' | 'next' }) {
  const isNext = props.direction === 'next';
  const Icon = isNext ? ChevronRight : ChevronLeft;
  return (
    <Link
      href={props.item.url}
      rel={isNext ? 'next' : 'prev'}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border p-4 text-sm font-medium transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground @max-lg:col-span-full',
        isNext && 'flex-row-reverse text-end'
      )}
    >
      <Icon className="-mx-1 size-4 shrink-0 rtl:rotate-180" />
      <span className="sr-only">
        {isNext ? 'Next page: ' : 'Previous page: '}
      </span>
      {props.item.name}
    </Link>
  );
}
