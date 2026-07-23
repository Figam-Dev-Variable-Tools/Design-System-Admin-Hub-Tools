// PG 카탈로그의 순수 규칙 — 자격증명 완비 판정 · 결제수단 파생 · 카탈로그 자체의 불변식
//
// [이 파일이 지키는 것] "카카오페이인데 가상계좌 체크박스가 있다" 나 "signKey 가 평문 텍스트
// 칸이다" 같은 사고는 화면을 눈으로 보고서는 잡히지 않는다 — 표 한 줄이 잘못 적히는 것으로
// 충분히 생기고, 그 표는 PG 를 하나 더할 때마다 길어진다. 그래서 표 자체를 여기서 검사한다.
import { describe, expect, it } from 'vitest';

import { BRAND_MARK_IDS } from '../ui/brand-marks';
import {
  connectionComplete,
  connectionHasSecret,
  connectionPublicValue,
  connectionTarget,
  emptyConnection,
  missingCredentials,
  PAYMENT_METHODS,
  PG_TARGETS,
  pgLabel,
  pgMeta,
  isPgTargetId,
  retainSupportedMethods,
  unsupportedMethods,
} from './pg-catalog';
import type { PgConnection } from './pg-catalog';

/** 토스 자격증명을 다 채운 연결 — 여기서 한 칸씩 무너뜨려 판정을 확인한다 */
const TOSS_FULL: PgConnection = {
  mode: 'direct',
  provider: 'toss',
  publicValues: { clientKey: 'test_ck_0001', mid: 'tosspayments-mid-0001' },
  storedSecrets: ['secretKey'],
};

const PORTONE_FULL: PgConnection = {
  mode: 'gateway',
  gateway: 'portone',
  storeId: 'store-0001',
  channelKey: 'channel-0001',
  hasApiSecret: true,
  hasWebhookSecret: false,
};

