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

      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
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
    if (!lines || lines.length === 0) return;

    // Check cache first for all lines
    const uncachedIndices: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].text.trim();
      if (!trimmed || trimmed.length < 2) continue;
      const cacheKey = `${targetLang}:${trimmed}`;
      if (translationCache.has(cacheKey)) {
        lines[i].translation = translationCache.get(cacheKey);
      } else {
        uncachedIndices.push(i);
      }
    }

    if (uncachedIndices.length === 0) return;

    // Process uncached lines in chunks of 20 to avoid firing 100+ concurrent requests and hitting HTTP 429
    const CHUNK_SIZE = 20;
    for (let i = 0; i < uncachedIndices.length; i += CHUNK_SIZE) {
      const chunk = uncachedIndices.slice(i, i + CHUNK_SIZE);
      const combinedText = chunk.map((idx) => lines[idx].text.trim()).join('\n');

      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(
          targetLang,
        )}&dt=t&q=${encodeURIComponent(combinedText)}`;

        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = (await res.json()) as unknown[][][];
          if (Array.isArray(data) && Array.isArray(data[0])) {
            const translatedFull = data[0]
              .map((c) => (Array.isArray(c) && typeof c[0] === 'string' ? c[0] : ''))
              .join('');

            const translatedLines = translatedFull.split('\n');
            if (translatedLines.length === chunk.length) {
              for (let j = 0; j < chunk.length; j++) {
                const lineIdx = chunk[j];
                const original = lines[lineIdx].text.trim();
                const trans = translatedLines[j].trim();
                if (trans && trans.toLowerCase() !== original.toLowerCase()) {
                  lines[lineIdx].translation = trans;
                  translationCache.set(`${targetLang}:${original}`, trans);
                }
              }
              continue;
            }
          }
        }
      } catch (e) {
        console.warn('[AuraMusic Live Translator] Batch translation error, using fallback:', e);
      }

      // Fallback: translate line by line
      for (const lineIdx of chunk) {
        lines[lineIdx].translation = await this.translateLine(lines[lineIdx].text, targetLang);
      }
    }
  }
}
