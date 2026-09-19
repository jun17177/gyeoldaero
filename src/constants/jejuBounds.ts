// 제주 본섬과 우도·마라도·추자도를 포함하는 범위. API가 좌표를 비워 보내면(빈 문자열 → NaN, 또는 0)
// 이동시간이 수만 분으로 계산돼 일정 전체가 망가지므로, 이 범위를 벗어난 좌표는 없는 것으로 본다
const LAT_MIN = 33.0;
const LAT_MAX = 34.1;
const LON_MIN = 126.0;
const LON_MAX = 127.1;

export function isJejuCoord(lat: number, lon: number): boolean {
  return lat >= LAT_MIN && lat <= LAT_MAX && lon >= LON_MIN && lon <= LON_MAX;
}
