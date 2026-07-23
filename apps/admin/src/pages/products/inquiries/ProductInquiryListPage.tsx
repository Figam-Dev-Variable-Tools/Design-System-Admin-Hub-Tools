// ProductInquiryListPage — 상품 문의 목록 (라우트: /products/inquiries)
//
// [무엇을 보는 화면인가] 결제대행(PG)을 끈 상품의 스토어프론트 버튼은 '구매하기' 대신 '문의하기'
// 다. 그 버튼을 누른 고객의 글이 도착하는 곳이 여기다. 그래서 이 목록의 중심 열은 상품도 제목도
// 아니고 **얼마나 오래 답을 못 받았는가**(경과)다 — 운영자가 여기서 하는 판단은 '무엇부터
// 답할까' 하나뿐이다.
//
// [읽기 전용 껍데기] 문의는 고객이 만들고 관리자는 답변·종결만 한다. 삭제·일괄작업·선택
// 체크박스가 **어떤 역할에게도** 없어야 하므로 CrudListShell 이 아니라 CrudReadListShell 을 쓴다
// (sales/inquiries 와 같은 결). 행 클릭은 read 로 게이팅되어 조회 전용 역할도 상세를 볼 수 있다.
//
// [좌측 상태 필터] 상태를 툴바의 <select> 에 숨기면 '지금 무엇으로 걸러져 있는지' 와 '각 상태에
// 몇 건이 있는지' 를 볼 수 없다. 프로그램·상품 목록과 같은 좌측 aside(건수 배지 + aria-pressed)를
// 쓰고, 건수는 **필터 이전** 전체 집합에서 센다.
//
// [조회 상태의 소유자] status·keyword 는 이 화면의 useState 가 아니라 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — '접수' 만 골라 한 건을 열고 Back 하면 그 조건이 그대로
// 살아 있고, 그 URL 을 그대로 공유할 수 있다. 검색은 IME 안전이다 (COMP-10).
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { cssVar } from '@tds/ui';

import { formatDateTime, formatNumber, objectParticle } from '../../../shared/format';
import { isAbort } from '../../../shared/async';
import { issuedQuoteHref, issueQuote, quoteIssueBlock } from '../../../shared/domain/quote-issue';
import {
  Alert,
  Button,
  FilterPanel,
  FilterRail,
  hintStyle,
  SearchField,
  StatusBadge,
  useToast,
} from '../../../shared/ui';
import {
  CrudReadListShell,
  DetailCellLink,
  parseFilter,
  useCrudListQuery,
  useListState,
} from '../../../shared/crud';
import type { CrudColumn, RowTarget } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { PRODUCT_INQUIRY_RESOURCE, productInquiryAdapter } from './data-source';
import {
  applyQuoteIssued,
  toProductInquiryInput,
  toQuoteIssueCandidate,
  toQuoteIssueSource,
} from './_shared/store';
import type { ProductInquiry } from './_shared/store';
import {
  countInquiriesByStatus,
  elapsedLabel,
  elapsedTone,
  filterInquiriesByStatus,
  INQUIRY_STATUS_ALL,
  INQUIRY_STATUS_FILTER_VALUES,
  INQUIRY_STATUS_FILTERS,
  inquiryChannelLabel,
  inquiryStatusLabel,
  inquiryStatusTone,
  searchProductInquiries,
  unansweredCount,
} from './types';
import type { InquiryStatusFilter } from './types';

const ENTITY_LABEL = '상품 문의';
const LIST_PATH = '/products/inquiries';

/**
 * 경과의 기준일.
 *
 * 화면이 `new Date()` 를 읽으면 픽스처의 '3일째 미답변' 이 실행하는 날마다 달라져 스토리북 회귀
 * 비교가 매일 깨진다(ProgramListPage 와 같은 판단). 백엔드가 붙으면 서버가 내려주는 기준 시각으로
 * 바뀐다.
 */
const TODAY = '2026-07-21';

