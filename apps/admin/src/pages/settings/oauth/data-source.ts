// OAuth 설정 데이터 소스 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [시크릿] 저장소는 **평문 시크릿을 갖지 않는다** — `hasSecret` 불리언만 안다.
// 조회 응답에도 시크릿은 실리지 않는다(서버가 준다 해도 화면이 쓸 일이 없다).
// 저장은 '새로 넣은 값' 만 보내고, 빈 문자열이면 서버가 기존 값을 유지한다.
//
// [픽스처의 Client ID 는 명백한 더미다] 실제 제공자 콘솔에서 받은 값처럼 보이면 안 된다.
//
// [실패/충돌 재현] /settings/oauth?fail=load · ?fail=save · ?fail=conflict
import { createRevisionedStore } from '../_shared/store';
import type { OAuthSettingsValues } from './validation';

export const oauthSettingsKey = ['settings', 'oauth'] as const;

/**
 * 현재 값 — 세 제공자 모두 꺼져 있고 자격증명이 없다.
 * (켜져 있는 척하면 '왜 로그인이 안 되지' 로 돌아온다 — 백엔드가 없으니 실제로 동작하지 않는다.)
 */
const DEFAULT_OAUTH_SETTINGS: OAuthSettingsValues = {
  providers: [
    {
      provider: 'google',
      enabled: false,
      clientId: '',
      secret: '',
      hasSecret: false,
      redirectUri: 'https://example.com/auth/google/callback',
    },
    {
      provider: 'kakao',
      enabled: false,
      clientId: '',
      secret: '',
      hasSecret: false,
      redirectUri: 'https://example.com/auth/kakao/callback',
    },
    {
      provider: 'naver',
      enabled: false,
      clientId: '',
      secret: '',
      hasSecret: false,
      redirectUri: 'https://example.com/auth/naver/callback',
    },
  ],
};

// TODO(backend): GET /api/settings/oauth · PUT /api/settings/oauth
//   GET 응답: providers[] — clientId·redirectUri·enabled·hasSecret. **secret 은 실리지 않는다.**
//   PUT 요청: If-Match: <revision> + providers[] { provider, enabled, clientId, redirectUri, secret? }
//             secret 이 없거나 빈 문자열이면 서버는 **기존 시크릿을 유지**한다(덮어쓰지 않는다).
//   응답: 200 → { value, revision, audit } / 409·412 → 동시 편집 충돌 / 422 → 검증 실패
export const oauthSettingsStore = createRevisionedStore<OAuthSettingsValues>(
  'oauth',
  DEFAULT_OAUTH_SETTINGS,
  { updatedBy: '김운영', updatedAt: '2026-07-02T08:05:00.000Z' },
);

/**
 * 저장 직후의 정규화 — 새로 넣은 시크릿은 '저장됨' 이 되고, 폼의 평문 자리는 비운다.
 *
 * 이걸 하지 않으면 저장한 뒤에도 입력칸에 평문이 남아 있고, 그 상태가 곧 새 기준선이 되어
 * **DOM 에 평문이 계속 산다**. 저장은 시크릿을 화면에서 지우는 시점이기도 하다.
 */
export function normalizeAfterSave(values: OAuthSettingsValues): OAuthSettingsValues {
  return {
    providers: values.providers.map((provider) => ({
      ...provider,
      hasSecret: provider.hasSecret || provider.secret.trim() !== '',
      secret: '',
    })),
  };
}

// [충돌 항목 라벨이 여기 없는 이유] 다른 설정 화면은 divergedLabels(필드 키 → 라벨)로 짚지만,
// 이 화면의 문서는 제공자 배열이라 필드 단위로 나열하면 'providers' 한 줄이 되어 아무것도 알려주지
// 못한다. 그래서 OAuthPage 가 제공자 이름으로 직접 짚는다 (Google · 카카오 …).
