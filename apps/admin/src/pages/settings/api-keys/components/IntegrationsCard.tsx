// 연동 목록 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// 탭 6종 + 표. 탭은 **두 축이 섞여 있다**: 분류 3종(모델 / 클라우드 / 게이트웨이) → 상태 2종
// (연동 완료 / 연동 해제) → 전체. 분류를 왼쪽에 두는 이유는 ../integrations.ts 의 탭 머리말에 있다.
//
// 축이 섞여 있어도 탭 라벨의 건수와 표의 행은 **같은 필터**를 통해 나온다
// (../integrations.ts 의 filterIntegrations) — 세면서 다른 규칙을 쓰면 '모델 (9)' 인데 행이 8개인
// 날이 온다.
//
// [상태를 지어내지 않는다] 각 행의 status·connectedAt 은 이 파일이 정하지 않는다. 카탈로그와
// **저장된 자격증명**(../ai-connections.ts)에서 이미 해소된 값을 받아 그리기만 한다 —
// 화면은 판정하지 않는다.
//
// [앱 설정] 갈 곳이 있으면 그 설정 화면으로 보내고, 없으면 **왜 없는지**를 말한 채 잠근다.
// 잠긴 버튼 옆에 이유가 없으면 운영자는 고장이라고 생각한다.
import { useCallback } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { cssVar, Menu, tabPanelId, Tabs } from '@tds/ui';
import type { MenuProps } from '@tds/ui';

import {
  Alert,
  buttonStyle,
  Card,
  CardTitle,
  StatusBadge,
  tableStyle,
  tdStyle,
  thStyle,
} from '../../../../shared/ui';
import { formatDateOnly } from '../../_shared/diff';
import {
  filterIntegrations,
  integrationCategoryLabel,
  integrationTabItems,
  isIntegrationTabId,
} from '../integrations';
import type { Integration, IntegrationTabId } from '../integrations';
import { ServiceGlyph } from './ServiceGlyph';

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const nameCellStyle: CSSProperties = {
  ...tdStyle,
  minWidth: 0,
};

const nameRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const nameStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const nameTextStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
};

const descriptionStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const mutedCellStyle: CSSProperties = {
  ...tdStyle,
  color: cssVar('color.text.muted'),
  whiteSpace: 'nowrap',
};

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'end',
  whiteSpace: 'nowrap',
};

const actionRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

/** 잠긴 '앱 설정' 옆의 이유 — 표 안이라 한 줄로 짧게 */
const reasonStyle: CSSProperties = {
  display: 'block',
  maxWidth: 'calc(var(--tds-space-6) * 7)',
  marginTop: cssVar('space.1'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  whiteSpace: 'normal',
  textAlign: 'end',
};

const emptyStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: cssVar('space.6'),
  paddingBottom: cssVar('space.6'),
  paddingLeft: 0,
  paddingRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  textAlign: 'center',
};

const TAB_PANEL_ID = tabPanelId('settings-integrations');

interface IntegrationsCardProps {
  readonly integrations: readonly Integration[];
  readonly tab: IntegrationTabId;
  readonly onTabChange: (tab: IntegrationTabId) => void;
}

