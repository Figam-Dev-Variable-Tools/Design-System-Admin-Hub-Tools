// 결제 설정 회귀 테스트 (시스템 설정 섹션)
//
// 지키는 것 여섯:
//   ① **비밀은 저장 문서에 값으로 남지 않는다** — 이름 목록만 남는다
//   ② **저장 후 평문 입력칸이 비워진다** — 폼에 평문이 계속 살면 마스킹은 눈속임이다
//   ③ **결제수단은 PG 에서 파생된다** — 카카오페이에 가상계좌를 권하지 않는다
//   ④ **목록 스키마는 자격증명을 막지 않는다** — 고칠 칸이 그 화면에 없다
//   ⑤ **대상 스코프 스키마는 그 PG 만 본다** — 보이지 않는 오류가 저장을 막지 않는다
//   ⑥ **형식으로 막지 않는다** — 문서화되지 않은 채번 규칙으로 멀쩡한 값을 거절하지 않는다
import { describe, expect, it } from 'vitest';

import { DEFAULT_PAYMENT_SETTINGS } from '../../../shared/commerce/payment-settings';
import type { PaymentSettings } from '../../../shared/commerce/payment-settings';
import { connectionTarget, PG_TARGETS, pgMeta } from '../../../shared/commerce/pg-catalog';
import { paymentDivergedLabels } from './data-source';
import { pgTargetPath, PAYMENT_LIST_PATH } from './paths';
import {
  methodOptionsFor,
  normalizeAfterSave,
  toPaymentFormValues,
  toPaymentFormValuesFor,
  toPaymentSettings,
  toPgConnection,
} from './types';
import {
  connectionFormFor,
  credentialFormatWarning,
  credentialIssues,
  inquiryGuideIssues,
  methodIssues,
  paymentListSchema,
  paymentSettingsSchema,
  pgTargetScopedSchema,
  pgTileStatus,
} from './validation';
import type { PaymentSettingsValues } from './validation';

/** 토스로 연동을 마친 설정 — 여기서 한 축씩 무너뜨린다 */
const TOSS_LIVE: PaymentSettings = {
  usePg: true,
  connection: {
    mode: 'direct',
    provider: 'toss',
    publicValues: { clientKey: 'live_ck_0001', mid: 'mid-0001' },
    storedSecrets: ['secretKey'],
  },
  mode: 'live',
  methods: ['card'],
  contractStatus: 'live',
  inquiryGuide: '결제 준비 중이에요.',
};

/** 폼 값 한 벌 만들기 — 저장 문서에서 파생시킨다(손으로 적으면 모델이 바뀔 때 어긋난다) */
function formOf(settings: PaymentSettings): PaymentSettingsValues {
  return toPaymentFormValues(settings);
}