describe('카탈로그 자체의 불변식 — 표 한 줄이 잘못 적히는 것으로 화면이 거짓말한다', () => {
  it('모든 대상이 메타를 갖고, 메타의 id 가 자기 자리와 일치한다', () => {
    for (const target of PG_TARGETS) {
      expect(pgMeta(target).id).toBe(target);
      expect(pgLabel(target)).not.toBe('');
    }
  });

  // 지금은 다섯 다 true 라 이 단언이 갈리지 않는다 — 그래도 남긴다: 좁은 PG 가 들어올 때
  // 두 필드가 어긋난 채 추가되는 것을 막는 것이 이 검사의 실제 일이다(위 카나리아와 한 벌).
  it('supportsVirtualAccount 는 supportedMethods 와 어긋날 수 없다', () => {
    for (const target of PG_TARGETS) {
      const meta = pgMeta(target);
      expect(meta.supportsVirtualAccount).toBe(meta.supportedMethods.includes('vbank'));
    }
  });

  it('계약이 필요한 수단은 지원 수단의 부분집합이다 — 못 켜는 수단에 계약 딱지를 붙이지 않는다', () => {
    for (const target of PG_TARGETS) {
      const meta = pgMeta(target);
      for (const method of meta.contractRequiredMethods) {
        expect(meta.supportedMethods).toContain(method);
      }
    }
  });

  it('자격증명 키는 대상 안에서 유일하고, 라벨이 비어 있지 않다', () => {
    for (const target of PG_TARGETS) {
      const keys = pgMeta(target).credentials.map((field) => field.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const field of pgMeta(target).credentials) expect(field.label).not.toBe('');
    }
  });

  it("서명 재료는 이름이 '키' 여도 secret 이다 — 이 표가 그것을 못박는다", () => {
    /** 이름만 보면 식별자로 읽히지만 요청 서명에 들어가는 값들 */
    const signingMaterials: readonly (readonly [string, string])[] = [
      ['inicis', 'signKey'],
      ['inicis', 'iniApiKey'],
      ['inicis', 'iniApiIv'],
      ['kcp', 'siteKey'],
      ['nice', 'secretKey'],
      ['toss', 'secretKey'],
      ['portone', 'apiSecret'],
      ['portone', 'webhookSecret'],
    ];

    for (const [target, key] of signingMaterials) {
      expect(isPgTargetId(target)).toBe(true);
      if (!isPgTargetId(target)) continue;

      const field = pgMeta(target).credentials.find((candidate) => candidate.key === key);
      expect(field?.visibility).toBe('secret');
    }
  });

  it('비밀 필드에는 테스트 예시값을 싣지 않는다', () => {
    for (const target of PG_TARGETS) {
      for (const field of pgMeta(target).credentials) {
        if (field.visibility === 'secret') expect(field.testValue).toBeNull();
      }
    }
  });

  it('brand 는 실재하는 마크이거나 null 이다 — 없는 로고를 가리키지 않는다', () => {
    for (const target of PG_TARGETS) {
      const { brand } = pgMeta(target);
      if (brand !== null) expect(BRAND_MARK_IDS).toContain(brand);
    }
  });

  /*
   * ⚠ [카나리아 — 통과하는 것이 목적이 아니다]
   *
   * 예전에는 여기서 "카카오페이·네이버페이는 간편결제 하나뿐" 을 고정했다. 그 둘을 목록에서
   * 내리면서 **결제수단이 갈리는 데이터가 카탈로그에서 사라졌다** — 남은 다섯은 전부 다섯
   * 수단을 지원한다. 그래서 `unsupportedMethods` 를 실제로 발동시킬 수 있는 항목이 없다.
   *
   * 그 사실을 조용히 두면 파생 로직 전체가 **아무것도 지키지 않는 채로 초록불**이 된다.
   * 그래서 '지금은 전부 같다' 를 명시적으로 못박는다: 좁은 PG 가 하나라도 들어오는 날 이
   * 테스트가 **깨지고**, 그때 위의 갈리는 단언들을 되살리라는 신호가 된다.
   */
  it('지금은 모든 대상이 다섯 수단을 지원한다 — 좁은 PG 가 들어오면 여기가 깨진다', () => {
    for (const target of PG_TARGETS) {
      expect(pgMeta(target).supportedMethods).toEqual([...PAYMENT_METHODS]);
    }
  });

  it('포트원만 게이트웨이다 — 나머지는 직접 연동이다', () => {
    expect(pgMeta('portone').integrationMode).toBe('gateway');
    for (const target of PG_TARGETS) {
      if (target === 'portone') continue;
      expect(pgMeta(target).integrationMode).toBe('direct');
    }
  });
});

describe('isPgTargetId — 주소창에서 온 문자열을 좁히는 유일한 관문', () => {
  it('아는 대상만 통과시킨다', () => {
    expect(isPgTargetId('toss')).toBe(true);
    expect(isPgTargetId('portone')).toBe(true);
    expect(isPgTargetId('paypal')).toBe(false);
    expect(isPgTargetId('')).toBe(false);
  });
});

describe('connection — 갈래 분기를 한 곳에만 둔다', () => {
  it('두 갈래 모두 자기 카탈로그 대상을 답한다', () => {
    expect(connectionTarget(TOSS_FULL)).toBe('toss');
    expect(connectionTarget(PORTONE_FULL)).toBe('portone');
  });

  it('게이트웨이의 공개 값도 같은 함수로 읽힌다 — 화면이 갈래를 다시 묻지 않는다', () => {
    expect(connectionPublicValue(PORTONE_FULL, 'storeId')).toBe('store-0001');
    expect(connectionPublicValue(PORTONE_FULL, 'channelKey')).toBe('channel-0001');
    expect(connectionPublicValue(TOSS_FULL, 'mid')).toBe('tosspayments-mid-0001');
    // 모르는 키는 빈 문자열이다 — undefined 갈래를 화면으로 흘리지 않는다
    expect(connectionPublicValue(TOSS_FULL, 'nope')).toBe('');
  });

  it('저장된 비밀은 이름으로만 확인된다 — 값은 어느 갈래에도 없다', () => {
    expect(connectionHasSecret(TOSS_FULL, 'secretKey')).toBe(true);
    expect(connectionHasSecret(PORTONE_FULL, 'apiSecret')).toBe(true);
    expect(connectionHasSecret(PORTONE_FULL, 'webhookSecret')).toBe(false);
  });

  it('빈 연결은 대상에 맞는 갈래로 만들어진다', () => {
    expect(emptyConnection('portone').mode).toBe('gateway');
    expect(emptyConnection('inicis').mode).toBe('direct');
    expect(connectionTarget(emptyConnection('inicis'))).toBe('inicis');
  });
});

