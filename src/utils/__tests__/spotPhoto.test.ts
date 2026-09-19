import { canonicalName, photoKeys, findPhotoMatch } from '../spotPhoto';
import { Spot } from '../../types';

const at = (name: string, lat = 33.4, lon = 126.5, imageUrl = 'https://img/x.jpg'): Spot => ({
  id: name, name, category: 'nature', lat, lon,
  durationMinutes: 90, emoji: '', tags: [], imageUrl,
});

describe('canonicalName', () => {
  it('가운뎃점과 마침표를 같게 본다 (제주4·3평화공원 = 제주4.3평화공원)', () => {
    expect(canonicalName('제주4·3평화공원')).toBe(canonicalName('제주4.3평화공원'));
  });

  it('해수욕장과 해변을 같게 본다', () => {
    expect(canonicalName('월정리해수욕장')).toBe(canonicalName('월정리해변'));
  });

  it('짚라인과 집라인을 같게 본다', () => {
    expect(canonicalName('제주라프 짚라인')).toBe(canonicalName('제주라프집라인'));
  });
});

describe('photoKeys', () => {
  it('괄호 안쪽도 키로 쓴다 (제주 야경 (사라봉) → 사라봉)', () => {
    expect(photoKeys({ name: '제주 야경 (사라봉)' })).toContain('사라봉');
  });

  it('별칭을 키에 포함한다', () => {
    expect(photoKeys({ name: '넥슨컴퓨터박물관', photoAliases: ['넥슨뮤지엄'] })).toContain('넥슨뮤지엄');
  });
});

describe('findPhotoMatch', () => {
  it('이름이 같으면 좌표가 멀어도 잇는다 (시드 좌표 오차 허용)', () => {
    const far = at('제주 씨월드', 33.9, 126.9);
    expect(findPhotoMatch({ name: '제주 씨월드', lat: 33.2, lon: 126.4 }, [far])).toBe(far);
  });

  it('접두·접미사가 붙어도 가까우면 잇는다', () => {
    const cases: [string, string][] = [
      ['한라산', '한라산국립공원'],
      ['김녕미로공원', '제주김녕미로공원'],
      ['돈사돈', '돈사돈 본점'],
      ['쇠소깍 카약', '쇠소깍'],
    ];
    for (const [seed, api] of cases) {
      expect(findPhotoMatch({ name: seed, lat: 33.4, lon: 126.5 }, [at(api)])?.name).toBe(api);
    }
  });

  it('군더더기가 적은 후보를 고른다', () => {
    const best = at('한라산국립공원');
    const noisy = at('한라산국립공원어리목탐방로');
    expect(findPhotoMatch({ name: '한라산', lat: 33.4, lon: 126.5 }, [noisy, best])).toBe(best);
  });

  it('이름이 비슷해도 멀면 잇지 않는다 (한라산 vs 한라산소주)', () => {
    const soju = at('한라산소주', 33.48, 126.48); // 시드 한라산에서 약 14km
    expect(findPhotoMatch({ name: '한라산', lat: 33.3617, lon: 126.5292 }, [soju])).toBeUndefined();
  });

  it('2자 이름은 부분 일치로 잇지 않는다 (우도 vs 우도해녀의집)', () => {
    expect(findPhotoMatch({ name: '우도', lat: 33.4, lon: 126.5 }, [at('우도해녀의집')])).toBeUndefined();
  });

  it('사진 없는 후보는 건너뛴다', () => {
    const noPhoto = { ...at('한라산국립공원'), imageUrl: undefined };
    expect(findPhotoMatch({ name: '한라산', lat: 33.4, lon: 126.5 }, [noPhoto])).toBeUndefined();
  });

  it('후보 이름의 괄호 수식어를 떼고 잇는다 (우도 → 우도(해양도립공원))', () => {
    const api = at('우도(해양도립공원)');
    expect(findPhotoMatch({ name: '우도', lat: 33.5015, lon: 126.9516 }, [api])).toBe(api);
  });

  it('별칭으로 잇는다 (넥슨컴퓨터박물관 → 넥슨뮤지엄)', () => {
    const api = at('넥슨뮤지엄');
    const seed = { name: '넥슨컴퓨터박물관', lat: 33.4, lon: 126.5, photoAliases: ['넥슨뮤지엄'] };
    expect(findPhotoMatch(seed, [api])).toBe(api);
  });
});
