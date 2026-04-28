// src/app/layout.tsx
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google'; // 1. Import Manrope
import '../../global.css';

export const metadata: Metadata = {
  title: 'Fin-Recruit Dashboard',
  description: 'Smart dashboard for department heads',
};

// 2. Configure the font
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans', // This directly connects to your Tailwind config!
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 3. Apply the font variable to the HTML tag
    <html lang="en" className={manrope.variable}>
      <body className="font-sans antialiased bg-red text-foreground">
        {children}
      </body>
    </html>
  );
}