// 三方四正、夹宫、四化飞星的提取（依赖 iztro 原始实例的方法）。

export type PalaceBrief = {
  name: string;
  majorStars: string[];
  minorStars: string[];
};

export type Relations = {
  /** 三方四正 */
  target: PalaceBrief | null;
  opposite: PalaceBrief | null;
  wealth: PalaceBrief | null;
  career: PalaceBrief | null;
  /** 夹宫（左右邻宫） */
  previous: PalaceBrief | null;
  next: PalaceBrief | null;
  /** 本宫四化飞出的目标宫 */
  flyOut: { to: string }[];
  /** 四化飞入本宫的源宫 */
  flyIn: { from: string }[];
};

function brief(p: Record<string, unknown> | undefined | null): PalaceBrief | null {
  if (!p) return null;
  const names = (arr: unknown) =>
    ((arr ?? []) as { name?: string }[]).map((s) => String(s.name ?? ''));
  return {
    name: String((p as { name?: string }).name ?? ''),
    majorStars: names((p as { majorStars?: unknown }).majorStars),
    minorStars: names((p as { minorStars?: unknown }).minorStars),
  };
}

export function getRelations(
  raw: {
    palace: (n: string) => Record<string, unknown> | undefined;
    surroundedPalaces: (n: string) => Record<string, unknown> | undefined;
    flankingPalaces: (n: string) => Record<string, unknown> | undefined;
  },
  palaceName: string,
): Relations {
  const sp = raw.surroundedPalaces(palaceName);
  const fp = raw.flankingPalaces(palaceName);

  const target = brief(sp?.target as Record<string, unknown>);
  const opposite = brief(sp?.opposite as Record<string, unknown>);
  const wealth = brief(sp?.wealth as Record<string, unknown>);
  const career = brief(sp?.career as Record<string, unknown>);
  const previous = brief(fp?.previous as Record<string, unknown>);
  const next = brief(fp?.next as Record<string, unknown>);

  // 本宫四化飞出的目标宫
  const flyOut: { to: string }[] = [];
  try {
    const src = raw.palace(palaceName) as { mutagedPlaces?: () => Record<string, unknown>[] };
    const places = src?.mutagedPlaces?.() ?? [];
    places.forEach((p) => {
      const n = (p as { name?: string }).name;
      if (n) flyOut.push({ to: n });
    });
  } catch {
    /* ignore */
  }

  // 四化飞入本宫的源宫
  const flyIn: { from: string }[] = [];
  const PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '仆役', '官禄', '田宅', '福德', '父母'];
  try {
    PALACE_NAMES.forEach((name) => {
      const p = raw.palace(name) as { mutagedPlaces?: () => Record<string, unknown>[] };
      const places = p?.mutagedPlaces?.() ?? [];
      if (places.some((t) => (t as { name?: string }).name === palaceName)) {
        flyIn.push({ from: name });
      }
    });
  } catch {
    /* ignore */
  }

  return { target, opposite, wealth, career, previous, next, flyOut, flyIn };
}
