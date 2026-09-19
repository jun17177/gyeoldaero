import { Router } from 'express';
import { routePlanRequestSchema } from '../planner/schema';
import { planRoute } from '../planner/planRoute';
import { extractTripSettings, tripSettingsRequestSchema } from '../planner/tripSettings';

const router = Router();

router.post('/trip-settings', async (req, res) => {
  const parsed = tripSettingsRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }
  try {
    const result = await extractTripSettings(parsed.data.text);
    res.status(result ? 200 : 422).json(result ?? { error: 'settings_unavailable' });
  } catch (error) {
    console.error('[trip-settings]', error instanceof Error ? error.message : 'failed');
    res.status(502).json({ error: 'upstream_error' });
  }
});

router.post('/route-plan', async (req, res) => {
  const parsed = routePlanRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }
  try {
    const result = await planRoute(parsed.data);
    res.status(result ? 200 : 422).json(result ?? { error: 'plan_unavailable' });
  } catch (error) {
    console.error('[route-plan]', error instanceof Error ? error.message : 'failed');
    res.status(502).json({ error: 'upstream_error' });
  }
});

export default router;
