// 사이트 설정 데이터 소스 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [백엔드 연동 지점] revision(낙관적 동시성 토큰)을 함께 나르는 저장소로 설정 1건을 흉내 낸다.
// **실제 HTTP 호출은 한 줄도 없다** — 실행되는 서버가 없다. 백엔드가 붙으면 store 본문만 바뀐다.
//
// [실패/충돌 재현]
//   /settings/site?fail=load      → 조회 실패 (인라인 배너 + 다시 시도)
//   /settings/site?fail=save      → 저장 실패 (확인 다이얼로그 안 danger 배너)
//   /settings/site?fail=conflict  → 저장이 409 (동시 편집 충돌 다이얼로그)
import { createRevisionedStore } from '../_shared/store';
import type { SiteSettingsValues } from './validation';

export const siteSettingsKey = ['settings', 'site'] as const;

/** 현재 운영 중인 사이트 설정(이라고 가정하는 값) — 화면의 초기 상태다 */
const DEFAULT_SITE_SETTINGS: SiteSettingsValues = {
  siteName: 'TDS 스페이스플래닝',
  siteDescription: '공간 기획·설계·시공을 한 팀이 맡는 종합 공간 솔루션',
  baseUrl: 'https://example.com',
  contactEmail: 'help@example.com',
  contactPhone: '02-1234-5678',
  timezone: 'Asia/Seoul',
  signupEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: '',
};

// TODO(backend): GET /api/settings/site · PUT /api/settings/site
//   PUT 요청: If-Match: <revision> 헤더 + 바디 { siteName, siteDescription, baseUrl, contactEmail,
//             contactPhone, timezone, signupEnabled, maintenanceMode, maintenanceMessage }
//   응답: 200 → { value, revision, audit } / 409·412 → 동시 편집 충돌(최신 문서를 실어 보낸다)
//        422 → 필드 검증 실패(프론트 검증은 UX 이지 보증이 아니다 — 서버가 다시 검증한다)
export const siteSettingsStore = createRevisionedStore<SiteSettingsValues>(
  'site',
  DEFAULT_SITE_SETTINGS,
  { updatedBy: '박관리', updatedAt: '2026-07-09T02:14:00.000Z' },
);

/** 충돌 다이얼로그가 '어느 항목이 달라졌는지' 짚을 때 쓰는 라벨 — 필드 키와 1:1 */
export const SITE_FIELD_LABELS: Readonly<Record<keyof SiteSettingsValues, string>> = {
  siteName: '사이트명',
  siteDescription: '사이트 설명',
  baseUrl: '기본 URL',
  contactEmail: '대표 이메일',
  contactPhone: '대표 전화번호',
  timezone: '표시 시간대',
  signupEnabled: '회원가입 허용',
  maintenanceMode: '유지보수 모드',
  maintenanceMessage: '유지보수 안내 문구',
};
