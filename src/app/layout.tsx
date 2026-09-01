import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "Sistema de Gestão de Espaços Corporativos",
  description: "Protótipo de otimização de alocação de salas — ISTQB CT-AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans antialiased">
        <Nav />
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
