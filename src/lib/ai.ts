// AI 兜底层：直接调用 OpenAI 兼容的 /chat/completions 接口。
// 纯前端直连，用户自行填写 API Key（Key 只保存在本地 localStorage）。

export type AiProvider = 'deepseek' | 'openai' | 'qwen' | 'custom';

export const AI_PROVIDERS: Record<AiProvider, { label: string; baseUrl: string; model: string }> = {
  deepseek: { label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  qwen: { label: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  custom: { label: '自定义 (OpenAI 兼容)', baseUrl: '', model: '' },
};

export type AiConfig = {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function buildChatUrl(config: AiConfig): string {
  const base = config.baseUrl.replace(/\/+$/, '');
  return `${base}/chat/completions`;
}

export async function askAI(
  config: AiConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch(buildChatUrl(config), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI 调用失败 (${res.status})：${text.slice(0, 300)}`);
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '（无返回内容）';
}

export function buildChartPrompt(summary: string, focus?: string): string {
  const focusLine = focus ? `\n用户当前重点关注：${focus}。` : '';
  return `以下是某人的紫微斗数排盘结构概要：\n\n${summary}\n${focusLine}\n\n请基于以上结构，给出：\n1. 整体命格的一段综合分析（性格、优势、需留意之处）；\n2. 事业、财运、感情三个方面各一句扼要点评。`;
}

export function buildPalacePrompt(summary: string, palaceText: string, palaceName: string): string {
  return `以下是排盘结构概要：\n\n${summary}\n\n用户当前想了解「${palaceName}」，该宫位的排盘结构为：\n\n${palaceText}\n\n请基于此，对该宫位做一段通俗易懂的解读（含义、星曜组合的影响、需留意的点），控制在 200 字左右。`;
}
