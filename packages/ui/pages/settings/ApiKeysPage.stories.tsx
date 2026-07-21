/**
 * Design System/Templates/Settings/API Keys — AI 모델 연동 마켓스토어 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Settings`(시스템 설정)다 — packages/ui/pages/_data/pages.ts 의 GROUPS 에서
 * `['시스템 설정', 'Settings', '/settings', …]` 로 확정된다. 화면 en = "API Keys"(`/settings/api-keys`).
 *
 * 대응 실화면: apps/admin/src/pages/settings/api-keys/ApiKeysPage.tsx 와 그 하위
 * components/IntegrationsCard.tsx · components/ServiceGlyph.tsx (+ integrations.ts 카탈로그).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면 논리 ↔ DS 컴포넌트 매핑:
 *   화면 설명문        → 토큰만 쓴 <p>(muted)
 *   조회 실패 배너      → Alert(danger) + 다시 시도 Button
 *   최초 로드          → aria-busy 영역 + Skeleton
 *   연동 목록 카드      → Card(제목 <h2> 는 토큰만으로 조립 — DS 에 CardTitle 이 없다)
 *   분류/상태 탭        → Tabs(라벨에 건수 '모델 (9)')
 *   서비스 글리프       → 토큰만 쓴 머리글자 배지(실화면 ServiceGlyph 는 brand=null 이라 전부 배지다)
 *   상태 배지          → StatusBadge(success 연동 완료 / neutral 연동 해제)
 *   행 액션            → 앱 설정 Button + 더보기 Menu(연동 해제 / 연동 방법 안내)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  Menu,
  Skeleton,
  StatusBadge,
  Tabs,
  cssVar,
  typography,
} from '../../src';
import type { MenuProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Settings/API Keys',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 토큰 유틸 (px 리터럴 대신 space 토큰의 calc 배수) ──────────────────────────── */

const size = (multiple: number): string => `calc(${cssVar('space.6')} * ${multiple})`;

/* ── 데모 데이터 — 실화면 integrations.ts 카탈로그를 대표값으로 인라인 ──────────── */

type Category = 'model' | 'cloud' | 'gateway';
type Status = 'connected' | 'disconnected';

const CATEGORY_LABEL: Record<Category, string> = {
  model: '모델',
  cloud: '클라우드',
  gateway: '게이트웨이',
};

interface Provider {
  readonly id: string;
  readonly name: string;
  readonly glyph: string;
  readonly category: Category;
  readonly description: string;
}

/** 실화면 INTEGRATION_CATALOGUE 미러 — 글리프는 카탈로그 안에서 유일하다(머리글자 충돌 방지) */
const PROVIDERS: readonly Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    glyph: 'OA',
    category: 'model',
    description: 'GPT 계열 모델을 부릅니다. 글 생성·요약·분류 전반에 씁니다. 키 하나로 연동됩니다.',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    glyph: 'Cl',
    category: 'model',
    description:
      'Claude 모델을 부릅니다. 긴 문서 이해와 도구 사용에 강합니다. 키와 함께 API 버전을 보냅니다.',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    glyph: 'Gm',
    category: 'model',
    description:
      'Gemini 모델을 부릅니다. 이미지·문서를 함께 다룰 때 씁니다. Vertex AI 와는 다른 연동입니다.',
  },
  {
    id: 'grok',
    name: 'Grok',
    glyph: 'Gk',
    category: 'model',
    description: 'Grok 모델을 부릅니다. OpenAI 호환 형식이라 기존 호출부를 그대로 씁니다.',
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    glyph: 'Mi',
    category: 'model',
    description: '유럽에서 운영하는 모델입니다. 데이터 처리 위치가 중요할 때 후보가 됩니다.',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    glyph: 'Px',
    category: 'model',
    description: '웹 검색에 근거해 답합니다. 최신 정보가 필요한 질문에 씁니다.',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    glyph: 'Co',
    category: 'model',
    description: '검색용 임베딩과 재순위(rerank)에 강합니다. 사내 문서 검색에 씁니다.',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    glyph: 'DS',
    category: 'model',
    description: '추론에 특화된 모델을 낮은 단가로 제공합니다. OpenAI 호환 형식입니다.',
  },
  {
    id: 'groq',
    name: 'Groq',
    glyph: 'Gq',
    category: 'model',
    description:
      '공개 모델을 자체 하드웨어에서 매우 빠르게 돌립니다. 응답 속도가 중요할 때 씁니다.',
  },
  {
    id: 'azure-openai',
    name: 'Azure OpenAI',
    glyph: 'Az',
    category: 'cloud',
    description:
      '우리 Azure 구독 안에서 OpenAI 모델을 돌립니다. 키 외에 리소스 주소와 배포명이 필요합니다.',
  },
  {
    id: 'amazon-bedrock',
    name: 'Amazon Bedrock',
    glyph: 'Br',
    category: 'cloud',
    description:
      '여러 회사의 모델을 AWS 계정 안에서 부릅니다. 자격증명이 리전에 묶여 있어 리전을 함께 지정합니다.',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    glyph: 'OR',
    category: 'gateway',
    description: '키 하나로 여러 회사의 모델을 골라 부릅니다. 모델을 바꿔 가며 비교할 때 편합니다.',
  },
  {
    id: 'together',
    name: 'Together AI',
    glyph: 'Tg',
    category: 'gateway',
    description: '공개 모델을 호스팅해 제공합니다. 직접 서버를 두지 않고 오픈 모델을 쓸 때 씁니다.',
  },
];