/** URL 파라미터의 기본값 — 이 값과 같으면 URL 에서 지운다(공유 링크를 짧게) */
const FILTER_DEFAULTS = { status: INQUIRY_STATUS_ALL } as const;

/** 행 클릭 목적지 — 상세(답변 작성). 표의 캡션 문장도 여기서 파생된다 */
const ROW_TARGET: RowTarget<ProductInquiry> = {
  kind: 'detail',
  href: (item) => `${LIST_PATH}/${item.id}`,
};

/** 좌: 고정 폭 필터 / 우: 남는 폭 전부 (minmax(0,…) 이라야 표가 그리드를 밀지 않는다) */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
};

/** 문의번호는 고객이 전화로 부르는 값이다 — 줄바꿈 없이 한 덩이로 읽힌다 */
const inquiryNoStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
  color: cssVar('color.text.muted'),
};

const productCellStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 8)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const nameOf = (item: ProductInquiry) => item.subject;

const basketBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** 담은 문의를 지우고 다시 담게 하는 토글 — 선택 집합은 불변으로 다룬다 */
function toggleId(selected: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(selected);
  if (!next.delete(id)) next.add(id);
  return next;
}

export default function ProductInquiryListPage() {
  // 답변 권한이 없으면 이 화면은 '읽는 화면' 이다 — 좌측 안내가 그 사실을 미리 밝힌다 (EXC-03)
  const { canUpdate } = useRouteWritePermissions();

  // status·keyword 의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?status=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체' 로 되돌린다
  const status: InquiryStatusFilter = parseFilter(
    list.filters['status'] ?? INQUIRY_STATUS_ALL,
    INQUIRY_STATUS_FILTER_VALUES,
    INQUIRY_STATUS_ALL,
  );

  const { data, isFetching, error, refetch } = useCrudListQuery(
    PRODUCT_INQUIRY_RESOURCE,
    productInquiryAdapter,
  );
  // [STATE-01] skeleton 은 최초 로드에서만 — refetch 중에는 이전 행을 유지한다.
  const firstLoading = isFetching && data === undefined;

  const items = useMemo(() => data ?? [], [data]);

  // 건수는 **필터 이전** 전체 집합에서 센다. 아직 못 셌으면 null 이다 —
  // 0 과 '모름' 은 다른 사실이라 FilterPanel 이 '—' 를 띄운다.
  const loaded = !firstLoading && error === null;
  const statusCounts = useMemo(
    () => (loaded ? countInquiriesByStatus(items) : null),
    [items, loaded],
  );
  const pending = useMemo(() => unansweredCount(items), [items]);

  const visible = useMemo(
    () => searchProductInquiries(filterInquiriesByStatus(items, status), list.keyword),
    [items, status, list.keyword],
  );

  /* ── 견적 바구니 ─────────────────────────────────────────────────────────
   *
   * [왜 필요한가] 상품 문의는 `productId` 가 단수라 한 건이 상품 하나를 가리킨다. 그런데 실제
   * 요청은 '이거랑 이거랑 저거 합쳐서 얼마인가요' 다 — 외부 커머스의 견적 요청(WooCommerce·
   * Shopify 계열)이 전부 장바구니 모양인 것도 그래서다. 문의마다 견적을 한 장씩 내면 합계가
   * 없는 견적 세 장이 되고, 합치는 일은 앱 밖에서 손으로 벌어진다.
   *
   * [왜 CrudReadListShell 의 선택이 아닌가] 그 껍데기의 선택 체크박스는 **일괄 삭제**를 위한
   * 것이라 어떤 역할에게도 없다(그 파일 머리말). 여기 필요한 것은 지우는 선택이 아니라 담는
   * 선택이고, 쓰기 권한이 있는 사람에게만 열린다 — 그래서 열 하나로 따로 만든다.
   */
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [basket, setBasket] = useState<ReadonlySet<string>>(new Set());

  // 보고 있는 행 집합이 바뀌면 담아 둔 것은 무의미해진다 — 화면에 없는 문의가 담긴 채
  // '선택 3건 견적 발행' 이 되지 않게 한다 (STATE-04-b, 형제 목록과 같은 처리).
  useEffect(() => {
    setBasket(new Set());
  }, [status, list.keyword]);

  const basketItems = useMemo(() => items.filter((item) => basket.has(item.id)), [items, basket]);
  // 버튼의 disabled 조건과 발행의 거절 조건이 **같은 술어**를 읽는다 (shared/domain/quote-issue)
  const basketBlock = quoteIssueBlock(basketItems.map(toQuoteIssueCandidate));

  const issue = useMutation({
    mutationFn: async (targets: readonly ProductInquiry[]) => {
      const issued = issueQuote(targets.map(toQuoteIssueSource));
      // 배선이 없으면 여기 도달하지 않는다(basketBlock 이 먼저 막는다) — 도달하면 그것은 버그다.
      if (issued === null) throw new Error('견적 발행을 사용할 수 없어요.');
      // 합쳐진 문의는 모두 같은 견적 id 를 갖는다 — 하나라도 빠지면 그 문의는 견적 없이 남는다.
      for (const target of targets) {
        await productInquiryAdapter.update(
          target.id,
          toProductInquiryInput(applyQuoteIssued(target, issued.id)),
        );
      }
      return issued;
    },
    onSuccess: (issued) => {
      void queryClient.invalidateQueries({ queryKey: [PRODUCT_INQUIRY_RESOURCE, 'list'] });
      setBasket(new Set());
      toast.success(`견적 ${issued.quoteNo}${objectParticle(issued.quoteNo)} 발행했어요.`);
      navigate(issuedQuoteHref(issued.id));
    },
    onError: (cause: unknown) => {
      if (isAbort(cause)) return;
      toast.error('견적을 발행하지 못했어요. 잠시 후 다시 시도해 주세요.');
    },
  });

  const onToggleBasket = useCallback((id: string) => {
    setBasket((current) => toggleId(current, id));
  }, []);

  const columns: readonly CrudColumn<ProductInquiry>[] = [
    {
      header: '문의번호',
      nowrap: true,
      render: (item) => <span style={inquiryNoStyle}>{item.id}</span>,
    },
    {
      header: '상품명',
      render: (item) => <span style={productCellStyle}>{item.productName}</span>,
    },
    { header: '문의자', nowrap: true, render: (item) => item.customerName },
    {
      // 제목은 상세로 가는 **키보드 경로**다 — 행 클릭은 마우스 전용이다(DetailCellLink 머리말)
      header: '제목',
      render: (item) => (
        <DetailCellLink to={`${LIST_PATH}/${item.id}`}>{item.subject}</DetailCellLink>
      ),
    },
    { header: '채널', nowrap: true, render: (item) => inquiryChannelLabel(item.channel) },
    {
      header: '상태',
      nowrap: true,
      render: (item) => (
        <StatusBadge
          tone={inquiryStatusTone(item.status)}
          label={inquiryStatusLabel(item.status)}
        />
      ),
    },
    { header: '접수일', nowrap: true, render: (item) => formatDateTime(item.createdAt) },
    {
      header: '경과',
      nowrap: true,
      // 색만으로 지연을 말하지 않는다 — 배지 안에 '3일째 미답변' 이라는 문구가 함께 실린다
      render: (item) => (
        <StatusBadge tone={elapsedTone(item, TODAY)} label={elapsedLabel(item, TODAY)} />
      ),
    },
  ];

  // 담기 열은 **쓰기 권한이 있을 때만 존재한다** — 누를 수 없는 것을 보여 주지 않는다 (EXC-03)
  const basketColumn: CrudColumn<ProductInquiry> = {
    header: '견적 바구니',
    nowrap: true,
    render: (item) => {
      if (item.quoteId !== '') {
        return (
          <a href={issuedQuoteHref(item.quoteId)} className="tds-ui-link tds-ui-focusable">
            견적 보기
          </a>
        );
      }
      const inBasket = basket.has(item.id);
      return (
        <Button
          variant="secondary"
          size="sm"
          aria-pressed={inBasket}
          disabled={issue.isPending}
          onClick={() => onToggleBasket(item.id)}
        >
          {inBasket ? '담김' : '담기'}
        </Button>
      );
    },
  };

  const visibleColumns = canUpdate ? [...columns, basketColumn] : columns;

  const toolbar: ReactNode = (
    <>
      <div style={toolbarStyle}>
        <span style={searchWrapStyle}>
          <SearchField
            value={list.searchInput}
            onChange={list.setSearchInput}
            label="문의번호·상품명·문의자·제목 검색"
            placeholder="문의번호 · 상품명 · 문의자 검색"
            // 조합 중 커밋 금지 + Enter 차단 — '패딩' 을 치는 도중 자모마다 조회가 나가지 않는다 (COMP-10)
            {...list.searchInputProps}
          />
        </span>
      </div>
      {/* 담은 것이 있을 때만 나타나는 막대 — 아무것도 담기지 않은 화면에 죽은 버튼을 두지 않는다 */}
      {canUpdate && basket.size > 0 && (
        <Alert tone="info">
          <div style={basketBarStyle}>
            <span>
              {basketBlock === null
                ? `문의 ${formatNumber(basketItems.length)}건을 한 견적으로 합쳐요.`
                : basketBlock}
            </span>
            <span style={toolbarStyle}>
              <Button
                variant="secondary"
                disabled={issue.isPending}
                onClick={() => setBasket(new Set())}
              >
                비우기
              </Button>
              <Button
                variant="primary"
                loading={issue.isPending}
                disabled={issue.isPending || basketBlock !== null}
                onClick={() => issue.mutate(basketItems)}
              >
                견적 발행
              </Button>
            </span>
          </div>
        </Alert>
      )}
    </>
  );

  return (
    <div style={layoutStyle}>
      <FilterRail
        notice={
          <>
            <p style={hintStyle}>
              {loaded
                ? `답변을 기다리는 문의가 ${formatNumber(pending)}건 있어요.`
                : '미답변 건수를 세는 중이에요.'}
            </p>
            <p style={hintStyle}>
              결제대행을 끈 상품은 구매하기 대신 문의하기 버튼이 노출되고, 그 문의가 이 목록으로
              들어와요.
            </p>
            <p style={hintStyle}>
              여러 문의를 바구니에 담아 한 견적으로 합칠 수 있어요. 합친 문의는 모두 같은 견적을
              가리켜요.
            </p>
            {!canUpdate && <p style={hintStyle}>답변 권한이 없어 조회만 가능해요.</p>}
          </>
        }
      >
        <FilterPanel
          navLabel="상품 문의 상태 필터"
          heading="처리 상태"
          options={INQUIRY_STATUS_FILTERS}
          value={status}
          counts={statusCounts}
          onChange={(next) => list.setFilter('status', next)}
        />
      </FilterRail>

      <CrudReadListShell
        entityLabel={ENTITY_LABEL}
        state={{
          firstLoading,
          refreshing: isFetching && !firstLoading,
          error,
          refetch: () => void refetch(),
        }}
        visibleItems={visible}
        columns={visibleColumns}
        nameOf={nameOf}
        rowTarget={ROW_TARGET}
        toolbar={toolbar}
        // 왜 비었는지에 따라 복구 수단이 다르다 — 검색 지우기 / 필터 초기화 (STATE-05)
        empty={{
          createVerb: '접수',
          hasQuery: list.hasQuery,
          hasActiveFilters: list.hasActiveFilters,
          onClearSearch: list.clearSearch,
          onResetFilters: list.resetFilters,
        }}
      />
    </div>
  );
}
