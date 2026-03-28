'use client';

import { Home, Settings, Clock } from 'lucide-react';
import Link from 'next/link';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 selection:bg-cyan-500/30">
      {/* Decoração de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[25%] -right-[10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative max-w-lg w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
        {/* Logo / Ícone Central */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
            <div className="relative bg-[#1e293b]/80 border border-slate-700/50 p-6 rounded-3xl shadow-2xl backdrop-blur-xl group overflow-hidden">
               <Home className="w-16 h-16 text-cyan-400 group-hover:scale-110 transition-transform duration-500" />
            </div>
          </div>
        </div>

        {/* Títulos e Mensagem */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            Estamos preparando <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              novidades incríveis
            </span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed max-w-md mx-auto">
            O Aluga Fácil está em manutenção rápida para melhorias no motor de sincronização. Voltaremos em alguns instantes com mais tecnologia e velocidade.
          </p>
        </div>

        {/* Status / Info de Progresso */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-8">
           <div className="flex items-center gap-3 text-slate-300 bg-slate-800/40 px-5 py-3 rounded-full border border-slate-700/50 backdrop-blur-sm">
             <Clock className="w-5 h-5 text-cyan-400" />
             <span className="text-sm font-medium">Previsão: Já voltamos</span>
           </div>
           
           <div className="flex items-center gap-3 text-slate-300 bg-slate-800/40 px-5 py-3 rounded-full border border-slate-700/50 backdrop-blur-sm">
             <Settings className="w-5 h-5 text-cyan-400 animate-spin-slow" />
             <span className="text-sm font-medium">Estado: Otimizando Motor</span>
           </div>
        </div>

        {/* Footer / Suporte */}
        <div className="pt-4 border-t border-slate-800/50">
          <p className="text-slate-500 text-sm mb-4 italic">
            "A tecnologia a serviço da sua confiança."
          </p>
          <div className="flex justify-center gap-4">
            <Link 
              href="https://wa.me/5511988392241" 
              target="_blank"
              className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-semibold flex items-center gap-2"
            >
              Falar com Suporte
            </Link>
          </div>
        </div>
      </div>
      
      {/* CSS para animação spin-slow que não vem no tailwind base */}
      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
