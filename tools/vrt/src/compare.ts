/**
 * 기준 이미지 ↔ 스크린샷 픽셀 비교 모듈 (pixelmatch + pngjs).
 * 두 라이브러리가 설치되지 않은 환경에서는 null을 반환한다 (graceful skip).
 */
import fs from 'node:fs';

export interface CompareOutcome {
  /** 이미지 크기 불일치 여부 — 불일치 시 diffRatio는 1로 고정 */
  dimensionMismatch: boolean;
  /** 상이 픽셀 수 / 전체 픽셀 수 (0 ~ 1) */
  diffRatio: number;
  /** diff 시각화 PNG 버퍼 (상이 픽셀 0이거나 크기 불일치면 null) */
  diffPngBuffer: Buffer | null;
  width: number;
  height: number;
}

/**
 * 두 PNG를 픽셀 단위로 비교한다.
 * @returns pixelmatch/pngjs 미설치 시 null
 */
export async function compareImages(
  baselinePath: string,
  actualPath: string,
): Promise<CompareOutcome | null> {
  // @types/pixelmatch 는 `export =` 형태다 — `.default` 를 붙이면 타입이 없다.
  let pixelmatch: typeof import('pixelmatch');
  let PNG: typeof import('pngjs').PNG;
  try {
    pixelmatch = (await import('pixelmatch')).default;
    ({ PNG } = await import('pngjs'));
  } catch {
    return null; // 의존성 미설치 — 호출자가 '측정 불가'로 처리한다 (통과가 아니다)
  }

  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const actual = PNG.sync.read(fs.readFileSync(actualPath));

  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    return {
      dimensionMismatch: true,
      diffRatio: 1,
      diffPngBuffer: null,
      width: baseline.width,
      height: baseline.height,
    };
  }

  const { width, height } = baseline;
  const diff = new PNG({ width, height });
  // threshold 0.1: 안티앨리어싱 미세 차이는 허용 (픽셀 색상 민감도 — diff 비율 기준 0.1%와는 다른 값)
  const diffPixels = pixelmatch(baseline.data, actual.data, diff.data, width, height, {
    threshold: 0.1,
  });

  return {
    dimensionMismatch: false,
    diffRatio: diffPixels / (width * height),
    diffPngBuffer: diffPixels > 0 ? PNG.sync.write(diff) : null,
    width,
    height,
  };
}
