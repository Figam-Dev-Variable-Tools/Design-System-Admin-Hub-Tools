// ApiKeysPage — AI 모델 연동 마켓스토어 (라우트: /settings/api-keys) · 시스템 설정 섹션 소유
//
// ┌ 이 화면이 무엇인가 ───────────────────────────────────────────────────────┐
// │ 이 어드민에 **붙일 수 있는 AI 모델 프로바이더**를 한자리에 모아 보여주는 진열대다. │
// │ 붙일 수 있는 프로바이더, 그 상태(연동 완료/해제), 그리고 각각이 요구하는          │
// │ 자격증명의 모양을 보여준다.                                                   │
// │                                                                          │
// │ **자격증명을 발급하지 않는다.** 진열대는 '무엇을 붙일 수 있는가' 를 말하는 곳이고,  │
// │ 키를 만들고 폐기하는 일은 다른 관심사다 — 여기에 두면 둘 다 흐려진다.             │
// │                                                                          │
// │ **자격증명을 여기서 입력하지도 않는다.** 이름(또는 '앱 설정')을 누르면 그          │
// │ 프로바이더의 상세로 간다(/settings/api-keys/:providerId) — ../oauth 가 목록과     │
// │ 상세로 갈린 것과 같은 관례다. 13종의 요구가 서로 다른데 한 화면에 다 펼치면        │
// │ 무엇을 채워야 하는지가 보이지 않는다.                                          │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [커머스 잔재를 남기지 않았다] 이 화면은 한때 쇼핑몰 연동 진열대였고, 우측에 '이용 가능 서비스'
// 사이드바(사방넷·플레이오토·FASSTO)를 달고 있었다. 카탈로그가 AI 프로바이더로 바뀌면서 그
// 사이드바는 **본문과 아무 관계가 없어졌다** — AI 모델 목록 옆에 물류·쇼핑몰 통합 안내가 붙어
// 있으면 이 화면이 무엇에 관한 것인지 흐려진다. 그래서 레일과 그 카탈로그(services.ts)를 함께
// 지웠고, 2단 레이아웃도 필요가 없어져 한 단으로 되돌렸다.
//
// [연동 상태는 지어내지 않는다] 상태는 **저장된 자격증명**에서만 해소된다
// (./data-source.ts → ./integrations.ts). 아무것도 저장하지 않은 상태에서는 13/13 이
// '연동 해제' 이고, 운영자가 상세 화면에서 실제로 저장해야 '연동 완료' 가 된다 —
// 붙지도 않은 것을 완료라 말하면 운영자는 되지도 않는 기능을 믿고 판다.
//
// [조회가 생겼으므로 실패 표면도 함께 생겼다] 예전에는 이 화면에 조회가 없어 로딩·실패 표면도
// 없었다(없는 실패를 위해 배너를 만들어 두지 않는다). 이제 저장된 연동을 **읽어야** 하므로
// 조회가 있고, 그래서 실패했을 때 **무엇을 확인하지 못했는지** 말한다. 확인하지 못한 것을
// '연동 완료' 로 그리지 않는다 — 모르면 해제 쪽으로 붙인다(fail-closed).
import { useState } from 'react';
import type { CSSProperties } from 'react';

import { cssVar, Skeleton } from '@tds/ui';

import { Alert, Button } from '../../../shared/ui';
import { useSettingsQuery } from '../_shared/queries';
import { IntegrationsCard } from './components/IntegrationsCard';
import { aiConnectionsKey, aiConnectionsStore } from './data-source';
import { toConnection } from './ai-connections';
import { resolveIntegrations } from './integrations';
import type { IntegrationTabId } from './integrations';

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
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

export default function ApiKeysPage() {
  /** 기본 탭은 '모델' — 이 화면에서 먼저 하는 일은 '어떤 종류를 붙일까' 다(integrations.ts 탭 머리말) */
  const [tab, setTab] = useState<IntegrationTabId>('model');

  const { data, isFetching, error, refetch } = useSettingsQuery(
    aiConnectionsKey,
    aiConnectionsStore,
  );

  /**
   * 카탈로그(항상 있다) + 저장된 연동(조회해야 안다).
   *
   * 조회가 실패하면 빈 목록으로 해소한다 — **화면이 죽지 않고 전 항목이 '연동 해제' 로 남는다.**
   * 그것이 fail-closed 다: '확인하지 못했다' 는 '완료' 가 아니라 '해제' 쪽에 붙인다.
   * 다만 그 사실을 아래 배너가 **말한다** — 조용히 해제로 그리면 진짜 해제와 구분되지 않는다.
   */
  const integrations = resolveIntegrations((data?.value.connections ?? []).map(toConnection));

  const loading = isFetching && data === undefined;

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        이 사이트에 연동할 수 있는 AI 모델 프로바이더를 모아 둔 곳입니다. 이름을 누르면 그
        프로바이더가 요구하는 자격증명을 넣고 연동을 켤 수 있습니다.
      </p>

      {error !== null && (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>
              저장된 연동을 불러오지 못했습니다. 아래 목록은{' '}
              <strong>연동 상태를 확인하지 못한</strong> 상태이며, 실제로는 연동돼 있을 수 있습니다.
            </span>
            <Button variant="secondary" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        </Alert>
      )}

      {loading ? (
        // 이관 전에는 aria-busy·aria-label 이 스켈레톤 자신에게 붙어 있었다 — Skeleton 계약은
        // 블록이 항상 aria-hidden 이고 로딩 고지는 **담은 영역**의 몫이라고 못박는다. 그래서 여기로 옮긴다.
        <div aria-busy="true" aria-label="연동 목록을 불러오는 중">
          <Skeleton />
        </div>
      ) : (
        <IntegrationsCard integrations={integrations} tab={tab} onTabChange={setTab} />
      )}
    </div>
  );
}
