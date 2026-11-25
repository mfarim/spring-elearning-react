import { useMemo } from 'react';
import { create } from 'zustand';
import { messages } from './messages';
import { detectLanguage, saveLanguage, type Lang } from './detect';

export type { Lang };

type Namespaces = typeof messages;
type Namespace = keyof Namespaces & string;

/** Every key in the form "namespace.key", e.g. "nav.dashboard". */
export type MessageKey = {
  [N in Namespace]: `${N}.${keyof Namespaces[N]['id'] & string}`;
}[Namespace];

export type MessageVars = Record<string, string | number>;

export const LOCALES: Record<Lang, string> = { id: 'id-ID', en: 'en-US' };

export function translate(lang: Lang, key: MessageKey, vars?: MessageVars): string {
  const dot = key.indexOf('.');
  const table = messages[key.slice(0, dot) as Namespace][lang] as Record<string, string>;
  const text = table[key.slice(dot + 1)] ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

const applyDocumentLang = (lang: Lang) => {
  document.documentElement.lang = lang;
};

interface I18nState {
  lang: Lang;
  /** Chosen with the language selector: remembered, and wins over the location from then on. */
  setLang: (lang: Lang) => void;
}

export const useI18nStore = create<I18nState>((set) => {
  const initial = detectLanguage();
  applyDocumentLang(initial);
  return {
    lang: initial,
    setLang: (lang) => {
      saveLanguage(lang);
      applyDocumentLang(lang);
      set({ lang });
    },
  };
});

/**
 * Text and locale for the current language. Components that call it re-render when the language
 * changes. Use `locale` for dates and numbers: date.toLocaleDateString(locale).
 */
export function useI18n() {
  const lang = useI18nStore((state) => state.lang);
  const setLang = useI18nStore((state) => state.setLang);
  return useMemo(
    () => ({
      lang,
      locale: LOCALES[lang],
      setLang,
      t: (key: MessageKey, vars?: MessageVars) => translate(lang, key, vars),
    }),
    [lang, setLang]
  );
}

/** For code outside React components (stores, utils). It does not re-render anything by itself. */
export function t(key: MessageKey, vars?: MessageVars): string {
  return translate(useI18nStore.getState().lang, key, vars);
}
