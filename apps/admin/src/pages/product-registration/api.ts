// 상품 등록 화면 로컬 mock API (SCR-003) — 백엔드 미구현 구간의 대역(代役)이다.
//
// 실제 HTTP 클라이언트로 교체할 때 이 모듈의 함수 시그니처만 유지하면 화면 코드는 변경되지 않는다.
// - 카테고리 조회(§3.3): 로딩/정상/에러/빈
// - 등록 제출(§3 등록): 성공 / 서버 필드 검증 실패 / 네트워크·서버 오류 / 타임아웃 30초
// - 임시저장(§3.2): 저장·조회·삭제. 서버 저장 규격이지만 백엔드가 없어 localStorage로 대체(계정당 1건).
// - 이미지 업로드(§3.1): 파일별 비동기 업로드 + 진행률 + 취소 + 파일당 60초 타임아웃
//
// [mock 시나리오 전환] URL 쿼리로 상태를 결정론적으로 재현한다(데모·수동 QA용).
//   /products/new?mockCategories=error|empty|slow
//   /products/new?mockSubmit=field-error|server-error|timeout
//   /products/new?mockUpload=error
//   /products/new?mockDraft=save-error|delete-error
//   /products/new?role=viewer|guest        ← §5.1 권한 매트릭스 재현
import type { Category, DraftSnapshot, ProductFormValues, UploadedImageRef } from './types';

/** §5.3 규칙 5 타임아웃 */
const SUBMIT_TIMEOUT_MS = 30_000;
const DRAFT_TIMEOUT_MS = 10_000;
const UPLOAD_TIMEOUT_MS = 60_000;

const DRAFT_STORAGE_KEY = 'tds.admin.product-registration.draft';

/** §5.1 권한 매트릭스의 역할 */
type UserRole = 'admin' | 'operator' | 'viewer' | 'guest';

function queryParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

/**
 * 현재 사용자 역할 — 인증 컨텍스트(shared/auth)가 아직 없으므로 mock이다.
 * 실제 구현에서는 세션/토큰 기반 컨텍스트로 교체한다.
 */
export function getCurrentRole(): UserRole {
  const param = queryParam('role');
  if (param === 'viewer' || param === 'guest' || param === 'operator' || param === 'admin') {
    return param;
  }
  return 'admin';
}

/** signal을 존중하는 지연 — abort 시 즉시 reject */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      window.clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/** 요청 타임아웃 래퍼 — 초과 시 요청을 중단(abort)하고 'timeout'을 돌려준다 (§5.3 규칙 5) */
async function withTimeout<T>(
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>,
  external?: AbortSignal,
): Promise<T | 'timeout'> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const forwardAbort = () => controller.abort();
  external?.addEventListener('abort', forwardAbort, { once: true });
  try {
    return await run(controller.signal);
  } catch {
    // mock에서 발생하는 예외는 abort(취소·타임아웃)뿐이다.
    return 'timeout';
  } finally {
    window.clearTimeout(timer);
    external?.removeEventListener('abort', forwardAbort);
  }
}

// ── 카테고리 (§3.3) ────────────────────────────────────────────────────────

type CategoriesResult = { status: 'success'; categories: Category[] } | { status: 'error' };

const MOCK_CATEGORIES: readonly Category[] = [
  { id: 'cat-outer', name: '아우터' },
  { id: 'cat-shoes', name: '신발' },
  { id: 'cat-bag', name: '가방' },
  { id: 'cat-top', name: '상의' },
  { id: 'cat-acc', name: '액세서리' },
  { id: 'cat-bottom', name: '하의' },
] as const;

/** 화면 진입 시 1회 호출(§5.3 규칙 8). 활성 카테고리를 이름 가나다순 정렬해 반환한다. */
export async function fetchCategories(signal?: AbortSignal): Promise<CategoriesResult> {
  const scenario = queryParam('mockCategories');
  const latency = scenario === 'slow' ? 3000 : 600;
  try {
    await delay(latency, signal);
  } catch {
    return { status: 'error' };
  }
  if (scenario === 'error') return { status: 'error' };
  if (scenario === 'empty') return { status: 'success', categories: [] };

  const sorted = [...MOCK_CATEGORIES].sort((a, b) => a.name.localeCompare(b.name, 'ko-KR'));
  return { status: 'success', categories: sorted };
}

