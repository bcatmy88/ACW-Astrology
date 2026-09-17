import React from 'react';
import type { AppLanguage } from '../types';

interface LanguageToggleProps {
  lang: AppLanguage;
  onToggle: (lang: AppLanguage) => void;
  className?: string;
}

export default function LanguageToggle({ lang, onToggle, className = '' }: LanguageToggleProps) {
  return (
    <div 
      className={`inline-flex items-center p-0.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs shrink-0 select-none shadow-sm ${className}`}
      title={lang === 'zh' ? '点击切换语言 (Switch Language)' : 'Click to switch language (切换语言)'}
    >
      <button
        type="button"
        onClick={() => onToggle('zh')}
        className={`px-2 py-0.5 rounded-md transition-all font-bold text-[11px] leading-tight ${
          lang === 'zh'
            ? 'bg-gold text-zinc-950 shadow-sm'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        华语
      </button>
      <button
        type="button"
        onClick={() => onToggle('en')}
        className={`px-2 py-0.5 rounded-md transition-all font-bold text-[11px] leading-tight ${
          lang === 'en'
            ? 'bg-gold text-zinc-950 shadow-sm'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  );
}
