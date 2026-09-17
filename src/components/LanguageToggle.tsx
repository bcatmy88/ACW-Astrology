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
      className={`inline-flex items-center p-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs shrink-0 select-none shadow-sm ${className}`}
      title={lang === 'zh' ? '点击切换语言 (Switch Language)' : 'Click to switch language (切换语言)'}
    >
      <button
        type="button"
        onClick={() => onToggle('zh')}
        className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all font-bold text-xs sm:text-xs leading-none min-h-[30px] flex items-center justify-center cursor-pointer ${
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
        className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all font-bold text-xs sm:text-xs leading-none min-h-[30px] flex items-center justify-center cursor-pointer ${
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
