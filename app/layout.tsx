import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import PrivacyBanner from "@/components/PrivacyBanner";
import Footer from "@/components/Footer";
import { LanguageProvider } from "@/lib/LanguageContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ImagePine – Resize, Compress, Convert & Edit Images Online",
  description:
    "Free online image editor. Resize, compress, rotate, flip and convert images instantly in your browser. No upload needed - 100% private.",
  keywords: "image resizer, image compressor, rotate image, flip image, free image editor online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var manual = localStorage.getItem('imagepine_lang_manual');
                  var detected = sessionStorage.getItem('imagepine_lang_detected');
                  var lang = manual || detected;
                  if (lang && lang !== 'en') {
                    document.documentElement.classList.add("lang-loading");
                    setTimeout(function() {
                      document.documentElement.classList.remove("lang-loading");
                    }, 1200);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* Google Analytics (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-K17SPE0RN6"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-K17SPE0RN6');
          `}
        </Script>
      </head>
      <body
        className={`${inter.variable} font-sans antialiased`}
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          background: "#F7F7FB",
        }}
      >
        <LanguageProvider>
          <Navbar />
          <PrivacyBanner />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}

