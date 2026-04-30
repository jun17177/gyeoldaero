import { Spot } from '../types';
import { haversineDistance } from './haversine';

export function nearestNeighbor(
  spots: Spot[],
  startLat: number,
  startLon: number
): Spot[] {
  const unvisited = [...spots];
  const route: Spot[] = [];
  let curLat = startLat, curLon = startLon;
  while (unvisited.length > 0) {
    let minDist = Infinity, minIdx = 0;
    unvisited.forEach((s, i) => {
      const d = haversineDistance(curLat, curLon, s.lat, s.lon);
      if (d < minDist) { minDist = d; minIdx = i; }
    });
    const next = unvisited.splice(minIdx, 1)[0];
    route.push(next);
    curLat = next.lat;
    curLon = next.lon;
  }
  return route;
}
