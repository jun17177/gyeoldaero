import {
  useFonts,
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
  NotoSansKR_700Bold,
} from '@expo-google-fonts/noto-sans-kr';
import { NotoSerifKR_700Bold } from '@expo-google-fonts/noto-serif-kr';

// 앱에서 쓰는 폰트를 불러온다. 웹에서는 같은 이름의 .web.ts가 대신 쓰여
// 폰트를 내려받지 않는다 (한글 폰트가 커서 웹 번들이 160MB를 넘는다).
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_500Medium,
    NotoSansKR_700Bold,
    NotoSerifKR_700Bold,
  });
  return loaded;
}
