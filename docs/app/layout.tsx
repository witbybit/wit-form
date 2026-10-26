import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Provider } from '@/components/provider';
import './global.css';

export const metadata: Metadata = {
  title: { template: '%s | Wit Form', default: 'Wit Form' },
  description:
    'Headless React forms that stay fast at thousands of fields. Every field is its own Jotai atom, so typing re-renders only that field.',
  // Set DOCS_SITE_URL to the deployed URL so social preview images resolve
  ...(process.env.DOCS_SITE_URL && {
    metadataBase: new URL(process.env.DOCS_SITE_URL),
  }),
};

const inter = Inter({
  subsets: ['latin'],
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
