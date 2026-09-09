const translationCache = new Map<string, string>();

/**
 * Real-time lyric translation service for AuraMusic Desktop.
 * Translates foreign lyric lines on the fly with batching and local memory caching.
 */
export class LyricsTranslator {
  private static targetLanguage = 'en';

  public static setTargetLanguage(lang: string) {
    this.targetLanguage = lang || 'en';
  }

  public static async translateLine(text: string, targetLang: string = this.targetLanguage): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 2) return '';

    const cacheKey = `${targetLang}:${trimmed}`;
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
        targetLang,
      )}&dt=t&q=${encodeURIComponent(trimmed)}`;

      const res = await fetch(url);
      if (!res.ok) return '';

      const data = (await res.json()) as unknown[][][];
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translated = data[0]
          .map((chunk) => (Array.isArray(chunk) && typeof chunk[0] === 'string' ? chunk[0] : ''))
          .join('')
          .trim();

        if (translated && translated.toLowerCase() !== trimmed.toLowerCase()) {
          translationCache.set(cacheKey, translated);
          return translated;
        }
      }
    } catch (e) {
      console.warn('[AuraMusic Live Translator] Translation failed for line:', trimmed, e);
    }

    return '';
  }

  public static async translateLines(
    lines: { text: string; translation?: string }[],
    targetLang: string = this.targetLanguage,
  ): Promise<void> {
    const promises = lines.map(async (line) => {
      if (!line.text.trim()) return;
      line.translation = await this.translateLine(line.text, targetLang);
    });

    await Promise.allSettled(promises);
  }
}
