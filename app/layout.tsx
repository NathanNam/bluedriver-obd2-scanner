import type { Metadata } from 'next';
import '../src/index.css';

export const metadata: Metadata = {
  title: 'OBD2 Scanner',
  description: 'Vehicle diagnostics via Web Bluetooth',
  icons: { icon: '/assets/favicon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
