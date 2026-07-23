// 연동 마켓스토어 회귀 테스트 (시스템 설정 섹션)
//
// 이 테스트가 지키는 것 여섯:
//   ① **연동 상태를 지어내지 않는다** — 저장된 자격증명이 없으면 어떤 것도 '연동 완료' 가 아니다.
//   ② **자격증명 요구가 타입에 드러난다** — 키 하나로 되지 않는 연동이 실제로 그렇게 적혀 있다.
//   ③ **로고를 지어내지 않는다** — 확보하지 못한 마크는 그리지 않고, 표현 갈래가 하나로 정해진다.
//   ④ **뺀 것이 조용히 사라지지 않는다** — 카탈로그에서 빠졌는데 저장돼 있는 연동은 이름이 불린다.
//   ⑤ **분류 식별자와 화면 문구가 같은 낱말이다** — `cloud`/'파운데이션 모델' 처럼 갈리지 않는다.
//   ⑥ **택배사를 여기서 정의하지 않는다** — 배송 연동은 코드로 배송 정책을 가리키기만 한다.
import { describe, expect, it } from 'vitest';

import {
  countIntegrations,
  filterIntegrations,
  integrationCatalogue,
  integrationCategoryLabel,
  integrationTabItems,
  INTEGRATION_CATEGORIES,
  INTEGRATION_TABS,
  isIntegrationTabId,
  orphanedConnectionIds,
  resolveIntegrations,
} from './integrations';
// 저장소를 **읽는** 표면은 data-source 가 갖는다 — integrations.ts 가 읽으면 순환이 된다
// (data-source 는 연동 성립 판정에 카탈로그의 required 를 써야 한다).
import { aiProviderStatuses, currentIntegrations, listAiConnections } from './data-source';
import {
  AI_CREDENTIAL_FIELDS,
  connectionIsUsable,
  CREDENTIAL_SECRECY,
  credentialIsSecret,
} from './ai-connections';
import type { AiConnection } from './ai-connections';
import { baseUrlWarning, EMPTY_CONNECTION_FORM, modelIdWarning } from './validation';
import { aiConnectionPath } from './paths';
import { isBrandMarkId } from '../../../shared/ui';

describe('resolveIntegrations — 상태는 지어내지 않고 저장된 자격증명에서 해소한다', () => {
  it('저장된 연동이 없으면 어떤 프로바이더도 완료라고 말하지 않는다', () => {
    expect(resolveIntegrations([]).every((item) => item.status === 'disconnected')).toBe(true);
  });

  it('오늘의 화면은 전부 연동 해제다 — 저장 경로가 아직 없다', () => {
    // 픽스처로 '연동된 척' 채우면 AI 화면의 응답 모드가 열리고, 열린 모드가 아무 일도 하지 않는다
    expect(listAiConnections()).toHaveLength(0);
    expect(currentIntegrations().every((item) => item.status === 'disconnected')).toBe(true);
  });

  it('켜져 있고 필수 자격증명이 다 저장돼야 연동 완료다', () => {
    const connection: AiConnection = {
      providerId: 'openai',
      enabled: true,
      storedFields: ['apiKey'],
      lastVerifiedAt: null,
      connectedAt: '2026-07-01T00:00:00.000Z',
    };

    const list = resolveIntegrations([connection]);
    expect(list.find((item) => item.id === 'openai')?.status).toBe('connected');
    // 다른 프로바이더까지 덩달아 켜지지 않는다
    expect(list.find((item) => item.id === 'claude')?.status).toBe('disconnected');
  });

  it('꺼져 있으면 키가 저장돼 있어도 연동 완료가 아니다 — 운영자가 쓰지 않겠다고 정한 것이다', () => {
    const connection: AiConnection = {
      providerId: 'openai',
      enabled: false,
      storedFields: ['apiKey'],
      lastVerifiedAt: null,
      connectedAt: null,
    };

    expect(resolveIntegrations([connection]).find((item) => item.id === 'openai')?.status).toBe(
      'disconnected',
    );
  });

  it('필수 칸이 하나라도 비면 연동 완료가 아니다 — 저장은 됐는데 호출이 실패하는 상태를 막는다', () => {
    // Azure OpenAI 는 키만으로 부족하다(엔드포인트·배포명이 필수다)
    const halfDone: AiConnection = {
      providerId: 'azure-openai',
      enabled: true,
      storedFields: ['apiKey'],
      lastVerifiedAt: null,
      connectedAt: null,
    };

    expect(resolveIntegrations([halfDone]).find((item) => item.id === 'azure-openai')?.status).toBe(
      'disconnected',
    );
  });

  it('연동 시작일을 지어내지 않는다 — 기록이 없으면 null 이다', () => {
    expect(currentIntegrations().every((item) => item.connectedAt === null)).toBe(true);
  });

  it('설정 화면이 없는 연동은 왜 없는지를 반드시 말한다', () => {
    for (const item of currentIntegrations()) {
      if (item.settingsPath === null) {
        expect(item.settingsUnavailableReason).not.toBeNull();
      } else {
        // 갈 곳이 있으면 이유는 필요 없다 — 둘 다 있으면 화면이 무엇을 믿을지 모른다
        expect(item.settingsUnavailableReason).toBeNull();
      }
    }
  });

  it('검증 시각을 지어내지 않는다 — 실제로 불러 본 적이 없으면 null 이다', () => {
    for (const connection of listAiConnections()) {
      expect(connection.lastVerifiedAt).toBeNull();
    }
  });
});

/* ── 자격증명 요구 ────────────────────────────────────────────────────────────
 *
 * 여기서 지키는 것: **키 하나로 되지 않는 곳이 그렇게 적혀 있다.** 이 단언이 깨지면
 * 저장 폼이 'API 키' 한 칸으로 만들어지고, Azure·Bedrock 은 저장은 되는데 호출이 실패한다 —
 * 가장 진단하기 어려운 형태의 고장이다. */

