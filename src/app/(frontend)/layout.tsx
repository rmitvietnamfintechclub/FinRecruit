// src/app/(frontend)/layout.tsx
import type { Metadata } from 'next';
import { Manrope } from 'next/font/google'; // Import Manrope font
import '../../../global.css'; // Make sure this path points to your global.css

export const metadata: Metadata = {
  title: 'Fin-Recruit Dashboard',
  description: 'Smart dashboard for department heads',
};

// Configure the Manrope font as a CSS variable
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans', // This allows us to map it in global.css or tailwind config
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Add suppressHydrationWarning to both html and body tags
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}