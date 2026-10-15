import { ACCOMMODATION_COORDS, ACCOMMODATION_LABEL, ACCOMMODATION_OPTIONS } from '../accommodations';

// 숙소 좌표 표가 화면·알고리즘에 따로 있을 때 키가 빠져 제주시로 조용히 대체되던 버그의 회귀 방지
describe('accommodations', () => {
  const ids = Object.keys(ACCOMMODATION_LABEL);

  it('모든 숙소에 좌표와 라벨이 있다', () => {
    for (const id of ids) {
      expect(ACCOMMODATION_COORDS[id as keyof typeof ACCOMMODATION_COORDS]).toBeDefined();
    }
  });

  it('선택지가 모든 숙소를 한 번씩 포함한다', () => {
    expect(ACCOMMODATION_OPTIONS.map(o => o.id).sort()).toEqual([...ids].sort());
  });

  it('제주시를 제외한 숙소는 서로 다른 좌표를 갖는다 (제주시로 대체되지 않음)', () => {
    const jeju = ACCOMMODATION_COORDS.jejucity;
    for (const id of ['aewol', 'hallim', 'jungmun', 'seogwipo', 'seongsan'] as const) {
      const c = ACCOMMODATION_COORDS[id];
      expect(c.lat !== jeju.lat || c.lon !== jeju.lon).toBe(true);
    }
  });
});