describe('자격증명 — 요구가 타입에 드러난다', () => {
  const catalogue = integrationCatalogue();
  const entryOf = (id: string) => catalogue.find((item) => item.id === id);

  /*
    [손으로 옮겨 적은 두 목록] 폼 스키마(zod/mini)는 칸 이름을 객체 리터럴로 적어야 해서
    AI_CREDENTIAL_FIELDS 유니온에서 도출할 수 없다. 어긋나면 그 칸의 값이 스키마를 통과하지
    못하고 **고칠 입력칸이 없는 오류**가 저장을 막는다 — 가장 진단하기 어려운 형태다.
    칸을 더할 때(예: CJ 의 customerCode) 한쪽만 고치는 사고를 여기서 잡는다.
  */
  it('폼이 아는 칸과 카탈로그가 쓸 수 있는 칸이 정확히 같다', () => {
    expect(Object.keys(EMPTY_CONNECTION_FORM.credentials).sort()).toEqual(
      [...AI_CREDENTIAL_FIELDS].sort(),
    );
  });

  it('카탈로그가 요구하는 칸은 전부 폼이 아는 칸이다 — 그리지 못할 요구를 만들지 않는다', () => {
    for (const entry of catalogue) {
      for (const field of entry.credentials) {
        expect(AI_CREDENTIAL_FIELDS).toContain(field.key);
      }
    }
  });

  it('모든 연동은 최소한 하나의 필수 자격증명을 요구한다', () => {
    for (const entry of catalogue) {
      expect(entry.credentials.some((field) => field.required)).toBe(true);
    }
  });

  /* ── 비밀 여부의 정본 ────────────────────────────────────────────────────────
   *
   * ┌ 무엇이 달라졌나 ─────────────────────────────────────────────────────────┐
   * │ 예전에는 카탈로그 항목마다 `secret` 을 적었고, 그래서 **같은 칸이 항목마다   │
   * │ 다르게 적힐 수 있는 자리가 구조적으로 열려 있었다.** 그 갈라짐은 조용하지    │
   * │ 않다: 저장(applyCredentials)이 평문을 버리는 근거가 그 값이라, 한 곳에서만   │
   * │ 공개로 적히면 **그 프로바이더에서만 키가 평문으로 저장 문서에 남는다.**      │
   * │                                                                        │
   * │ 그래서 판단을 칸 이름으로 옮겼다(CREDENTIAL_SECRECY). 아래 첫 단언은         │
   * │ '되돌리면 깨지는' 자리다 — 항목에 `secret` 을 되살리려면 타입부터 바꿔야 한다.│
   * └────────────────────────────────────────────────────────────────────────┘ */

  it('비밀 여부의 정본은 칸 이름 하나다 — 카탈로그 항목이 그것을 적을 자리가 없다', () => {
    for (const entry of catalogue) {
      for (const field of entry.credentials) {
        // 타입에 자리가 없으므로 런타임에도 없다 — 있으면 누군가 다시 적기 시작한 것이다
        expect(Object.hasOwn(field, 'secret')).toBe(false);
      }
    }
  });

  it('모든 칸이 비밀 여부에 답한다 — 새 칸이 조용히 공개가 되지 않는다', () => {
    expect(Object.keys(CREDENTIAL_SECRECY).sort()).toEqual([...AI_CREDENTIAL_FIELDS].sort());
  });

  it('인증 재료만 비밀이다 — 주소·식별자는 되읽을 수 있어야 폼이 쓸모 있다', () => {
    const secrets = AI_CREDENTIAL_FIELDS.filter(credentialIsSecret);
    expect([...secrets].sort()).toEqual(['apiKey', 'secretAccessKey']);
  });

  it('API 키는 언제나 시크릿이다 — 저장 후 다시 보여줄 수 없다', () => {
    expect(credentialIsSecret('apiKey')).toBe(true);
    for (const entry of catalogue) {
      const apiKey = entry.credentials.find((field) => field.key === 'apiKey');
      if (apiKey === undefined) continue;
      expect(credentialIsSecret(apiKey.key)).toBe(true);
    }
  });

  it('시크릿이 아닌 칸(엔드포인트·리전·배포명·조직 ID)은 마스킹 대상이 아니다', () => {
    for (const entry of catalogue) {
      for (const field of entry.credentials) {
        if (field.key === 'apiKey' || field.key === 'secretAccessKey') continue;
        expect(credentialIsSecret(field.key)).toBe(false);
      }
    }
  });

  it('조직·프로젝트 ID 는 비밀이 아니다 — 그것만으로는 아무 호출도 인증되지 않는다', () => {
    // 방증: Anthropic 은 `anthropic-organization-id` 를 **모든 응답 헤더에** 실어 돌려준다.
    // 되돌려주는 값을 비밀이라 부를 수 없다 — 비밀로 적으면 폼이 저장값을 되읽지 못한다.
    expect(credentialIsSecret('organizationId')).toBe(false);
    expect(credentialIsSecret('projectId')).toBe(false);
  });

  it('Azure OpenAI 는 키만으로 되지 않는다 — 엔드포인트와 배포명이 필수다', () => {
    const required = (entryOf('azure-openai')?.credentials ?? [])
      .filter((field) => field.required)
      .map((field) => field.key);

    expect(required).toContain('apiKey');
    expect(required).toContain('endpoint');
    expect(required).toContain('deployment');
  });

  it('Azure 의 api-version 은 선택이다 — v1 엔드포인트에서는 요구되지 않는다', () => {
    const apiVersion = entryOf('azure-openai')?.credentials.find(
      (field) => field.key === 'apiVersion',
    );

    expect(apiVersion).toBeDefined();
    expect(apiVersion?.required).toBe(false);
  });

  it('Amazon Bedrock 은 리전을 함께 요구한다 — 자격증명이 리전에 묶여 있다', () => {
    const required = (entryOf('amazon-bedrock')?.credentials ?? [])
      .filter((field) => field.required)
      .map((field) => field.key);

    expect(required).toContain('apiKey');
    expect(required).toContain('region');
  });

  /* ── 모델 4종의 칸이 늘었다 (2026-07) ────────────────────────────────────────
   *
   * ┌ 왜 '한 칸' 이 더는 참이 아닌가 ──────────────────────────────────────────┐
   * │ 예전 단언은 '모델 4종은 API 키 한 칸' 이었다. 그것이 지키던 규율은 **없는     │
   * │ 입력을 요구하지 않는다** 이지 '칸이 하나다' 가 아니다. 그리고 재조사에서      │
   * │ 없는 입력이 아니라 **있는 입력을 빠뜨리고 있었다**는 것이 드러났다:           │
   * │   · 베이스 URL — xAI 는 주소 교체가 **정상 사용법**이다(공식 문서 안내).      │
   * │   · 조직·프로젝트 ID — 없으면 **연동이 아예 안 되는 계정이 실재한다.**        │
   * │ 그래서 단언의 겨냥을 옮긴다: 필수는 여전히 키 하나이고(운영자가 더 채워야     │
   * │ 하는 것이 늘지 않았다), 늘어난 칸은 전부 **선택·공개**다.                    │
   * └────────────────────────────────────────────────────────────────────────┘ */

  it('모델 4종의 **필수**는 여전히 API 키 하나다 — 채워야 할 것이 늘지 않았다', () => {
    for (const id of ['openai', 'claude', 'gemini', 'grok']) {
      const required = (entryOf(id)?.credentials ?? [])
        .filter((field) => field.required)
        .map((field) => field.key);
      expect(required).toEqual(['apiKey']);
    }
  });

  it('모델 4종이 공통으로 베이스 URL·기본 모델을 받는다 — 둘 다 선택이고 공개다', () => {
    for (const id of ['openai', 'claude', 'gemini', 'grok']) {
      const fields = entryOf(id)?.credentials ?? [];
      for (const key of ['baseUrl', 'defaultModel'] as const) {
        const field = fields.find((item) => item.key === key);
        expect(field).toBeDefined();
        expect(field?.required).toBe(false);
        expect(credentialIsSecret(key)).toBe(false);
      }
    }
  });

  it('베이스 URL 은 파운데이션 모델·배송에는 없다 — 주소를 정하는 칸이 둘이 되지 않는다', () => {
    // Azure 는 endpoint, Bedrock 은 region 이 이미 주소를 정한다. 둘을 함께 두면
    // 어느 쪽이 이기는지를 화면이 답할 수 없다.
    for (const id of ['azure-openai', 'amazon-bedrock', 'cj-logistics']) {
      expect((entryOf(id)?.credentials ?? []).some((field) => field.key === 'baseUrl')).toBe(false);
    }
  });

  it('조직·프로젝트 ID 는 OpenAI 에만 있다 — 모두에게 붙이는 칸이 아니다', () => {
    const keysOf = (id: string) => (entryOf(id)?.credentials ?? []).map((field) => field.key);

    expect(keysOf('openai')).toEqual([
      'apiKey',
      'baseUrl',
      'defaultModel',
      'organizationId',
      'projectId',
    ]);
    const others = ['claude', 'gemini', 'grok', 'azure-openai', 'amazon-bedrock', 'cj-logistics'];
    for (const id of others) {
      expect(keysOf(id)).not.toContain('organizationId');
      expect(keysOf(id)).not.toContain('projectId');
    }
  });

  it('모델 id 목록을 카탈로그에 박지 않는다 — 힌트의 예시에는 확인 날짜가 붙는다', () => {
    /* 박아 두면 낡는다: `claude-opus-4-1-20250805` 는 이미 deprecated 이고 2026-08-05 retire 다.
       그렇다고 예시를 아예 빼면 운영자가 무엇을 넣어야 할지 모른다 —
       **낡은 목록이라도 낡았다는 사실이 함께 적혀 있으면 거짓말이 아니다.** */
    for (const id of ['openai', 'claude', 'gemini', 'grok']) {
      const field = (entryOf(id)?.credentials ?? []).find((item) => item.key === 'defaultModel');
      expect(field?.hint).toContain('2026-07 확인분');
      // 선택지(enum·options)를 들고 있지 않다 — 자유 입력이다
      expect(Object.hasOwn(field ?? {}, 'options')).toBe(false);
    }
  });

  it('모델 id 검증은 되묻기만 하고 막지 않는다 — 접두어 규칙을 박으면 실재하는 id 가 거절된다', () => {
    // 카탈로그 접두어(^gpt-·^claude-)를 박았다면 아래 셋이 전부 거절됐을 값이다
    for (const id of ['o3', 'grok-build-0.1', 'veo-3.1-generate-preview']) {
      expect(modelIdWarning(id)).toBeNull();
    }
    // 되묻는 것은 둘뿐이다: 표시명을 붙여 넣었거나(공백) 주소를 붙여 넣었을 때
    expect(modelIdWarning('GPT-5.6 Sol')).not.toBeNull();
    expect(modelIdWarning('https://api.openai.com/v1')).not.toBeNull();
    expect(modelIdWarning('   ')).toBeNull();
  });

  it('베이스 URL 검증도 경고 전용이다 — 경로가 붙은 정상 주소를 거절하지 않는다', () => {
    // 둘 다 공식 문서가 안내하는 값이다. 경로를 오타로 잡으면 공식 사용법이 거절된다.
    expect(baseUrlWarning('https://api.x.ai/v1')).toBeNull();
    expect(baseUrlWarning('https://generativelanguage.googleapis.com/v1beta/openai/')).toBeNull();
    // 스킴만 되묻는다
    expect(baseUrlWarning('api.openai.com')).not.toBeNull();
    expect(baseUrlWarning('http://proxy.internal/v1')).not.toBeNull();
    expect(baseUrlWarning('')).toBeNull();
  });

  it('connectionIsUsable 은 필수 칸만 본다 — 선택 칸이 비어도 연동은 성립한다', () => {
    const azure = entryOf('azure-openai')?.credentials ?? [];
    const withoutApiVersion: AiConnection = {
      providerId: 'azure-openai',
      enabled: true,
      storedFields: ['apiKey', 'endpoint', 'deployment'],
      lastVerifiedAt: null,
      connectedAt: null,
    };

    expect(connectionIsUsable(azure, withoutApiVersion)).toBe(true);
  });
});