describe('폼 ↔ 도메인 — 비밀은 값으로 건너가지 않는다', () => {
  it('저장된 비밀은 폼에 평문으로 채워지지 않는다 — 이름만 실린다', () => {
    const form = connectionFormFor(TOSS_LIVE, 'toss');

    expect(form.storedSecrets).toEqual(['secretKey']);
    expect(form.secretInputs.secretKey).toBe('');
  });

  it('새로 넣은 비밀은 **이름만** 저장 문서로 넘어간다', () => {
    const form = formOf({ ...TOSS_LIVE, connection: { ...TOSS_LIVE.connection } });
    const draft: PaymentSettingsValues = {
      ...form,
      connection: {
        ...form.connection,
        storedSecrets: [],
        secretInputs: { secretKey: 'plaintext-should-not-persist' },
      },
    };

    const connection = toPgConnection(draft.connection);

    expect(connection.mode).toBe('direct');
    if (connection.mode !== 'direct') return;
    expect(connection.storedSecrets).toEqual(['secretKey']);
    // 저장 문서 어디에도 평문이 없다
    expect(JSON.stringify(connection)).not.toContain('plaintext-should-not-persist');
  });

  it('저장 직후의 새 기준선에는 평문 입력칸이 비어 있다', () => {
    const normalized = normalizeAfterSave(TOSS_LIVE);
    expect(normalized.connection.secretInputs.secretKey).toBe('');
    expect(normalized.connection.storedSecrets).toEqual(['secretKey']);
  });

  it('공개 값은 앞뒤 공백을 다듬어 저장한다 — 붙여넣기 사고가 굳지 않게', () => {
    const form = formOf(TOSS_LIVE);
    const draft: PaymentSettingsValues = {
      ...form,
      connection: { ...form.connection, publicValues: { clientKey: ' ck ', mid: ' mid-0001 ' } },
    };

    const saved = toPaymentSettings(draft);
    expect(saved.connection.mode === 'direct' && saved.connection.publicValues.mid).toBe(
      'mid-0001',
    );
  });

  it('게이트웨이는 판별 합집합의 다른 갈래로 승격된다 — publicValues 를 들고 다니지 않는다', () => {
    const form = connectionFormFor(DEFAULT_PAYMENT_SETTINGS, 'portone');
    const draft = {
      ...form,
      publicValues: { storeId: 'store-1', channelKey: 'channel-1' },
      secretInputs: { apiSecret: 'v2-secret', webhookSecret: '' },
    };

    const connection = toPgConnection(draft);

    expect(connection).toEqual({
      mode: 'gateway',
      gateway: 'portone',
      storeId: 'store-1',
      channelKey: 'channel-1',
      hasApiSecret: true,
      hasWebhookSecret: false,
    });
  });

  it('다른 대상으로 폼을 열면 앞 PG 의 값이 남지 않는다', () => {
    const form = connectionFormFor(TOSS_LIVE, 'inicis');

    expect(form.target).toBe('inicis');
    expect(form.publicValues.mid).toBe('');
    expect(form.storedSecrets).toEqual([]);
  });

  /*
   * [겨냥을 옮긴 자리] 원래는 카카오페이(간편결제 전용)로 옮기면 'card' 가 떨어지는 것을 봤다.
   * 그 PG 를 내리면서 **걸러질 데이터가 사라져** 같은 단언은 아무것도 지키지 않게 됐다.
   * 그래서 카탈로그에 의존하지 않는 성질(순서 정규화)로 겨냥을 옮긴다 — 걸러짐 자체는
   * shared/commerce/pg-catalog.test.ts 의 카나리아가 '지금은 발동하지 않는다' 로 못박는다.
   */
  it('대상을 바꾸면 결제수단이 카탈로그 순서로 되맞춰진다', () => {
    const form = toPaymentFormValuesFor({ ...TOSS_LIVE, methods: ['easypay', 'card'] }, 'inicis');
    expect(form.methods).toEqual(['card', 'easypay']);
  });
});

describe('자격증명 검증 — 막는 것은 비어 있음과 길이 폭주뿐', () => {
  it('PG 를 켰는데 필수 공개 값이 비면 막는다', () => {
    const form = formOf(TOSS_LIVE);
    const blank = { ...form.connection, publicValues: { clientKey: 'ck', mid: '  ' } };

    expect(credentialIssues(blank, true).map((issue) => issue.path.join('.'))).toEqual([
      'connection.publicValues.mid',
    ]);
  });

  it('PG 를 껐으면 비어 있어도 막지 않는다 — 계약 전에 미리 적어 두는 것은 정상이다', () => {
    const form = connectionFormFor(DEFAULT_PAYMENT_SETTINGS, 'inicis');
    expect(credentialIssues(form, false)).toEqual([]);
  });

  it('저장된 비밀이 있으면 비워 둬도 통과한다 — 저장할 때마다 재발급하게 하지 않는다', () => {
    const form = connectionFormFor(TOSS_LIVE, 'toss');
    expect(credentialIssues(form, true)).toEqual([]);
  });

  it('저장된 비밀도 새 입력도 없으면 막는다', () => {
    const form = connectionFormFor(TOSS_LIVE, 'toss');
    const noSecret = { ...form, storedSecrets: [] };

    expect(credentialIssues(noSecret, true).map((issue) => issue.path.join('.'))).toEqual([
      'connection.secretInputs.secretKey',
    ]);
  });

  it('선택 필드는 비어 있어도 막지 않는다 — 이니시스 INILite·INIAPI 가 그렇다', () => {
    const form = connectionFormFor(DEFAULT_PAYMENT_SETTINGS, 'inicis');
    const filled = {
      ...form,
      publicValues: { mid: 'INIpayTest' },
      storedSecrets: ['signKey'],
    };

    expect(credentialIssues(filled, true)).toEqual([]);
  });

  it('형식으로는 막지 않는다 — 공백은 경고일 뿐 저장을 멈추지 않는다', () => {
    const form = connectionFormFor(TOSS_LIVE, 'toss');
    const spaced = { ...form, publicValues: { clientKey: 'live ck', mid: 'mid-0001' } };

    expect(credentialIssues(spaced, true)).toEqual([]);
    expect(credentialFormatWarning('live ck')).not.toBeNull();
    expect(credentialFormatWarning('live_ck_0001')).toBeNull();
  });

  it('길이 폭주는 켜짐과 무관하게 막는다', () => {
    const form = connectionFormFor(TOSS_LIVE, 'toss');
    const huge = { ...form, publicValues: { clientKey: 'x'.repeat(400), mid: 'mid' } };

    expect(credentialIssues(huge, false).map((issue) => issue.path.join('.'))).toEqual([
      'connection.publicValues.clientKey',
    ]);
  });
});

