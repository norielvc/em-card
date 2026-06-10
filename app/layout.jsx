import './globals.css';
import DevErrorSuppressor from './components/DevErrorSuppressor';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata = {
  title: 'EM Card | Epektibong Mamamayan',
  description: 'Ang EM Card ay isang Non-Government Organization na nagpapalakas ng komunidad sa pamamagitan ng serbisyo, aksyon, at pagiging bukas.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="tl" suppressHydrationWarning>
      <body>
        <DevErrorSuppressor />
        {children}
      </body>
    </html>
  );
}
