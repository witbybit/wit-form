import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';
import { SidebarFooter } from '@/components/sidebar-footer';
import { SidebarHeading } from '@/components/sidebar-heading';
import { version } from '../../../package.json';

export default function Layout({ children }: LayoutProps<'/docs'>) {
  // The sidebar footer has its own GitHub card and theme switch, so drop the default icon bar
  const { githubUrl: _githubUrl, ...options } = baseOptions();
  return (
    <DocsLayout
      tree={source.getPageTree()}
      {...options}
      themeSwitch={{ enabled: false }}
      sidebar={{
        footer: <SidebarFooter version={version} />,
        components: { Separator: SidebarHeading },
      }}
    >
      {children}
    </DocsLayout>
  );
}
