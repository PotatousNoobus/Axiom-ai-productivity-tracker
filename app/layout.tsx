import type {Metadata} from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ChatProvider } from '@/components/ChatContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title: 'Neon Dark Dashboard',
  description: 'A sleek, modern dashboard with an AI chat interface.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="font-sans bg-gray-50 dark:bg-[#0d1117] text-slate-800 dark:text-gray-200 antialiased selection:bg-cyan-500/30">
        <ChatProvider>
          {children}
        </ChatProvider>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#161b22',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
          }}
        />
      </body>
    </html>
  );
}