describe('결제수단은 provider 종속이다', () => {
  it('선택지가 고정 5칸이 아니라 그 PG 의 supportedMethods 에서 파생된다', () => {
    // 고정 배열과 비교하지 않는다 — 그러면 파생을 지우고 상수로 되돌려도 통과한다.
    // 카탈로그가 말하는 것과 화면이 그리는 것이 **같은 출처**임을 본다.
    for (const target of PG_TARGETS) {
      expect(methodOptionsFor(target).map((option) => option.id)).toEqual([
        ...pgMeta(target).supportedMethods,
      ]);
    }
  });

  it('사전 계약이 필요한 수단은 그 사실을 함께 들고 다닌다', () => {
    const vbank = methodOptionsFor('toss').find((option) => option.id === 'vbank');
    const card = methodOptionsFor('toss').find((option) => option.id === 'card');

    expect(vbank?.contractRequired).toBe(true);
    expect(card?.contractRequired).toBe(false);
  });

  it('지금 카탈로그에는 걸러질 수단이 없다 — 좁은 PG 가 들어오면 이 전제가 바뀐다', () => {
    // 원래는 카카오페이로 '카드가 거절된다' 를 봤다. 그 데이터가 사라졌으므로 단언을
    // 남겨 두면 `[] === []` 로 통과만 한다 — 전제를 명시적으로 적어 카나리아로 만든다.
    for (const target of PG_TARGETS) {
      expect(methodIssues(target, [...pgMeta(target).supportedMethods], true)).toEqual([]);
    }
  });

  it('켜 두고 아무 수단도 안 고르면 막는다 — 결제창이 열려도 고를 것이 없다', () => {
    expect(methodIssues('toss', [], true).map((issue) => issue.message)).toEqual([
      '결제수단을 하나 이상 선택하세요.',
    ]);
    // 꺼져 있으면 묻지 않는다
    expect(methodIssues('toss', [], false)).toEqual([]);
  });
});

describe('문의 전환 안내 — 결제를 안 쓸 때의 유일한 설명이다', () => {
  it('꺼 두고 문구가 비면 막는다', () => {
    const form = formOf({ ...DEFAULT_PAYMENT_SETTINGS, inquiryGuide: '   ' });
    expect(inquiryGuideIssues(form)).toHaveLength(1);
  });

  it('켜 두었으면 비어도 막지 않는다 — 쓰이지 않는 문구다', () => {
    const form = formOf({ ...TOSS_LIVE, inquiryGuide: '' });
    expect(inquiryGuideIssues(form)).toEqual([]);
  });
});

