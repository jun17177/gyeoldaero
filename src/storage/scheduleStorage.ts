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

export async function loadScheduleById(id: string): Promise<TripSchedule | null> {
  const all = await loadAllSchedules();
  return all.find(s => s.id === id) ?? null;
}
