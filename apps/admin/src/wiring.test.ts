// 배선 지점 회귀 테스트 — **꽂은 것이 실제로 반대편에 닿는가**
//
// [왜 이 테스트가 배선 파일 옆에 있나] 여기서 잇는 두 도메인은 서로를 모르도록 만들어져 있다
// (code-quality 축1, blocker). 그래서 '설정 화면이 저장한 값이 발송 화면에 도달하는가' 같은
// 질문은 **어느 한쪽 페이지의 테스트에서 물을 수 없다** — 물으려면 그 페이지가 상대를 import
// 해야 하고, 그것이 정확히 금지된 결합이다(테스트 파일도 스캔 대상이다). 두 도메인을 모두
// 아는 유일한 자리가 wiring.ts 이므로, 그 계약을 확인하는 자리도 여기다.
//
// [무엇을 보는가] 각 화면의 규칙은 각자의 테스트가 이미 본다. 여기서 보는 것은 **연결**뿐이다:
// 조회기가 꽂히는가, 값의 대응(어느 필드가 어느 필드가 되는가)이 맞는가.
import { beforeAll, describe, expect, it } from 'vitest';

import { companyProfileKey } from './pages/company/profile/data-source';
import type { CompanyProfile } from './pages/company/profile/types';
import { siteSettingsStore } from './pages/settings/site/data-source';
import { keepSignedInDefault, messagingNameOf } from './shared/domain/site-policy';
import { quoteSupplier } from './pages/sales/quotes/types';
import { queryClient } from './shared/query/queryClient';
import { wireDomains } from './wiring';

const PROFILE: CompanyProfile = {
  companyName: '주식회사 예시플래닝',
  businessNumber: '123-45-67890',
  address: '서울특별시 예시구 가상대로 123, 예시타워 8층',
  ceoName: '홍길동',
  contact: '02-0000-0000',
  logoUrl: '/fixtures/placeholder-image.svg',
};

beforeAll(() => {
  // 회사 정보 화면이 읽는 바로 그 캐시를 미리 채운다 — 배선은 이 키를 본다(wiring.ts wireSupplier)
  queryClient.setQueryData(companyProfileKey, PROFILE);
  wireDomains();
});

describe('사이트 기본 설정 → 발송 화면 · 로그인 화면', () => {
  it('전용 사이트 이름이 발송물의 발신 표시 이름으로 나간다', () => {
    expect(messagingNameOf()).toBe(siteSettingsStore.peek().value.messagingName);
  });

  it('로그인 상태 유지가 로그인 화면 체크박스의 기본값으로 나간다', () => {
    expect(keepSignedInDefault()).toBe(siteSettingsStore.peek().value.keepSignedIn);
  });
});

describe('회사 정보 → 견적서 공급자', () => {
  /**
   * **이 테스트가 이 배선의 이유다.** 예전에는 견적 폴더 안의 하드코딩 상수가 인쇄됐고,
   * 회사 정보를 아무리 고쳐도 종이는 바뀌지 않았다. 두 화면이 같은 회사를 다르게 말했다.
   */
  it('회사 정보 문서의 값이 그대로 공급자 블록이 된다', () => {
    const supplier = quoteSupplier();
    expect(supplier.name).toBe(PROFILE.companyName);
    expect(supplier.bizNo).toBe(PROFILE.businessNumber);
    expect(supplier.ceoName).toBe(PROFILE.ceoName);
    expect(supplier.address).toBe(PROFILE.address);
    expect(supplier.phone).toBe(PROFILE.contact);
  });

  /** 필드 이름이 양쪽에서 다르다(businessNumber ↔ bizNo · contact ↔ phone) — 대응을 못박는다 */
  it('회사 정보를 바꾸면 다음 조회부터 곧바로 반영된다', () => {
    queryClient.setQueryData<CompanyProfile>(companyProfileKey, {
      ...PROFILE,
      companyName: '주식회사 바뀐이름',
      contact: '031-000-0000',
    });

    expect(quoteSupplier().name).toBe('주식회사 바뀐이름');
    expect(quoteSupplier().phone).toBe('031-000-0000');

    queryClient.setQueryData(companyProfileKey, PROFILE);
  });
});
