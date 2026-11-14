import { CookieBanner } from '@/components/legal/CookieBanner';
import type { Metadata, Viewport } from "next";
import { Baloo_2, Inter } from "next/font/google";
import "./globals.css";
import { MARCA } from "@/lib/marca";

// Tipografía de marca: Baloo 2 (display, 600/700/800) + Inter (body).
// Las variables alimentan --font-display / --font-body en components/landing/tokens.css.
const baloo2 = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: "variable",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Dirección pública del sitio: sirve para armar las URL absolutas de las vistas previas al compartir.
// Se define en .env.local (ver .env.example). Si falta o es inválida, se usa localhost.
function siteUrl(): URL {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

const TITULO = `${MARCA.nombre}: cuiden a su familiar mayor entre todos`;
const DESCRIPCION =
  "Medicamentos, citas y novedades del cuidado de tus padres en un solo lugar, entre todos los hermanos.";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: TITULO,
  description: DESCRIPCION,
  applicationName: MARCA.nombre,
  openGraph: {
    type: "website",
    locale: "es_LA",
    siteName: MARCA.nombre,
    title: TITULO,
    description: DESCRIPCION,
  },
  twitter: { card: "summary_large_image", title: TITULO, description: DESCRIPCION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f7fd", // el fondo azulado de la marca (tokens.css --bg): tiñe la barra del navegador móvil
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${baloo2.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js');setTimeout(function(){if(!document.documentElement.hasAttribute('data-reveal-ready'))document.documentElement.classList.add('reveal-fallback')},5000)" }} />
      </head>
      <body className="min-h-dvh flex flex-col">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
