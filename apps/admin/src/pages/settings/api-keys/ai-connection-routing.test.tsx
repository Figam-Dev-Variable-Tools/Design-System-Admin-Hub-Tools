// 목록 → 상세, 그리고 **저장이 실제로 되는가** · apps/admin/src/pages/settings/api-keys/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나 — 이 파일의 존재 이유]
// 이 화면의 이전 결함은 '저장 경로가 없다' 였고, 그보다 나쁜 결함은 이 코드베이스가 이미 한 번
// 겪은 것이다: **저장되지 않는데 성공처럼 보이는 화면**(삭제된 renameApiKey — 없는 id 를 조용히
// 지나치고 성공 토스트를 띄웠다).
//
// 그래서 여기서는 '토스트가 떴다' 로 단언하지 않는다 — 그것은 그 결함에서도 참이었다.
// **저장 뒤에 저장소가 실제로 무엇을 들고 있는지**를 본다.
//
// [비밀은 왕복하지 않는다] 입력한 API 키가 저장 후 폼·DOM·저장 문서 어디에도 남지 않는지 본다.
// [검증은 시늉하지 않는다] 저장이 성공해도 lastVerifiedAt 은 null 이다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import {
  enabledAiProviders,
  hasEnabledAiProvider,
  registerAiProviderLookup,
  resetAiProviderLookup,
} from '../../../shared/fixtures/ai-providers';
// 택배사 원장 조회기 — 배송 연동 상세가 이것에게 묻는다(미배선 경로를 실제로 밟아 보기 위해 쓴다)
import {
  registerCarrierCatalogLookup,
  resetCarrierCatalogLookup,
} from '../../../shared/domain/shipment';
import ApiKeysPage from './ApiKeysPage';
import AiConnectionPage from './AiConnectionPage';
import { AI_CONNECTION_LIST_PATH, aiConnectionPath } from './paths';
import {
  aiConnectionsStore,
  aiProviderStatuses,
  applyCredentials,
  connectionSavePayload,
  emptyConnectionRecord,
  findAiConnectionRecord,
  formToRecord,
  listAiConnections,
  recordToForm,
} from './data-source';
import { connectionIsUsable, storedFieldsOf } from './ai-connections';
import { integrationCatalogue } from './integrations';
import { credentialIssues, EMPTY_CONNECTION_FORM } from './validation';
import type { AiConnectionFormValues } from './validation';

/** 지금 주소를 화면에 내놓는다 — 단언이 'UI 가 바뀌었다' 가 아니라 **URL** 을 볼 수 있게 */
function LocationProbe() {
  const { pathname } = useLocation();
  return <span data-testid="pathname">{pathname}</span>;
}

