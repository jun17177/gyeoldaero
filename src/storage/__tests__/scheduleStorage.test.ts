// AsyncStorage를 인메모리로 모킹 (jest node 환경에서 네이티브 모듈 대체)
jest.mock('@react-native-async-storage/async-storage', () => {
  let store: Record<string, string> = {};
  return {
    setItem: jest.fn((k: string, v: string) => { store[k] = v; return Promise.resolve(); }),
    getItem: jest.fn((k: string) => Promise.resolve(k in store ? store[k] : null)),
    removeItem: jest.fn((k: string) => { delete store[k]; return Promise.resolve(); }),
    clear: jest.fn(() => { store = {}; return Promise.resolve(); }),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveSchedule,
  loadAllSchedules,
  deleteSchedule,
  loadScheduleById,
} from '../scheduleStorage';
import { TripSchedule } from '../../types';

const KEY = 'gyeoldaero_schedules';

function make(id: string, name: string): TripSchedule {
  return {
    id, name, createdAt: '2026-01-01T00:00:00.000Z',
    days: 2, spots: [], accommodation: 'jejucity', tags: [],
    settings: {
      themes: ['healing'], weather: 'sunny', season: 'spring',
      startTime: 9, endTime: 19, people: 2, budget: 5, luggage: 'light',
    },
  };
}

beforeEach(async () => {
  await (AsyncStorage as unknown as { clear: () => Promise<void> }).clear();
});

describe('scheduleStorage', () => {
  it('저장 안 했으면 빈 배열', async () => {
    expect(await loadAllSchedules()).toEqual([]);
  });

  it('신규 저장은 맨 앞에 쌓인다(unshift)', async () => {
    await saveSchedule(make('a', 'A'));
    await saveSchedule(make('b', 'B'));
    const all = await loadAllSchedules();
    expect(all.map(s => s.id)).toEqual(['b', 'a']);
  });

  it('같은 id 재저장은 제자리 업데이트(중복 생성 안 함)', async () => {
    await saveSchedule(make('a', 'A'));
    await saveSchedule(make('b', 'B'));
    await saveSchedule(make('a', 'A수정'));
    const all = await loadAllSchedules();
    expect(all.map(s => s.id)).toEqual(['b', 'a']); // 순서 유지
    expect(all.find(s => s.id === 'a')?.name).toBe('A수정');
  });

  it('loadScheduleById로 단건 조회, 없으면 null', async () => {
    await saveSchedule(make('a', 'A'));
    expect((await loadScheduleById('a'))?.name).toBe('A');
    expect(await loadScheduleById('nope')).toBeNull();
  });

  it('deleteSchedule는 해당 id만 제거', async () => {
    await saveSchedule(make('a', 'A'));
    await saveSchedule(make('b', 'B'));
    await deleteSchedule('a');
    const all = await loadAllSchedules();
    expect(all.map(s => s.id)).toEqual(['b']);
  });

  it('저장 데이터가 손상돼도 빈 배열로 안전 폴백', async () => {
    await AsyncStorage.setItem(KEY, '{망가진 JSON');
    expect(await loadAllSchedules()).toEqual([]);
  });
});
