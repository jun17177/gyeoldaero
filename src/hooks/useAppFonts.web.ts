// 웹 전용. 한글 폰트 파일은 굵기당 수 MB라 번들에 담으면 모바일에서 쓸 수 없다.
// 웹에서는 기기의 시스템 한글 폰트를 그대로 쓰고, 내려받지 않는다.
export function useAppFonts(): boolean {
  return true;
}
