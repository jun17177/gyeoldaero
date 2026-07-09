import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../constants/theme';
import { NAVER_MAP_API_KEY_ID } from '../constants/naverApiKeys';

export interface RoutePoint {
  label: string;   // 핀에 표시할 값 (예: '1', '숙소')
  name: string;    // 장소명
  lat: number;
  lon: number;
  kind: 'spot' | 'accommodation';
}

interface Props {
  points: RoutePoint[];
  routePath?: { lat: number; lon: number }[]; // 실제 도로 경로 좌표 (없으면 마커 직선 연결)
}

// 네이버 동적지도(JS) HTML 생성 — 번호 마커 + 동선 폴리라인 + 전체가 보이도록 fitBounds
function buildHtml(
  points: RoutePoint[],
  keyId: string,
  routePath: { lat: number; lon: number }[]
): string {
  // 외부 데이터(명소명 등)에 '</script>' 등이 섞여도 스크립트 블록이 깨지지 않도록 '<' 이스케이프
  const data = JSON.stringify(points).replace(/</g, '\\u003c');
  const roadData = JSON.stringify(routePath).replace(/</g, '\\u003c');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
    .pin {
      display: flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 14px;
      color: #fff; font-size: 13px; font-weight: 700;
      border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      font-family: -apple-system, Roboto, sans-serif;
    }
    .pin-spot { background: ${colors.primary}; }
    /* 숙소는 흰 바탕 + teal 테두리 + 집 아이콘 — 명소 핀과 형태·색 모두 구분 */
    .pin-accom { background: #fff; color: ${colors.teal}; border-color: ${colors.teal}; font-size: 14px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var RN = window.ReactNativeWebView;
    function notify(t) { if (RN) RN.postMessage(t); }
    function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
    // 네이버 인증 실패 시 호출되는 전역 콜백 → 폴백 표시용
    window.navermap_authFailure = function () { notify('error'); };
  </script>
  <script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${keyId}"
          onerror="notify('error')"></script>
  <script>
    (function () {
      try {
        if (!window.naver || !window.naver.maps) { notify('error'); return; }
        var pts = ${data};
        var road = ${roadData};
        var map = new naver.maps.Map('map', {
          zoom: 11,
          center: new naver.maps.LatLng(pts[0].lat, pts[0].lon),
        });
        var bounds = new naver.maps.LatLngBounds();
        var markerPath = [];
        var markers = [];
        var infowindow = new naver.maps.InfoWindow({ backgroundColor: '#fff', borderColor: '${colors.border}', borderWidth: 1, anchorSize: new naver.maps.Size(10, 10) });
        function iconFor(p, dx) {
          return {
            content: '<div class="pin ' + (p.kind === 'accommodation' ? 'pin-accom' : 'pin-spot') + '">' + (p.kind === 'accommodation' ? '🏠' : esc(p.label)) + '</div>',
            anchor: new naver.maps.Point(14 - dx, 14),
          };
        }
        pts.forEach(function (p) {
          var pos = new naver.maps.LatLng(p.lat, p.lon);
          markerPath.push(pos);
          bounds.extend(pos);
          var marker = new naver.maps.Marker({
            position: pos,
            map: map,
            title: p.name,
            icon: iconFor(p, 0),
          });
          markers.push({ m: marker, pos: pos, p: p });
          // 핀 탭 → 명소명 InfoWindow
          naver.maps.Event.addListener(marker, 'click', function () {
            infowindow.setContent('<div style="padding:6px 10px;font-size:13px;font-weight:600;color:#1C2B38;font-family:-apple-system,Roboto,sans-serif;white-space:nowrap;">' + (p.kind === 'accommodation' ? '🏠 ' : (esc(p.label) + '. ')) + esc(p.name) + '</div>');
            infowindow.open(map, marker);
          });
        });
        // 화면 픽셀 기준으로 겹치는 핀을 감지해 좌우로 비켜 배치 — 줌 바뀔 때마다 재계산
        function relayout() {
          try {
            var proj = map.getProjection();
            if (!proj) return;
            var groups = [];
            markers.forEach(function (e) {
              var pt = proj.fromCoordToOffset(e.pos);
              var g = null;
              for (var i = 0; i < groups.length; i++) {
                if (Math.abs(groups[i].x - pt.x) < 34 && Math.abs(groups[i].y - pt.y) < 34) { g = groups[i]; break; }
              }
              if (g) g.items.push(e);
              else groups.push({ x: pt.x, y: pt.y, items: [e] });
            });
            groups.forEach(function (g) {
              var n = g.items.length;
              g.items.forEach(function (e, i) {
                var dx = n > 1 ? Math.round((i - (n - 1) / 2) * 30) : 0;
                e.m.setIcon(iconFor(e.p, dx));
              });
            });
          } catch (err) { /* projection 미준비 등 — 다음 이벤트에서 재시도 */ }
        }
        naver.maps.Event.addListener(map, 'zoom_changed', function () { setTimeout(relayout, 120); });
        naver.maps.Event.addListener(map, 'idle', relayout);
        // 폴리라인: 실제 도로 경로(road)가 있으면 도로를 따라, 없으면 마커 직선 연결
        var linePath = road.length > 1
          ? road.map(function (c) { var ll = new naver.maps.LatLng(c.lat, c.lon); bounds.extend(ll); return ll; })
          : markerPath;
        if (linePath.length > 1) {
          // 흰 외곽선(casing) 위에 오렌지 본선 — 핀(남색·teal)과 색이 겹치지 않아 구분이 명확
          new naver.maps.Polyline({
            map: map, path: linePath,
            strokeColor: '#FFFFFF', strokeWeight: 7, strokeOpacity: 0.9,
          });
          new naver.maps.Polyline({
            map: map, path: linePath,
            strokeColor: '${colors.warning}', strokeWeight: 4, strokeOpacity: 0.95,
          });
          map.fitBounds(bounds);
        } else {
          map.setCenter(markerPath[0]);
          map.setZoom(13);
        }
        setTimeout(relayout, 300); // 초기 배치 후 1회 겹침 정리
        notify('ready');
      } catch (e) {
        notify('error');
      }
    })();
  </script>
</body>
</html>`;
}

export default function RouteMapWebView({ points, routePath }: Props) {
  const webRef = useRef<WebView>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const html = useMemo(
    () => buildHtml(points, NAVER_MAP_API_KEY_ID, routePath ?? []),
    [points, routePath]
  );

  const handleMessage = (e: WebViewMessageEvent) => {
    const msg = e.nativeEvent.data;
    if (msg === 'ready') setStatus('ready');
    else if (msg === 'error') setStatus('error');
  };

  // 키가 없거나 좌표가 없으면 WebView를 띄우지 않고 바로 폴백
  const noKey = !NAVER_MAP_API_KEY_ID;
  const noPoints = points.length === 0;

  if (noKey || noPoints || status === 'error') {
    return (
      <View style={styles.fallback}>
        <Ionicons name="map-outline" size={32} color={colors.textMuted} />
        <Text style={styles.fallbackTitle}>
          {noPoints ? '표시할 동선이 없어요' : '지도를 불러올 수 없어요'}
        </Text>
        {!noPoints && (
          <Text style={styles.fallbackSub}>
            {noKey
              ? '네이버 지도 키가 설정되지 않았어요'
              : '네트워크 또는 지도 설정을 확인해주세요'}
          </Text>
        )}
        {/* 폴백: 방문 순서 텍스트로라도 동선 안내 */}
        <View style={styles.fallbackList}>
          {points.map((p, i) => (
            <Text key={`${p.name}-${i}`} style={styles.fallbackItem}>
              {p.kind === 'accommodation' ? `🏠 ${p.name}` : `${p.label}. ${p.name}`}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://localhost' }}
        onMessage={handleMessage}
        onError={() => setStatus('error')}
        onHttpError={() => setStatus('error')}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webview}
      />
      {status === 'loading' && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>지도를 불러오는 중...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.primaryLight },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  loadingText: { fontSize: 13, color: colors.textMuted },

  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  fallbackTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  fallbackSub: { fontSize: 12, color: colors.textMuted },
  fallbackList: {
    marginTop: spacing.lg,
    alignSelf: 'stretch',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  fallbackItem: { fontSize: 13, color: colors.text },
});