export function IntegrationsCard({ integrations, tab, onTabChange }: IntegrationsCardProps) {
  const navigate = useNavigate();

  const rows = filterIntegrations(integrations, tab);
  const tabs = integrationTabItems(integrations);

  /**
   * 보이는 행이 **전부 같은 이유로** 잠겨 있으면 그 이유를 행마다 반복하지 않고 표 위에 한 번만 적는다.
   *
   * [왜 필요해졌나] 잠긴 이유를 버튼 옆에 적는 규율(`:263`)은 이유가 행마다 다를 때를 위한 것이다.
   * 지금처럼 설정 화면이 통째로 없어 13행이 **똑같은 문장**을 들고 있으면, 같은 문장이 13번
   * 반복돼 표를 덮는다 — 읽히지 않고, 정작 행마다 다른 정보(이름·설명)를 밀어낸다.
   * 데이터는 그대로 두고(각 항목은 여전히 자기 이유를 안다) **표시만** 접는다.
   */
  const sharedReason =
    rows.length > 0 &&
    rows.every(
      (item) =>
        item.settingsUnavailableReason !== null &&
        item.settingsUnavailableReason === rows[0]?.settingsUnavailableReason,
    )
      ? (rows[0]?.settingsUnavailableReason ?? null)
      : null;

  /** @tds/ui Tabs 는 도메인을 모른다 — onChange 로 `string` 을 준다. 여기서 좁힌다 */
  const selectTab = useCallback(
    (id: string) => {
      if (!isIntegrationTabId(id)) return;
      onTabChange(id);
    },
    [onTabChange],
  );

  // DS Menu 의 items 는 잠금 사유를 optional `string` 으로 받는다(값이 있으면 그 항목이 잠긴다).
  // 예전 지역 컴포넌트는 `string | null` 이었다 — 뜻은 같고 표기만 다르다.
  // tsconfig 가 exactOptionalPropertyTypes 라 `undefined` 를 넣는 대신 **키를 빼야** 한다.
  const menuItemsOf = useCallback((integration: Integration): MenuProps['items'] => {
    const disconnectReason =
      integration.status === 'disconnected'
        ? '이미 연동 해제 상태입니다.'
        : integration.settingsPath === null
          ? '해제할 설정 화면이 아직 없습니다.'
          : null;
    const guideReason = integration.guideUrl === null ? '공개된 연동 문서가 아직 없습니다.' : null;

    return [
      {
        id: 'disconnect',
        label: '연동 해제',
        ...(disconnectReason === null ? {} : { disabledReason: disconnectReason }),
      },
      {
        id: 'guide',
        label: '연동 방법 안내',
        ...(guideReason === null ? {} : { disabledReason: guideReason }),
      },
    ];
  }, []);

  const onMenuSelect = useCallback(
    (integration: Integration, id: string) => {
      if (id === 'disconnect') {
        // 해제는 자격증명을 끄는 일이다 — 그 스위치를 가진 화면으로 보낸다.
        // 여기서 직접 끄면 같은 동작이 두 화면에 살고, 확인 문구도 둘로 갈라진다.
        if (integration.settingsPath === null) return;
        void navigate(integration.settingsPath);
        return;
      }
      if (integration.guideUrl === null) return;
      window.open(integration.guideUrl, '_blank', 'noopener,noreferrer');
    },
    [navigate],
  );

  return (
    <Card>
      <CardTitle>연동 목록</CardTitle>

      <div style={stackStyle}>
        {/* 라벨이 '연동 상태' 가 아닌 이유: 6개 중 셋은 상태가 아니라 분류다 */}
        <Tabs value={tab} items={tabs} ariaLabel="연동 분류 및 상태 필터" onChange={selectTab} />

        {/* 전 행이 같은 이유로 잠겼을 때만 — 행마다 반복하는 대신 여기 한 번 */}
        {sharedReason !== null && <Alert tone="info">{sharedReason}</Alert>}

        <div id={TAB_PANEL_ID} role="tabpanel">
          {rows.length === 0 ? (
            <p style={emptyStyle}>이 상태에 해당하는 연동이 없습니다.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle} scope="col">
                    상태
                  </th>
                  <th style={thStyle} scope="col">
                    이름
                  </th>
                  <th style={thStyle} scope="col">
                    연동 시작일
                  </th>
                  {/* '관리' 가 아니다 — 관리할 수 있는 것이 아직 없다(설정 화면이 없어 전 행 비활성).
                      열에 담긴 것은 설정 화면으로 가는 길과 안내 링크뿐이라 그대로 '설정' 이라 적는다.
                      할 수 없는 일을 열 이름으로 약속하지 않는다. */}
                  <th style={thStyle} scope="col">
                    설정
                  </th>
                </tr>
              </thead>

              <tbody>
                {rows.map((integration) => {
                  const connected = integration.status === 'connected';
                  const settingsPath = integration.settingsPath;

                  return (
                    <tr key={integration.id}>
                      <td style={tdStyle}>
                        <StatusBadge
                          tone={connected ? 'success' : 'neutral'}
                          label={connected ? '연동 완료' : '연동 해제'}
                        />
                      </td>

                      <td style={nameCellStyle}>
                        <span style={nameRowStyle}>
                          <ServiceGlyph glyph={integration.glyph} brand={integration.brand} />
                          <span style={nameStackStyle}>
                            <span style={nameTextStyle}>
                              {/* 이름이 상세로 가는 링크다 — 앱의 다른 목록(회원·공지·상품)과 같은 관례이고,
                                  링크라서 새 탭·중간 클릭·'링크 주소 복사' 가 그대로 동작한다.
                                  (설정 화면이 없는 항목이 다시 생기면 그때는 링크가 아니라 텍스트다.) */}
                              {settingsPath === null ? (
                                integration.name
                              ) : (
                                <Link to={settingsPath} className="tds-ui-link tds-ui-focusable">
                                  {integration.name}
                                </Link>
                              )}
                              {' · '}
                              {integrationCategoryLabel(integration.category)}
                            </span>
                            <span style={descriptionStyle}>{integration.description}</span>
                          </span>
                        </span>
                      </td>

                      {/* 한 번도 연결된 적 없으면 '-' — 다른 시각(설정 수정일)으로 채우지 않는다 */}
                      <td style={mutedCellStyle}>
                        {integration.connectedAt === null
                          ? '-'
                          : formatDateOnly(integration.connectedAt)}
                      </td>

                      <td style={actionCellStyle}>
                        <span style={actionRowStyle}>
                          {/* 갈 곳이 있으면 **링크**다(MembersTable 의 Link-as-button 선례).
                              갈 곳이 없으면 누를 수 없는 것을 링크로 그리지 않는다 — 그때는
                              비활성 모양의 <span> 이고 왜 못 가는지가 옆에 붙는다. */}
                          {settingsPath === null ? (
                            <span style={buttonStyle('secondary', true)} aria-disabled="true">
                              앱 설정
                            </span>
                          ) : (
                            <Link
                              to={settingsPath}
                              className="tds-ui-focusable"
                              style={buttonStyle('secondary')}
                              aria-label={`${integration.name} 앱 설정`}
                            >
                              앱 설정
                            </Link>
                          )}

                          <Menu
                            // 접근 가능한 이름은 예전 지역 컴포넌트가 붙이던 접미사를 그대로 둔다 —
                            // '구글 로그인' 만 읽히면 무엇을 하는 버튼인지 알 수 없다
                            label={`${integration.name} 더보기`}
                            trigger="more-vertical"
                            items={menuItemsOf(integration)}
                            onSelect={(id) => onMenuSelect(integration, id)}
                          />
                        </span>

                        {/* 잠근 이유를 곧바로 옆에 적는다 — 없으면 고장으로 읽힌다.
                            (전 행이 같은 이유면 위에 한 번만 적었으므로 여기서는 생략한다) */}
                        {sharedReason === null &&
                          integration.settingsUnavailableReason !== null && (
                            <span style={reasonStyle}>{integration.settingsUnavailableReason}</span>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Card>
  );
}
