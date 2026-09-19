import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from './provider';

// 명소 추천·여행 코멘트처럼 가벼운 작업 전용 모델.
// 사용자가 화면에서 기다리는 요청이라 속도를 우선한다 — 실측(명소 10곳) sonnet-4-6 9.9초 → haiku-4.5 4.9초.
// 동선 설계(planner/claude.ts)와 변수를 분리해 둔 이유: 그쪽은 output_config.effort를 쓰는데
// Haiku 4.5는 effort를 지원하지 않아, 한 변수를 공유하면 Haiku 설정이 동선 설계를 깨뜨린다.
const MODEL = process.env.AI_MODEL ?? 'claude-haiku-4-5';

export class ClaudeProvider implements LLMProvider {
  name = 'claude';
  private client = new Anthropic(); // ANTHROPIC_API_KEY 환경변수 사용

  async completeJson<T>(params: {
    system: string;
    prompt: string;
    schema: object;
    maxTokens?: number;
  }): Promise<T> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: params.maxTokens ?? 2048,
      system: params.system,
      messages: [{ role: 'user', content: params.prompt }],
      // 구조화 출력 — 응답이 schema를 따르는 JSON임을 보장
      output_config: {
        format: {
          type: 'json_schema',
          schema: params.schema as Record<string, unknown>,
        },
      },
    });

    const text = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text'
    )?.text;
    if (!text) throw new Error('Claude 응답에 텍스트가 없습니다');
    return JSON.parse(text) as T;
  }
}
