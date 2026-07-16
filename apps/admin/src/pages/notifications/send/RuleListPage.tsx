// RuleListPage — 알림 발송 (라우트: /notifications/send)
//
// [이 화면이 마케팅 'SMS/이메일 발송'과 근본적으로 다른 점]
//   마케팅 발송 화면은 '누구에게 언제 무엇을 보낼지'를 운영자가 정해 캠페인 1건을 만든다.
//   이 화면은 아무것도 보내지 않는다. **이벤트가 나면 시스템이 자동으로 보낼 규칙**을 관리한다:
//   '주문 접수 → 주문 접수 안내(SMS) 를 SMS 로, 실패하면 1회 재시도' 같은 상시 대기 규칙이다.
//   그래서 발송 버튼도, 예약 시각도, 세그먼트도 없다. 대신 **ON/OFF 스위치**가 운영의 핵심이다 —
//   끄면 그 이벤트에 알림이 안 나간다(점검·장애 대응 중 운영자가 실제로 쓰는 스위치).
//
// 실 발송 0건: 여기서 나가는 발송 요청은 없다(data-source 의 // TODO(backend) 참조).
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatNumber, objectParticle } from '../../../shared/format';
import {
  Button,
  hintStyle,
  PlusCircleIcon,
  SearchField,
  StatusBadge,
  ToggleSwitch,
} from '../../../shared/ui';
import { CrudListShell, useCrudList, useCrudRowUpdate, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { ruleAdapter, RULE_RESOURCE } from './data-source';
import { CategoryFilter } from '../_shared/CategoryFilter';
import { TransactionalNotice } from '../_shared/TransactionalNotice';
import { triggerColumn } from '../_shared/triggerColumn';
import {
  listLayoutStyle,
  numericMutedStyle,
  pageStyle,
  toolbarFiltersStyle,
  toolbarStyle,
} from '../_shared/styles';
import { templateNameOf } from '../_shared/store';
import {
  CATEGORY_PARAM,
  countByCategory,
  countEnabled,
  filterByCategory,
  FILTER_ALL,
  notificationChannelLabel,
  parseCategoryFilter,
  retryPolicyLabel,
  searchRules,
  triggerLabel,
} from '../_shared/notification';
import type { NotificationRule, NotificationRuleInput } from '../_shared/notification';

const ENTITY_LABEL = '발송 규칙';
const LIST_PATH = '/notifications/send';

/** 규칙엔 이름이 없다 — 삭제 확인·토스트가 부를 이름은 '이벤트 + 채널'이다 */
const nameOf = (rule: NotificationRule) =>
  `${triggerLabel(rule.trigger)} ${notificationChannelLabel(rule.channel)}`;

const toInput = (rule: NotificationRule): NotificationRuleInput => ({
  trigger: rule.trigger,
  channel: rule.channel,
  templateId: rule.templateId,
  enabled: rule.enabled,
  retryPolicy: rule.retryPolicy,
});

export default function RuleListPage() {
  const navigate = useNavigate();
  // IA-13 + COMP-10 — 조회 상태의 원천은 URL, IME 조합 판정은 공유 훅 소유 (사본 수렴됨).
  const list = useListState({ filterDefaults: { [CATEGORY_PARAM]: FILTER_ALL } });
  const { keyword, hasQuery, hasActiveFilters } = list;
  const category = parseCategoryFilter(list.filters[CATEGORY_PARAM] ?? null);

  const controller = useCrudList<NotificationRule, NotificationRuleInput>({
    resource: RULE_RESOURCE,
    adapter: ruleAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  const rowUpdate = useCrudRowUpdate<NotificationRule, NotificationRuleInput>(
    RULE_RESOURCE,
    ruleAdapter,
  );

  // STATE-04 — 필터/검색이 바뀌면 이제 숨겨진 행의 선택을 해제한다.
  useEffect(() => {
    clear();
  }, [category, keyword, clear]);

  const counts = useMemo(() => countByCategory(controller.items), [controller.items]);
  const visibleItems = useMemo(
    () =>
      searchRules(filterByCategory(controller.items, category), keyword, (rule) =>
        templateNameOf(rule.channel, rule.templateId),
      ),
    [controller.items, category, keyword],
  );

  const onToggle = (rule: NotificationRule, next: boolean) => {
    const label = nameOf(rule);
    rowUpdate.run(
      rule.id,
      { ...toInput(rule), enabled: next },
      {
        // ERP-13 — 조사를 앞 낱말의 받침에 맞춰 고른다. 리터럴 '을(를)' 을 내지 않는다.
        success: next
          ? `${label} 알림${objectParticle('알림')} 켰습니다. 이제 이 이벤트가 나면 자동 발송합니다.`
          : `${label} 알림${objectParticle('알림')} 껐습니다. 이 이벤트에는 알림이 나가지 않습니다.`,
        failure: `${label} 알림 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.`,
      },
    );
  };

  const columns: readonly CrudColumn<NotificationRule>[] = [
    triggerColumn<NotificationRule>(),
    {
      header: '채널',
      nowrap: true,
      render: (rule) => (
        <StatusBadge tone="neutral" label={notificationChannelLabel(rule.channel)} />
      ),
    },
    {
      header: '템플릿',
      render: (rule) => {
        const name = templateNameOf(rule.channel, rule.templateId);
        // 연결된 템플릿이 지워지면 이벤트가 나도 보낼 문구가 없다 — 조용히 실패하지 않도록 드러낸다.
        return name === '' ? (
          <StatusBadge tone="danger" label="템플릿 없음 — 발송되지 않습니다" />
        ) : (
          <span>{name}</span>
        );
      },
    },
    {
      header: '실패 시',
      nowrap: true,
      render: (rule) => <span style={numericMutedStyle}>{retryPolicyLabel(rule.retryPolicy)}</span>,
    },
    {
      header: '자동 발송',
      nowrap: true,
      render: (rule) => (
        <ToggleSwitch
          checked={rule.enabled}
          busy={rowUpdate.pendingId === rule.id}
          onChange={(next) => onToggle(rule, next)}
          label={`${nameOf(rule)} 자동 발송 여부`}
          onLabel="켜짐"
          offLabel="꺼짐"
        />
      ),
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={toolbarFiltersStyle}>
        {/* COMP-10 — 조합(IME) 중에는 커밋하지 않고, 조합이 끝난 뒤 debounce 로 한 번만 커밋한다. */}
        <SearchField
          value={list.searchInput}
          onChange={list.setSearchInput}
          label="이벤트·템플릿 검색"
          placeholder="이벤트 · 템플릿 검색"
          {...list.searchInputProps}
        />
        <span style={hintStyle}>{`켜짐 ${formatNumber(countEnabled(visibleItems))}건`}</span>
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        발송 규칙 등록
      </Button>
    </div>
  );

  return (
    <div style={pageStyle}>
      <TransactionalNotice>
        이벤트별 자동 발송 규칙을 관리합니다. 이 화면에서 직접 발송하지는 않습니다.
      </TransactionalNotice>

      <div style={listLayoutStyle}>
        <CategoryFilter
          filter={category}
          counts={counts}
          onChange={(next) => list.setFilter(CATEGORY_PARAM, next)}
        />

        {/* STATE-05 — 왜 비었는지에 따라 문구·복구 수단이 갈린다. 조사(이/가)는 Empty 가 고른다. */}
        <CrudListShell
          entityLabel={ENTITY_LABEL}
          controller={controller}
          visibleItems={visibleItems}
          columns={columns}
          nameOf={nameOf}
          selectAllLabelId="notification-rules-select-all"
          empty={{
            hasQuery,
            hasActiveFilters,
            onClearSearch: list.clearSearch,
            onResetFilters: list.resetFilters,
            createAction: (
              <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
                <PlusCircleIcon />
                발송 규칙 등록
              </Button>
            ),
          }}
          toolbar={toolbar}
          onEdit={(rule) => navigate(`${LIST_PATH}/${rule.id}/edit`)}
        />
      </div>
    </div>
  );
}
