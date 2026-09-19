// LLM 추상화 — 환경변수 LLM_PROVIDER로 claude/gemini 교체 가능

export interface LLMProvider {
  name: string;
  // 프롬프트를 보내고 schema 형태의 JSON 객체를 받는다.
  completeJson<T>(params: {
    system: string;
    prompt: string;
    schema: object;        // JSON Schema
    maxTokens?: number;
  }): Promise<T>;
}

import { ClaudeProvider } from './claude';
import { GeminiProvider } from './gemini';

export function createProvider(): LLMProvider {
  const which = (process.env.LLM_PROVIDER ?? 'claude').toLowerCase();
  if (which === 'gemini') return new GeminiProvider();
  return new ClaudeProvider();
}
