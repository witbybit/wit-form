import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/'>) {
  const base = baseOptions();
  return (
    <HomeLayout
      {...base}
      // See-through over the hero's glow, solid once the page scrolls
      nav={{ ...base.nav, transparentMode: 'top' }}
      // Only the home page needs these. The docs layout has its own sidebar
      links={[
        { text: 'Docs', url: '/docs/getting-started' },
        { text: 'Examples', url: '/docs/examples' },
        { text: 'API', url: '/docs/api/use-form' },
        { text: 'Comparison', url: '/docs/comparison' },
      ]}
    >
      {children}
    </HomeLayout>
  );
}
