import './globals.css';
import DevErrorSuppressor from './components/DevErrorSuppressor';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#062b1e',
};

export const metadata = {
  title: 'EM Card | Epektibong Mamamayan',
  description: 'Ang EM Card ay isang Non-Government Organization na nagpapalakas ng komunidad sa pamamagitan ng serbisyo, aksyon, at pagiging bukas.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EM Admin',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="tl" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#062b1e" />
      </head>
      <body>
        <DevErrorSuppressor />
        {children}
      </body>
    </html>
  );
}
