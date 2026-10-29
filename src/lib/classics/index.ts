import type { Book } from './types';
import { guSuiFu } from './data/gusuifu';
import { ziWeiQuanShu } from './data/quanshu';
import { ziWeiQuanJi } from './data/quanji';

export type ClassicHit = {
  bookTitle: string;
  bookSlug: string;
  chapterTitle: string;
  paragraphId: string;
  text: string;
};

export const ALL_BOOKS: Book[] = [guSuiFu, ziWeiQuanShu, ziWeiQuanJi];

export function searchClassics(query: string, limit = 60): ClassicHit[] {
  const q = query.trim();
  if (!q) return [];
  const hits: ClassicHit[] = [];
  for (const book of ALL_BOOKS) {
    for (const chapter of book.chapters) {
      for (const p of chapter.paragraphs) {
        if (p.text.includes(q)) {
          hits.push({
            bookTitle: book.title,
            bookSlug: book.slug,
            chapterTitle: chapter.title,
            paragraphId: p.id,
            text: p.text,
          });
          if (hits.length >= limit) return hits;
        }
      }
    }
  }
  return hits;
}

/** 按星曜名检索整理本中的相关段落（用于星曜手册与宫位卡） */
export function quotesForStar(star: string, limit = 4): ClassicHit[] {
  return searchClassics(star, limit);
}

export function quotesForStars(stars: string[], limit = 4): ClassicHit[] {
  const seen = new Set<string>();
  const out: ClassicHit[] = [];
  for (const star of stars) {
    for (const hit of searchClassics(star, 3)) {
      const key = hit.paragraphId;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(hit);
      if (out.length >= limit) return out;
    }
  }
  return out;
}
