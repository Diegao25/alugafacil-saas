'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  defaultOpen = false 
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-slate-50 transition-colors text-left group cursor-pointer"
      >
        <div className="flex items-center gap-3 pointer-events-none">
          <div className="p-2 bg-slate-50 rounded-xl text-slate-600 group-hover:bg-white group-hover:shadow-sm transition-all">
            {icon}
          </div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">{title}</span>
        </div>
        <div className="text-slate-400 pointer-events-none">
          {isOpen ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
        </div>
      </button>

      <div 
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100 border-t border-slate-100' : 'max-h-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-8 pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
