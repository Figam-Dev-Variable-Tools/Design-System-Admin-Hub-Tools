// 이미지 업로드 상태 관리 (SCR-003 §3.1) — 외부 업로드 라이브러리 없이 직접 구현한다.
//
// - 파일 선택 즉시 파일별 비동기 업로드 시작(개별 진행률 · 개별 취소 · 파일당 60초 타임아웃)
// - 형식/용량/장수는 파일 선택 시점에 즉시 검사 → 위반 파일은 업로드 시작 없이 실패 상태로 표시(§5.2)
// - 미리보기는 URL.createObjectURL로 만들고 제거·언마운트 시 revoke한다(누수 방지)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { uploadImage } from './api';
import type { UploadedImageRef } from './types';
import { IMAGE_MAX_COUNT, MESSAGES, validateImageFile } from './validation';

type ImageStatus = 'uploading' | 'success' | 'error';

export interface ImageItem {
  /** 로컬 고유 키(리스트 key · 맵 키) — 서버 발급 id와 다르다 */
  key: string;
  name: string;
  size: number;
  /** 섬네일 URL — objectURL(신규 선택) 또는 복원된 저장 URL. 없으면 빈 문자열 */
  previewUrl: string;
  status: ImageStatus;
  /** 0-100 */
  progress: number;
  /** 실패 사유(§3.1 실패) — 없으면 null */
  error: string | null;
  /** 업로드 성공 시 서버 발급 이미지 ID — 제출 payload에 담긴다 */
  remoteId: string | null;
  /** 복원본(파일 객체 없음) 여부 — [다시 시도] 불가 */
  restored: boolean;
}

export interface ImageUploads {
  items: ImageItem[];
  /** 업로드 완료 이미지만 — 제출·임시저장 payload */
  uploadedRefs: UploadedImageRef[];
  /** 1건이라도 업로드 중이면 true → [등록] 제출 차단(§3 등록-에러 (d)) */
  isUploading: boolean;
  /** 장수 초과 등 선택 시점 오류(파일 행이 아닌 위젯 단위 오류) */
  selectionError: string | null;
  addFiles: (files: FileList | File[]) => void;
  remove: (key: string) => void;
  cancel: (key: string) => void;
  retry: (key: string) => void;
  restore: (refs: UploadedImageRef[]) => void;
  reset: () => void;
  clearSelectionError: () => void;
}