/* ── 탭 ──────────────────────────────────────────────────────────────────────
 *
 * 탭이 두 축(분류·상태)을 섞어 쓰므로, 집계가 한 필터를 지나는지가 더 중요해졌다. */

describe('연동 목록 탭 — 건수와 행이 같은 필터에서 나온다', () => {
  const list = currentIntegrations();

  it('분류 탭이 상태 탭보다 앞에 온다 — 먼저 하는 일이 고르는 일이다', () => {
    expect(INTEGRATION_TABS[0]).toBe('model');
    // 마지막 분류 탭이 첫 상태 탭보다 앞이다. 분류가 늘거나 줄어도 이 관계는 그대로여야 한다.
    const lastCategoryTab = Math.max(
      ...INTEGRATION_CATEGORIES.map((category) => INTEGRATION_TABS.indexOf(category)),
    );
    expect(lastCategoryTab).toBeLessThan(INTEGRATION_TABS.indexOf('connected'));
  });

  it('탭 축은 분류 전부 + 상태 둘 + 전체다 — 항목 없는 분류 탭이 남지 않는다', () => {
    // 게이트웨이가 빠질 때 실제로 있었던 위험: 분류는 지웠는데 탭만 남아 '게이트웨이 (0)' 이
    // 영원히 0을 세는 상태. 탭 목록을 분류 축에서 다시 도출해 비교하면 그 어긋남이 잡힌다.
    expect([...INTEGRATION_TABS]).toEqual([
      ...INTEGRATION_CATEGORIES,
      'connected',
      'disconnected',
      'all',
    ]);
    // 그리고 분류 탭은 실제로 항목을 갖는다 — 빈 탭은 '아직 안 채웠나' 라는 기대를 만든다
    for (const category of INTEGRATION_CATEGORIES) {
      expect(filterIntegrations(list, category).length).toBeGreaterThan(0);
    }
  });

  it("'전체' 가 마지막이고 그 건수가 실제 항목 수와 같다", () => {
    expect(INTEGRATION_TABS[INTEGRATION_TABS.length - 1]).toBe('all');
    expect(countIntegrations(list).all).toBe(list.length);
  });

  it('분류 탭이 목록을 남김없이 나눈다', () => {
    const counts = countIntegrations(list);
    const byCategory = INTEGRATION_CATEGORIES.reduce((sum, tab) => sum + counts[tab], 0);
    expect(byCategory).toBe(counts.all);
  });

  it('상태 두 탭도 목록을 남김없이 나눈다', () => {
    const counts = countIntegrations(list);
    expect(counts.connected + counts.disconnected).toBe(counts.all);
  });

  it('탭 라벨의 건수가 그 탭의 행 수와 일치한다', () => {
    for (const item of integrationTabItems(list)) {
      const rows = filterIntegrations(list, item.id).length;
      expect(item.label).toContain(`(${String(rows)})`);
    }
  });

  it('필터는 자기 축으로만 나눈다 — 모델 탭에 파운데이션 모델·배송이 섞이지 않는다', () => {
    expect(filterIntegrations(list, 'model').every((i) => i.category === 'model')).toBe(true);
    expect(filterIntegrations(list, 'foundation').every((i) => i.category === 'foundation')).toBe(
      true,
    );
    expect(filterIntegrations(list, 'shipping').every((i) => i.category === 'shipping')).toBe(true);
    expect(filterIntegrations(list, 'disconnected').every((i) => i.status === 'disconnected')).toBe(
      true,
    );
  });

  it('탭 문구와 항목 부제가 같은 낱말로 분류를 부른다', () => {
    // 탭은 '파운데이션 모델 (2)' 인데 행에는 '클라우드' 라 적혀 있으면 운영자는 둘을 다른 것으로
    // 읽는다. 라벨 표가 둘(TAB_LABEL·CATEGORY_LABEL)이라 갈라질 수 있는 자리다.
    for (const category of INTEGRATION_CATEGORIES) {
      const tab = integrationTabItems(list).find((item) => item.id === category);
      expect(tab?.label.startsWith(integrationCategoryLabel(category))).toBe(true);
    }
  });

  it("분류 이름에 '클라우드' 를 쓰지 않는다 — 파는 것은 그 위에서 부르는 모델이다", () => {
    const labels = INTEGRATION_CATEGORIES.map(integrationCategoryLabel);
    expect(labels).toEqual(['모델', '파운데이션 모델', '배송']);
    expect(labels.some((label) => label.includes('클라우드'))).toBe(false);
    expect(labels.some((label) => label.includes('게이트웨이'))).toBe(false);
  });

  /*
    [식별자 ↔ 문구] 직전 기준에는 `cloud` 라는 식별자와 '파운데이션 모델' 이라는 문구가 갈려 있었다.
    코드를 읽는 사람과 화면을 보는 사람이 같은 분류를 다른 이름으로 부르면, '클라우드 탭' 이라는
    버그 리포트를 받은 사람이 화면에서 그 탭을 찾지 못한다. 개명(`cloud` → `foundation`)으로
    없앴고, **다음 사람이 같은 실수를 반복하지 않도록** 규칙 자체를 여기 고정한다.
  */
  it('분류 식별자와 화면 문구가 어긋나지 않는다 — 죽은 낱말이 식별자에 남지 않는다', () => {
    // 옛 식별자가 되살아나면 여기서 잡힌다
    expect(INTEGRATION_CATEGORIES).not.toContain('cloud');
    expect(INTEGRATION_CATEGORIES).not.toContain('gateway');

    // 그리고 새 분류를 더할 때도 짝이 맞아야 한다 — 문구가 비어 있거나 식별자와 같은 영문이면 실수다
    for (const category of INTEGRATION_CATEGORIES) {
      const label = integrationCategoryLabel(category);
      expect(label.trim()).not.toBe('');
      expect(label).not.toBe(category);
    }
  });

  it('알 수 없는 탭 id 를 좁혀 낸다 — Tabs 는 string 을 준다', () => {
    expect(isIntegrationTabId('model')).toBe(true);
    expect(isIntegrationTabId('connected')).toBe(true);
    expect(isIntegrationTabId('전체')).toBe(false);
    expect(isIntegrationTabId('')).toBe(false);
  });
});

