// 등록 CTA 는 create 권한이 있을 때만 존재한다 (EXC-03) — 목록 화면 9종
//   + 영업 파이프라인 3종은 create 권한이 있어도 CTA 가 없다 (아래 두 번째 표)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// CrudListShell 은 **수정·삭제**를 스스로 게이팅한다(canUpdate/canRemove). 그런데 등록 CTA 는
// 화면이 toolbar 로 넘기는 ReactNode 라 껍데기가 붙잡을 손잡이가 없고(CrudListShell.tsx:114-115),
// 그래서 아래 12개 화면은 **읽기 전용 역할에게도 등록 버튼을 그대로 보여 주고 있었다.** 누르면
// /new 폼까지 열린다 — RequirePermission 은 read 만 보므로 폼도 막지 않는다.
//
// 이는 EXC-03 이 고쳤다고 선언한 바로 그 결함("read 전용 역할이 등록 버튼을 그대로 보고 누를 수
// 있었다")이 목록 화면에 남아 있던 것이다. ProductListPage 가 이미 옳은 형태다
// (products/items/ProductListPage.tsx:119,256 — canCreate 로 CTA 자체를 만들지 않는다).
//
// [영업 파이프라인 3종은 왜 여기서 빠졌나 — 겨냥을 옮겼다]
// 견적·계약·프로젝트는 **앞 칸에서만** 생긴다(문의 → 견적 → 계약 → 프로젝트). 그래서 등록 CTA
// 자체가 사라졌고, 위 표에 그대로 두면 '뷰어에게 버튼이 없다' 는 단언이 **누구에게도 버튼이 없어서**
// 통과한다 — 전제가 사라진 채 통과하는, 아무것도 지키지 않는 단언이다. 지우지 않고 아래
// CHAIN_ONLY_SCREENS 로 옮겨 **다른 사실**을 지키게 했다: 권한이 있어도 CTA 가 없다(순서 문제이지
// 권한 문제가 아니다). 그리고 그 단언이 헛돌지 않도록 같은 렌더에서 툴바가 실제로 그려졌는지를
// 함께 본다 — 화면이 통째로 안 그려져도 통과하는 일이 없게.
//
// [왜 표본이 아니라 9개 전부인가]
// 지시는 대표 3~4개면 족하다고 했다. 그런데 이 결함의 성질이 **화면마다 독립**이다 — 껍데기가
// 아니라 각 화면이 따로 canCreate 를 적어야 하므로, 한 화면이 빠지면 그 화면만 조용히 무방비가
// 된다(route-resource.ts 가 화면별 resourceId 배선을 거부한 것과 같은 논리). 표본 검사는 바로
// 그 '한 곳만 빠뜨림' 을 원리적으로 못 잡는다. 12개가 구조적으로 동일해 테이블 한 벌로 전수
// 커버가 되므로, 표본을 고를 이유가 없다.
//
// [왜 '뷰어' 역할인가] 손으로 매트릭스를 조립하지 않는다. '뷰어'는 앱이 실제로 배포하는 기본
// 역할 3종 중 하나이며(roles.ts createDefaultRoles) 정의상 전 리소스 read-only 다. 손으로 만든
// 매트릭스는 enforceMatrix 의 불변식(read 의존)을 우회할 수 있어 실제 운영 상태가 아니게 된다.
//
// [왜 toolbar 를 로딩과 무관하게 단언할 수 있나] CrudListShell 은 firstLoading·error 와 무관하게
// toolbar 를 항상 렌더한다(CrudListShell.tsx:132 — 분기 바깥). 따라서 어댑터 응답을 기다릴
// 필요가 없고, 이 테스트는 데이터 소스에 의존하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_PAYMENT_SETTINGS,
  resetPaymentSettings,
  writePaymentSettings,
} from '../shared/commerce/payment-settings';
import { usePermissionStore } from '../shared/permissions/permission-store';
import { OPERATOR_ROLE_ID, VIEWER_ROLE_ID } from '../shared/permissions/roles';
import { ToastProvider } from '../shared/ui';

