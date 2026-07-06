
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-CVD1KGT6GM"; // Updated ID
const HOTJAR_ID = 6441159; // Your Hotjar Site ID

export const metadata: Metadata = {
  title: 'Campus Codex - Interactive Coding Labs & Online Assessments',
  description: 'A learning platform for college students, offering interactive coding labs and online assessments to master programming languages like Python, Java, and more.',
  keywords: ['coding', 'programming', 'learn to code', 'online coding labs', 'programming assessments', 'college coding', 'Python', 'Java', 'C++', 'JavaScript', 'computer science', 'coding practice', 'programming exercises', 'student learning platform'],
  authors: [{ name: 'Campus Codex' }],
  creator: 'Campus Codex',
  publisher: 'Campus Codex',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://campuscodex.com',
    title: 'Campus Codex - Interactive Coding Labs & Online Assessments',
    description: 'A learning platform for college students, offering interactive coding labs and online assessments to master programming languages.',
    siteName: 'Campus Codex',
    images: [
      {
        url: '/favicon.ico',
        width: 512,
        height: 512,
        alt: 'Campus Codex Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Campus Codex - Interactive Coding Labs & Online Assessments',
    description: 'A learning platform for college students, offering interactive coding labs and online assessments to master programming languages.',
    images: ['/favicon.ico'],
    creator: '@campuscodex',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export const viewport: Viewport = {
  themeColor: '#29ABE2',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <meta name="application-name" content="Campus Codex" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Campus Codex" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#29ABE2" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Theme Initialization Script to prevent flash and preserve theme on pages without Navbar */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storedTheme = localStorage.getItem('theme') || 'dark';
                  if (storedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (_) {}
              })();
            `,
          }}
        />

        {/* Google Analytics */}
        {process.env.NODE_ENV === 'production' && GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== "G-XXXXXXXXXX" && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}

        {/* Hotjar Tracking Code */}
        {process.env.NODE_ENV === 'production' && (
          <Script id="hotjar-tracking" strategy="afterInteractive">
            {`
              (function(h,o,t,j,a,r){
                  h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                  h._hjSettings={hjid:${HOTJAR_ID},hjsv:6};
                  a=o.getElementsByTagName('head')[0];
                  r=o.createElement('script');r.async=1;
                  r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                  a.appendChild(r);
              })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
            `}
          </Script>
        )}
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
