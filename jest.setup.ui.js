// RN 0.88의 `import { AssetRegistry } from 'react-native'`는 내부 경로를 쓰는데,
// jest-expo 58.0.12는 `react-native/asset-registry`만 목킹해 폰트(아이콘) 로딩이
// "missing from the asset registry"로 실패한다. 같은 목을 내부 경로에도 적용한다.
jest.mock('react-native/src/private/assets/AssetRegistry', () => ({
  AssetRegistry: {
    registerAsset: jest.fn(() => 1),
    getAssetByID: jest.fn(() => ({
      fileSystemLocation: '/full/path/to/directory',
      httpServerLocation: '/assets/full/path/to/directory',
      scales: [1],
      fileHashes: ['md5'],
      name: 'name',
      exists: true,
      type: 'type',
      hash: 'md5',
      uri: 'uri',
      width: 1,
      height: 1,
    })),
  },
}));
