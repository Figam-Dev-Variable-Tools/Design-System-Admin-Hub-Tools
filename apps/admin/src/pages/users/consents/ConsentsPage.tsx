// ConsentsPage — 동의 이력 관리 (라우트: /users/consents) · 사용자 관리 섹션
//
// ┌ 이 화면이 답하는 질문 ─────────────────────────────────────────────────────┐
// │ 1. 우리는 무엇에 동의를 받는가, 그중 무엇이 필수인가   → 동의 항목            │
// │ 2. 누가 언제 무엇에 동의하고 철회했는가                → 동의 이력(append-only)│
// │ 3. 지금 다시 물어야 할 사람과, 지워야 할 기록은         → 재동의 · 파기        │
// │                                                                          │
// │ 셋을 한 화면에 둔 이유: 세 질문의 답이 **같은 이력**에서 나온다. 나누면 어느   │
// │ 화면이 정본인지 흐려지고, 항목 정의를 바꾼 결과가 다른 화면에서만 보인다.      │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [/content/terms 와 무엇이 다른가] 그쪽은 **문서 본문**을 관리한다. 문서가 있다는 것과 누가
// 그것에 동의했다는 것은 다른 사실이고, 분쟁에서 요구되는 것은 후자다. 이 화면은 문서를 쓰지
// 않고, 약관 버전은 조회기로 **읽기만** 한다(shared/domain/terms-version.ts).
//
// [권한] 이력은 조회뿐이다 — 어떤 역할에게도 수정·삭제 표면이 없다. 항목 정의만 update 로
// 게이팅된다(EXC-03).
//
// [데이터] 화면은 data-source.ts 하고만 대화한다. 실제 HTTP 호출은 없다(백엔드 미존재).
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { cssVar, Skeleton, Tabs, tabId, tabPanelId } from '@tds/ui';

import { formatDate } from '../../../shared/format';
import { Alert, Button, useToast } from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { CompliancePanel } from './components/CompliancePanel';
import { ConsentHistoryPanel } from './components/ConsentHistoryPanel';
import { ConsentItemsCard } from './components/ConsentItemsCard';
import {
  consentEventsKey,
  consentItemsKey,
  consentItemsStore,
  CONSENT_ITEM_SEED,
  fetchConsentEvents,
} from './data-source';
import type { ConsentItemDef, ConsentItemsDoc } from './types';

const TAB_ITEMS = [
  { id: 'items', label: '동의 항목' },
  { id: 'history', label: '동의 이력' },
  { id: 'compliance', label: '재동의 · 파기' },
] as const;

type TabId = (typeof TAB_ITEMS)[number]['id'];

function isTabId(value: string): value is TabId {
  return TAB_ITEMS.some((tab) => tab.id === value);
}

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const descriptionStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

export default function ConsentsPage() {
  const [tab, setTab] = useState<TabId>('items');
  const { canUpdate } = useRouteWritePermissions();
  const toast = useToast();
  const client = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: consentItemsKey,
    queryFn: ({ signal }) => consentItemsStore.fetch(signal),
  });

  const eventsQuery = useQuery({
    queryKey: consentEventsKey,
    queryFn: ({ signal }) => fetchConsentEvents(signal),
  });

  const saveItems = useMutation({
    mutationFn: (items: readonly ConsentItemDef[]) => {
      const doc: ConsentItemsDoc = { items };
      return consentItemsStore.save(doc);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: consentItemsKey });
      toast.success('동의 항목을 저장했습니다.');
    },
    onError: () => {
      toast.error('동의 항목을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    },
  });

  /**
   * 항목 정의를 아직 못 읽었을 때의 기준선.
   *
   * 빈 배열로 그리면 '동의 항목이 하나도 없는 서비스' 처럼 보인다 — 조회 실패와 '항목 없음' 은
   * 다른 사실이고, 아래 배너가 실패를 따로 말한다.
   */
  const items = itemsQuery.data?.items ?? CONSENT_ITEM_SEED;
  const loadingItems = itemsQuery.isFetching && itemsQuery.data === undefined;
  const today = formatDate(new Date());

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        동의 항목의 정의와 동의·철회 이력을 관리합니다. 이력은 <strong>덧붙이기만</strong> 하며
        수정·삭제 표면이 없습니다 — 고칠 수 있는 기록은 증거가 되지 못합니다.
      </p>

      {itemsQuery.error !== null && (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>동의 항목 정의를 불러오지 못했습니다. 아래는 기본 정의입니다.</span>
            <Button
              variant="secondary"
              onClick={() => {
                void itemsQuery.refetch();
              }}
            >
              다시 시도
            </Button>
          </div>
        </Alert>
      )}

      <Tabs
        value={tab}
        items={[...TAB_ITEMS]}
        ariaLabel="동의 이력 관리 영역"
        onChange={(next) => {
          if (isTabId(next)) setTab(next);
        }}
      />

      <div id={tabPanelId(tab)} role="tabpanel" aria-labelledby={tabId(tab)}>
        {tab === 'items' &&
          (loadingItems ? (
            <div aria-busy="true" aria-label="동의 항목을 불러오는 중">
              <Skeleton />
            </div>
          ) : (
            <ConsentItemsCard
              items={items}
              canUpdate={canUpdate}
              saving={saveItems.isPending}
              onSave={(next) => {
                saveItems.mutate(next);
              }}
            />
          ))}

        {tab === 'history' && <ConsentHistoryPanel items={items} query={eventsQuery} />}

        {tab === 'compliance' && (
          <CompliancePanel items={items} events={eventsQuery.data ?? []} today={today} />
        )}
      </div>
    </div>
  );
}
