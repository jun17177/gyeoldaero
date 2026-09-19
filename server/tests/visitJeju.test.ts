import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapVisitJejuItem } from '../src/visitJeju';

const item = { contentsid: 'id', title: 'Place', contentscd: { value: 'c1', label: '관광지' }, latitude: 33.4, longitude: 126.5,
  tag: '바다,산책', repPhoto: { photoid: { thumbnailpath: 'https://example.com/image.jpg' } } };

test('maps coordinates and representative image without exposing credentials', () => {
  const spot = mapVisitJejuItem(item);
  assert.equal(spot?.imageUrl, 'https://example.com/image.jpg');
  assert.equal(spot?.lat, 33.4);
  assert.equal(spot?.id, 'visitjeju:id');
  assert.deepEqual(spot?.tags, ['바다', '산책']);
});

test('excludes events and invalid coordinates', () => {
  assert.equal(mapVisitJejuItem({ ...item, contentscd: { value: 'c5', label: '축제/행사' } }), null);
  assert.equal(mapVisitJejuItem({ ...item, latitude: null }), null);
  assert.equal(mapVisitJejuItem({ ...item, longitude: 'invalid' }), null);
});

test('places without photos are excluded and restaurants are categorized', () => {
  // 사진 없는 명소는 카드가 비어 보여 목록에서 뺀다
  assert.equal(mapVisitJejuItem({ ...item, repPhoto: null }), null);
  assert.equal(mapVisitJejuItem({ ...item, repPhoto: { photoid: { imgpath: 'http://insecure.example/x.jpg' } } }), null);

  const spot = mapVisitJejuItem({ ...item, contentscd: { value: 'c4', label: '음식점' } });
  assert.equal(spot?.category, 'food');
});
