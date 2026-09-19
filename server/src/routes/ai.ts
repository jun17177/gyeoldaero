import { Router, Request, Response } from 'express';
import { createProvider } from '../llm/provider';
import {
  RecommendSpotsRequest,
  RecommendSpotsResponse,
  TripCommentRequest,
  TripCommentResponse,
} from '../types';

const router = Router();
const llm = createProvider();

const SYSTEM = `당신은 제주 여행 전문 플래너 "결대로"의 AI입니다.
사용자의 취향(테마)·계절·날씨·짐 무게·인원을 종합해 명소를 추천하고 일정을 설명합니다.
- 항상 한국어로, 친근하지만 담백하게 답합니다.
- 날씨가 비/눈이면 실내·근거리 위주로 판단합니다.
- 짐이 무겁거나 인원이 많으면 이동이 적은 동선을 선호합니다.`;

const RECOMMEND_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          spotId: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['spotId', 'reason'],
        additionalProperties: false,
      },
    },
    summary: { type: 'string' },
  },
  required: ['recommendations', 'summary'],
  additionalProperties: false,
};

const COMMENT_SCHEMA = {
  type: 'object',
  properties: { comment: { type: 'string' } },
  required: ['comment'],
  additionalProperties: false,
};

// 후보 명소 중 사용자 맞춤 추천 선별
router.post('/recommend-spots', async (req: Request, res: Response) => {
  try {
    const body = req.body as RecommendSpotsRequest;
    if (!Array.isArray(body?.spots) || body.spots.length === 0 || !body?.settings) {
      return res.status(400).json({ error: 'spots와 settings는 필수입니다' });
    }
    if (!Array.isArray(body.settings.themes) || typeof body.settings.weather !== 'string') {
      return res.status(400).json({ error: 'settings 형식이 올바르지 않습니다' });
    }
    const maxCount = Math.min(Math.max(Number(body.maxCount) || 5, 1), 10);
    // 토큰 절약: 후보는 최대 60개까지만 전달
    const candidates = body.spots.slice(0, 60);

    const prompt = `사용자 설정: ${JSON.stringify(body.settings)}
후보 명소 목록: ${JSON.stringify(candidates)}

위 후보 중 사용자에게 가장 잘 맞는 명소를 정확히 ${maxCount}개 골라주세요.
- spotId는 반드시 후보 목록의 id 값을 그대로 사용하세요.
- reason은 사용자 설정과 연결된 한 문장으로 쓰세요.
- summary는 전체 추천 방향을 한 문장으로 요약하세요.`;

    const result = await llm.completeJson<RecommendSpotsResponse>({
      system: SYSTEM,
      prompt,
      schema: RECOMMEND_SCHEMA,
      maxTokens: 1500,
    });

    // LLM이 잘못된 id를 반환하는 경우 방어
    const validIds = new Set(candidates.map(s => s.id));
    result.recommendations = result.recommendations.filter(r => validIds.has(r.spotId));

    res.json(result);
  } catch (e) {
    console.error('[recommend-spots]', e);
    res.status(502).json({ error: 'AI 추천 생성에 실패했습니다' });
  }
});

// 최적화된 일정에 대한 자연어 코멘트 생성
router.post('/trip-comment', async (req: Request, res: Response) => {
  try {
    const body = req.body as TripCommentRequest;
    if (!Array.isArray(body?.spots) || body.spots.length === 0 || !body?.settings) {
      return res.status(400).json({ error: 'spots와 settings는 필수입니다' });
    }
    if (typeof body.days !== 'number' || body.days < 1 || body.days > 30) {
      return res.status(400).json({ error: 'days는 1~30 사이 숫자여야 합니다' });
    }

    const prompt = `여행 일정 정보:
- 기간: ${body.days}일
- 방문 순서: ${body.spots.map(s => `${s.name}(${s.category})`).join(' → ')}
- 사용자 설정: ${JSON.stringify(body.settings)}
- 오늘 제주 날씨: ${body.weatherLabel ?? '정보 없음'}

이 일정이 왜 이렇게 짜였는지 사용자에게 2~3문장으로 설명해주세요.
날씨·짐 무게·테마가 일정에 어떻게 반영됐는지 자연스럽게 언급하세요.`;

    const result = await llm.completeJson<TripCommentResponse>({
      system: SYSTEM,
      prompt,
      schema: COMMENT_SCHEMA,
      maxTokens: 500,
    });

    res.json(result);
  } catch (e) {
    console.error('[trip-comment]', e);
    res.status(502).json({ error: 'AI 코멘트 생성에 실패했습니다' });
  }
});

export default router;
