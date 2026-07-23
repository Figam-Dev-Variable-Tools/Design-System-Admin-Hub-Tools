// ApiKeysPage — 연동 마켓스토어 (라우트: /settings/api-keys) · 시스템 설정 섹션 소유
//
// ┌ 이 화면이 무엇인가 ───────────────────────────────────────────────────────┐
// │ 이 어드민이 **밖으로 걸 수 있는 연동**을 한자리에 모아 보여주는 진열대다.          │
// │ 붙일 수 있는 연동, 그 상태(연동 완료/해제), 그리고 각각이 요구하는                │
// │ 자격증명의 모양을 보여준다.                                                   │
// │                                                                          │
// │ ⚠ **AI 전용이 아니다**(2026-07-22 배송 분류 추가). 이 화면의 문장이 스스로를      │
// │ 'AI 프로바이더 진열대' 라고 부르던 자리를 전부 고쳤다 — 진열대가 담은 것보다      │
// │ 좁게 말하면, 여기 온 운영자는 자기가 찾던 연동이 없다고 읽고 되돌아간다.          │
// │                                                                          │
// │ **자격증명을 발급하지 않는다.** 진열대는 '무엇을 붙일 수 있는가' 를 말하는 곳이고,  │
// │ 키를 만들고 폐기하는 일은 다른 관심사다 — 여기에 두면 둘 다 흐려진다.             │
// │                                                                          │
// │ **자격증명을 여기서 입력하지도 않는다.** 이름(또는 '앱 설정')을 누르면 그          │
// │ 연동의 상세로 간다(/settings/api-keys/:providerId) — ../oauth 가 목록과           │
// │ 상세로 갈린 것과 같은 관례다. 7종의 요구가 서로 다른데 한 화면에 다 펼치면         │
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
// (./data-source.ts → ./integrations.ts). 아무것도 저장하지 않은 상태에서는 7/7 이
// '연동 해제' 이고, 운영자가 상세 화면에서 실제로 저장해야 '연동 완료' 가 된다 —
// 붙지도 않은 것을 완료라 말하면 운영자는 되지도 않는 기능을 믿고 판다.
//
// [카탈로그에서 빠진 연동도 말한다] 카탈로그가 좁아지면(13종 → 6종) 이미 저장된 자격증명 중
// 어느 것은 **화면에서만 사라진다** — 그 문서는 그대로 남아 있다. 목록이 그 사실을 배너로 말한다:
// 조용히 지우지도, 조용히 감추지도 않는다(./integrations.ts 의 orphanedConnectionIds).
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
import { orphanedConnectionIds, resolveIntegrations } from './integrations';
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

export default function ApiKeysPage() {
  /** 기본 탭은 '모델' — 이 화면에서 먼저 하는 일은 '어떤 종류를 붙일까' 다(integrations.ts 탭 머리말).
   *  분류가 셋이 됐어도 첫 탭은 그대로다: 항목이 가장 많은 분류를 먼저 보여 준다. */
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
  const connections = (data?.value.connections ?? []).map(toConnection);
  const integrations = resolveIntegrations(connections);

  /**
   * 저장돼 있는데 카탈로그에 없는 프로바이더 — 목록에는 나올 자리가 없다.
   *
   * 조회에 실패했으면 빈 배열이라 배너도 뜨지 않는다. 그것이 맞다: 문서를 못 읽었으면
   * '고아 레코드가 없다' 가 아니라 **모르는 것**이고, 모르는 것으로 경고를 만들지 않는다.
   */
  const orphaned = orphanedConnectionIds(connections);

  const loading = isFetching && data === undefined;

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        이 사이트에 붙일 수 있는 연동을 모아 둔 곳이에요. 이름을 누르면 그 연동이 요구하는
        자격증명을 넣고 연동을 켤 수 있어요.
      </p>

      {error !== null && (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>
              저장된 연동을 불러오지 못했어요. 아래 목록은{' '}
              <strong>연동 상태를 확인하지 못한</strong> 상태이며, 실제로는 연동돼 있을 수 있어요.
            </span>
            <Button variant="secondary" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        </Alert>
      )}

      {/* 목록에서 사라진 연동을 **말한다** — 지우지 않았고, 감추지도 않는다.
          (왜 지우지 않는지는 ./integrations.ts 의 orphanedConnectionIds 머리말에 있다.) */}
      {orphaned.length > 0 && (
        <Alert tone="warning">
          연동 목록에서 빠진 항목의 자격증명이 저장돼 있어요 ({orphaned.join(' · ')}).{' '}
          <strong>저장된 값은 지워지지 않았지만</strong> 이 화면에서는 더 이상 열 수 없고, 그 연동은
          호출되지 않아요.
        </Alert>
      )}

      {loading ? (
        // 이관 전에는 aria-busy·aria-label 이 스켈레톤 자신에게 붙어 있었다 — Skeleton 계약은
        // 블록이 항상 aria-hidden 이고 로딩 고지는 **담은 영역**의 몫이라고 못박는다. 그래서 여기로 옮긴다.
        // role="status" 를 둔다: 역할 없는 <div>(generic)엔 aria-label 이 금지라(axe aria-prohibited-attr)
        // 이름을 실을 수 없다. status 는 author 이름을 허용하고 로딩을 polite 로 알린다.
        <div role="status" aria-busy="true" aria-label="연동 목록을 불러오는 중">
          <Skeleton />
        </div>
      ) : (
        <IntegrationsCard integrations={integrations} tab={tab} onTabChange={setTab} />
      )}
    </div>
  );
}
