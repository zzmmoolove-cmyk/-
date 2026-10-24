// 安星码：将排盘配置（出生信息 + 流派设置）编码为短码，可复制分享、导入复现。

import type { BirthInput, ChartOptions } from '../types';

export type ChartCodePayload = BirthInput & ChartOptions;

export function encodeChart(payload: ChartCodePayload): string {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeChart(code: string): ChartCodePayload | null {
  try {
    let b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const json = new TextDecoder().decode(bytes);
    const obj = JSON.parse(json) as Partial<ChartCodePayload>;
    if (typeof obj.birthday !== 'string' || typeof obj.gender !== 'string') return null;
    return obj as ChartCodePayload;
  } catch {
    return null;
  }
}