describe('스키마 셋 — 화면마다 검증 범위가 다르다', () => {
  it('문서 전체 스키마는 자격증명까지 본다', () => {
    const form = formOf(TOSS_LIVE);
    const broken: PaymentSettingsValues = {
      ...form,
      connection: { ...form.connection, storedSecrets: [] },
    };

    expect(paymentSettingsSchema.safeParse(broken).success).toBe(false);
    expect(paymentSettingsSchema.safeParse(form).success).toBe(true);
  });

  it('목록 스키마는 자격증명을 막지 않는다 — 고칠 칸이 그 화면에 없다', () => {
    const form = formOf(TOSS_LIVE);
    const broken: PaymentSettingsValues = {
      ...form,
      connection: {
        ...form.connection,
        storedSecrets: [],
        publicValues: { clientKey: '', mid: '' },
      },
    };

    expect(paymentListSchema.safeParse(broken).success).toBe(true);
  });

  it('목록 스키마는 자기가 그리는 것(안내 문구)은 막는다', () => {
    const form = formOf({ ...DEFAULT_PAYMENT_SETTINGS, inquiryGuide: '' });
    expect(paymentListSchema.safeParse(form).success).toBe(false);
  });

  it('대상 스코프 스키마는 다른 대상의 폼을 건드리지 않는다', () => {
    const form = formOf(TOSS_LIVE);
    const broken: PaymentSettingsValues = {
      ...form,
      connection: { ...form.connection, storedSecrets: [] },
    };

    // 이 폼이 편집 중인 것은 toss 다 — inicis 스코프는 아무 말도 하지 않는다
    expect(pgTargetScopedSchema('inicis').safeParse(broken).success).toBe(true);
    expect(pgTargetScopedSchema('toss').safeParse(broken).success).toBe(false);
  });
});

describe('타일 상태 — 두 묶음이 여기서 파생된다', () => {
  it('연결된 대상만 사용 중이고, 나머지는 전부 idle 이다', () => {
    expect(pgTileStatus(TOSS_LIVE, 'toss')).toBe('in-use');
    expect(pgTileStatus(TOSS_LIVE, 'inicis')).toBe('idle');
    expect(pgTileStatus(TOSS_LIVE, 'portone')).toBe('idle');
  });

  it('마스터 스위치를 내리면 값이 남아 있어도 사용 중이 아니다', () => {
    expect(pgTileStatus({ ...TOSS_LIVE, usePg: false }, 'toss')).toBe('ready');
  });

  it('사용 중인 타일이 하나도 없는 상태가 곧 "문의로 받는다" 이다', () => {
    const off = { ...TOSS_LIVE, usePg: false };
    const inUse = PG_TARGETS.filter(
      (target) => target === connectionTarget(off.connection) && off.usePg,
    );
    expect(inUse).toEqual([]);
  });
});

describe('충돌 비교 — 중첩 문서라 자기 비교기를 갖는다', () => {
  it('PG 가 바뀌면 어느 PG 에서 어느 PG 로인지 말한다', () => {
    const other: PaymentSettings = {
      ...TOSS_LIVE,
      connection: { mode: 'direct', provider: 'inicis', publicValues: {}, storedSecrets: [] },
    };

    expect(paymentDivergedLabels(TOSS_LIVE, other)[0]).toContain('토스페이먼츠');
    expect(paymentDivergedLabels(TOSS_LIVE, other)[0]).toContain('KG이니시스');
  });

  it('같은 PG 안에서는 어느 칸이 달라졌는지 이름으로 짚는다', () => {
    const changed: PaymentSettings = {
      ...TOSS_LIVE,
      connection: {
        mode: 'direct',
        provider: 'toss',
        publicValues: { clientKey: 'live_ck_0001', mid: 'mid-9999' },
        storedSecrets: ['secretKey'],
      },
    };

    expect(paymentDivergedLabels(TOSS_LIVE, changed)).toEqual(['상점아이디(MID)']);
  });

  it('아무것도 안 바뀌면 빈 목록이다 — 없는 충돌을 지어내지 않는다', () => {
    expect(paymentDivergedLabels(TOSS_LIVE, { ...TOSS_LIVE })).toEqual([]);
  });
});

describe('주소는 한 군데서만 만든다', () => {
  it('상세 주소는 목록 주소 아래에 놓인다', () => {
    expect(pgTargetPath('toss')).toBe(`${PAYMENT_LIST_PATH}/toss`);
    expect(pgTargetPath('portone')).toBe(`${PAYMENT_LIST_PATH}/portone`);
  });
});
