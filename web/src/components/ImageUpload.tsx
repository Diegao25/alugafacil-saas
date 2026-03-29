'use client';

import { useState, useRef } from 'react';
import { ImageIcon, Upload, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import Image from 'next/image';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}

export default function ImageUpload({ value, onChange, label = "Foto do Imóvel" }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validação básica de tipo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem válido.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.url) {
        onChange(response.data.url);
      }
    } catch (err: any) {
      console.error('[Upload Error]', err);
      setError('Erro ao subir imagem. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <label className="text-sm font-bold text-slate-700 block">{label}</label>
      
      {value ? (
        <div className="relative group w-full aspect-video rounded-2xl overflow-hidden border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/10 transition-all">
          <Image 
            src={value} 
            alt="Preview" 
            fill 
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all border border-white/30"
              title="Trocar Foto"
            >
              <Upload className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={removeImage}
              className="p-3 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-600 transition-all border border-red-400/30"
              title="Remover Foto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="absolute top-4 right-4 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative w-full aspect-video rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center p-6
            ${isUploading ? 'bg-slate-50 border-blue-400 animate-pulse' : 'bg-slate-50 border-slate-300 hover:border-blue-500 hover:bg-blue-50/50'}
          `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <p className="text-sm font-bold text-blue-700 animate-pulse">Enviando para a nuvem...</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                <ImageIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">Clique ou arraste a foto</p>
                <p className="text-xs text-slate-500 mt-1">JPG, PNG ou WEBP (Max 10MB)</p>
              </div>
            </>
          )}
          
          {error && (
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-xs font-bold text-red-600 bg-red-50 p-2 rounded-xl border border-red-100 animate-bounce">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleUpload}
        className="hidden" 
        accept="image/*"
      />
    </div>
  );
}