/** 연동 완료로 저장된 것 + 연동 시작일 — 실화면은 저장된 자격증명에서 해소한다(여기서는 데모로 인라인) */
const CONNECTED: Readonly<Record<string, string>> = {
  openai: '2026-06-30',
  'azure-openai': '2026-07-11',
};

/* ── 탭 (한 축이 아니다: 분류 3 + 상태 2 + 전체) ─────────────────────────────── */

const TABS = ['model', 'cloud', 'gateway', 'connected', 'disconnected', 'all'] as const;
type TabId = (typeof TABS)[number];

const TAB_LABEL: Record<TabId, string> = {
  model: '모델',
  cloud: '클라우드',
  gateway: '게이트웨이',
  connected: '연동 완료',
  disconnected: '연동 해제',
  all: '전체',
};

const isTabId = (value: string): value is TabId => TABS.some((tab) => tab === value);

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const descriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  margin: 0,
  color: cssVar('color.text.muted'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const tableWrapStyle: CSSProperties = { overflowX: 'auto' };

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const thStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  textAlign: 'start',
  padding: cssVar('space.3'),
  borderBottom: `${cssVar('border-width.thin')} solid ${cssVar('color.border.default')}`,
  whiteSpace: 'nowrap',
};

const tdStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  padding: cssVar('space.3'),
  borderBottom: `${cssVar('border-width.thin')} solid ${cssVar('color.border.subtle')}`,
  verticalAlign: 'top',
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
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const descCellStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const mutedCellStyle: CSSProperties = {
  ...tdStyle,
  color: cssVar('color.text.muted'),
  whiteSpace: 'nowrap',
};

const actionCellStyle: CSSProperties = {
  ...tdStyle,
  whiteSpace: 'nowrap',
};

const actionRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

/** 머리글자 배지 — 실화면 ServiceGlyph(brand=null) 미러. 정사각 변은 space 토큰의 배수다 */
const glyphStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: size(1.5),
  height: size(1.5),
  borderRadius: cssVar('radius.md'),
  border: `${cssVar('border-width.thin')} solid ${cssVar('color.border.default')}`,
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
};

const emptyStyle: CSSProperties = {
  ...typography('typography.label.md'),
  margin: 0,
  padding: `${cssVar('space.6')} 0`,
  color: cssVar('color.text.muted'),
  textAlign: 'center',
};

/* ── 조립 ─────────────────────────────────────────────────────────────────────── */

function ServiceGlyph({ glyph }: { glyph: string }) {
  return (
    <span style={glyphStyle} aria-hidden="true">
      {glyph}
    </span>
  );
}

function statusOf(id: string, failClosed: boolean): Status {
  if (failClosed) return 'disconnected';
  return CONNECTED[id] !== undefined ? 'connected' : 'disconnected';
}

/** 실화면 filterIntegrations 미러 — 라벨 건수와 표 행이 같은 필터를 지난다 */
function filterRows(tab: TabId, failClosed: boolean): readonly Provider[] {
  if (tab === 'all') return PROVIDERS;
  if (tab === 'connected' || tab === 'disconnected') {
    return PROVIDERS.filter((provider) => statusOf(provider.id, failClosed) === tab);
  }
  return PROVIDERS.filter((provider) => provider.category === tab);
}

