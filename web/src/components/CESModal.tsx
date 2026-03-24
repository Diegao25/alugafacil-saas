'use client';

import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '@/lib/api';

interface CESModalProps {
  onClose: () => void;
  taskType?: string;
  onSuccess?: () => void;
}

const cesScale = [
  { value: 1, label: 'Muito Difícil', color: 'bg-red-500' },
  { value: 2, label: 'Difícil', color: 'bg-orange-500' },
  { value: 3, label: 'Um pouco Difícil', color: 'bg-amber-500' },
  { value: 4, label: 'Neutro', color: 'bg-yellow-500' },
  { value: 5, label: 'Um pouco Fácil', color: 'bg-lime-500' },
  { value: 6, label: 'Fácil', color: 'bg-emerald-500' },
  { value: 7, label: 'Muito Fácil', color: 'bg-teal-600' },
];

export default function CESModal({ onClose, taskType = 'onboarding', onSuccess }: CESModalProps) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (score === null) {
      toast.warning('Por favor, selecione uma nota de 1 a 7.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/ces', {
        score,
        comment: comment.trim() || undefined,
        task_type: taskType
      });
      toast.success('Obrigado pelo seu feedback! Isso nos ajuda a melhorar.');
      // Limpar dismissal se respondeu
      localStorage.removeItem('ces_dismissed_at');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao enviar CES:', error);
      toast.error('Não foi possível enviar seu feedback no momento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm px-4 py-6 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg rounded-[2.5rem] bg-white shadow-2xl border border-slate-100 overflow-hidden transform animate-in zoom-in-95 duration-300">
        {/* Header Decorativo */}
        <div className="h-2 bg-gradient-to-r from-blue-600 to-teal-500 w-full" />
        
        <div className="p-8 md:p-10">
          <button
            onClick={() => {
              localStorage.setItem('ces_dismissed_at', new Date().getTime().toString());
              onClose();
            }}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>

          <div className="text-center mb-8">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-4 inline-block">
              Feedback de Experiência
            </span>
            <h3 className="text-2xl font-black text-slate-900 leading-tight">
              O quão fácil foi realizar as configurações iniciais do sistema?
            </h3>
            <p className="text-slate-500 mt-2 text-sm font-medium">
              Sua resposta nos ajuda a tornar o Aluga Fácil cada vez mais simples.
            </p>
          </div>

          <div className="space-y-8">
            {/* Escala */}
            <div className="relative">
              <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">
                <span>Muito Difícil</span>
                <span>Muito Fácil</span>
              </div>
              
              <div className="flex items-center justify-between gap-2">
                {cesScale.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setScore(item.value)}
                    className={`
                      relative flex-1 h-12 rounded-xl font-black text-lg transition-all duration-200
                      ${score === item.value 
                        ? `${item.color} text-white shadow-lg shadow-${item.color.split('-')[1]}-200 scale-110 -translate-y-1` 
                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:-translate-y-0.5'
                      }
                    `}
                    title={item.label}
                  >
                    {item.value}
                    {score === item.value && (
                      <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                        <Check size={10} className="text-slate-900" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              {score && (
                <p className="text-center mt-4 text-xs font-bold text-slate-600 animate-in fade-in slide-in-from-top-1">
                  Nota selecionada: <span className="text-blue-600">{cesScale.find(s => s.value === score)?.label}</span>
                </p>
              )}
            </div>

            {/* Comentário */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Conte-nos mais (opcional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                placeholder="O que foi mais difícil ou o que você mais gostou?"
                className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none resize-none h-24 font-medium"
              />
              <div className="flex justify-end pr-1">
                <span className={`text-[9px] font-bold ${comment.length >= 450 ? 'text-amber-500' : 'text-slate-300'}`}>
                  {comment.length}/500
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || score === null}
              className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200 active:scale-[0.98]"
            >
              {submitting ? 'Enviando...' : 'ENVIAR FEEDBACK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
