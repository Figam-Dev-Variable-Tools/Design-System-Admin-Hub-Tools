// 자산 업로드 흐름 (사이트 설정 전용) — 고르기 → 검증 → 해상도 확인 → 업로드
//
// [왜 훅인가] 파비콘·대표 이미지·비공개용 이미지 세 자리가 **같은 순서**를 밟는다. 다른 것은 규칙
// (확장자·용량·해상도)뿐이라, 순서는 한 벌만 두고 규칙은 인자로 받는다.
//
// [실패는 전부 말이 되어 나온다 — 침묵 0]
//   ① 확장자가 다르다      → '파비콘은 ICO 파일만 …'
//   ② 용량이 넘는다        → '… 용량은 100KB 를 넘을 수 없습니다.'
//   ③ 파일을 읽지 못한다    → '이미지를 읽지 못했습니다 …'   (깨진 파일·지원하지 않는 인코딩)
//   ④ 해상도가 모자란다     → '파비콘은 가로·세로 16 이상이어야 합니다.'
//   ⑤ 업로드가 실패한다     → '… 업로드하지 못했습니다 …'   (`?fail=upload` 로 재현)
// 다섯 경로 모두 **그 항목 옆 인라인 오류**로 뜬다(토스트로 흘려보내지 않는다 — STATE-02).
import { useCallback, useEffect, useRef, useState } from 'react';

import { isAbort } from '../../../shared/async';
import { uploadSiteAsset } from './data-source';
import { faviconDimensionError, faviconFileError, imageFileError } from './validation';
import type { SiteAsset } from './validation';

/** 자산 자리 — 오류·진행 상태를 자리별로 따로 들고 있어야 서로를 지우지 않는다 */
export type AssetSlot = 'favicon' | 'ogImage' | 'privateImage';

const UPLOAD_FAILED = '파일을 업로드하지 못했어요. 잠시 후 다시 시도해 주세요.';
const UNREADABLE = '이미지를 읽지 못했어요. 파일이 손상되었는지 확인해 주세요.';

/** 이미지의 실제 픽셀 크기 — 파일을 디코드해야 알 수 있어 비동기다 */
function probeImageSize(file: File): Promise<{ readonly width: number; readonly height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      // 우리가 만든 핸들이므로 성공·실패 어느 쪽이든 반드시 회수한다(누수 0)
      URL.revokeObjectURL(url);
      reject(new Error(UNREADABLE));
    };

    image.src = url;
  });
}

type SlotState = Readonly<Record<AssetSlot, string | null>>;

const EMPTY_ERRORS: SlotState = { favicon: null, ogImage: null, privateImage: null };

interface UseAssetUpload {
  /** 파일을 골랐다 — 검증·업로드까지 끝나면 onUploaded 가 불린다 */
  readonly pick: (slot: AssetSlot, file: File) => void;
  readonly errorOf: (slot: AssetSlot) => string | null;
  readonly busyOf: (slot: AssetSlot) => boolean;
  /** 자산을 비운다 — 그 자리의 오류도 함께 지운다 */
  readonly clearError: (slot: AssetSlot) => void;
}

export function useAssetUpload(
  onUploaded: (slot: AssetSlot, asset: SiteAsset) => void,
): UseAssetUpload {
  const [errors, setErrors] = useState<SlotState>(EMPTY_ERRORS);
  const [busy, setBusy] = useState<Readonly<Record<AssetSlot, boolean>>>({
    favicon: false,
    ogImage: false,
    privateImage: false,
  });

  // 화면을 떠나면 진행 중이던 업로드를 끊는다 — 언마운트된 폼에 setState 하지 않는다
  const controllersRef = useRef<AbortController[]>([]);
  useEffect(
    () => () => {
      for (const controller of controllersRef.current) controller.abort();
      controllersRef.current = [];
    },
    [],
  );

  const setError = useCallback((slot: AssetSlot, message: string | null) => {
    setErrors((prev) => ({ ...prev, [slot]: message }));
  }, []);

  const pick = useCallback(
    (slot: AssetSlot, file: File) => {
      // ①② 파일 자체의 규칙 — 네트워크를 태우기 전에 끝낸다
      const ruleError = slot === 'favicon' ? faviconFileError(file) : imageFileError(file);
      if (ruleError !== null) {
        setError(slot, ruleError);
        return;
      }

      setError(slot, null);
      setBusy((prev) => ({ ...prev, [slot]: true }));

      const controller = new AbortController();
      controllersRef.current = [...controllersRef.current, controller];

      const finish = () => {
        controllersRef.current = controllersRef.current.filter((item) => item !== controller);
        if (!controller.signal.aborted) setBusy((prev) => ({ ...prev, [slot]: false }));
      };

      const run = async (): Promise<void> => {
        // ③④ 해상도 — 파비콘만 본다. 대표/비공개 이미지는 어떤 크기든 잘라서 쓴다
        if (slot === 'favicon') {
          const { width, height } = await probeImageSize(file);
          if (controller.signal.aborted) return;

          const sizeError = faviconDimensionError(width, height);
          if (sizeError !== null) {
            setError(slot, sizeError);
            return;
          }
        }

        // ⑤ 업로드
        const asset = await uploadSiteAsset(file, controller.signal);
        if (controller.signal.aborted) return;
        onUploaded(slot, asset);
      };

      void run()
        .catch((cause: unknown) => {
          // 언마운트로 끊긴 것은 실패가 아니다
          if (isAbort(cause) || controller.signal.aborted) return;
          setError(
            slot,
            cause instanceof Error && cause.message === UNREADABLE ? UNREADABLE : UPLOAD_FAILED,
          );
        })
        .finally(finish);
    },
    [onUploaded, setError],
  );

  const errorOf = useCallback((slot: AssetSlot) => errors[slot], [errors]);
  const busyOf = useCallback((slot: AssetSlot) => busy[slot], [busy]);
  const clearError = useCallback((slot: AssetSlot) => setError(slot, null), [setError]);

  return { pick, errorOf, busyOf, clearError };
}
