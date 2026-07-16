// CustomerFaqPage — 고객노출 FAQ 큐레이션 (라우트: /support/faq) · A41 소유
//
// [콘텐츠 FAQ 와의 관계] 작성·관리(등록/수정/삭제·카테고리)는 콘텐츠 관리 FAQ 소관이라 여기엔 없다.
// 이 화면은 발행된 FAQ 를 고객센터에서 어떻게 보여줄지만 큐레이션한다: 표시 순서(DnD)·노출·BEST 고정.
// 작성이 필요하면 상단 안내에서 콘텐츠 관리로 이동한다(페이지 간 직접 import 없이 라우트 링크로 연결).
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import { formatNumber } from '../../../shared/format';
import { Alert, Button, Card, hintStyle, useToast } from '../../../shared/ui';
import { CustomerFaqTable } from './components/CustomerFaqTable';
import {
  fetchCustomerFaqs,
  reorderCustomerFaqs,
  setCustomerFaqPinned,
  setCustomerFaqVisible,
} from './data-source';
import { applyFaqOrder, countVisible } from './types';
import type { CustomerFaq } from './types';

const QUERY_KEY = ['support-faq', 'list'] as const;

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

const noticeStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

export default function CustomerFaqPage() {
  const toast = useToast();
  const client = useQueryClient();
  const reorderControllerRef = useRef<AbortController | null>(null);
  const [togglingIds, setTogglingIds] = useState<ReadonlySet<string>>(new Set());

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ signal }) => fetchCustomerFaqs(signal),
    placeholderData: (previous) => previous,
  });
  const faqs = data ?? [];

  /**
   * [STATE-01] 스켈레톤은 **최초 로드에만** 뜬다.
   *
   * 예전엔 `isFetching` 을 그대로 `loading` 이라 불러 표에 넘겼다. 그래서 노출/고정 토글이나
   * 순서 이동이 invalidate 를 걸 때마다 **이미 채워져 있던 행이 스켈레톤으로 지워졌다** —
   * 표를 훑던 운영자 밑에서 데이터가 사라진다. placeholderData 로 이전 행을 들고 있으면서도
   * 화면이 그 이득을 스스로 버리고 있던 셈이다.
   * (공유 useCrudList 는 F2 에서 이 규칙을 갖췄다. 이 화면은 순서 이동 때문에 그 훅을 쓰지 않아
   *  같은 규칙을 여기에 둔다 — 이름과 값의 정의는 useCrudList 와 글자까지 같다.)
   */
  const firstLoading = isFetching && data === undefined;
  /** 데이터가 있는 채로 백그라운드 재조회 중 — 가벼운 인디케이터용, 표를 비우지 않는다 (STATE-03) */
  const refreshing = isFetching && data !== undefined;

  const setSnapshot = (next: readonly CustomerFaq[]) => {
    client.setQueryData<readonly CustomerFaq[]>(QUERY_KEY, next);
  };

  const markToggling = (id: string, busy: boolean) => {
    setTogglingIds((prev) => {
      const nextSet = new Set(prev);
      if (busy) nextSet.add(id);
      else nextSet.delete(id);
      return nextSet;
    });
  };

  const reorder = useMutation({
    mutationFn: ({ orderedIds, signal }: { orderedIds: readonly string[]; signal: AbortSignal }) =>
      reorderCustomerFaqs(orderedIds, signal),
    onSettled: () => void client.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const onReorder = (orderedIds: readonly string[]) => {
    reorderControllerRef.current?.abort();
    const controller = new AbortController();
    reorderControllerRef.current = controller;
    const snapshot = faqs;
    setSnapshot(applyFaqOrder(faqs, orderedIds)); // 낙관적 반영

    reorder.mutate(
      { orderedIds, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success('고객센터 표시 순서를 변경했습니다.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setSnapshot(snapshot); // 롤백
          toast.error('순서를 변경하지 못했습니다.', { retry: () => onReorder(orderedIds) });
        },
      },
    );
  };

  const visibility = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      setCustomerFaqVisible(id, visible),
    onSettled: () => void client.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const onToggleVisible = (faq: CustomerFaq, next: boolean) => {
    if (togglingIds.has(faq.id)) return;
    markToggling(faq.id, true);
    const snapshot = faqs;
    setSnapshot(faqs.map((item) => (item.id === faq.id ? { ...item, visible: next } : item)));
    visibility.mutate(
      { id: faq.id, visible: next },
      {
        onSuccess: () =>
          toast.success(
            next ? `'${faq.question}' 를 노출합니다.` : `'${faq.question}' 를 숨겼습니다.`,
          ),
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setSnapshot(snapshot);
          toast.error('노출 상태를 변경하지 못했습니다.', {
            retry: () => onToggleVisible(faq, next),
          });
        },
        onSettled: () => markToggling(faq.id, false),
      },
    );
  };

  const pinning = useMutation({
    mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
      setCustomerFaqPinned(id, pinned),
    onSettled: () => void client.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const onTogglePinned = (faq: CustomerFaq, next: boolean) => {
    if (togglingIds.has(faq.id)) return;
    markToggling(faq.id, true);
    const snapshot = faqs;
    setSnapshot(faqs.map((item) => (item.id === faq.id ? { ...item, pinned: next } : item)));
    pinning.mutate(
      { id: faq.id, pinned: next },
      {
        onSuccess: () =>
          toast.success(
            next
              ? `'${faq.question}' 를 BEST 로 고정했습니다.`
              : `'${faq.question}' BEST 고정을 해제했습니다.`,
          ),
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setSnapshot(snapshot);
          toast.error('BEST 고정을 변경하지 못했습니다.', {
            retry: () => onTogglePinned(faq, next),
          });
        },
        onSettled: () => markToggling(faq.id, false),
      },
    );
  };

  if (error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>고객노출 FAQ 를 불러오지 못했습니다.</span>
            <Button variant="secondary" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <Alert tone="info">
        <div style={noticeStyle}>
          <span>
            FAQ 작성·수정·삭제와 카테고리 관리는 콘텐츠 관리에서 합니다. 이 화면은 고객센터 노출
            순서·노출 여부·BEST 고정만 큐레이션합니다.
          </span>
          <Link to="/content/faq" className="tds-ui-link tds-ui-focusable">
            콘텐츠 관리 FAQ 로 이동
          </Link>
        </div>
      </Alert>

      <p style={hintStyle} aria-busy={refreshing}>
        {firstLoading
          ? '불러오는 중…'
          : `전체 ${formatNumber(faqs.length)}건 · 노출 ${formatNumber(countVisible(faqs))}건`}
        {refreshing && ' · 새로고침 중…'}
      </p>

      <Card>
        <CustomerFaqTable
          faqs={faqs}
          loading={firstLoading}
          onReorder={onReorder}
          reordering={reorder.isPending}
          onToggleVisible={onToggleVisible}
          onTogglePinned={onTogglePinned}
          togglingIds={togglingIds}
        />
      </Card>
    </div>
  );
}