import CertificatesListPage from './company/certificates/CertificatesListPage';
import EsgListPage from './company/esg/EsgListPage';
import HistoryListPage from './company/history/HistoryListPage';
import CaseStudyListPage from './portfolio/case-studies/CaseStudyListPage';
import PortfolioListPage from './portfolio/items/PortfolioListPage';
import CouponListPage from './products/coupons/CouponListPage';
import AccountListPage from './sales/accounts/AccountListPage';
import ContractListPage from './sales/contracts/ContractListPage';
import ProjectListPage from './sales/projects/ProjectListPage';
import QuoteListPage from './sales/quotes/QuoteListPage';
import DownloadListPage from './support/downloads/DownloadListPage';
import RepliesPage from './support/replies/RepliesPage';

interface ListScreen {
  /** 라우트 — 여기서 권한 리소스가 파생된다 (route-resource.ts) */
  readonly path: string;
  readonly Page: ComponentType;
  /** 등록 버튼의 접근성 이름. 아이콘은 aria-hidden 이라 텍스트만 남는다 */
  readonly createLabel: string;
}

/** 각 화면의 LIST_PATH 상수와 등록 버튼 라벨을 그대로 옮긴 것 */
const SCREENS: readonly ListScreen[] = [
  { path: '/company/certificates', Page: CertificatesListPage, createLabel: '인증서/특허 등록' },
  { path: '/company/esg', Page: EsgListPage, createLabel: 'ESG 활동 등록' },
  { path: '/company/history', Page: HistoryListPage, createLabel: '연혁 등록' },
  { path: '/portfolio/case-studies', Page: CaseStudyListPage, createLabel: '성공 사례 등록' },
  { path: '/portfolio/items', Page: PortfolioListPage, createLabel: '포트폴리오 등록' },
  { path: '/products/coupons', Page: CouponListPage, createLabel: '쿠폰 등록' },
  { path: '/sales/accounts', Page: AccountListPage, createLabel: '거래처 등록' },
  { path: '/support/downloads', Page: DownloadListPage, createLabel: '자료 등록' },
  { path: '/support/replies', Page: RepliesPage, createLabel: '템플릿 등록' },
];

/**
 * 사슬 안에서만 생기는 목록 — 등록 CTA 가 **권한과 무관하게** 없다.
 *
 * `toolbarProbe` 는 그 화면의 툴바에 실제로 있는 컨트롤의 접근성 이름이다. '버튼이 없다' 만
 * 단언하면 화면이 통째로 렌더되지 않아도 통과한다 — 위 표가 반대 방향 단언으로 막는 그 구멍을,
 * 여기서는 CTA 를 되살릴 수 없으니 이 탐침으로 막는다.
 */
interface ChainOnlyScreen {
  readonly path: string;
  readonly Page: ComponentType;
  /** 예전에 이 자리에 있던 등록 버튼의 접근성 이름 — 되살아나면 이 테스트가 잡는다 */
  readonly removedCreateLabel: string;
  /** 툴바가 실제로 그려졌는지 확인하는 탐침 */
  readonly toolbarProbe: string;
}

const CHAIN_ONLY_SCREENS: readonly ChainOnlyScreen[] = [
  {
    path: '/sales/quotes',
    Page: QuoteListPage,
    removedCreateLabel: '견적 등록',
    toolbarProbe: '상태로 거르기',
  },
  {
    path: '/sales/contracts',
    Page: ContractListPage,
    removedCreateLabel: '계약 등록',
    toolbarProbe: '상태로 거르기',
  },
  {
    path: '/sales/projects',
    Page: ProjectListPage,
    removedCreateLabel: '프로젝트 등록',
    toolbarProbe: '단계로 거르기',
  },
];