function tabItems(failClosed: boolean): readonly { readonly id: string; readonly label: string }[] {
  return TABS.map((tab) => ({
    id: tab,
    label: `${TAB_LABEL[tab]} (${String(filterRows(tab, failClosed).length)})`,
  }));
}

/** 더보기 메뉴 — exactOptionalPropertyTypes 라 disabledReason 은 있을 때만 스프레드한다 */
function menuItemsOf(status: Status): MenuProps['items'] {
  const disconnectReason = status === 'disconnected' ? '이미 연동 해제 상태입니다.' : null;
  return [
    {
      id: 'disconnect',
      label: '연동 해제',
      ...(disconnectReason === null ? {} : { disabledReason: disconnectReason }),
    },
    { id: 'guide', label: '연동 방법 안내', disabledReason: '공개된 연동 문서가 아직 없습니다.' },
  ];
}

function IntegrationsCard({ failClosed }: { failClosed: boolean }) {
  const [tab, setTab] = useState<TabId>('model');
  const titleId = useId();
  const rows = filterRows(tab, failClosed);

  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={cardTitleStyle}>
          연동 목록
        </h2>

        <Tabs
          value={tab}
          items={tabItems(failClosed)}
          ariaLabel="연동 분류 및 상태 필터"
          onChange={(next) => {
            if (isTabId(next)) setTab(next);
          }}
        />

        {rows.length === 0 ? (
          <p style={emptyStyle}>이 상태에 해당하는 연동이 없습니다.</p>
        ) : (
          <div style={tableWrapStyle}>
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
                  <th style={thStyle} scope="col">
                    설정
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((provider) => {
                  const status = statusOf(provider.id, failClosed);
                  const connected = status === 'connected';
                  return (
                    <tr key={provider.id}>
                      <td style={tdStyle}>
                        <StatusBadge
                          tone={connected ? 'success' : 'neutral'}
                          label={connected ? '연동 완료' : '연동 해제'}
                        />
                      </td>
                      <td style={tdStyle}>
                        <span style={nameRowStyle}>
                          <ServiceGlyph glyph={provider.glyph} />
                          <span style={nameStackStyle}>
                            <span style={nameTextStyle}>
                              {`${provider.name} · ${CATEGORY_LABEL[provider.category]}`}
                            </span>
                            <span style={descCellStyle}>{provider.description}</span>
                          </span>
                        </span>
                      </td>
                      <td style={mutedCellStyle}>
                        {connected ? (CONNECTED[provider.id] ?? '-') : '-'}
                      </td>
                      <td style={actionCellStyle}>
                        <span style={actionRowStyle}>
                          <Button variant="secondary" size="sm">
                            앱 설정
                          </Button>
                          <Menu
                            label={`${provider.name} 더보기`}
                            trigger="more-vertical"
                            items={menuItemsOf(status)}
                          />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}

interface ApiKeysScreenProps {
  readonly loading?: boolean;
  readonly loadFailed?: boolean;
}

function ApiKeysScreen({ loading = false, loadFailed = false }: ApiKeysScreenProps) {
  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>
        이 사이트에 연동할 수 있는 AI 모델 프로바이더를 모아 둔 곳입니다. 이름을 누르면 그
        프로바이더가 요구하는 자격증명을 넣고 연동을 켤 수 있습니다.
      </p>

      {loadFailed ? (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>
              저장된 연동을 불러오지 못했습니다. 아래 목록은{' '}
              <strong>연동 상태를 확인하지 못한</strong> 상태이며, 실제로는 연동돼 있을 수 있습니다.
            </span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      ) : null}

      {loading ? (
        <div aria-busy="true" aria-label="연동 목록을 불러오는 중">
          <Skeleton />
        </div>
      ) : (
        <IntegrationsCard failClosed={loadFailed} />
      )}
    </div>
  );
}

/** 정상 — OpenAI·Azure OpenAI 는 연동 완료, 나머지는 연동 해제(연동 완료/해제가 함께 보이는 상태) */
export const Default: Story = {
  render: () => <ApiKeysScreen />,
};

/** 최초 로드 — 저장된 연동을 읽는 동안 Skeleton (STATE-01: data === undefined) */
export const Loading: Story = {
  render: () => <ApiKeysScreen loading />,
};

/** 조회 실패 — fail-closed: 배너로 사실을 말하고 전 항목을 '연동 해제' 로 둔다(지어내지 않는다) */
export const LoadFailed: Story = {
  render: () => <ApiKeysScreen loadFailed />,
};
