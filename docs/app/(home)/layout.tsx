import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <HomeLayout
      {...baseOptions()}
      // Only the home page needs these. The docs layout has its own sidebar
      links={[
        { text: 'Docs', url: '/docs/getting-started' },
        { text: 'Examples', url: '/docs/examples' },
        { text: 'API', url: '/docs/api/use-form' },
      ]}
    >
      {children}
    </HomeLayout>
  );
}