// ── 이미지 업로드 (§3.1) ───────────────────────────────────────────────────

type UploadResult =
  { status: 'success'; image: UploadedImageRef } | { status: 'error'; message: string };

interface UploadOptions {
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}

const UPLOAD_FAILED_MESSAGE = '이미지를 업로드하지 못했습니다. 다시 시도해 주세요.';
const UPLOAD_TIMEOUT_MESSAGE = '이미지 업로드 시간이 초과되었습니다. 다시 시도해 주세요.';

/**
 * 파일 1건 업로드 — 진행률 콜백 + 취소(signal) + 파일당 60초 타임아웃.
 * 성공 시 서버가 발급한 이미지 ID를 돌려준다(제출 시 이 ID만 전송 — §3.1).
 * mock이므로 미리보기 URL은 호출자가 만든 objectURL을 그대로 사용한다(previewUrl 인자).
 */
export async function uploadImage(
  file: File,
  previewUrl: string,
  options: UploadOptions,
): Promise<UploadResult> {
  const shouldFail = queryParam('mockUpload') === 'error';

  const result = await withTimeout(
    UPLOAD_TIMEOUT_MS,
    async (signal): Promise<UploadResult> => {
      const steps = [10, 30, 55, 80, 100];
      for (const step of steps) {
        await delay(180, signal);
        options.onProgress(step);
      }
      if (shouldFail) {
        return { status: 'error', message: UPLOAD_FAILED_MESSAGE };
      }
      return {
        status: 'success',
        image: {
          id: `img_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          url: previewUrl,
        },
      };
    },
    options.signal,
  );

  if (result === 'timeout') {
    // 사용자 취소(abort)와 타임아웃을 구분한다 — 취소는 호출자가 항목을 제거하므로 메시지는 무시된다.
    return { status: 'error', message: UPLOAD_TIMEOUT_MESSAGE };
  }
  return result;
}

// ── 등록 제출 (§3 등록) ────────────────────────────────────────────────────

interface SubmitPayload {
  values: ProductFormValues;
  /** 업로드 완료된 이미지 ID만 전송한다 (§3.1) */
  imageIds: string[];
}

type SubmitResult =
  | { status: 'success'; productId: string }
  /** (b) 서버 필드 검증 실패 — 필드 코드를 인라인 에러로 매핑 */
  | { status: 'field-error'; fieldErrors: Partial<Record<'name' | 'price' | 'stock', string>> }
  /** (c) 네트워크/서버 오류 · 타임아웃 */
  | { status: 'error' };

export const SUBMIT_ERROR_MESSAGE =
  '일시적인 오류로 상품을 등록하지 못했습니다. 다시 시도해 주세요.';
export const SUBMIT_SUCCESS_MESSAGE = '상품이 등록되었습니다.';
export const UPLOAD_IN_PROGRESS_MESSAGE = '이미지 업로드가 완료된 뒤 등록할 수 있습니다.';
/** 서버 필드 검증 실패 예시 — 상품명 중복 (§3 등록-에러 (b)) */
const DUPLICATE_NAME_MESSAGE = '이미 등록된 상품명입니다. 다른 이름을 입력해 주세요.';

export async function submitProduct(
  payload: SubmitPayload,
  signal?: AbortSignal,
): Promise<SubmitResult> {
  const scenario = queryParam('mockSubmit');

  const result = await withTimeout(
    SUBMIT_TIMEOUT_MS,
    async (inner): Promise<SubmitResult> => {
      await delay(scenario === 'timeout' ? SUBMIT_TIMEOUT_MS + 1000 : 900, inner);
      if (scenario === 'server-error') return { status: 'error' };
      if (scenario === 'field-error') {
        return { status: 'field-error', fieldErrors: { name: DUPLICATE_NAME_MESSAGE } };
      }
      return { status: 'success', productId: `prd_${Date.now().toString(36)}` };
    },
    signal,
  );

  if (result === 'timeout') return { status: 'error' };
  return result;
}

// ── 임시저장 (§3.2) ────────────────────────────────────────────────────────

type DraftSaveResult = { status: 'success'; savedAt: string } | { status: 'error' };
type DraftDeleteResult = { status: 'success' } | { status: 'error' };

export const DRAFT_SAVE_ERROR_MESSAGE = '임시저장하지 못했습니다. 다시 시도해 주세요.';
export const DRAFT_DELETE_ERROR_MESSAGE = '임시저장본을 삭제하지 못했습니다. 다시 시도해 주세요.';

function isProductFormValues(input: unknown): input is ProductFormValues {
  if (typeof input !== 'object' || input === null) return false;
  const record = input as Record<string, unknown>;
  return (
    typeof record['name'] === 'string' &&
    typeof record['description'] === 'string' &&
    typeof record['price'] === 'string' &&
    typeof record['stock'] === 'string' &&
    typeof record['categoryId'] === 'string'
  );
}

function isUploadedImageRef(input: unknown): input is UploadedImageRef {
  if (typeof input !== 'object' || input === null) return false;
  const record = input as Record<string, unknown>;
  return (
    typeof record['id'] === 'string' &&
    typeof record['name'] === 'string' &&
    typeof record['url'] === 'string'
  );
}

function parseDraft(raw: string): DraftSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    const values = record['values'];
    const images = record['images'];
    const savedAt = record['savedAt'];
    if (!isProductFormValues(values)) return null;
    if (typeof savedAt !== 'string') return null;
    if (!Array.isArray(images) || !images.every(isUploadedImageRef)) return null;
    return { values, images, savedAt };
  } catch {
    return null;
  }
}

/** 화면 진입 시 임시저장본 조회 — 계정당 1건(§5.3 규칙 2) */
export function loadDraft(): DraftSnapshot | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw === null) return null;
    const draft = parseDraft(raw);
    if (draft === null) {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      return null;
    }
    return draft;
  } catch {
    // 스토리지 접근 불가(프라이빗 모드 등) — 임시저장본 없음으로 취급
    return null;
  }
}

/** [임시저장] — 재저장 시 최신본이 기존 본을 덮어쓴다(§5.3 규칙 2). 10초 타임아웃(§3.2 저장 로딩) */
export async function saveDraft(
  values: ProductFormValues,
  images: UploadedImageRef[],
  signal?: AbortSignal,
): Promise<DraftSaveResult> {
  const scenario = queryParam('mockDraft');

  const result = await withTimeout(
    DRAFT_TIMEOUT_MS,
    async (inner): Promise<DraftSaveResult> => {
      await delay(scenario === 'save-timeout' ? DRAFT_TIMEOUT_MS + 1000 : 500, inner);
      if (scenario === 'save-error') return { status: 'error' };
      const snapshot: DraftSnapshot = { values, images, savedAt: new Date().toISOString() };
      try {
        window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(snapshot));
      } catch {
        return { status: 'error' };
      }
      return { status: 'success', savedAt: snapshot.savedAt };
    },
    signal,
  );

  if (result === 'timeout') return { status: 'error' };
  return result;
}

/** 임시저장본 삭제 — [삭제하고 새로 작성](§3.2 복원 거부) · 등록 성공 시(§5.3 규칙 2) */
export async function deleteDraft(signal?: AbortSignal): Promise<DraftDeleteResult> {
  const scenario = queryParam('mockDraft');

  const result = await withTimeout(
    DRAFT_TIMEOUT_MS,
    async (inner): Promise<DraftDeleteResult> => {
      await delay(300, inner);
      if (scenario === 'delete-error') return { status: 'error' };
      try {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {
        return { status: 'error' };
      }
      return { status: 'success' };
    },
    signal,
  );

  if (result === 'timeout') return { status: 'error' };
  return result;
}

/** 저장 시각 표시 — "HH:mm" (§3.2 저장 성공 Alert) */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** 저장 시각 표시 — "YYYY-MM-DD HH:mm" (§3.2 복원 안내 Alert) */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const yyyy = String(date.getFullYear());
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mo}-${dd} ${formatTime(iso)}`;
}
