// 약관 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/content/terms/**)
//
// [백엔드 연동 지점] 함수 시그니처가 프론트 ↔ 백엔드 계약이다. 지금은 픽스처를 돌려준다.
// 백엔드가 붙으면 **이 파일의 함수 본문만** 실제 HTTP 로 바꾸고 화면 코드는 그대로 둔다.
import { wait } from '../../../shared/async';
import type { TermsStatus, TermsType, TermsVersion } from './types';

const LATENCY_MS = 400;

type FailureOp = 'all' | 'list' | 'save' | 'delete';

function failIfRequested(op: FailureOp): void {
  const flags = new URLSearchParams(window.location.search).get('fail');
  if (flags === null) return;
  const requested = flags.split(',').map((flag) => flag.trim());
  if (requested.includes('all') || requested.includes(op)) {
    throw new Error('요청을 처리하지 못했습니다.');
  }
}

/* ── 픽스처 ──────────────────────────────────────────────────────────────── */

export const TERMS_TYPES: readonly TermsType[] = [
  { id: 'service', label: '이용약관' },
  { id: 'efinance', label: '전자금융거래 이용약관' },
  { id: 'marketing', label: '마케팅 정보 수신 동의' },
];

/** 한 종류당 3개 버전(만료 · 시행중 · 시행예정)을 결정적으로 만든다 */
function versionsFor(type: TermsType, typeIndex: number): readonly TermsVersion[] {
  const specs: readonly { version: string; date: string; status: TermsStatus }[] = [
    { version: 'v1.0', date: `2024-0${typeIndex + 1}-01`, status: 'archived' },
    { version: 'v1.1', date: `2025-0${typeIndex + 1}-01`, status: 'active' },
    { version: 'v2.0', date: `2027-0${typeIndex + 1}-01`, status: 'scheduled' },
  ];
  return specs.map((spec) => ({
    id: `${type.id}-${spec.version}`,
    typeId: type.id,
    version: spec.version,
    effectiveDate: spec.date,
    status: spec.status,
    body:
      `${type.label} ${spec.version}\n\n제1조(목적) 이 약관은 회사가 제공하는 서비스의 이용 조건 및 ` +
      '절차, 회사와 회원의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.\n\n' +
      '제2조(용어의 정의) 이 약관에서 사용하는 용어의 정의는 다음과 같습니다. …',
  }));
}

const ALL_VERSIONS: readonly TermsVersion[] = TERMS_TYPES.flatMap((type, index) =>
  versionsFor(type, index),
);

/** 시행일 내림차순(최신이 위) — 서버 정렬을 흉내 낸다 */
export function sortVersions(versions: readonly TermsVersion[]): readonly TermsVersion[] {
  return [...versions].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
}

/* ── 조회 ────────────────────────────────────────────────────────────────── */

// TODO(backend): GET /api/terms-types
export async function fetchTermsTypes(signal: AbortSignal): Promise<readonly TermsType[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested('list');
  return TERMS_TYPES;
}

// TODO(backend): GET /api/terms?typeId=
export async function fetchTermsVersions(
  typeId: string,
  signal: AbortSignal,
): Promise<readonly TermsVersion[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested('list');
  return sortVersions(ALL_VERSIONS.filter((version) => version.typeId === typeId));
}

/* ── 쓰기 계열 ───────────────────────────────────────────────────────────── */

export interface TermsVersionInput {
  readonly typeId: string;
  readonly version: string;
  readonly effectiveDate: string;
  readonly status: TermsStatus;
  readonly body: string;
}

// TODO(backend): POST /api/terms
export async function createTermsVersion(
  input: TermsVersionInput,
  signal?: AbortSignal,
): Promise<void> {
  void input;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}

// TODO(backend): PUT /api/terms/:id
export async function updateTermsVersion(
  id: string,
  input: TermsVersionInput,
  signal?: AbortSignal,
): Promise<void> {
  void id;
  void input;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}

// TODO(backend): DELETE /api/terms/:id
export async function deleteTermsVersion(id: string, signal?: AbortSignal): Promise<void> {
  void id;
  await wait(LATENCY_MS, signal);
  failIfRequested('delete');
}
