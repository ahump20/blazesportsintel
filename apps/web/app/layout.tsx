import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blaze Sports Intel',
  description: 'Developer Mode and advanced graphics lab for Blaze Sports Intel.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
