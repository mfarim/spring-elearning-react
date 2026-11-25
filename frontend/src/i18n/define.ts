/**
 * Declares one namespace of UI text. Both languages must have exactly the same keys: a key that is
 * missing in either one is a type error, so `npm run build` catches untranslated text.
 *
 * Placeholders use braces: "Hello {name}" with t('ns.key', { name }).
 */
export function defineMessages<K extends string>(messages: { id: Record<K, string>; en: Record<K, string> }) {
  return messages;
}
