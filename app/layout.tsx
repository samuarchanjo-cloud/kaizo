import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;
  const description = "Gestão de clientes, veículos, ordens de serviço, orçamentos e pagamentos para oficinas modernas.";
  return {
    title: "KAIZO · Gestão automotiva",
    description,
    applicationName: "KAIZO",
    manifest: "/manifest.webmanifest",
    icons: { icon: "/kaizo-logo.png", apple: "/kaizo-logo.png" },
    openGraph: { title: "KAIZO · Gestão automotiva", description, type: "website", images: [{ url: socialImage, width: 1680, height: 945, alt: "KAIZO — Gestão que move sua oficina" }] },
    twitter: { card: "summary_large_image", title: "KAIZO · Gestão automotiva", description, images: [socialImage] },
  };
}

export const viewport: Viewport = { themeColor: "#07090b", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={geist.variable}>{children}</body></html>;
}
