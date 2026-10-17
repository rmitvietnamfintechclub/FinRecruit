import type { Metadata } from 'next';
import { Manrope } from 'next/font/google'; // 1. Import Manrope
import '../../global.css'; 

export const metadata: Metadata = {
    title: 'Fin-Recruit',
    description: 'RMIT Vietnam FinTech Club\'s integrated platform designed to completely digitize the club’s end-to-end recruitment lifecycle.',
};

const manrope = Manrope({
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-sans',
});

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={manrope.variable}>
            <body className="font-sans antialiased bg-background text-foreground">
                {children}
            </body>
        </html>
    );
}