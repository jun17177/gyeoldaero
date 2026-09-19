import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTripSettings, tripSettingsRequestSchema } from '../src/planner/tripSettings';
import { routePlanRequestSchema } from '../src/planner/schema';
import { validatePlan } from '../src/planner/feasibility';

test('settings sanitization preserves valid choices and repairs invalid AI values', () => {
  const result = sanitizeTripSettings({ themes: ['food', 'food', 'invalid'], season: 'invalid',
    startTime: 20, endTime: 10, firstDayArrival: 14, lastDayDeparture: null,
    people: -2, budget: -1, luggage: 'invalid', summary: 'Trip' }, new Date('2026-09-19T00:00:00Z'));
  assert.deepEqual(result.settings.themes, ['food']);
  assert.equal(result.settings.season, 'fall');
  assert.equal(result.settings.weather, 'sunny');
  assert.equal(result.settings.startTime, 9);
  assert.equal(result.settings.endTime, 19);
  assert.equal(result.settings.firstDayArrival, 14);
  assert.equal(result.settings.lastDayDeparture, undefined);
  assert.equal(result.settings.people, 1);
  assert.equal(result.settings.budget, 0);
});

test('rejects empty and oversized descriptions', () => {
  assert.equal(tripSettingsRequestSchema.safeParse({ text: ' ' }).success, false);
  assert.equal(tripSettingsRequestSchema.safeParse({ text: 'a'.repeat(501) }).success, false);
});

test('route validation rejects missing, duplicate, and unknown places', () => {
  const request = routePlanRequestSchema.parse({
    spots: [{ id: 'a', name: 'A', category: 'nature', durationMinutes: 30, tags: [] }],
    settings: { themes: ['healing'], season: 'spring', startTime: 9, endTime: 19,
      people: 2, budget: 1, luggage: 'light' },
    accommodationLabel: 'custom', travelMinutes: [[0, 10], [10, 0]],
    baseline: { days: 1, order: ['a'] }, slackFactor: 1,
  });
  assert.deepEqual(validatePlan(request, { days: [{ spots: [1], work: '', note: '' }], daysReason: '' }), []);
  for (const spots of [[], [1, 1], [2]]) {
    assert.ok(validatePlan(request, { days: [{ spots, work: '', note: '' }], daysReason: '' }).length);
  }
  assert.equal(routePlanRequestSchema.safeParse({ ...request, travelMinutes: [[0]] }).success, false);
});
