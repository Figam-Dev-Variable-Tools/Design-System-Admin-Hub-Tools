// 결제 설정 목록 → PG 상세는 **주소가 바뀌는 이동**이다 · apps/admin/src/pages/settings/payment/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// ① 타일은 disclosure 가 아니라 **링크**다 — '패널이 나타났다' 로 단언하면 아무것도 지키지
//    못한다(펼침 구현에서도 참이다). 반드시 **URL 이 바뀌었는가**를 본다.
// ② **사용 중인 PG 가 없으면** 목록이 그 사실과 **결과**를 말한다(문의로 나간다 + 문의 화면 링크).
// ③ 상세는 **그 PG 가 실제로 요구하는 칸만** 그린다 — 고정된 칸 묶음이 아니다.
// ④ **비밀은 평문 입력칸으로 그려지지 않는다** — 서명 재료(signKey·site_key)가 특히 그렇다.
// ⑤ 우리가 콘솔에 넣어 줄 주소는 **입력이 아니라 읽는 값**이다(편집 컨트롤이 아니다).
// ⑥ **'연결 테스트' 버튼이 없다** — 있으면 시크릿을 브라우저로 내려야 하고 규약이 거짓이 된다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import { resetPaymentSettings } from '../../../shared/commerce/payment-settings';
import PaymentSettingsPage from './PaymentSettingsPage';
import PgProviderPage from './PgProviderPage';
import { PAYMENT_LIST_PATH, pgTargetPath } from './paths';

/** 지금 주소를 화면에 내놓는다 — 단언이 '패널' 이 아니라 **URL** 을 볼 수 있게 */
function LocationProbe() {
  const { pathname } = useLocation();
  return <span data-testid="pathname">{pathname}</span>;
}