/* ── 카탈로그의 정직함 ───────────────────────────────────────────────────────── */

describe('AI 카탈로그 — 지어내지 않는다', () => {
  const catalogue = integrationCatalogue();

  it('사용자가 지정한 네 프로바이더를 반드시 담는다', () => {
    for (const id of ['openai', 'claude', 'gemini', 'grok']) {
      expect(catalogue.some((item) => item.id === id)).toBe(true);
    }
  });

  it('카탈로그는 정확히 7종이다 — 13 → 6 으로 좁힌 뒤 배송 1종이 붙었다', () => {
    expect(catalogue.map((item) => item.id)).toEqual([
      'openai',
      'claude',
      'gemini',
      'grok',
      'azure-openai',
      'amazon-bedrock',
      'cj-logistics',
    ]);
  });

  it('빼기로 한 7종이 하나도 남지 않았다 — 앱 설정 진입까지 함께 사라졌다', () => {
    // 운영자 요구(2026-07-22): 모델 5종 + 게이트웨이 분류 통째.
    // 항목만 지우고 경로가 남으면 목록에 없는 화면이 주소로 살아 있는 상태가 된다.
    const removed = [
      'mistral',
      'perplexity',
      'cohere',
      'deepseek',
      'groq',
      'openrouter',
      'together',
    ];

    for (const id of removed) {
      expect(catalogue.some((item) => item.id === id)).toBe(false);
      expect(catalogue.some((item) => item.settingsPath === aiConnectionPath(id))).toBe(false);
    }
  });

  it('파운데이션 모델을 모델과 구분한다 — 자격증명의 성격이 다르다', () => {
    // 이름을 바꿨을 뿐 축은 남겼다: 왼쪽은 키 한 칸, 오른쪽은 리소스/리전에 매여 있다.
    expect(catalogue.find((item) => item.id === 'azure-openai')?.category).toBe('foundation');
    expect(catalogue.find((item) => item.id === 'amazon-bedrock')?.category).toBe('foundation');
    expect(catalogue.find((item) => item.id === 'openai')?.category).toBe('model');
    expect(catalogue.find((item) => item.id === 'cj-logistics')?.category).toBe('shipping');
  });

  it('로고 표현이 항목마다 하나로 정해져 있다 — 마크 / 이미지 / 배지', () => {
    // 둘 다 채우면 카탈로그만 보고는 어느 것이 그려지는지 알 수 없다(ServiceGlyph 는 마크를
    // 먼저 본다). 표현을 고르는 일은 화면이 아니라 여기서 끝나야 한다.
    for (const entry of catalogue) {
      expect(entry.brand === null || entry.logoSrc === null).toBe(true);
    }
  });

  it('카탈로그가 말하는 브랜드는 실제로 마크가 있는 것뿐이다 — 오타는 빈 칸이 된다', () => {
    // brand-marks.tsx 에 마크 4종(openai·claude·gemini·grok)이 들어오면 카탈로그의 `brand` 가
    // 채워진다. 이 단언은 그때 오타를 잡는다 — '전부 null' 로 고정하지 않는 이유다.
    for (const entry of catalogue) {
      if (entry.brand === null) continue;
      expect(isBrandMarkId(entry.brand)).toBe(true);
    }
  });

  it('로고 이미지는 앱 자산을 가리킨다 — 외부 호스트를 런타임에 부르지 않는다', () => {
    // 공식 SVG 를 확보하지 못한 둘만 이미지다. 지어낸 벡터로 대체하지 않았다는 사실이 여기 남는다.
    const withImage = catalogue.filter((item) => item.logoSrc !== null);
    expect(withImage.map((item) => item.id)).toEqual([
      'azure-openai',
      'amazon-bedrock',
      'cj-logistics',
    ]);

    for (const entry of withImage) {
      expect(entry.logoSrc?.startsWith('/brand/')).toBe(true);
      // 절대 URL 이면 그 호스트가 죽는 날 우리 목록에 깨진 이미지가 뜬다
      expect(entry.logoSrc?.includes('//')).toBe(false);
    }
  });

  it('연동 방법 안내는 **확인한 주소만** 싣는다 — 그럴듯한 주소를 지어내지 않는다', () => {
    for (const entry of catalogue) {
      if (entry.guideUrl === null) continue;
      expect(entry.guideUrl.startsWith('https://')).toBe(true);
    }

    expect(catalogue.find((item) => item.id === 'azure-openai')?.guideUrl).toContain(
      'learn.microsoft.com',
    );
    expect(catalogue.find((item) => item.id === 'amazon-bedrock')?.guideUrl).toContain(
      'docs.aws.amazon.com',
    );
  });

  it('모델 4종의 1차 문서를 확인해 채웠다 — 더는 비활성 메뉴가 아니다', () => {
    const guideOf = (id: string) => catalogue.find((item) => item.id === id)?.guideUrl;

    expect(guideOf('openai')).toBe('https://developers.openai.com/api/reference/overview');
    expect(guideOf('claude')).toBe('https://platform.claude.com/docs/en/api/overview');
    expect(guideOf('gemini')).toBe('https://ai.google.dev/gemini-api/docs/api-key');
    expect(guideOf('grok')).toBe('https://docs.x.ai/docs/overview');
  });

  it('Anthropic 문서는 **옮겨 간 뒤의 호스트**를 쓴다 — 옛 주소는 크로스호스트 리다이렉트다', () => {
    // docs.anthropic.com · docs.claude.com 은 301/302 로 옮겨 갔다.
    // 리다이렉트되는 주소를 적어 두면 언젠가 조용히 끊긴다.
    const guide = catalogue.find((item) => item.id === 'claude')?.guideUrl ?? '';
    expect(guide.startsWith('https://platform.claude.com/')).toBe(true);
    expect(guide).not.toContain('docs.anthropic.com');
    expect(guide).not.toContain('docs.claude.com');
  });

  /* ── 사용량·요금·한도 ────────────────────────────────────────────────────────
   *
   * 넣지 않기로 한 것도 결정이므로 고정한다. 근거: 넷의 조회 수단이 고르지 않고, OpenAI 는
   * 일반 API 키로 읽히지 않아 **admin 키라는 비밀을 하나 더 받아야** 한다 — 이 섹션의 규약과
   * 정면으로 부딪친다. 그래서 숫자는 들이지 않고 **갈 곳만** 가리킨다. */

  it('사용량·요금·한도 값을 카탈로그가 갖지 않는다 — 링크만 든다', () => {
    for (const entry of catalogue) {
      for (const key of ['usage', 'quota', 'rateLimit', 'spend', 'tier']) {
        expect(Object.hasOwn(entry, key)).toBe(false);
      }
      if (entry.rateLimitUrl === null) continue;
      expect(entry.rateLimitUrl.startsWith('https://')).toBe(true);
    }
  });

  it('한도 안내는 주소를 확인한 넷만 갖는다 — 확인하지 못한 셋은 null 로 둔다', () => {
    const withLimits = catalogue.filter((item) => item.rateLimitUrl !== null).map((it) => it.id);
    expect(withLimits).toEqual(['openai', 'claude', 'gemini', 'grok']);
  });

  /* ── 화면이 사실처럼 적어 두었던 **틀린 문장 두 개** ──────────────────────────
   *
   * ┌ 왜 문구를 테스트가 붙잡는가 ────────────────────────────────────────────┐
   * │ 이 화면의 `connectionNotice` 는 장식이 아니라 **운영자가 사실로 읽는 문장**  │
   * │ 이다. 틀린 문장은 링크가 죽은 것보다 나쁘다 — 눌러 봐도 틀린 줄을 모른다.    │
   * │ 아래 둘은 재조사(2026-07)에서 1차 문서와 어긋난 것이 확인돼 고친 자리이고,   │
   * │ **되살아나면 여기서 깨진다.**                                             │
   * └────────────────────────────────────────────────────────────────────────┘ */

  it('① Anthropic 이 Bearer 를 쓰지 않는다고 말하지 않는다 — 공식 표는 둘 중 하나를 요구한다', () => {
    const notice = catalogue.find((item) => item.id === 'claude')?.connectionNotice ?? '';

    // 우리가 말할 수 있는 좁고 확실한 사실: 이 화면은 콘솔 키를 받고 x-api-key 로 보낸다
    expect(notice).toContain('x-api-key');
    // `anthropic-version` 필수는 **여전히 사실이다**(공식 표 Required: Yes) — 그래서 남긴다
    expect(notice).toContain('anthropic-version');
    // 그러나 '헤더 이름이 다르다' 를 '그쪽은 Bearer 를 쓰지 않는다' 로 넓히지 않는다
    expect(notice).not.toContain('가 아니라 `x-api-key`');
    expect(notice).not.toMatch(/Anthropic 만 인증 방식이 달라요/);
  });

  it('①-2 anthropic-version 은 여전히 입력칸이 아니다 — 클라이언트 상수다', () => {
    const keys = (catalogue.find((item) => item.id === 'claude')?.credentials ?? []).map(
      (field) => field.key,
    );
    expect(keys).not.toContain('apiVersion');
  });

  it('② OpenAI 의 401 서술이 사라졌다 — 1차 문서에서 확인되지 않은 관찰이었다', () => {
    const notice = catalogue.find((item) => item.id === 'openai')?.connectionNotice ?? '';

    expect(notice).not.toContain('401');
    // 우리 코드의 사실은 남는다 — 그것은 우리가 보증할 수 있는 문장이다
    expect(notice).toContain('비어 있으면 해당 헤더를 보내지 않아요');
    // 그리고 '칸을 두지 않는다' 는 옛 판단도 함께 사라졌다(이제 칸이 있다)
    expect(notice).not.toContain('칸을 두지 않아요');
  });

  it('③ Gemini 도 헤더 함정을 말한다 — Anthropic 에만 경고가 붙어 있던 비대칭을 없앴다', () => {
    const notice = catalogue.find((item) => item.id === 'gemini')?.connectionNotice ?? '';

    expect(notice).toContain('x-goog-api-key');
    expect(notice).toContain('Authorization: Bearer');
    // 옛 경고(Vertex 혼동)도 지우지 않는다 — 둘 다 실재하는 헛디딤이다
    expect(notice).toContain('Vertex AI');
  });

  it('④ Grok 의 주의사항이 더는 null 이 아니다 — 채울 근거가 둘 생겼다', () => {
    const notice = catalogue.find((item) => item.id === 'grok')?.connectionNotice;

    expect(notice).not.toBeNull();
    // ① 이 화면의 키로는 관리 API 를 부를 수 없다(발급처가 다른 별도 키다)
    expect(notice).toContain('management key');
    // ② 리브랜딩 중이라 콘솔 이름표가 흔들린다
    expect(notice).toContain('리브랜딩');
  });

  it('id 가 중복되지 않는다 — 상태 해소가 첫 항목만 보고 끝난다', () => {
    const ids = catalogue.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/* ── 배지 표기의 유일성 ───────────────────────────────────────────────────────
 *
 * ┌ 무엇을 지키는 검사인가 ────────────────────────────────────────────────────┐
 * │ 배지는 마크도 로고 이미지도 없는 항목이 목록에서 **눈으로 갈리게** 하는 수단이다. │
 * │ 갈리지 않으면 훑어서 고르는 일이 불가능해진다.                                 │
 * │                                                                          │
 * │ 한때 ServiceGlyph 가 이름의 첫 글자를 잘랐고, 그 결과 13종이 8종으로 뭉갰다      │
 * │ (G×3 Gemini·Grok·Groq · A×3 Anthropic·Azure·Amazon · O×2 OpenAI·OpenRouter). │
 * │ **아래 첫 단언 한 줄이면 잡혔을 결함이다.**                                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌ Grok/Groq 단언을 어떻게 다시 세웠나 ────────────────────────────────────────┐
 * │ 옛 단언은 `glyphOf('grok') !== glyphOf('groq')` 였다. Groq 가 카탈로그에서      │
 * │ 빠지면서 **그 단언의 전제가 없어졌다** — 두 값이 모두 undefined 가 되어 서로     │
 * │ 같아지므로, 그대로 두면 '규칙이 지켜져서' 가 아니라 '항목이 없어서' 통과하거나     │
 * │ 실패한다. 어느 쪽이든 더는 아무것도 지키지 않는다.                              │
 * │                                                                          │
 * │ 그래서 **지우지 않고 겨냥을 옮겼다.** 그 단언이 실제로 지키던 것은 둘이었다:      │
 * │   ⓐ 표기는 카탈로그 안에서 유일하다  → 남은 6종 기준으로 그대로 유지한다.        │
 * │   ⓑ 표기는 이름에서 규칙으로 파생되지 않는다(사람이 정한다) → 지금 목록에서       │
 * │      그 사실을 여전히 반증할 수 있는 항목으로 다시 세운다: 'Anthropic Claude' 의  │
 * │      표기는 Cl(제품명)이고 'Amazon Bedrock' 은 Br(제품명)이다 — 이름 앞 두       │
 * │      글자('An'·'Am')도, 첫 글자도 아니다.                                     │
 * │ 유일성 자체는 여전히 규칙이므로 크기가 6이든 13이든 남는다.                      │
 * └──────────────────────────────────────────────────────────────────────────┘ */

describe('배지 표기(glyph) — 카탈로그 안에서 유일하다', () => {
  const catalogue = integrationCatalogue();
  const glyphOf = (id: string): string | undefined =>
    catalogue.find((item) => item.id === id)?.glyph;

  it('7종의 표기가 서로 다르다', () => {
    const glyphs = catalogue.map((item) => item.glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it('첫 글자만으로는 갈리지 않는다는 사실을 기록해 둔다 — 그래서 표기를 따로 둔다', () => {
    // 지금도 A×3(Anthropic·Azure·Amazon) · G×2(Gemini·Grok)로 겹친다.
    // 이 단언이 깨진다면(=첫 글자가 전부 유일해졌다면) glyph 필드의 존재 이유가 사라진 것이다.
    // 그때는 필드를 지워도 되지만, 지우기 전에 이 테스트가 먼저 알려 준다.
    const initials = catalogue.map((item) => Array.from(item.name.trim())[0]);
    expect(new Set(initials).size).toBeLessThan(initials.length);
  });

  it('표기는 이름에서 파생된 것이 아니다 — 회사명이 아니라 제품명에서 딴다', () => {
    // 옛 Grok/Groq 단언이 지키던 것과 같은 규칙이다: 표기를 자동 생성하려는 유혹을 막는다.
    const twoLetterPrefix = (id: string): string =>
      Array.from(catalogue.find((item) => item.id === id)?.name.trim() ?? '')
        .slice(0, 2)
        .join('');

    // Anthropic Claude → 'An' 이 아니라 'Cl' · Amazon Bedrock → 'Am' 이 아니라 'Br'
    expect(glyphOf('claude')).not.toBe(twoLetterPrefix('claude'));
    expect(glyphOf('amazon-bedrock')).not.toBe(twoLetterPrefix('amazon-bedrock'));
    // Grok 은 한때 Groq 와 'Gr' 로 같았다 — 그 항목이 빠져도 규칙은 그대로 둔다
    expect(glyphOf('grok')).not.toBe('Gr');
  });

  it('표기는 배지에 들어갈 길이다 — 1~2글자', () => {
    for (const item of catalogue) {
      expect(Array.from(item.glyph).length).toBeGreaterThanOrEqual(1);
      expect(Array.from(item.glyph).length).toBeLessThanOrEqual(2);
    }
  });

  it('표기가 비어 있지 않다 — 빈 배지는 고장으로 읽힌다', () => {
    for (const item of catalogue) {
      expect(item.glyph.trim()).not.toBe('');
    }
  });
});

/* ── 배송 연동 — 택배사를 여기서 정의하지 않는다 ──────────────────────────────
 *
 * ┌ 이 묶음이 지키는 것 ────────────────────────────────────────────────────────┐
 * │ 이 리포에는 택배사를 아는 원장이 **이미 있다**(배송 정책 /products/shipping).   │
 * │ 연동 카탈로그가 이름·추적 URL 을 자기 사실로 들고 있으면 같은 택배사를 두 곳이    │
 * │ 각자 알게 되고, 정책에서 지운 뒤에도 연동은 멀쩡해 보인다.                      │
 * │                                                                            │
 * │ 그래서 카탈로그가 드는 것은 **코드 하나**뿐이고, 그 코드로 원장에게 묻는 일은     │
 * │ 공통 층이 한다(shared/domain/carrier-integration.ts). 아래 단언들이            │
 * │ '카탈로그가 택배사를 다시 정의하기 시작했는가' 를 감시한다.                     │
 * └────────────────────────────────────────────────────────────────────────────┘ */

describe('배송 연동 — 택배사의 정본은 배송 정책이다', () => {
  const cj = integrationCatalogue().find((item) => item.id === 'cj-logistics');

  it('배송 분류에 CJ대한통운 한 종이 있다 — 빈 탭을 만들지 않는다', () => {
    expect(cj).toBeDefined();
    expect(cj?.name).toBe('CJ대한통운');
    expect(filterIntegrations(currentIntegrations(), 'shipping')).toHaveLength(1);
  });

  it('택배사 코드만 든다 — 이름·추적 URL·사용 여부를 카탈로그가 갖지 않는다', () => {
    expect(cj?.carrierCode).toBe('CJGLS');
    // 배송 정책의 택배사 코드 규칙과 같은 문자 집합이어야 운영자가 그대로 옮겨 적을 수 있다
    expect(cj?.carrierCode).toMatch(/^[A-Z0-9-]+$/);
    // 카탈로그 항목에 택배사 원장의 칸이 새어 들어오지 않았는가
    for (const key of ['trackingUrlTemplate', 'active', 'carrierName']) {
      expect(Object.hasOwn(cj ?? {}, key)).toBe(false);
    }
  });

  it('택배사가 아닌 연동은 코드를 갖지 않는다 — 모두에게 붙이는 칸이 아니다', () => {
    for (const entry of integrationCatalogue()) {
      if (entry.category === 'shipping') continue;
      expect(entry.carrierCode).toBeNull();
    }
  });

  it('자격증명은 인증키(비밀) + 고객코드(공개) 둘이다 — 확인한 것만 칸으로 만든다', () => {
    expect(cj?.credentials.map((field) => field.key)).toEqual(['apiKey', 'customerCode']);

    const apiKey = cj?.credentials.find((field) => field.key === 'apiKey');
    const customerCode = cj?.credentials.find((field) => field.key === 'customerCode');

    // 인증 재료는 전부 비밀이다 (판단은 항목이 아니라 칸 이름이 갖는다 — CREDENTIAL_SECRECY)
    expect(credentialIsSecret('apiKey')).toBe(true);
    expect(apiKey).toBeDefined();
    // 계약 상대가 우리를 식별하는 번호는 비밀이 아니다 — 되읽지 못하면 폼이 쓸모없어진다
    expect(credentialIsSecret('customerCode')).toBe(false);
    expect(customerCode?.required).toBe(true);
  });

  it('확인하지 못한 값을 칸으로 만들지 않고, 확인하지 못했다고 화면이 말한다', () => {
    // 가맹점코드·협력사코드는 재판매 솔루션의 요구로만 확인됐다 — 오픈API 요구는 미확인이다
    const keys = cj?.credentials.map((field) => field.key) ?? [];
    expect(keys).not.toContain('accessKeyId');
    expect(keys).not.toContain('endpoint');
    // 그 사실을 삼키지 않는다
    expect(cj?.connectionNotice).toContain('확인하지 못했어요');
    expect(cj?.connectionNotice).toContain('계약');
  });

  it('부를 수 없는 API 를 부를 수 있는 것처럼 두지 않는다 — 묶음은 목록이지 버튼이 아니다', () => {
    expect(cj?.apiPackage?.name).toBe('(일반)택배 운영 API');
    // 운영자가 포털에서 확인해 넘긴 7종 — 표기를 다듬지 않는다(포털에서 같은 이름을 찾아야 한다)
    expect(cj?.apiPackage?.operations).toEqual([
      '(공통) 상품 추적(운송장 번호 기준)',
      '(공통) 운송장 번호 생성',
      '(공통) 주소 정제',
      '(일반) 상품 추적(예약 정보 기준)',
      '(일반) 상품 추적(예약 정보 기준) 수신 여부 확정',
      '(일반) 예약 접수',
      '(일반) 예약 취소',
    ]);
  });

  it('켜도 달라지는 것이 없으면 없다고 둔다 — AI 문장을 물려받지 않는다', () => {
    // 이 자격증명을 부르는 코드가 앱에 한 줄도 없다. 'AI 응답 모드가 열립니다' 를 물려받으면
    // 저장 확인 다이얼로그가 거짓말을 한다 — 그것이 enableEffect 를 항목에 둔 이유다.
    expect(cj?.enableEffect).toBeNull();
    for (const entry of integrationCatalogue()) {
      if (entry.category === 'shipping') continue;
      expect(entry.enableEffect).not.toBeNull();
    }
  });
});

/* ── AI 화면이 읽는 상태 ────────────────────────────────────────────────────── */

describe('aiProviderStatuses — AI 화면에 넘기는 좁힌 계약', () => {
  it('핵심 4종만 넘긴다 — 파운데이션 모델까지 알 이유가 없다', () => {
    expect(aiProviderStatuses().map((item) => item.id)).toEqual([
      'openai',
      'claude',
      'gemini',
      'grok',
    ]);
  });

  it('표시명을 함께 넘긴다 — 잠금 사유가 어느 것을 붙이라고 말할 수 있어야 한다', () => {
    expect(aiProviderStatuses().find((item) => item.id === 'claude')?.label).toBe(
      'Anthropic Claude',
    );
  });

  it('저장된 연동이 없으므로 전부 꺼져 있다 — fail-closed 다', () => {
    expect(aiProviderStatuses().every((item) => !item.enabled)).toBe(true);
  });
});

describe('커머스 잔재가 남지 않았다', () => {
  it('카탈로그에 쇼핑몰·결제·소셜 로그인 항목이 하나도 없다', () => {
    // 이 화면은 한때 커머스 연동 진열대였다. 카탈로그를 AI 로 갈아 끼우면서
    // 옛 항목이 한 건이라도 남으면 화면이 무엇에 관한 것인지 흐려진다.
    const gone = [
      'simple-identity',
      'google-login',
      'naver-login',
      'kakao-sync',
      'social-share',
      'domestic-pg',
      'naver-analytics',
      'sms-alimtalk',
      'domain',
      'ssl',
    ];

    for (const id of gone) {
      expect(integrationCatalogue().some((item) => item.id === id)).toBe(false);
    }
  });

  it('분류에 결제·메시지·인프라 같은 옛 커머스 갈래가 없다', () => {
    const categories = new Set(integrationCatalogue().map((item) => item.category));
    expect([...categories].sort()).toEqual(['foundation', 'model', 'shipping']);
    // 축에 선언된 분류와 실제로 쓰이는 분류가 같다 — 항목 없는 분류가 남아 있지 않다
    expect([...categories].sort()).toEqual([...INTEGRATION_CATEGORIES].sort());
  });
});

/* ── 카탈로그에서 빠졌는데 저장돼 있는 연동 ─────────────────────────────────────
 *
 * 13종 → 6종으로 좁히면서 생긴 새 상태다. `resolveIntegrations` 는 카탈로그를 돌기 때문에
 * 그런 레코드를 **말없이 지나간다** — 운영자 눈에는 자기가 넣은 키가 그냥 사라진 것으로 보인다.
 * 방침(지우지 않는다 · 대신 말한다)의 근거는 integrations.ts 의 orphanedConnectionIds 머리말에. */

describe('빠진 프로바이더의 저장 레코드 — 지우지 않고 이름을 부른다', () => {
  const orphan = (providerId: string): AiConnection => ({
    providerId,
    enabled: true,
    storedFields: ['apiKey'],
    lastVerifiedAt: null,
    connectedAt: '2026-07-01T00:00:00.000Z',
  });

  it('카탈로그에 없는 저장 레코드를 찾아낸다', () => {
    expect(orphanedConnectionIds([orphan('mistral'), orphan('together')])).toEqual([
      'mistral',
      'together',
    ]);
  });

  it('카탈로그에 있는 것은 고아가 아니다 — 정상 연동을 경고로 만들지 않는다', () => {
    expect(orphanedConnectionIds([orphan('openai'), orphan('amazon-bedrock')])).toEqual([]);
  });

  it('저장된 것이 없으면 아무것도 말하지 않는다 — 오늘의 화면에는 배너가 없다', () => {
    expect(orphanedConnectionIds(listAiConnections())).toEqual([]);
  });

  it('고아 레코드가 목록에 행으로 새어 나오지 않는다 — 카탈로그가 정본이다', () => {
    const list = resolveIntegrations([orphan('groq')]);
    expect(list).toHaveLength(7);
    expect(list.some((item) => item.id === 'groq')).toBe(false);
    // 그리고 남은 항목을 덩달아 '연동 완료' 로 만들지도 않는다
    expect(list.every((item) => item.status === 'disconnected')).toBe(true);
  });
});
