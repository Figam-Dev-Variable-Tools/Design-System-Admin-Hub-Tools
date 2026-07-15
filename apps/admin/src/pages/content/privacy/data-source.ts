// 개인정보 처리방침 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/content/privacy/**)
//
// [백엔드 연동 지점] 함수 시그니처가 프론트 ↔ 백엔드 계약이다. 지금은 픽스처를 돌려준다.
// 단일 문서라 종류(typeId)가 없다 — 버전만 관리한다.
import { wait } from '../../../shared/async';
import type { PrivacyStatus, PrivacyVersion } from './types';

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

const SPECS: readonly { version: string; date: string; status: PrivacyStatus }[] = [
  { version: 'v1.0', date: '2023-01-01', status: 'archived' },
  { version: 'v1.1', date: '2024-06-01', status: 'archived' },
  { version: 'v2.0', date: '2025-03-01', status: 'active' },
  { version: 'v2.1', date: '2027-01-01', status: 'scheduled' },
];

const ALL_VERSIONS: readonly PrivacyVersion[] = SPECS.map((spec) => ({
  id: `privacy-${spec.version}`,
  version: spec.version,
  effectiveDate: spec.date,
  status: spec.status,
  body:
    `개인정보 처리방침 ${spec.version}\n\n1. 개인정보의 처리 목적: 회사는 회원 가입 및 관리, ` +
    '서비스 제공, 고충처리 등의 목적으로 개인정보를 처리합니다.\n\n' +
    '2. 개인정보의 처리 및 보유 기간: 법령에 따른 보유·이용 기간 내에서 처리합니다. …',
}));

/** 시행일 내림차순(최신이 위) — 서버 정렬을 흉내 낸다 */
export function sortVersions(versions: readonly PrivacyVersion[]): readonly PrivacyVersion[] {
  return [...versions].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
}

/* ── 조회 ────────────────────────────────────────────────────────────────── */

// TODO(backend): GET /api/privacy-policy
export async function fetchPrivacyVersions(
  signal: AbortSignal,
): Promise<readonly PrivacyVersion[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested('list');
  return sortVersions(ALL_VERSIONS);
}

// TODO(backend): GET /api/privacy-policy/:id
export async function fetchPrivacyVersion(
  id: string,
  signal: AbortSignal,
): Promise<PrivacyVersion> {
  await wait(LATENCY_MS, signal);
  failIfRequested('detail');
  const version = ALL_VERSIONS.find((item) => item.id === id);
  if (version === undefined) throw new Error('처리방침 버전을 찾을 수 없습니다');
  return version;
}

/* ── 쓰기 계열 ───────────────────────────────────────────────────────────── */

export interface PrivacyVersionInput {
  readonly version: string;
  readonly effectiveDate: string;
  readonly status: PrivacyStatus;
  readonly body: string;
}

// TODO(backend): POST /api/privacy-policy
export async function createPrivacyVersion(
  input: PrivacyVersionInput,
  signal?: AbortSignal,
): Promise<void> {
  void input;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}

// TODO(backend): PUT /api/privacy-policy/:id
export async function updatePrivacyVersion(
  id: string,
  input: PrivacyVersionInput,
  signal?: AbortSignal,
): Promise<void> {
  void id;
  void input;
  await wait(LATENCY_MS, signal);
  failIfRequested('save');
}

// TODO(backend): DELETE /api/privacy-policy/:id
export async function deletePrivacyVersion(id: string, signal?: AbortSignal): Promise<void> {
  void id;
  await wait(LATENCY_MS, signal);
  failIfRequested('delete');
}