function renderAt(initialPath: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[initialPath]}>
          <LocationProbe />
          <Routes>
            <Route path={PAYMENT_LIST_PATH} element={<PaymentSettingsPage />} />
            <Route path={`${PAYMENT_LIST_PATH}/:target`} element={<PgProviderPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function currentPath(): string {
  return screen.getByTestId('pathname').textContent ?? '';
}

/** 타일 = PG 로 가는 링크. 접근 이름에 상태가 실려 있으므로 그것으로 찾는다 */
function tile(label: string): HTMLElement {
  return screen.getByRole('link', { name: new RegExp(`^${label},`) });
}

afterEach(() => {
  resetPaymentSettings();
});

describe('목록 — 타일은 링크이고, 두 묶음은 하나의 카탈로그에서 파생된다', () => {
  it('타일이 그 PG 의 상세 주소를 가리키는 링크로 그려진다', async () => {
    renderAt(PAYMENT_LIST_PATH);

    const toss = await screen.findByRole('link', { name: /^토스페이먼츠,/ });
    expect(toss.getAttribute('href')).toBe('/settings/payment/toss');
  });

  it('타일에 aria-expanded · aria-controls 가 없다 — 여는 것이 아니라 이동한다', async () => {
    renderAt(PAYMENT_LIST_PATH);

    const toss = await screen.findByRole('link', { name: /^토스페이먼츠,/ });
    expect(toss.getAttribute('aria-expanded')).toBeNull();
    expect(toss.getAttribute('aria-controls')).toBeNull();
  });

  it('타일을 누르면 **URL 이 상세 라우트로 바뀐다**', async () => {
    renderAt(PAYMENT_LIST_PATH);
    await screen.findByRole('link', { name: /^KG이니시스,/ });

    await userEvent.click(tile('KG이니시스'));

    expect(currentPath()).toBe(pgTargetPath('inicis'));
  });

  it('상태가 접근 이름에 실린다 — 알약 색만으로 말하지 않는다', async () => {
    renderAt(PAYMENT_LIST_PATH);

    // 기본 설정은 PG 미사용이다 — 토스에 값이 없으므로 '연동 안 함'
    const toss = await screen.findByRole('link', { name: /^토스페이먼츠,/ });
    expect(toss.getAttribute('aria-label')).toContain('연동 안 함');
  });

  it('자격증명 폼은 목록 화면에 없다 — 상세로 옮겨졌다', async () => {
    renderAt(PAYMENT_LIST_PATH);
    await screen.findByRole('link', { name: /^토스페이먼츠,/ });

    expect(screen.queryByLabelText(/클라이언트 키/)).toBeNull();
    expect(screen.queryByLabelText(/시크릿 키/)).toBeNull();
  });
});

describe('사용 중인 PG 가 없으면 — 목록이 사실과 결과를 함께 말한다', () => {
  it("'결제 없이 운영해요' 와 '문의하기로 나가요' 를 함께 말한다", async () => {
    renderAt(PAYMENT_LIST_PATH);

    expect(await screen.findByText(/결제 없이 운영해요/)).toBeTruthy();
    // 여러 곳에서 말한다(빈 묶음 안내 · 사실 한 줄) — 하나만 있어야 한다고 단언하지 않는다
    expect(screen.getAllByText(/문의하기/).length).toBeGreaterThan(0);
  });

  it('문의가 쌓이는 두 화면으로 가는 링크를 준다 — 다음에 갈 곳을 끊지 않는다', async () => {
    renderAt(PAYMENT_LIST_PATH);

    const product = await screen.findByRole('link', { name: '상품 문의' });
    const program = screen.getByRole('link', { name: '프로그램 문의' });

    expect(product.getAttribute('href')).toBe('/products/inquiries');
    expect(program.getAttribute('href')).toBe('/programs/inquiries');
  });

  /*
   * [여기서 '사용 중 묶음' 을 렌더로 확인하지 않는 이유 — 다시 시도하지 말 것]
   * 이 화면의 저장소는 모듈 로드 시점에 `readPaymentSettings()` 를 **한 번 스냅샷**한다
   * (./data-source.ts 의 createRevisionedStore). 그래서 테스트에서 `writePaymentSettings` 를
   * 불러도 화면은 여전히 처음 값을 그린다 — 그걸 모르고 단언하면 '사용 중이 안 뜬다' 는
   * 거짓 실패를 보게 된다(실제로 그렇게 한 번 실패했다).
   * 묶음 파생 자체는 순수 함수라 ./payment.test.ts 의 `pgTileStatus` 단언이 세 갈래를 모두
   * 고정한다 — 렌더에서 다시 확인할 것이 없다.
   */

  it('미리보기 카드가 아니라 **사실 한 줄**로 말한다', async () => {
    renderAt(PAYMENT_LIST_PATH);

    expect(await screen.findByText(/지금 사이트 전체:/)).toBeTruthy();
    // 가짜 상품 카드(상품 상세 / 프로그램 상세 스테이지)를 그리지 않는다
    expect(screen.queryByText('상품 상세')).toBeNull();
    expect(screen.queryByText('프로그램 상세')).toBeNull();
  });
});

describe('상세 — 그 PG 가 실제로 요구하는 칸만 그린다', () => {
  it('토스는 클라이언트 키 · 상점아이디 · 시크릿 키 셋이다', async () => {
    renderAt(pgTargetPath('toss'));

    expect(await screen.findByLabelText(/클라이언트 키/)).toBeTruthy();
    expect(screen.getByLabelText(/상점아이디\(MID\)/)).toBeTruthy();
    expect(screen.getByLabelText(/시크릿 키/)).toBeTruthy();
    // 다른 PG 의 칸이 섞여 들어오지 않는다
    expect(screen.queryByLabelText(/사이트코드/)).toBeNull();
  });

  it('KG이니시스는 다섯 칸이고 선택 필드까지 그린다 — 고정 세 칸이 아니다', async () => {
    renderAt(pgTargetPath('inicis'));

    expect(await screen.findByLabelText(/PG상점아이디\(MID\)/)).toBeTruthy();
    expect(screen.getByLabelText(/웹표준 signkey/)).toBeTruthy();
    expect(screen.getByLabelText(/INILite Key/)).toBeTruthy();
    expect(screen.getByLabelText(/INIAPI Key/)).toBeTruthy();
    expect(screen.getByLabelText(/INIAPI IV/)).toBeTruthy();
  });

  it('게이트웨이는 개별 PG 와 다른 축임을 화면이 말한다', async () => {
    renderAt(pgTargetPath('portone'));

    expect(await screen.findByLabelText(/상점 아이디\(storeId\)/)).toBeTruthy();
    expect(screen.getByLabelText(/채널 키\(channelKey\)/)).toBeTruthy();
    expect(screen.getByText(/채널 안에 들어가요/)).toBeTruthy();
  });

  it('알 수 없는 PG 는 빈 화면이 아니라 이유와 돌아갈 길을 준다', async () => {
    renderAt(`${PAYMENT_LIST_PATH}/paypal`);

    expect(await screen.findByText(/아는 결제 서비스가 아니에요/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /결제 서비스 목록으로 돌아가기/ })).toBeTruthy();
  });
});