/** 렌더 결과를 그대로 돌려준다 — 한 테스트에서 여러 프로바이더를 훑을 때 `unmount()` 가 필요하다 */
function renderAt(initialPath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <LocationProbe />
          <Routes>
            <Route path={AI_CONNECTION_LIST_PATH} element={<ApiKeysPage />} />
            <Route path={`${AI_CONNECTION_LIST_PATH}/:providerId`} element={<AiConnectionPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function currentPath(): string {
  return screen.getByTestId('pathname').textContent ?? '';
}

const catalogue = integrationCatalogue();
const entryOf = (id: string) => {
  const entry = catalogue.find((item) => item.id === id);
  if (entry === undefined) throw new Error(`카탈로그에 ${id} 가 없다`);
  return entry;
};

/** 저장소를 초기 상태로 되돌린다 — 테스트끼리 저장 결과가 새지 않게 */
async function resetStore(): Promise<void> {
  const current = aiConnectionsStore.peek();
  await aiConnectionsStore.save({
    value: { connections: [] },
    expectedRevision: current.revision,
    force: true,
  });
}

beforeEach(async () => {
  await resetStore();
  resetAiProviderLookup();
  // 테스트끼리 배선을 물려받으면 '모른다' 경로를 다시는 밟아 볼 수 없다
  resetCarrierCatalogLookup();
});

/** 폼 값 한 벌을 만든다 — 순수 함수 단언용. 안 적은 칸은 빈 문자열로 남는다 */
interface FormPatch {
  readonly enabled?: boolean;
  readonly credentials?: Partial<AiConnectionFormValues['credentials']>;
  readonly storedSecrets?: AiConnectionFormValues['storedSecrets'];
}

function formOf(providerId: string, patch: FormPatch): AiConnectionFormValues {
  return {
    ...EMPTY_CONNECTION_FORM,
    providerId,
    enabled: patch.enabled ?? false,
    storedSecrets: patch.storedSecrets ?? [],
    credentials: { ...EMPTY_CONNECTION_FORM.credentials, ...patch.credentials },
  };
}

/* ── 목록 → 상세 ─────────────────────────────────────────────────────────── */

describe('연동 목록 — 행은 상세로 가는 링크다', () => {
  it("'앱 설정' 이 더 이상 비활성이 아니다 — 갈 곳이 생겼다", async () => {
    renderAt(AI_CONNECTION_LIST_PATH);

    const link = await screen.findByRole('link', { name: 'OpenAI 앱 설정' });
    expect(link.getAttribute('href')).toBe('/settings/api-keys/openai');
  });

  it("'자격증명 저장 경로가 아직 없어요' 배너가 사라졌다", async () => {
    renderAt(AI_CONNECTION_LIST_PATH);

    await screen.findByRole('link', { name: 'OpenAI 앱 설정' });
    expect(screen.queryByText(/자격증명 저장 경로가 아직 없어요/)).toBeNull();
  });

  it('이름을 누르면 **URL 이 상세 라우트로 바뀐다**', async () => {
    const user = userEvent.setup();
    renderAt(AI_CONNECTION_LIST_PATH);

    const name = await screen.findByRole('link', { name: 'Anthropic Claude' });
    expect(currentPath()).toBe('/settings/api-keys');

    await user.click(name);

    await waitFor(() => {
      expect(currentPath()).toBe('/settings/api-keys/claude');
    });
  });

  it('카탈로그의 7종이 모두 상세 경로를 갖는다 — 갈 수 없는 행이 없다', () => {
    for (const entry of catalogue) {
      expect(entry.settingsPath).toBe(aiConnectionPath(entry.id));
      expect(entry.settingsUnavailableReason).toBeNull();
    }
  });

  it('카탈로그에서 뺀 프로바이더는 목록에 행이 없다 — 링크도 남지 않는다', async () => {
    renderAt(AI_CONNECTION_LIST_PATH);

    await screen.findByRole('link', { name: 'OpenAI 앱 설정' });
    // 모델 5종 + 게이트웨이 2종이 빠졌다. 기본 탭('모델')에 남아 있으면 여기서 잡힌다.
    for (const name of ['Mistral AI', 'Perplexity', 'Cohere', 'DeepSeek', 'Groq']) {
      expect(screen.queryByRole('link', { name })).toBeNull();
    }
    // 게이트웨이 분류가 통째로 사라졌으므로 그 탭도 없다 — 빈 탭을 남기지 않는다
    expect(screen.queryByRole('tab', { name: /게이트웨이/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: /클라우드/ })).toBeNull();
    expect(await screen.findByRole('tab', { name: /파운데이션 모델/ })).not.toBeNull();
  });
});

/* ── 카탈로그가 좁아진 뒤 남은 저장 레코드 ──────────────────────────────────
 *
 * 화면에서만 사라지고 문서는 남는다. **조용히 두지 않는다** — 목록이 그 사실을 말한다.
 * (지우지 않는 이유는 ./integrations.ts 의 orphanedConnectionIds 머리말에 있다.) */

describe('빠진 프로바이더의 저장 레코드 — 목록이 사실을 말한다', () => {
  it('저장된 자격증명이 남아 있으면 배너로 알린다', async () => {
    const current = aiConnectionsStore.peek();
    await aiConnectionsStore.save({
      value: connectionSavePayload(
        current.value,
        'groq',
        formToRecord(
          emptyConnectionRecord('groq'),
          formOf('groq', { enabled: true, credentials: { apiKey: 'gsk-old' } }),
        ),
      ),
      expectedRevision: current.revision,
    });

    renderAt(AI_CONNECTION_LIST_PATH);

    expect(await screen.findByText(/연동 목록에서 빠진 항목의 자격증명이 저장돼/)).not.toBeNull();
    expect(screen.getByText(/저장된 값은 지워지지 않았지만/)).not.toBeNull();
    // 그렇다고 행으로 되살아나지는 않는다 — 카탈로그가 정본이다
    expect(screen.queryByRole('link', { name: 'Groq' })).toBeNull();
  });

  it('남은 레코드가 없으면 배너도 없다 — 없는 경고를 만들어 두지 않는다', async () => {
    renderAt(AI_CONNECTION_LIST_PATH);

    await screen.findByRole('link', { name: 'OpenAI 앱 설정' });
    expect(screen.queryByText(/연동 목록에서 빠진 항목/)).toBeNull();
  });
});

/* ── 카테고리별 폼 ───────────────────────────────────────────────────────── */

describe('상세 화면 — 프로바이더가 **실제로 요구하는 칸만** 그린다', () => {
  it('모델(OpenAI)은 파운데이션 모델의 칸을 물려받지 않는다 — 요구가 다르다', async () => {
    renderAt(aiConnectionPath('openai'));

    // 조회가 끝나야 폼이 그려진다 — 그전에는 스켈레톤이다
    await screen.findByLabelText(/API 키/);
    expect(document.querySelector('#ai-credential-apiKey')).not.toBeNull();
    expect(document.querySelector('#ai-credential-endpoint')).toBeNull();
    expect(document.querySelector('#ai-credential-deployment')).toBeNull();
    expect(document.querySelector('#ai-credential-region')).toBeNull();
    expect(document.querySelector('#ai-credential-apiVersion')).toBeNull();
  });

  /* ── 늘어난 칸 — 넷 공통 둘 + OpenAI 둘 ────────────────────────────────────
   *
   * 이 묶음이 지키는 것: **칸이 실제로 그려진다.** 카탈로그만 고치고 폼이 따라오지 않으면
   * 요구와 화면이 갈라지고, 갈라진 채로 저장되면 진단이 가장 어려운 고장이 된다. */

  it('모델 4종에 베이스 URL·기본 모델 칸이 실제로 그려진다 — 죽은 칸이 아니다', async () => {
    for (const id of ['openai', 'claude', 'gemini', 'grok']) {
      const view = renderAt(aiConnectionPath(id));
      // 프로바이더마다 **독립 렌더**다 — 병렬로 섞으면 같은 라벨이 DOM 에 여럿 생긴다
      await screen.findByLabelText(/API 키/);

      expect(document.querySelector('#ai-credential-baseUrl')).not.toBeNull();
      expect(document.querySelector('#ai-credential-defaultModel')).not.toBeNull();
      // 둘 다 선택이다 — 필수 표식을 달지 않는다(끄고도 저장할 수 있어야 한다)
      expect(document.querySelector('#ai-credential-baseUrl')?.getAttribute('aria-required')).toBe(
        null,
      );
      view.unmount();
    }
  });

  it('OpenAI 만 조직·프로젝트 ID 칸을 그린다 — 모두에게 붙이는 칸이 아니다', async () => {
    renderAt(aiConnectionPath('openai'));

    await screen.findByLabelText(/API 키/);
    expect(document.querySelector('#ai-credential-organizationId')).not.toBeNull();
    expect(document.querySelector('#ai-credential-projectId')).not.toBeNull();
    // 비밀이 아니므로 password 가 아니다 — 되읽을 수 있어야 폼이 쓸모 있다
    expect(document.querySelector('#ai-credential-organizationId')?.getAttribute('type')).toBe(
      'text',
    );
  });

  it('조직·프로젝트 ID 는 OpenAI 밖으로 새지 않는다', async () => {
    renderAt(aiConnectionPath('claude'));

    await screen.findByLabelText(/API 키/);
    expect(document.querySelector('#ai-credential-organizationId')).toBeNull();
    expect(document.querySelector('#ai-credential-projectId')).toBeNull();
  });

  it('베이스 URL 은 파운데이션 모델·배송에 새지 않는다 — 주소를 정하는 칸이 둘이 되지 않는다', async () => {
    renderAt(aiConnectionPath('azure-openai'));

    await screen.findByLabelText(/API 키/);
    expect(document.querySelector('#ai-credential-endpoint')).not.toBeNull();
    expect(document.querySelector('#ai-credential-baseUrl')).toBeNull();
  });

  /* ── 경고는 되묻되 막지 않는다 ────────────────────────────────────────────── */

  it('모델 id 자리에 표시명을 넣으면 되묻는다 — 그래도 저장은 막지 않는다', async () => {
    const user = userEvent.setup();
    renderAt(aiConnectionPath('openai'));

    await screen.findByLabelText(/API 키/);
    await user.type(screen.getByLabelText(/기본 모델/), 'GPT-5.6 Sol');

    expect(await screen.findByText(/모델 id 가 아닌 것 같아요/)).not.toBeNull();
    // 되묻기이지 오류가 아니다 — 저장 버튼이 잠기지 않는다
    expect(screen.getByRole('button', { name: '저장' }).hasAttribute('disabled')).toBe(false);
  });

  it('접두어가 다른 실재 모델 id 는 되묻지 않는다 — 정규식을 박았다면 거절됐을 값이다', async () => {
    const user = userEvent.setup();
    renderAt(aiConnectionPath('grok'));

    await screen.findByLabelText(/API 키/);
    await user.type(screen.getByLabelText(/기본 모델/), 'grok-build-0.1');

    expect(screen.queryByText(/모델 id 가 아닌 것 같아요/)).toBeNull();
  });

  it('베이스 URL 은 경로가 붙은 공식 주소를 거절하지 않는다', async () => {
    const user = userEvent.setup();
    renderAt(aiConnectionPath('gemini'));

    await screen.findByLabelText(/API 키/);
    await user.type(
      screen.getByLabelText(/베이스 URL/),
      'https://generativelanguage.googleapis.com/v1beta/openai/',
    );

    expect(screen.queryByText(/베이스 URL 은 보통 https/)).toBeNull();
  });

  it('파운데이션 모델(Azure)은 네 칸이다 — 키 하나로 되지 않는다', async () => {
    renderAt(aiConnectionPath('azure-openai'));

    await screen.findByLabelText(/API 키/);
    for (const key of ['apiKey', 'endpoint', 'deployment', 'apiVersion']) {
      expect(document.querySelector(`#ai-credential-${key}`)).not.toBeNull();
    }
  });

  it('파운데이션 모델(Bedrock)은 리전을 함께 받는다 — 자격증명이 리전에 묶여 있다', async () => {
    renderAt(aiConnectionPath('amazon-bedrock'));

    await screen.findByLabelText(/API 키/);
    expect(document.querySelector('#ai-credential-region')).not.toBeNull();
    expect(document.querySelector('#ai-credential-deployment')).toBeNull();
  });

  /*
    [이 단언이 겨누던 것을 **두 번째로** 옮겼다]
      1차: 게이트웨이(OpenRouter)의 선택 헤더 → 그 분류가 통째로 빠져 항목이 사라졌다.
      2차: OpenAI 의 조직·프로젝트 헤더 → **2026-07 재조사에서 그 판단이 뒤집혔다.**
           1차 문서가 '다중 조직이거나 레거시 사용자 API 키를 쓰면 필요하다' 고 적는다.
           즉 그 값 없이는 연동이 아예 안 되는 운영자가 실재하므로 칸을 두는 쪽이 맞다.

    그런데 규율 자체('클라이언트가 고정으로 보내는 상수는 칸으로 만들지 않는다')는 여전히
    살아 있고, 지금 그것을 반증할 수 있는 항목은 Anthropic 의 `anthropic-version` 이다 —
    공식 표에서 **여전히 필수**인데도 운영자가 정할 값이 아니라 칸이 없다. 겨냥을 그리로 옮긴다.
  */
  it('클라이언트 상수는 칸으로 만들지 않고, 그 이유를 화면이 말한다', async () => {
    renderAt(aiConnectionPath('claude'));

    await screen.findByRole('heading', { name: 'Anthropic Claude' });
    // 필수 헤더인데도 입력칸이 없다 — 우리가 고정으로 보내는 값이기 때문이다
    expect(screen.queryByLabelText(/anthropic-version/)).toBeNull();
    expect(await screen.findByText(/우리가 고정으로 보내는 상수라 입력칸이 없어요/)).not.toBeNull();
  });

  it('반대로 **운영자가 정하는 값**은 칸이 된다 — 조직·프로젝트 ID 판단이 뒤집혔다', async () => {
    renderAt(aiConnectionPath('openai'));

    await screen.findByRole('heading', { name: 'OpenAI' });
    expect(entryOf('openai').credentials).toHaveLength(5);
    expect(await screen.findByLabelText(/조직 ID/)).not.toBeNull();
    expect(screen.getByLabelText(/프로젝트 ID/)).not.toBeNull();
    // 옛 문장('칸을 두지 않습니다')이 되살아나면 여기서 잡힌다
    expect(screen.queryByText(/이 화면에 칸을 두지 않아요/)).toBeNull();
    expect(screen.queryByText(/빈 값을 보내면 오히려 401/)).toBeNull();
  });

  it('카탈로그에서 뺀 프로바이더의 옛 주소는 빈 화면이 아니라 이유를 준다', async () => {
    // 목록에서 사라져도 링크·북마크는 남는다. 라우트는 여전히 열리고 화면이 사실을 말한다.
    renderAt(aiConnectionPath('mistral'));

    expect(await screen.findByText(/이 화면이 아는 연동이 아니에요/)).not.toBeNull();
    expect(screen.getByRole('link', { name: '연동 목록으로 돌아가기' })).not.toBeNull();
    expect(document.querySelector('#ai-credential-apiKey')).toBeNull();
  });

  it('Anthropic 은 우리가 받는 것만 말한다 — Bearer 를 쓰지 않는다고 말하지 않는다', async () => {
    renderAt(aiConnectionPath('claude'));

    await screen.findByRole('heading', { name: 'Anthropic Claude' });
    const notice = await screen.findByText(/x-api-key/);
    // `anthropic-version` 필수는 여전히 사실이라 남는다
    expect(notice.textContent).toContain('anthropic-version');
    // [고친 문장] 옛 화면은 '`Authorization: Bearer` 가 아니라 x-api-key 를 쓴다' 고 적었다.
    // 공식 표가 '둘 중 하나' 로 바뀌어 그 문장이 거짓이 됐다 — 되살아나면 여기서 잡힌다.
    expect(screen.queryByText(/Anthropic 만 인증 방식이 달라요/)).toBeNull();
    expect(notice.textContent).toContain('Workload Identity Federation');
  });

  it('Gemini 는 헤더 함정을 말한다 — Anthropic 에만 경고가 붙어 있던 비대칭을 없앴다', async () => {
    renderAt(aiConnectionPath('gemini'));

    await screen.findByRole('heading', { name: 'Google Gemini' });
    const notice = await screen.findByText(/x-goog-api-key/);
    // 실무에서 더 자주 터지는 쪽을 먼저 말한다. Vertex 혼동 경고도 지우지 않았다.
    expect(notice.textContent).toContain('Authorization: Bearer');
    expect(notice.textContent).toContain('Vertex AI');
    expect(document.querySelector('#ai-credential-region')).toBeNull();
  });

  it('Grok 은 더 이상 주의사항이 비어 있지 않다 — 이 키로는 관리 API 를 부를 수 없다', async () => {
    renderAt(aiConnectionPath('grok'));

    await screen.findByRole('heading', { name: 'Grok' });
    const notice = await screen.findByText(/management key/);
    expect(notice.textContent).toContain('리브랜딩');
  });

  it('알 수 없는 프로바이더는 빈 화면이 아니라 이유와 돌아갈 길을 준다', async () => {
    renderAt(aiConnectionPath('not-a-provider'));

    expect(await screen.findByText(/이 화면이 아는 연동이 아니에요/)).not.toBeNull();
    expect(screen.getByRole('link', { name: '연동 목록으로 돌아가기' })).not.toBeNull();
    // 폼을 그리지 않는다 — 어디로도 저장되지 않을 입력칸을 내놓지 않는다
    expect(document.querySelector('#ai-credential-apiKey')).toBeNull();
  });
});

/* ── 배송 연동 상세 — 새 분류가 같은 화면 하나를 쓴다 ────────────────────────
 *
 * 이 묶음이 지키는 것: **AI 전제를 하드코딩하지 않았다.** 항목마다 달라지는 문장은 전부
 * 카탈로그에서 나오고(entry.credentials · connectionNotice · enableEffect · carrierCode ·
 * apiPackage), 그래서 배송 항목 하나를 더하는 데 화면 분기가 늘지 않았다. */

describe('배송 연동 상세 — 같은 화면이 AI 가 아닌 연동도 그린다', () => {
  it('배송 탭에 CJ대한통운이 서고 상세로 가는 링크가 있다', async () => {
    const user = userEvent.setup();
    renderAt(AI_CONNECTION_LIST_PATH);

    // 기본 탭은 '모델' 이라 배송 항목은 아직 보이지 않는다 — 탭을 눌러야 나온다
    await screen.findByRole('link', { name: 'OpenAI 앱 설정' });
    await user.click(await screen.findByRole('tab', { name: /배송/ }));

    const link = await screen.findByRole('link', { name: 'CJ대한통운' });
    expect(link.getAttribute('href')).toBe('/settings/api-keys/cj-logistics');
  });

  it('요구하는 칸만 그린다 — 인증키와 고객코드 둘이고 AI 전용 칸은 없다', async () => {
    renderAt(aiConnectionPath('cj-logistics'));

    await screen.findByLabelText(/API 키/);
    expect(document.querySelector('#ai-credential-customerCode')).not.toBeNull();
    // 리전·배포명·엔드포인트는 파운데이션 모델의 요구다 — 여기 새어 나오면 폼이 거짓말을 한다
    for (const key of ['region', 'deployment', 'endpoint', 'apiVersion']) {
      expect(document.querySelector(`#ai-credential-${key}`)).toBeNull();
    }
  });

  it('확인하지 못한 것을 확인한 척하지 않는다 — 화면이 스스로 말한다', async () => {
    renderAt(aiConnectionPath('cj-logistics'));

    await screen.findByRole('heading', { name: 'CJ대한통운' });
    expect(await screen.findByText(/기업고객 계약을 맺고/)).not.toBeNull();
    expect(screen.getByText(/확인하지 못했어요/)).not.toBeNull();
  });

  it('7개 API 를 보여 주되 부를 수 있는 것처럼 만들지 않는다', async () => {
    renderAt(aiConnectionPath('cj-logistics'));

    expect(await screen.findByText(/\(일반\)택배 운영 API/)).not.toBeNull();
    expect(screen.getByText('(일반) 예약 접수')).not.toBeNull();
    expect(screen.getByText('(공통) 주소 정제')).not.toBeNull();
    expect(screen.getByText(/이 화면은 아직 이 중 어느 것도 부르지 않아요/)).not.toBeNull();
    // API 하나하나에 누를 것을 붙이지 않는다 — 누르면 성공을 지어내게 된다
    expect(screen.queryByRole('button', { name: /예약 접수|주소 정제|운송장/ })).toBeNull();
  });

  it('AI 항목의 문장을 물려받지 않는다 — 켜도 AI 응답 모드와 무관하다', async () => {
    const user = userEvent.setup();
    renderAt(aiConnectionPath('cj-logistics'));

    await screen.findByLabelText(/API 키/);
    await user.click(screen.getByRole('switch', { name: 'CJ대한통운 사용' }));
    await user.type(screen.getByLabelText(/API 키/), 'cj-test-key');
    await user.type(screen.getByLabelText(/고객코드/), '12345678');
    await user.click(screen.getByRole('button', { name: '저장' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText(/응답 모드/)).toBeNull();
    expect(within(dialog).getByText(/이 연동만 저장돼요/)).not.toBeNull();
  });

  it('AI 항목에서는 그 결과를 여전히 말한다 — 문장을 지운 것이 아니다', async () => {
    const user = userEvent.setup();
    renderAt(aiConnectionPath('openai'));

    await screen.findByLabelText(/API 키/);
    await user.click(screen.getByRole('switch', { name: 'OpenAI 사용' }));
    await user.type(screen.getByLabelText(/API 키/), 'sk-test');
    await user.click(screen.getByRole('button', { name: '저장' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/응답 모드/)).not.toBeNull();
  });
});

/* ── 배송 정책과의 어긋남을 화면이 드러낸다 ──────────────────────────────────
 *
 * 자격증명이 저장돼 있다는 것과 그 택배사로 물건이 나간다는 것은 다른 사실이다. 두 사실이
 * 어긋난 채로 조용히 성립하지 않도록, 상세 화면이 배송 정책에게 묻고 답을 그대로 그린다. */

describe('배송 정책 연결 카드', () => {
  it('배선 전에는 등록 여부를 지어내지 않는다 — 확인하지 못했다고 말한다', async () => {
    resetCarrierCatalogLookup();
    renderAt(aiConnectionPath('cj-logistics'));

    expect(await screen.findByText('확인하지 못함')).not.toBeNull();
    // '등록되지 않음' 이라고 쓰면 운영자가 하지 않아도 될 일을 하러 간다
    expect(screen.queryByText('등록되지 않음')).toBeNull();
  });

  it('정책에 없으면 말하고, 어디로 가야 하는지까지 알려 준다', async () => {
    registerCarrierCatalogLookup(() => []);
    renderAt(aiConnectionPath('cj-logistics'));

    expect(await screen.findByText('등록되지 않음')).not.toBeNull();
    expect(
      screen.getByText(/자격증명이 저장돼 있어도 이 택배사로는 배송이 나가지 않아요/),
    ).not.toBeNull();
    expect(screen.getByRole('link', { name: '배송 정책' }).getAttribute('href')).toBe(
      '/products/shipping',
    );
  });

  it('정책이 그 코드를 알면 정책의 이름을 그린다 — 카탈로그가 이름을 소유하지 않는다', async () => {
    registerCarrierCatalogLookup(() => [
      {
        id: 'car-cj',
        // 운영자가 정책에 적어 둔 표기가 따로 있으면 **그것**이 나와야 한다
        name: 'CJ대한통운(계약분)',
        code: 'CJGLS',
        trackingUrlTemplate: '',
        active: true,
      },
    ]);
    renderAt(aiConnectionPath('cj-logistics'));

    expect(await screen.findByText('사용 중')).not.toBeNull();
    expect(screen.getByText('CJ대한통운(계약분)')).not.toBeNull();
    expect(screen.queryByText(/배송이 나가지 않아요/)).toBeNull();
  });

  it('꺼 둔 택배사는 켜진 것과 다르게 그린다 — 선택지에 없으면 나가지 않는다', async () => {
    registerCarrierCatalogLookup(() => [
      {
        id: 'car-cj',
        name: 'CJ대한통운',
        code: 'CJGLS',
        trackingUrlTemplate: '',
        active: false,
      },
    ]);
    renderAt(aiConnectionPath('cj-logistics'));

    expect(await screen.findByText('사용 꺼짐')).not.toBeNull();
    expect(screen.getByText(/배송이 나가지 않아요/)).not.toBeNull();
  });

  it('택배사가 아닌 연동에는 이 카드가 붙지 않는다', async () => {
    registerCarrierCatalogLookup(() => []);
    renderAt(aiConnectionPath('openai'));

    await screen.findByLabelText(/API 키/);
    expect(screen.queryByText('배송 정책 연결')).toBeNull();
    expect(screen.queryByText('계약하면 열리는 API')).toBeNull();
  });
});

/* ── 저장 — 이 파일의 중심 ───────────────────────────────────────────────── */

describe('저장 — 실제로 저장되거나, 안 되면 안 된다고 말한다', () => {
  it('키를 넣고 켜서 저장하면 **저장소가 실제로 그 연동을 들고 있다**', async () => {
    const user = userEvent.setup();
    renderAt(aiConnectionPath('openai'));

    await screen.findByLabelText(/API 키/);

    await user.click(screen.getByRole('switch', { name: 'OpenAI 사용' }));
    await user.type(screen.getByLabelText(/API 키/), 'sk-test-not-a-real-key');
    await user.click(screen.getByRole('button', { name: '저장' }));

    // 확인 다이얼로그를 지나야 저장된다 — 클릭 한 번으로 바뀌지 않는다
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /저장/ }));

    await waitFor(() => {
      expect(findAiConnectionRecord('openai')?.enabled).toBe(true);
    });

    const record = findAiConnectionRecord('openai');
    expect(record?.storedSecrets).toEqual(['apiKey']);
    expect(connectionIsUsable(entryOf('openai').credentials, listAiConnections()[0])).toBe(true);
  });

  it('저장된 문서에 **평문이 없다** — 저장 여부만 남는다', async () => {
    const record = applyCredentials(emptyConnectionRecord('openai'), ['apiKey'], {
      apiKey: 'sk-plaintext-must-not-persist',
    });

    expect(JSON.stringify(record)).not.toContain('sk-plaintext-must-not-persist');
    expect(record.storedSecrets).toEqual(['apiKey']);
    expect(record.publicValues.apiKey).toBeUndefined();
  });

  it('저장된 키는 폼으로 되돌아오지 않는다 — 마스크만 그린다', () => {
    const record = applyCredentials(emptyConnectionRecord('openai'), ['apiKey'], {
      apiKey: 'sk-secret',
    });

    expect(recordToForm(record).credentials.apiKey).toBe('');
    expect(recordToForm(record).storedSecrets).toEqual(['apiKey']);
  });

  it('비밀이 아닌 칸은 되읽는다 — 배포명을 매번 다시 입력하게 하지 않는다', () => {
    const record = applyCredentials(emptyConnectionRecord('azure-openai'), ['apiKey'], {
      apiKey: 'k',
      endpoint: 'https://r.openai.azure.com',
      deployment: 'gpt-main',
    });

    expect(recordToForm(record).credentials.deployment).toBe('gpt-main');
    expect(recordToForm(record).credentials.endpoint).toBe('https://r.openai.azure.com');
  });

  it('빈 선택 칸은 아예 저장되지 않는다 — 빈 값을 보내면 401 이 난다', () => {
    const record = applyCredentials(emptyConnectionRecord('azure-openai'), ['apiKey'], {
      apiKey: 'k',
      endpoint: 'https://r.openai.azure.com',
      deployment: 'd',
      apiVersion: '   ',
    });

    expect(Object.keys(record.publicValues)).not.toContain('apiVersion');
    expect(storedFieldsOf(record)).not.toContain('apiVersion');
    // 그래도 연동은 성립한다 — 선택 칸은 판정에 넣지 않는다
    expect(
      connectionIsUsable(entryOf('azure-openai').credentials, {
        providerId: 'azure-openai',
        enabled: true,
        storedFields: storedFieldsOf(record),
        lastVerifiedAt: null,
        connectedAt: null,
      }),
    ).toBe(true);
  });

  it('비밀 칸을 비워 두면 기존 키가 유지된다 — 저장할 때마다 재발급하게 하지 않는다', () => {
    const first = applyCredentials(emptyConnectionRecord('openai'), ['apiKey'], { apiKey: 'k1' });
    const second = applyCredentials(first, ['apiKey'], { apiKey: '' });

    expect(second.storedSecrets).toEqual(['apiKey']);
  });

  it('켜려는데 필수 칸이 비면 저장을 막는다 — 켰는데 안 되는 상태를 만들지 않는다', () => {
    const issues = credentialIssues(
      entryOf('azure-openai').credentials,
      formOf('azure-openai', { enabled: true, credentials: { apiKey: 'k' } }),
    );

    expect(issues.map((issue) => issue.field)).toContain('endpoint');
    expect(issues.map((issue) => issue.field)).toContain('deployment');
    // 선택 칸은 막지 않는다
    expect(issues.map((issue) => issue.field)).not.toContain('apiVersion');
  });

  it('끄는 것은 언제나 허용한다 — 반쯤 채워져 있어도 끌 수 있다', () => {
    const issues = credentialIssues(
      entryOf('azure-openai').credentials,
      formOf('azure-openai', { enabled: false, credentials: { apiKey: '' } }),
    );

    expect(issues).toHaveLength(0);
  });

  it('이미 저장된 키가 있으면 다시 입력하지 않아도 켤 수 있다', () => {
    const issues = credentialIssues(
      entryOf('openai').credentials,
      formOf('openai', { enabled: true, storedSecrets: ['apiKey'] }),
    );

    expect(issues).toHaveLength(0);
  });

  it('저장은 **이 프로바이더 자리만** 쓴다 — 보이지 않는 연동을 덮어쓰지 않는다', () => {
    const other = applyCredentials(emptyConnectionRecord('claude'), ['apiKey'], { apiKey: 'k' });
    const server = { connections: [other] };

    const next = connectionSavePayload(
      server,
      'openai',
      formToRecord(emptyConnectionRecord('openai'), formOf('openai', { enabled: true })),
    );

    expect(next.connections.find((item) => item.providerId === 'claude')).toBe(other);
    expect(next.connections).toHaveLength(2);
  });

  it('검증 시각을 지어내지 않는다 — 저장이 성공해도 lastVerifiedAt 은 null 이다', () => {
    const saved = connectionSavePayload(
      { connections: [] },
      'openai',
      formToRecord(
        emptyConnectionRecord('openai'),
        formOf('openai', { enabled: true, credentials: { apiKey: 'k' } }),
      ),
    );

    expect(saved.connections[0]?.lastVerifiedAt).toBeNull();
    // 반면 연동 시작일은 **성립한 순간**에 찍힌다 — 저장 시각이 아니라 상태 전이 시점이다
    expect(saved.connections[0]?.connectedAt).not.toBeNull();
  });

  it('연동 시작일은 재연동해도 최초 값을 유지한다', () => {
    const first = connectionSavePayload(
      { connections: [] },
      'openai',
      formToRecord(
        emptyConnectionRecord('openai'),
        formOf('openai', { enabled: true, credentials: { apiKey: 'k' } }),
      ),
    );
    const firstAt = first.connections[0]?.connectedAt;
    const base = first.connections[0];
    if (base === undefined) throw new Error('저장된 연동이 없다');

    // 껐다가 다시 켠다
    const off = connectionSavePayload(first, 'openai', { ...base, enabled: false });
    const back = connectionSavePayload(off, 'openai', { ...base, enabled: true });

    expect(back.connections[0]?.connectedAt).toBe(firstAt);
  });

  it('필수 칸이 안 찬 채로는 연동 시작일도 찍히지 않는다 — 성립한 적이 없다', () => {
    const half = connectionSavePayload(
      { connections: [] },
      'azure-openai',
      formToRecord(
        emptyConnectionRecord('azure-openai'),
        formOf('azure-openai', { enabled: true, credentials: { apiKey: 'k' } }),
      ),
    );

    expect(half.connections[0]?.connectedAt).toBeNull();
  });
});

/* ── 저장이 AI 화면의 잠금을 푼다 ────────────────────────────────────────────
 *
 * [왜 pages/ai 를 import 하지 않는가] 그러면 이 테스트가 축1(page-coupling)이 금지하는 결합을
 * 그대로 만든다. 두 화면은 **공통 층의 조회기 계약**으로만 만나므로, 여기서도 그 계약을 겨눈다:
 * 저장이 끝나면 `enabledAiProviders()` 가 이 프로바이더를 돌려준다는 사실 하나면 충분하다.
 * (그 값이 '빠른·전문가·헤비' 를 여는 것은 pages/ai/_shared/modes.ts 가 보장한다.) */

describe('저장이 AI 응답 모드의 잠금을 푼다', () => {
  it('저장 전에는 조회기가 아무 프로바이더도 돌려주지 않는다 — fail-closed', () => {
    registerAiProviderLookup(aiProviderStatuses);
    expect(enabledAiProviders()).toHaveLength(0);
    expect(hasEnabledAiProvider()).toBe(false);
  });

  it('키를 저장하고 켜면 조회기가 그 프로바이더를 돌려준다', async () => {
    registerAiProviderLookup(aiProviderStatuses);

    const current = aiConnectionsStore.peek();
    await aiConnectionsStore.save({
      value: connectionSavePayload(
        current.value,
        'openai',
        formToRecord(
          emptyConnectionRecord('openai'),
          formOf('openai', { enabled: true, credentials: { apiKey: 'sk-test' } }),
        ),
      ),
      expectedRevision: current.revision,
    });

    expect(hasEnabledAiProvider()).toBe(true);
    expect(enabledAiProviders().map((provider) => provider.id)).toEqual(['openai']);
  });

  it('꺼 두면 키가 저장돼 있어도 열리지 않는다 — 운영자가 쓰지 않겠다고 정한 것이다', async () => {
    registerAiProviderLookup(aiProviderStatuses);

    const current = aiConnectionsStore.peek();
    await aiConnectionsStore.save({
      value: connectionSavePayload(
        current.value,
        'openai',
        formToRecord(
          emptyConnectionRecord('openai'),
          formOf('openai', { enabled: false, credentials: { apiKey: 'sk-test' } }),
        ),
      ),
      expectedRevision: current.revision,
    });

    expect(hasEnabledAiProvider()).toBe(false);
  });
});

/* ── 연결 검증과 자격증명 충족은 다른 사실이다 ───────────────────────────── */

describe('연결 상태 — 검증됨과 채워짐을 가른다', () => {
  it('자격증명이 채워져도 검증은 여전히 확인한 적 없음이다', async () => {
    const user = userEvent.setup();
    renderAt(aiConnectionPath('openai'));

    await screen.findByLabelText(/API 키/);
    await user.click(screen.getByRole('switch', { name: 'OpenAI 사용' }));
    await user.type(screen.getByLabelText(/API 키/), 'sk-test');
    await user.click(screen.getByRole('button', { name: '저장' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /저장/ }));

    await waitFor(() => {
      expect(screen.getByText('채워짐')).not.toBeNull();
    });
    expect(screen.getByText('확인한 적 없음')).not.toBeNull();
    // 부를 곳이 없는 '검증' 버튼을 그리지 않는다 — 누르면 성공을 지어내게 된다
    expect(screen.queryByRole('button', { name: /연결 검증|연결 테스트/ })).toBeNull();
  });

  it('검증을 만들지 않은 근거에 **제공자 문서도 같은 말을 한다**가 붙었다', async () => {
    renderAt(aiConnectionPath('openai'));

    await screen.findByLabelText(/API 키/);
    expect(await screen.findByText(/제공자 공식 문서도 같은 말을 해요/)).not.toBeNull();
    // 여전히 버튼은 없다 — 근거가 늘었을 뿐 판단은 그대로다
    expect(screen.queryByRole('button', { name: /연결 검증|연결 테스트/ })).toBeNull();
  });
});

/* ── 사용량·요금·한도는 화면에 들이지 않는다 ─────────────────────────────────
 *
 * 넷의 조회 수단이 고르지 않고, OpenAI 는 **admin 키라는 비밀을 하나 더** 받아야 읽힌다 —
 * 받는 비밀을 늘리지 않는다는 이 섹션의 규약과 정면으로 부딪친다. 그래서 숫자는 없고
 * 갈 곳만 있다(주소를 확인한 항목만). */

describe('한도 — 값은 두지 않고 갈 곳만 가리킨다', () => {
  it('주소를 확인한 항목은 링크를 준다', async () => {
    renderAt(aiConnectionPath('grok'));

    await screen.findByLabelText(/API 키/);
    const link = await screen.findByRole('link', { name: 'Grok 한도 안내 열기' });
    expect(link.getAttribute('href')).toBe('https://docs.x.ai/docs/rate-limits');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('확인하지 못한 항목은 링크를 지어내지 않고 그 사실을 말한다', async () => {
    renderAt(aiConnectionPath('amazon-bedrock'));

    await screen.findByLabelText(/API 키/);
    expect(await screen.findByText(/한도 안내 주소를 확인하지 못해/)).not.toBeNull();
    expect(screen.queryByRole('link', { name: /한도 안내 열기/ })).toBeNull();
  });

  it('사용량 숫자를 그리지 않는다 — 조회 수단이 고르지 않다는 사실을 화면이 말한다', async () => {
    renderAt(aiConnectionPath('openai'));

    await screen.findByLabelText(/API 키/);
    expect(await screen.findByText(/사용량·요금·한도는 이 화면에 없어요/)).not.toBeNull();
    expect(screen.queryByText(/토큰\/분|RPM|TPM|이번 달 사용량/)).toBeNull();
  });
});

/* ── 늘어난 공개 칸이 실제로 왕복하는가 ─────────────────────────────────────
 *
 * 새 칸이 '그려지기만' 하고 저장·되읽기 경로에 없으면 운영자는 매번 다시 입력하게 된다.
 * 비밀이 아닌 칸은 **되읽혀야** 폼이 쓸모 있다는 것이 이 섹션의 오래된 규약이다. */

describe('공개 칸의 왕복 — 베이스 URL·기본 모델·조직/프로젝트 ID', () => {
  it('저장하면 값이 그대로 남고, 폼이 되읽는다 — 비밀이 아니기 때문이다', () => {
    const record = formToRecord(
      emptyConnectionRecord('openai'),
      formOf('openai', {
        enabled: true,
        credentials: {
          apiKey: 'sk-test',
          baseUrl: 'https://proxy.example.com/v1',
          defaultModel: 'gpt-5.6-sol',
          organizationId: 'org-abc',
          projectId: 'proj_abc',
        },
      }),
    );

    // 비밀만 이름으로 바뀌고 평문이 버려진다
    expect(record.storedSecrets).toEqual(['apiKey']);
    expect(JSON.stringify(record)).not.toContain('sk-test');

    // 공개 칸은 값으로 남는다
    expect(record.publicValues.baseUrl).toBe('https://proxy.example.com/v1');
    expect(record.publicValues.defaultModel).toBe('gpt-5.6-sol');
    expect(record.publicValues.organizationId).toBe('org-abc');
    expect(record.publicValues.projectId).toBe('proj_abc');

    // 그리고 폼으로 되돌아온다 — 매번 다시 입력하게 하지 않는다
    const form = recordToForm(record);
    expect(form.credentials.defaultModel).toBe('gpt-5.6-sol');
    expect(form.credentials.organizationId).toBe('org-abc');
    expect(form.credentials.apiKey).toBe('');
  });

  it('선택 칸을 비우면 저장되지 않는다 — 빈 헤더를 보낼 값으로 읽히지 않게', () => {
    const record = formToRecord(
      emptyConnectionRecord('openai'),
      formOf('openai', {
        enabled: true,
        credentials: { apiKey: 'sk-test', organizationId: '   ' },
      }),
    );

    expect(Object.keys(record.publicValues)).not.toContain('organizationId');
    expect(storedFieldsOf(record)).not.toContain('organizationId');
    // 선택 칸이 비어도 연동은 성립한다
    expect(
      connectionIsUsable(entryOf('openai').credentials, {
        providerId: 'openai',
        enabled: true,
        storedFields: storedFieldsOf(record),
        lastVerifiedAt: null,
        connectedAt: null,
      }),
    ).toBe(true);
  });

  it('모델 id 가 이상해도 저장을 막지 않는다 — 되묻기이지 오류가 아니다', () => {
    const issues = credentialIssues(
      entryOf('openai').credentials,
      formOf('openai', {
        enabled: true,
        credentials: { apiKey: 'sk-test', defaultModel: 'GPT-5.6 Sol' },
      }),
    );

    expect(issues).toHaveLength(0);
  });
});
