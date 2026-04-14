import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Meridian — Supply Chain War Room",
  description:
    "Multi-agent AI supply chain disruption prediction and route optimization platform powered by Google ADK + Gemini",
  openGraph: {
    title: "Meridian — Supply Chain War Room",
    description:
      "Real-time multi-agent AI system for supply chain disruption prediction",
    siteName: "Meridian",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('meridian-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}else if(t==='system'||!t){var m=window.matchMedia('(prefers-color-scheme:light)').matches;document.documentElement.setAttribute('data-theme',m?'light':'dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className="h-full"
        style={{
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          background: "var(--bg-base)",
          color: "var(--text-primary)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
