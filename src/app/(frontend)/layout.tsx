import type { ReactNode } from 'react';
import Providers from '@/app/(frontend)/providers';

type FrontendLayoutProps = {
  children: ReactNode;
};

export default function FrontendLayout({ children }: FrontendLayoutProps) {
  return <Providers>{children}</Providers>;
}
