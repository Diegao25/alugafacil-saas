'use client';

import { PropsWithChildren, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

type CopyLinkButtonProps = {
  url?: string;
  label?: string;
  copiedLabel?: string;
};

export default function CopyLinkButton({
  url,
  label = 'Copiar link da agenda',
  copiedLabel = 'Link copiado!',
  children
}: PropsWithChildren<CopyLinkButtonProps>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const target = url ?? window.location.href;
      if (!target) return;
      await navigator.clipboard.writeText(target);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallbacks fail silently
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-600 transition hover:bg-slate-100 hover:border-slate-200 shadow-sm"
    >
      {copied ? (
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {copiedLabel}
        </span>
      ) : children || label}
    </button>
  );
}