function nextKey(): string {
  return `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useImageUploads(): ImageUploads {
  const [items, setItems] = useState<ImageItem[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  const filesRef = useRef(new Map<string, File>());
  const controllersRef = useRef(new Map<string, AbortController>());
  const objectUrlsRef = useRef(new Set<string>());

  const revoke = useCallback((url: string) => {
    if (objectUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      objectUrlsRef.current.delete(url);
    }
  }, []);

  // 언마운트 시 남은 objectURL 전부 해제 + 진행 중 업로드 중단
  useEffect(() => {
    const urls = objectUrlsRef.current;
    const controllers = controllersRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
      for (const controller of controllers.values()) controller.abort();
      controllers.clear();
    };
  }, []);

  const patchItem = useCallback((key: string, patch: Partial<ImageItem>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  const startUpload = useCallback(
    (key: string, file: File, previewUrl: string) => {
      const controller = new AbortController();
      controllersRef.current.set(key, controller);

      void uploadImage(file, previewUrl, {
        signal: controller.signal,
        onProgress: (percent) => {
          if (controller.signal.aborted) return;
          patchItem(key, { progress: percent });
        },
      }).then((result) => {
        controllersRef.current.delete(key);
        // 취소(=목록에서 제거)된 항목의 응답은 무시한다.
        if (controller.signal.aborted) return;
        if (result.status === 'success') {
          patchItem(key, {
            status: 'success',
            progress: 100,
            error: null,
            remoteId: result.image.id,
          });
          return;
        }
        patchItem(key, { status: 'error', error: result.message });
      });
    },
    [patchItem],
  );

  const addFiles = useCallback(
    (input: FileList | File[]) => {
      const incoming = Array.from(input);
      if (incoming.length === 0) return;

      setSelectionError(null);
      setItems((current) => {
        const slots = IMAGE_MAX_COUNT - current.length;
        if (slots <= 0) {
          setSelectionError(MESSAGES.imageCount);
          return current;
        }
        const accepted = incoming.slice(0, slots);
        if (incoming.length > slots) setSelectionError(MESSAGES.imageCount);

        const created: ImageItem[] = accepted.map((file) => {
          const key = nextKey();
          const invalid = validateImageFile(file);
          // 이미지가 아닌 파일은 미리보기를 만들지 않는다(objectURL 낭비 방지)
          const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';
          if (previewUrl.length > 0) objectUrlsRef.current.add(previewUrl);
          filesRef.current.set(key, file);

          if (invalid !== undefined) {
            return {
              key,
              name: file.name,
              size: file.size,
              previewUrl,
              status: 'error',
              progress: 0,
              error: invalid,
              remoteId: null,
              restored: false,
            };
          }
          // 검증 통과 파일만 업로드 시작(§3.1 — 선택 즉시 개별 비동기 업로드)
          startUpload(key, file, previewUrl);
          return {
            key,
            name: file.name,
            size: file.size,
            previewUrl,
            status: 'uploading',
            progress: 0,
            error: null,
            remoteId: null,
            restored: false,
          };
        });

        return [...current, ...created];
      });
    },
    [startUpload],
  );

  const dropItem = useCallback(
    (key: string) => {
      const controller = controllersRef.current.get(key);
      if (controller) {
        controller.abort();
        controllersRef.current.delete(key);
      }
      filesRef.current.delete(key);
      setItems((current) => {
        const target = current.find((item) => item.key === key);
        if (target && target.previewUrl.length > 0) revoke(target.previewUrl);
        return current.filter((item) => item.key !== key);
      });
      setSelectionError(null);
    },
    [revoke],
  );

  /** [삭제] — 확인 절차 없이 즉시 제거(§3.1 제거) */
  const remove = dropItem;
  /** [취소] — 업로드 중단 후 목록에서 제거(§3.1 업로드 중) */
  const cancel = dropItem;

  /** [다시 시도] — 실패 행 재업로드(§3.1 실패). 형식·용량 위반 파일은 재검사에서 다시 실패한다. */
  const retry = useCallback(
    (key: string) => {
      const file = filesRef.current.get(key);
      if (!file) return;
      const invalid = validateImageFile(file);
      if (invalid !== undefined) {
        patchItem(key, { status: 'error', error: invalid, progress: 0 });
        return;
      }
      setItems((current) => {
        const target = current.find((item) => item.key === key);
        if (target) startUpload(key, file, target.previewUrl);
        return current.map((item) =>
          item.key === key
            ? { ...item, status: 'uploading', progress: 0, error: null, remoteId: null }
            : item,
        );
      });
    },
    [patchItem, startUpload],
  );

  const clearAll = useCallback(() => {
    for (const controller of controllersRef.current.values()) controller.abort();
    controllersRef.current.clear();
    filesRef.current.clear();
    setItems((current) => {
      for (const item of current) {
        if (item.previewUrl.length > 0) revoke(item.previewUrl);
      }
      return [];
    });
    setSelectionError(null);
  }, [revoke]);

  /** 임시저장본 복원(§3.2 복원 실행) — 저장 시점의 업로드 완료 이미지 목록으로 대체한다 */
  const restore = useCallback(
    (refs: UploadedImageRef[]) => {
      clearAll();
      setItems(
        refs.slice(0, IMAGE_MAX_COUNT).map((ref) => ({
          key: nextKey(),
          name: ref.name,
          size: 0,
          previewUrl: ref.url,
          status: 'success' as const,
          progress: 100,
          error: null,
          remoteId: ref.id,
          restored: true,
        })),
      );
    },
    [clearAll],
  );

  const uploadedRefs = useMemo<UploadedImageRef[]>(
    () =>
      items
        .filter(
          (item): item is ImageItem & { remoteId: string } =>
            item.status === 'success' && item.remoteId !== null,
        )
        .map((item) => ({ id: item.remoteId, name: item.name, url: item.previewUrl })),
    [items],
  );

  const isUploading = useMemo(() => items.some((item) => item.status === 'uploading'), [items]);

  const clearSelectionError = useCallback(() => {
    setSelectionError(null);
  }, []);

  return {
    items,
    uploadedRefs,
    isUploading,
    selectionError,
    addFiles,
    remove,
    cancel,
    retry,
    restore,
    reset: clearAll,
    clearSelectionError,
  };
}
