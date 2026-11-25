import React from 'react';
import { Languages } from 'lucide-react';
import { useI18n, type Lang } from '../../i18n';

const OPTIONS: { lang: Lang; label: string; name: string }[] = [
  { lang: 'id', label: 'ID', name: 'Bahasa Indonesia' },
  { lang: 'en', label: 'EN', name: 'English' },
];

/** ID / EN toggle. The choice is remembered and overrides the location-based default. */
export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t('common.language')}
      className={`inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5 text-xs shadow-xs ${className}`}
    >
      <Languages className="w-3.5 h-3.5 text-gray-400 ml-1.5" aria-hidden="true" />
      {OPTIONS.map((option) => {
        const selected = option.lang === lang;
        return (
          <button
            key={option.lang}
            type="button"
            lang={option.lang}
            title={option.name}
            aria-label={option.name}
            aria-pressed={selected}
            onClick={() => setLang(option.lang)}
            className={`rounded-md px-2 py-1 font-semibold transition cursor-pointer ${
              selected ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:text-emerald-700 hover:bg-emerald-50'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