describe('비밀은 평문 칸으로 그려지지 않는다 — 서명 재료가 특히 그렇다', () => {
  /**
   * `signKey`·`site_key` 는 이름이 '키' 라서 식별자처럼 읽히지만 요청 서명(SHA256)의 재료다.
   * 평범한 텍스트 칸으로 그리는 것이 이 화면이 저지를 수 있는 최악의 실수라, 타입이 아니라
   * **렌더된 DOM** 으로 못박는다.
   */
  it.each([
    ['inicis', /웹표준 signkey/],
    ['kcp', /사이트키\(site_key\)/],
    ['toss', /시크릿 키/],
    ['portone', /V2 API Secret/],
  ])('%s 의 서명 재료는 type=password 다', async (target, labelRe) => {
    renderAt(`${PAYMENT_LIST_PATH}/${target}`);

    const field = await screen.findByLabelText(labelRe);
    expect(field.getAttribute('type')).toBe('password');
  });

  it('공개 식별자는 password 가 아니다 — 비밀이 아닌 값을 비밀처럼 다루지 않는다', async () => {
    renderAt(pgTargetPath('kcp'));

    const siteCd = await screen.findByLabelText(/사이트코드\(site_cd\)/);
    expect(siteCd.getAttribute('type')).toBe('text');
  });

  /*
   * 저장된 비밀의 '마스크만 그린다' 상태도 위와 같은 이유로 렌더에서 만들 수 없다
   * (저장소가 모듈 로드 시점 스냅샷이다). 그 계약은 두 곳이 대신 지킨다:
   *   · ./payment.test.ts — 폼에 평문이 실리지 않고 이름만 남는다(connectionFormFor)
   *   · 아래 단언          — 저장된 것이 없을 때는 입력칸이 **있어야** 한다(반대 방향)
   */
  it('저장된 비밀이 없으면 입력칸이 있다 — 넣을 자리까지 없애 버리지 않는다', async () => {
    renderAt(pgTargetPath('toss'));

    const secret = await screen.findByLabelText(/시크릿 키/);
    expect(secret.getAttribute('type')).toBe('password');
    expect(screen.queryByText('••••••••••••')).toBeNull();
  });
});

describe('우리가 콘솔에 넣어 줄 주소 — 입력이 아니라 읽는 값이다', () => {
  it('편집 컨트롤이 아니라 <output> 이다', async () => {
    renderAt(pgTargetPath('kcp'));

    const address = await screen.findByLabelText(/결과 통보 URL/);
    expect(address.tagName.toLowerCase()).toBe('output');
  });

  it('아직 서버에 없다는 사실을 숨기지 않는다 — 되는 척하지 않는다', async () => {
    renderAt(pgTargetPath('toss'));

    expect(await screen.findByText(/아직 서버에 없어요/)).toBeTruthy();
  });

  it('셀프서비스가 아닌 PG 는 그 사실을 말한다 — 없는 등록 화면을 찾아 헤매지 않게', async () => {
    renderAt(pgTargetPath('inicis'));

    expect(await screen.findByText(/영업담당자에게 요청해야 등록돼요/)).toBeTruthy();
  });
});

describe("'연결 테스트' 버튼을 만들지 않는다", () => {
  it.each(['toss', 'inicis', 'kcp', 'nice', 'portone'])('%s 상세에 그 버튼이 없다', async (t) => {
    renderAt(`${PAYMENT_LIST_PATH}/${t}`);
    // 폼이 실제로 그려진 뒤에 본다 — 아직 안 그려진 화면에서 '없다' 는 아무것도 지키지 않는다
    await screen.findByRole('group', { name: /결제수단/ });

    expect(screen.queryByRole('button', { name: /연결 테스트/ })).toBeNull();
  });

  it('없는 이유를 화면이 적어 둔다 — 빠진 것처럼 보이지 않게', async () => {
    renderAt(pgTargetPath('toss'));

    expect(await screen.findByText(/시크릿이\s*브라우저로 내려와야 하기 때문이에요/)).toBeTruthy();
  });
});

describe('결제수단은 그 PG 가 띄울 수 있는 것만 — 고정 5칸이 아니다', () => {
  it('계약이 필요한 수단에 꼬리표가 붙는다 — 체크만 하면 뜨는 줄 알지 않게', async () => {
    renderAt(pgTargetPath('toss'));

    await screen.findByRole('group', { name: /결제수단/ });
    expect(screen.getAllByText('계약 필요').length).toBeGreaterThan(0);
  });

  it('계약 상태가 수기 입력값임을 화면이 밝힌다 — 지어낸 상태를 사실처럼 보이지 않게', async () => {
    renderAt(pgTargetPath('toss'));

    expect(await screen.findByText(/운영자가 직접 골라 적어 두는 메모/)).toBeTruthy();
  });
});

describe('기본 설정에서 상세를 열면 — 마스터 스위치가 꺼져 있다는 사실을 말한다', () => {
  it('값을 넣어도 고객 화면은 문의하기로 남는다고 알려 주고 목록으로 보낸다', async () => {
    renderAt(pgTargetPath('toss'));

    expect(await screen.findByText(/PG 결제 사용이 꺼져 있어/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '결제 설정 목록' })).toBeTruthy();
  });
});
