import type { ReactNode } from 'react';
import Providers from '@/app/(frontend)/providers';
import '../../../global.css';

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return <Providers>{children}</Providers>;
}
