// 输出内容面板：显示/导出时可勾选的章节与参考书目标注。
// 设置会记在本机，下一次直接沿用；不影响排盘结果，只影响展示与 PDF。

export type OutputSections = {
  position: boolean;
  stars: boolean;
  synastry: boolean;
  surround: boolean;
  wuxing: boolean;
  four: boolean;
  blockages: boolean;
  strategies: boolean;
  gaps: boolean;
};

export type OutputReferences = {
  quanshu: boolean;
  quanshuFull: boolean;
  gusuifu: boolean;
};

export type OutputProfile = {
  sections: OutputSections;
  references: OutputReferences;
};

export const OUTPUT_STORAGE_KEY = 'ziwei-output-v1';

export const DEFAULT_OUTPUT: OutputProfile = {
  sections: {
    position: true,
    stars: true,
    synastry: true,
    surround: true,
    wuxing: true,
    four: true,
    blockages: true,
    strategies: true,
    gaps: false,
  },
  references: {
    quanshu: true,
    quanshuFull: false,
    gusuifu: false,
  },
};

export const SECTION_META: { key: keyof OutputSections; label: string; hint: string }[] = [
  { key: 'position', label: '宫位定位', hint: '这一宫管什么' },
  { key: 'stars', label: '本宫星曜', hint: '星曜 + 庙旺 + 四化' },
  { key: 'synastry', label: '同宫联动', hint: '星与星的生克' },
  { key: 'surround', label: '三方四正', hint: '对宫 / 三合会照' },
  { key: 'wuxing', label: '五行生克', hint: '顺生 / 相克 / 五行链' },
  { key: 'four', label: '四化', hint: '生年 / 自化 / 飞化' },
  { key: 'blockages', label: '卡点与策略', hint: '依据 / 影响 / 解法' },
  { key: 'strategies', label: '用星建议', hint: '风险 / 修正 / 座右铭' },
  { key: 'gaps', label: '数据缺口', hint: '哪些资料还没补齐' },
];

export const REFERENCE_META: { key: keyof OutputReferences; label: string }[] = [
  { key: 'quanshu', label: '《紫微斗数全书》' },
  { key: 'quanshuFull', label: '《紫微斗数全集》' },
  { key: 'gusuifu', label: '《骨髓赋》' },
];

export function loadOutputProfile(): OutputProfile {
  try {
    const raw = localStorage.getItem(OUTPUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<OutputProfile>;
      return {
        sections: { ...DEFAULT_OUTPUT.sections, ...(parsed.sections ?? {}) },
        references: { ...DEFAULT_OUTPUT.references, ...(parsed.references ?? {}) },
      };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_OUTPUT;
}

export function saveOutputProfile(p: OutputProfile): void {
  try {
    localStorage.setItem(OUTPUT_STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function referenceLabel(p: OutputProfile): string {
  return REFERENCE_META.filter((r) => p.references[r.key]).map((r) => r.label).join(' · ');
}

export function enabledSectionCount(p: OutputProfile): number {
  return SECTION_META.filter((s) => p.sections[s.key]).length;
}
