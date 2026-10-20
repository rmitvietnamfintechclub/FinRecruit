import type { ReactNode } from 'react';
import Providers from './providers';
import { SessionExpiredProvider } from '@/components/providers/SessionExpiredProvider';
import '../../../global.css';

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SessionExpiredProvider>{children}</SessionExpiredProvider>
        </Providers>
      </body>
    </html>
  );
}