describe('missingCredentials — 필수 공개 값 + 필수 비밀이 다 있어야 완비다', () => {
  it('다 채우면 남는 것이 없다', () => {
    expect(missingCredentials(TOSS_FULL)).toEqual([]);
    expect(connectionComplete(TOSS_FULL)).toBe(true);
  });

  it('공개 값이 공백뿐이면 비어 있는 것이다', () => {
    const blank: PgConnection = {
      ...TOSS_FULL,
      publicValues: { ...TOSS_FULL.publicValues, mid: '   ' },
    };

    expect(connectionComplete(blank)).toBe(false);
    expect(missingCredentials(blank).map((field) => field.key)).toEqual(['mid']);
  });

  it('비밀이 저장돼 있지 않으면 완비가 아니다 — 값이 화면에 없다고 넘어가지 않는다', () => {
    const noSecret: PgConnection = { ...TOSS_FULL, storedSecrets: [] };

    expect(connectionComplete(noSecret)).toBe(false);
    expect(missingCredentials(noSecret).map((field) => field.key)).toEqual(['secretKey']);
  });

  it('선택 필드는 비어 있어도 완비를 막지 않는다 — 포트원 웹훅 시크릿이 그렇다', () => {
    expect(connectionComplete(PORTONE_FULL)).toBe(true);
  });

  it('아무것도 넣지 않은 연결은 필수 항목 전부를 돌려준다', () => {
    const empty = emptyConnection('inicis');
    // KG이니시스의 필수는 MID 와 웹표준 signkey 둘이다(INILite·INIAPI 는 선택)
    expect(missingCredentials(empty).map((field) => field.key)).toEqual(['mid', 'signKey']);
  });
});

describe('결제수단은 provider 종속이다', () => {
  /*
   * [겨냥을 옮긴 자리] 이 둘은 원래 카카오페이(간편결제 전용)로 '걸러진다' 를 확인했다.
   * 그 데이터가 사라졌으므로 **카탈로그로는 더 이상 발동시킬 수 없다** — 억지로 남겨 두면
   * `unsupportedMethods(어떤것, 무엇이든) === []` 가 되어 아무것도 지키지 않는다.
   * 대신 카탈로그에 의존하지 않는 성질(빈 목록·순서 정규화)만 남긴다.
   */
  it('지원 목록에 없는 수단은 걸러진다 — 지금 카탈로그로는 발동하지 않는다', () => {
    // 다섯 대상 모두 다섯 수단을 지원하므로 걸러질 것이 없다(위 카나리아가 그 전제를 지킨다)
    for (const target of PG_TARGETS) {
      expect(unsupportedMethods(target, [...PAYMENT_METHODS])).toEqual([]);
    }
  });

  it('대상을 바꾸면 순서가 카탈로그 순서로 되맞춰진다 — 고른 순서가 저장 값에 남지 않는다', () => {
    expect(retainSupportedMethods('toss', ['easypay', 'card'])).toEqual(['card', 'easypay']);
    expect(retainSupportedMethods('inicis', ['vbank', 'transfer', 'card'])).toEqual([
      'card',
      'transfer',
      'vbank',
    ]);
  });

  it('바꾼 결과에는 지원하지 않는 수단이 남지 않는다', () => {
    for (const target of PG_TARGETS) {
      const retained = retainSupportedMethods(target, [...PAYMENT_METHODS]);
      expect(unsupportedMethods(target, retained)).toEqual([]);
    }
  });
});
