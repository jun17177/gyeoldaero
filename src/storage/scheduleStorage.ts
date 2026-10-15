import AsyncStorage from '@react-native-async-storage/async-storage';
import { TripSchedule } from '../types';

const KEY = 'gyeoldaero_schedules';

export async function saveSchedule(schedule: TripSchedule): Promise<void> {
  const all = await loadAllSchedules();
  const idx = all.findIndex(s => s.id === schedule.id);
  if (idx >= 0) {
    all[idx] = schedule;
  } else {
    all.unshift(schedule);
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export async function loadAllSchedules(): Promise<TripSchedule[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as TripSchedule[];
  } catch {
    return [];
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  const all = await loadAllSchedules();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(s => s.id !== id)));
}

// 이름만 제자리에서 바꾼다 (새 복제본을 만들지 않음). 빈 이름이거나 대상이 없으면 false.
export async function renameSchedule(id: string, name: string): Promise<boolean> {
  const trimmed = name.trim();
  if (!trimmed) return false;
  const all = await loadAllSchedules();
  const idx = all.findIndex(s => s.id === id);
  if (idx < 0) return false;
  all[idx] = { ...all[idx], name: trimmed };
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
  return true;
}

export async function loadScheduleById(id: string): Promise<TripSchedule | null> {
  const all = await loadAllSchedules();
  return all.find(s => s.id === id) ?? null;
}
