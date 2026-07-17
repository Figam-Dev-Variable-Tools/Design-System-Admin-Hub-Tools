// 팝업 데이터 소스 어댑터
//
// [백엔드 연동 지점] 함수 시그니처가 프론트 ↔ 백엔드 계약이다. 지금은 픽스처를 돌려준다.
// 백엔드가 붙으면 **이 파일의 함수 본문만** 실제 HTTP 로 바꾸고 화면 코드는 그대로 둔다.
// [이미지 업로드 없음] 이미지는 URL 문자열로만 저장한다 — TODO(backend): POST /api/uploads.
import { wait } from '../../../shared/async';
import { PAGE_SIZE } from './types';
import type { Popup, PopupListResult, PopupPosition } from './types';

const LATENCY_MS = 400;

type FailureOp = 'all' | 'list' | 'detail' | 'save' | 'delete';

function failIfRequested(op: FailureOp): void {
  const flags = new URLSearchParams(window.location.search).get('fail');
  if (flags === null) return;
  const requested = flags.split(',').map((flag) => flag.trim());
  if (requested.includes('all') || requested.includes(op)) {
    throw new Error('요청을 처리하지 못했습니다.');
  }
}

/* ── 픽스처 ──────────────────────────────────────────────────────────────── */

const POSITIONS: readonly PopupPosition[] = ['home', 'event', 'all'];
const TITLE_SEED = ['신규 가입 혜택', '시즌 프로모션', '점검 안내', '앱 다운로드'];

function makePopup(index: number): Popup {
  const position = POSITIONS[index % POSITIONS.length] ?? 'home';
  const seq = String(index + 1).padStart(3, '0');
  const month = (index % 12) + 1;
  const mm = String(month).padStart(2, '0');
  return {
    id: `PU-${seq}`,
    title: `${TITLE_SEED[index % TITLE_SEED.length] ?? '팝업'} (${seq})`,
    // 표시용 더미 이미지 URL — 실재 자산이 아니다(미리보기는 로드 실패 시 안내로 대체된다)
    imageUrl: `https://cdn.example.com/popups/${seq}.png`,
    linkUrl: index % 3 === 0 ? '' : `https://example.com/event/${seq}`,
    position,
    startAt: `2026-${mm}-01`,
    endAt: `2026-${mm}-28`,
    enabled: index % 4 !== 0,
    priority: (index % 5) + 1,
  };
}

/** 우선순위 오름차순 — 서버가 priority 기준으로 내려주는 것을 흉내 낸다.
 *  mutable — 목록에서 바로 ON/OFF 토글(setPopupEnabled)이 이 상태를 갱신한다(백엔드가 정본). */
export let POPUPS: Popup[] = Array.from({ length: 12 }, (_, index) => makePopup(index)).sort(
  (a, b) => a.priority - b.priority,
);

/* ── 조회 ────────────────────────────────────────────────────────────────── */

export interface PopupQuery {
  readonly enabled: 'all' | 'on' | 'off';
  readonly keyword: string;
  readonly page: number;
}

/** 상태 + 제목 키워드 — 서버 쿼리로 대체될 자리. **테스트가 이 함수를 직접 부른다.** */
export function applyQuery(query: PopupQuery, source: readonly Popup[] = POPUPS): readonly Popup[] {
  const keyword = query.keyword.trim().toLowerCase();
  return source.filter((popup) => {
    if (query.enabled === 'on' && !popup.enabled) return false;
    if (query.enabled === 'off' && popup.enabled) return false;
    if (keyword === '') return true;
    return popup.title.toLowerCase().includes(keyword);
  });
}

// TODO(backend): GET /api/popups?enabled=&keyword=&page=&size=
export async function fetchPopups(
  query: PopupQuery,
  signal: AbortSignal,
): Promise<PopupListResult> {
  await wait(LATENCY_MS, signal);
  failIfRequested('list');

  const filtered = applyQuery(query);
  const start = (query.page - 1) * PAGE_SIZE;
  return {
    popups: filtered.slice(start, start + PAGE_SIZE),
    total: filtered.length,
  };
}

// TODO(backend): GET /api/popups/:id
export async function fetchPopup(id: string, signal: AbortSignal): Promise<Popup> {
  await wait(LATENCY_MS, signal);
  failIfRequested('detail');
  const popup = POPUPS.find((item) => item.id === id);
  if (popup === undefined) throw new Error('팝업을 찾을 수 없습니다');
  return popup;
}

/* ── 쓰기 계열 ───────────────────────────────────────────────────────────── */

export interface PopupInput {
  readonly title: string;
  readonly imageUrl: string;
  readonly linkUrl: string;
  readonly position: PopupPosition;
  readonly startAt: string;
  readonly endAt: string;
  readonly enabled: boolean;
  readonly priority: number;
}

/* ── ON/OFF 토글 (목록에서 바로 — 낙관적 업데이트) ──────────────────────────── */

/** id 의 ON/OFF 만 바꾼 새 목록. **테스트가 이 순수 함수를 직접 부른다.** */
export function setEnabledById(list: readonly Popup[], id: string, enabled: boolean): Popup[] {
  return list.map((popup) => (popup.id === id ? { ...popup, enabled } : popup));
}

// TODO(backend): PATCH /api/popups/:id/enabled
export async function setPopupEnabled(
  id: string,
  enabled: boolean,
  signal?: AbortSignal,
): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
  POPUPS = setEnabledById(POPUPS, id, enabled);
}

/* ── 우선순위 자동 증분 (새 항목 = 현재 최대 + 1) ─────────────────────────── */

/** 현재 최대 priority + 1 (비면 1). **테스트가 이 순수 함수를 직접 부른다.** */
export function nextPriority(list: readonly Popup[]): number {
  return list.reduce((max, popup) => Math.max(max, popup.priority), 0) + 1;
}

// TODO(backend): GET /api/popups/next-priority
export async function fetchNextPopupPriority(signal?: AbortSignal): Promise<number> {
  await wait(LATENCY_MS, signal);
  failIfRequested('list');
  return nextPriority(POPUPS);
}

// TODO(backend): POST /api/popups
export async function createPopup(input: PopupInput, signal?: AbortSignal): Promise<void> {
  void input;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}

// TODO(backend): PUT /api/popups/:id
export async function updatePopup(
  id: string,
  input: PopupInput,
  signal?: AbortSignal,
): Promise<void> {
  void id;
  void input;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}

// TODO(backend): DELETE /api/popups/:id
export async function deletePopup(id: string, signal?: AbortSignal): Promise<void> {
  void id;
  await wait(LATENCY_MS, signal);
  failIfRequested('delete');
}
