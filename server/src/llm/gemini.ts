import { LLMProvider } from './provider';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export class GeminiProvider implements LLMProvider {
  name = 'gemini';

  async completeJson<T>(params: {
    system: string;
    prompt: string;
    schema: object;
    maxTokens?: number;
  }): Promise<T> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY가 설정되지 않았습니다');

    // 키는 URL이 아닌 헤더로 전달 (로그·프록시에 키가 남지 않도록)
    const res = await fetch(`${BASE}/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.system }] },
        contents: [{ role: 'user', parts: [{ text: params.prompt }] }],
        generationConfig: {
          maxOutputTokens: params.maxTokens ?? 2048,
          responseMimeType: 'application/json',
          responseSchema: params.schema,
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini 응답에 텍스트가 없습니다');
    return JSON.parse(text) as T;
  }
}
