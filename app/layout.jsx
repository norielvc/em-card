import './globals.css';

export const metadata = {
  title: 'EM Card | Epektibong Mamamayan',
  description: 'EM Card is a Non-Government Organization empowering communities through service, action, and transparency.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.addEventListener('error', (event) => {
                  if (event.filename && (event.filename.includes('extension') || event.filename.includes('chrome-extension'))) {
                    event.stopImmediatePropagation();
                  }
                }, true);
                window.addEventListener('unhandledrejection', (event) => {
                  // Suppress generic or extension-related uncaught rejections that crash Next.js overlay
                  if (!event.reason || (event.reason.stack && (event.reason.stack.includes('extension') || event.reason.stack.includes('chrome-extension')))) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                }, true);
              `,
            }}
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
