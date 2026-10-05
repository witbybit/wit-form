'use client';

import type * as PageTree from 'fumadocs-core/page-tree';

/**
 * Section labels from `---Title---` entries in meta.json. Small caps and muted, so they read as
 * headings rather than as page links.
 */
export function SidebarHeading({ item }: { item: PageTree.Separator }) {
  return (
    <p className="mt-7 mb-1.5 inline-flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fd-muted-foreground/70 first:mt-0 [&_svg]:size-3.5 [&_svg]:shrink-0">
      {item.icon}
      {item.name}
    </p>
  );
}