function renderAt({ path, Page }: { readonly path: string; readonly Page: ComponentType }): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Page />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/**
 * 쿠폰만 축이 하나 더 있다 — **결제(PG)를 쓰지 않으면 쿠폰 목록은 읽기 전용**이다.
 * 쿠폰을 쓸 시점이 결제뿐이라 그렇다(shared/commerce/pg-lock.ts). 기본 설정은 PG 미사용이므로,
 * 이 테스트가 보려는 것(create 권한 축)을 보려면 그 앞의 축을 열어 둬야 한다.
 *
 * 두 축을 한 단언에 섞지 않는 것이 요점이다: 권한이 있어도 PG 가 꺼져 있으면 버튼이 없는 것이
 * **옳은 동작**이고, 그 사실은 쿠폰 화면 자신의 테스트가 따로 고정한다.
 */
const PG_ON = {
  ...DEFAULT_PAYMENT_SETTINGS,
  usePg: true,
  // 자격증명은 PG 별 카탈로그가 정한다 — 토스는 클라이언트 키·MID·시크릿 키가 필수다
  // (shared/commerce/pg-catalog.ts). 하나라도 비면 pgSellable 이 fail-closed 로 닫는다.
  connection: {
    mode: 'direct',
    provider: 'toss',
    publicValues: { clientKey: 'test_ck_mid', mid: 'test-mid' },
    storedSecrets: ['secretKey'],
  },
} as const;

/** 스토어는 모듈 싱글턴이라 테스트 사이에 역할·설정이 새지 않게 매번 되돌린다 */
beforeEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
  writePaymentSettings(PG_ON);
});

afterEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
  resetPaymentSettings();
});

describe('목록 등록 CTA 는 create 권한을 따른다 (EXC-03)', () => {
  it.each(SCREENS.map((screenDef) => [screenDef.path, screenDef] as const))(
    '%s — create 권한이 없으면 등록 버튼이 존재하지 않는다',
    (_path, screenDef) => {
      usePermissionStore.getState().activateRole(VIEWER_ROLE_ID);
      renderAt(screenDef);

      expect(screen.queryByRole('button', { name: screenDef.createLabel })).toBeNull();
    },
  );

  /**
   * 반대 방향 — 이게 없으면 '버튼을 아예 지웠다' 로도 위 단언이 통과한다.
   * 즉 위 12건이 헛돌지 않는다는 것을 같은 파일 안에서 보장한다.
   */
  it.each(SCREENS.map((screenDef) => [screenDef.path, screenDef] as const))(
    '%s — create 권한이 있으면 등록 버튼이 보인다',
    (_path, screenDef) => {
      renderAt(screenDef);

      expect(screen.queryByRole('button', { name: screenDef.createLabel })).not.toBeNull();
    },
  );
});

/**
 * 영업 파이프라인 — 등록은 권한이 아니라 **순서**로 막힌다.
 *
 * 운영자(create 권한 있음) 역할로 렌더한다. 여기서 버튼이 보이면 사슬이 뚫린 것이다:
 * 목록에서 만든 견적은 원본 문의가 없고, 계약은 견적이 없고, 프로젝트는 계약이 없다.
 */
describe('영업 파이프라인 목록은 등록 CTA 가 없다 — 앞 칸에서만 생긴다', () => {
  it.each(CHAIN_ONLY_SCREENS.map((screenDef) => [screenDef.path, screenDef] as const))(
    '%s — create 권한이 있어도 등록 버튼이 존재하지 않는다',
    (_path, screenDef) => {
      // beforeEach 가 이미 운영자를 활성화했다 — 권한 축은 열려 있다.
      renderAt(screenDef);

      // 탐침: 툴바가 실제로 그려졌다(단언이 빈 화면 위에서 헛돌지 않는다)
      expect(screen.queryByLabelText(screenDef.toolbarProbe)).not.toBeNull();
      expect(screen.queryByRole('button', { name: screenDef.removedCreateLabel })).toBeNull();
    },
  );
});
