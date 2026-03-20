import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const inter = Inter({ subsets: ['latin'] });
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL('https://alugafacil.com.br'),
  title: 'Aluga Fácil | Sistema de Gestão de Locações por Temporada',
  description: 'A solução definitiva para anfitriões. Organize suas reservas, controle seus recebimentos e gere contratos em um só lugar. Economize tempo e profissionalize sua gestão.',
  keywords: ['gestão de imóveis', 'aluguel por temporada', 'calendário de reservas', 'controle financeiro imobiliário', 'anfitrião profissional'],
  authors: [{ name: 'Aluga Fácil' }],
  creator: 'Aluga Fácil',
  publisher: 'Aluga Fácil',
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: 'https://alugafacil.com.br',
    title: 'Aluga Fácil | Gestão Profissional de Imóveis por Temporada',
    description: 'Simplifique a gestão dos seus imóveis. Centralize reservas, controle pagamentos e pare de perder tempo com burocracia.',
    siteName: 'Aluga Fácil',
    images: [
      {
        url: '/logo.svg',
        width: 1200,
        height: 630,
        alt: 'Aluga Fácil Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aluga Fácil | Gestão Profissional de Imóveis por Temporada',
    description: 'A solução completa para anfitriões e gestores imobiliários.',
    images: ['/logo.svg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased`}>
        <AuthProvider>
          {children}
          <ToastContainer position="top-right" autoClose={3000} />
        </AuthProvider>
      </body>
    </html>
  );
}
