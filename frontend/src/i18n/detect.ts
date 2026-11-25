export type Lang = 'id' | 'en';

const STORAGE_KEY = 'lang';

/** Set by the frontend nginx from Cloudflare's CF-IPCountry header (see nginx.conf). */
const COUNTRY_COOKIE = /(?:^|;\s*)geo_country=([A-Z]{2})(?:;|$)/;

/** WIB, WITA and WIT. */
const INDONESIAN_TIME_ZONES = new Set(['Asia/Jakarta', 'Asia/Pontianak', 'Asia/Makassar', 'Asia/Jayapura']);

const isLang = (value: unknown): value is Lang => value === 'id' || value === 'en';

/** The language the user picked with the selector, if any. Storage can be blocked (private mode). */
export function readSavedLanguage(): Lang | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLang(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveLanguage(lang: Lang): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* the choice then only lasts for this page load */
  }
}

/** Two-letter country code of the visitor, or null when unknown (no Cloudflare, local dev, "XX"). */
export function readCountry(cookie: string = document.cookie): string | null {
  const country = cookie.match(COUNTRY_COOKIE)?.[1];
  return country && country !== 'XX' ? country : null;
}

function browserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * Indonesian for visitors in Indonesia, English for everyone else. The IP country decides when it is
 * known; otherwise the browser's time zone stands in for the location.
 */
export function languageForLocation(country: string | null, timeZone: string | undefined): Lang {
  if (country) return country === 'ID' ? 'id' : 'en';
  return timeZone && INDONESIAN_TIME_ZONES.has(timeZone) ? 'id' : 'en';
}

/** An explicit choice from the selector always wins over the location. */
export function detectLanguage(): Lang {
  return readSavedLanguage() ?? languageForLocation(readCountry(), browserTimeZone());
}
