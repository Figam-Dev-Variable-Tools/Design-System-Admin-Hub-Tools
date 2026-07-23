/**
 * Design System/Templates/Settings/AI Connection — 프로바이더 하나의 자격증명 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Settings`(시스템 설정)다 — `['시스템 설정', 'Settings', '/settings', …]`.
 * 화면 en = "AI Connection"(`/settings/api-keys/:providerId`).
 *
 * 대응 실화면: apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx 와 그 하위
 * components/AiCredentialFields.tsx · components/ServiceGlyph.tsx (+ integrations.ts 카탈로그).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin(SettingsFormShell 등)을 import 하지 않는다. 실화면 논리 ↔ DS 컴포넌트 매핑:
 *   목록 복귀 링크        → 토큰만 쓴 <a> + Icon(chevron-left)
 *   화면 제목             → 머리글자 배지 + <h2>(토큰)
 *   자격증명 카드(폼 껍데기) → Card + 토큰 <h2> + 설명(muted) + 저장/취소 Button (SettingsFormShell 갈음)
 *   사용 스위치           → ToggleSwitch
 *   자격증명 칸           → TextField(비밀은 type=password) · 저장된 비밀은 마스크 + '변경' Button
 *   프로바이더 주의사항    → Alert(info)  ·  연결 상태 카드 → StatusBadge ×2 + Alert(info)
 *
 * [비밀 칸의 세 상태] ① 저장된 적 없음 → 입력칸 ② 저장돼 있음 → 마스크 + '변경'(입력 요소를 아예
 * 렌더하지 않는다) ③ 변경 중 → 입력칸 + '취소'. 실화면 AiCredentialFields 와 같은 상태 기계다.
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰(cssVar/typography)과 rem·calc 만 참조한다.
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  Icon,
  Skeleton,
  StatusBadge,
  TextField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Settings/AI Connection',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

const size = (multiple: number): string => `calc(${cssVar('space.6')} * ${multiple})`;

const MASKED = '••••••••••••';

/* ── 데모 데이터 — 실화면 카탈로그 항목 하나의 요구 자격증명을 인라인 ──────────── */

interface CredentialField {
  readonly key: string;
  readonly label: string;
  readonly secret: boolean;
  readonly required: boolean;
  readonly hint: string;
}

interface DemoProvider {
  readonly id: string;
  readonly name: string;
  readonly glyph: string;
  readonly categoryLabel: string;
  readonly description: string;
  /** 자격증명 화면에 붙는 이 프로바이더만의 주의사항 — 없으면 null */
  readonly connectionNotice: string | null;
  readonly credentials: readonly CredentialField[];
}

const API_KEY_FIELD: CredentialField = {
  key: 'apiKey',
  label: 'API 키',
  secret: true,
  required: true,
  hint: '프로바이더 콘솔에서 발급한 키예요. 저장하면 다시 볼 수 없어요.',
};

/** 파운데이션 모델 — 키 하나로 되지 않는 곳(리소스 주소·배포명이 함께 필요하다) */
const AZURE_OPENAI: DemoProvider = {
  id: 'azure-openai',
  name: 'Azure OpenAI',
  glyph: 'Az',
  categoryLabel: '파운데이션 모델',
  description:
    '우리 Azure 구독 안에서 OpenAI 모델을 돌려요. 키 외에 리소스 주소와 배포명이 필요해요.',
  connectionNotice:
    'API 버전을 비우면 v1 엔드포인트로, 채우면 기존(dated) 엔드포인트로 불러요. 선택이지만 아무래도 좋은 칸은 아니에요 — 이 칸의 유무가 어느 표면을 부를지를 갈라요.',
  credentials: [
    {
      ...API_KEY_FIELD,
      hint: 'Azure 포털의 해당 OpenAI 리소스 > 키 및 엔드포인트에서 복사해요.',
    },
    {
      key: 'endpoint',
      label: '리소스 엔드포인트',
      secret: false,
      required: true,
      hint: '예: https://내리소스이름.openai.azure.com',
    },
    {
      key: 'deployment',
      label: '배포명',
      secret: false,
      required: true,
      hint: '모델명이 아니라 배포에 붙인 이름이에요. 다르면 호출이 404가 나요.',
    },
    {
      key: 'apiVersion',
      label: 'API 버전',
      secret: false,
      required: false,
      hint: '기존(dated) 엔드포인트를 쓸 때만 채워요. 예: 2024-06-01. v1 엔드포인트는 비워요.',
    },
  ],
};

/**
 * 모델 — 비밀은 키 하나뿐이고 **나머지는 전부 공개 선택 칸**이다.
 *
 * 실화면과 같은 다섯 칸을 그린다: 키(비밀·필수) · 베이스 URL · 기본 모델 · 조직 ID · 프로젝트 ID.
 * 뒤의 넷이 왜 칸으로 있는지(그리고 왜 비밀이 아닌지)는 실화면 카탈로그 주석에 있다 —
 * 요약하면 ① 주소 교체가 정상 사용법인 프로바이더가 있고 ② 조직·프로젝트 ID 가 없으면 아예
 * 연동되지 않는 계정이 실재하며 ③ 그 값들만으로는 어떤 호출도 인증되지 않는다.
 */
const OPENAI: DemoProvider = {
  id: 'openai',
  name: 'OpenAI',
  glyph: 'OA',
  categoryLabel: '모델',
  description: 'GPT 계열 모델을 불러요. 글 생성·요약·분류 전반에 써요. 키 하나로 연동돼요.',
  connectionNotice:
    '조직·프로젝트 ID 는 선택이에요 — 다중 조직 계정이거나 레거시 사용자 API 키를 쓰면 필요해요(공식 문서 기준). 그때는 이 값이 없으면 연동되지 않아요. 둘 다 비밀이 아니라 계정 안에서 우리를 가리키는 식별자이므로 저장한 값을 다시 보여 줘요. 비어 있으면 해당 헤더를 보내지 않아요.',
  credentials: [
    { ...API_KEY_FIELD, hint: 'OpenAI 대시보드의 API keys 에서 발급해요. sk- 로 시작해요.' },
    {
      key: 'baseUrl',
      label: '베이스 URL',
      secret: false,
      required: false,
      hint: '비우면 기본 주소(https://api.openai.com/v1)로 불러요. 프록시·게이트웨이를 거칠 때만 채워요.',
    },
    {
      key: 'defaultModel',
      label: '기본 모델',
      secret: false,
      required: false,
      hint: '비우면 클라이언트 기본값으로 불러요. 표시명이 아니라 API 가 받는 id 를 넣어요. 예: gpt-5.6-sol · gpt-5.6-terra · gpt-5.6-luna (2026-07 확인분 — 모델 목록은 빠르게 낡아요.)',
    },
    {
      key: 'organizationId',
      label: '조직 ID',
      secret: false,
      required: false,
      hint: 'OpenAI-Organization 헤더로 나가요. org- 로 시작해요. 다중 조직 계정이거나 레거시 사용자 API 키를 쓸 때만 필요해요.',
    },
    {
      key: 'projectId',
      label: '프로젝트 ID',
      secret: false,
      required: false,
      hint: 'OpenAI-Project 헤더로 나가요. proj_ 로 시작해요. 위 조직 ID 와 같은 조건에서만 필요해요.',
    },
  ],
};

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  color: cssVar('color.text.muted'),
  textDecoration: 'none',
  ...typography('typography.label.md'),
};

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

const titleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  margin: 0,
  ...typography('typography.title.md'),
  color: cssVar('color.text.default'),
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

const cardDescriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  margin: 0,
  color: cssVar('color.text.muted'),
};

const toggleRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  margin: 0,
  color: cssVar('color.text.muted'),
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
};

const secretRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const maskedStyle: CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
  color: cssVar('color.text.muted'),
  letterSpacing: cssVar('space.1'),
  ...typography('typography.label.md'),
};

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
  paddingTop: cssVar('space.2'),
  borderTop: `${cssVar('border-width.thin')} solid ${cssVar('color.border.subtle')}`,
};

const auditStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  margin: 0,
  color: cssVar('color.text.muted'),
};

const footerActionsStyle: CSSProperties = {
  display: 'inline-flex',
  gap: cssVar('space.2'),
};

const factListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const factRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const factLabelStyle: CSSProperties = {
  minWidth: size(2),
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/* ── 조립 ─────────────────────────────────────────────────────────────────────── */

function ServiceGlyph({ glyph }: { glyph: string }) {
  return (
    <span style={glyphStyle} aria-hidden="true">
      {glyph}
    </span>
  );
}

function BackLink() {
  return (
    <a href="#ai-connection-list" style={backLinkStyle}>
      <Icon name="chevron-left" />
      목록으로
    </a>
  );
}

interface AiConnectionScreenProps {
  readonly provider: DemoProvider;
  /** 저장돼 있는 비밀 칸의 키들 — 마스크 + '변경' 으로 그린다 */
  readonly storedSecrets?: readonly string[];
  /** 되읽는 비밀 아닌 칸의 저장값(엔드포인트·배포명 등) */
  readonly savedValues?: Readonly<Record<string, string>>;
  readonly initialEnabled?: boolean;
  readonly loading?: boolean;
}

function AiConnectionScreen({
  provider,
  storedSecrets = [],
  savedValues = {},
  initialEnabled = false,
  loading = false,
}: AiConnectionScreenProps) {
  const titleId = useId();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [values, setValues] = useState<Record<string, string>>(() => ({ ...savedValues }));
  const [changing, setChanging] = useState<readonly string[]>([]);

  const setField = (key: string, value: string): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  /** 연동이 성립하는가 — 켜져 있고 필수 칸이 빠짐없이 저장돼 있어야 한다(저장된 문서 기준) */
  const usable =
    enabled &&
    provider.credentials
      .filter((field) => field.required)
      .every((field) =>
        field.secret
          ? storedSecrets.includes(field.key)
          : (savedValues[field.key] ?? '').trim() !== '',
      );

  return (
    <div style={pageStyle}>
      <BackLink />

      <h2 style={titleStyle}>
        <ServiceGlyph glyph={provider.glyph} />
        {provider.name}
      </h2>

      {/* 자격증명 카드 — 실화면 SettingsFormShell 갈음(폼 껍데기 + 저장 바) */}
      <Card aria-labelledby={titleId}>
        <form style={cardBodyStyle} onSubmit={(event) => event.preventDefault()}>
          <h3 id={titleId} style={cardTitleStyle}>
            자격증명
          </h3>
          <p style={cardDescriptionStyle}>
            {`${provider.name} · ${provider.categoryLabel} — ${provider.description}`}
          </p>

          {provider.connectionNotice !== null ? (
            <Alert tone="info">{provider.connectionNotice}</Alert>
          ) : null}

          {loading ? (
            <div style={skeletonBodyStyle} aria-busy="true" aria-label="자격증명을 불러오는 중">
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : (
            <>
              <div style={toggleRowStyle}>
                <ToggleSwitch
                  checked={enabled}
                  label={`${provider.name} 사용`}
                  onChange={setEnabled}
                />
                <p style={hintStyle}>
                  켜면 필수 자격증명을 모두 요구해요. 끄는 것은 언제나 할 수 있어요 — 자격증명은
                  지워지지 않고 그대로 남아요.
                </p>
              </div>

              {provider.credentials.map((field) => {
                const stored = field.secret && storedSecrets.includes(field.key);
                const isChanging = changing.includes(field.key);
                const showMasked = stored && !isChanging;
                const required = enabled && field.required && !stored;

                return (
                  <div key={field.key} style={fieldStyle}>
                    {showMasked ? (
                      <>
                        <span style={fieldLabelStyle}>{field.label}</span>
                        <span style={secretRowStyle}>
                          <span style={maskedStyle}>{MASKED}</span>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setChanging((prev) => [...prev, field.key])}
                          >
                            변경
                          </Button>
                        </span>
                        <p style={hintStyle}>
                          저장돼 있어요. 값은 다시 표시할 수 없어요 — 바꾸려면 프로바이더 콘솔에서
                          새로 발급해 넣으세요.
                        </p>
                      </>
                    ) : (
                      <>
                        <span style={secretRowStyle}>
                          <TextField
                            id={`ai-credential-${field.key}`}
                            label={field.label}
                            type={field.secret ? 'password' : 'text'}
                            required={required}
                            value={values[field.key] ?? ''}
                            onChange={(event) => setField(field.key, event.target.value)}
                            {...(stored
                              ? { placeholder: '비워 두면 저장된 키를 그대로 써요' }
                              : {})}
                          />
                          {stored ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setChanging((prev) => prev.filter((key) => key !== field.key))
                              }
                            >
                              취소
                            </Button>
                          ) : null}
                        </span>
                        <p style={hintStyle}>{field.hint}</p>
                      </>
                    )}
                  </div>
                );
              })}

              <div style={footerStyle}>
                <p style={auditStyle}>마지막 저장: 관리자 · 2026-07-11 14:02</p>
                <span style={footerActionsStyle}>
                  <Button variant="secondary">취소</Button>
                  <Button variant="primary" type="submit">
                    저장
                  </Button>
                </span>
              </div>
            </>
          )}
        </form>
      </Card>

      {/* 연결 상태 — '채워짐' 과 '검증됨' 을 가른다(한 값으로 뭉치면 오타 고장이 배지 뒤에 숨는다) */}
      {loading ? null : (
        <Card>
          <div style={cardBodyStyle}>
            <h3 style={cardTitleStyle}>연결 상태</h3>
            <div style={factListStyle}>
              <div style={factRowStyle}>
                <span style={factLabelStyle}>자격증명</span>
                <StatusBadge
                  tone={usable ? 'success' : 'neutral'}
                  label={usable ? '채워짐' : '채워지지 않음'}
                />
                <span style={hintStyle}>
                  {usable
                    ? '필수 칸이 모두 저장돼 있고 사용 설정이 켜져 있어요.'
                    : '연동이 성립하려면 사용 설정을 켜고 필수 칸을 모두 저장해야 해요.'}
                </span>
              </div>
              <div style={factRowStyle}>
                <span style={factLabelStyle}>연결 검증</span>
                <StatusBadge tone="neutral" label="확인한 적 없음" />
                <span style={hintStyle}>-</span>
              </div>
              <Alert tone="info">
                <strong>자격증명이 채워진 것과 실제로 연결되는 것은 다른 사실이에요.</strong> 연결
                검증은 서버가 이 프로바이더를 실제로 한 번 호출해 봐야 성립해요. 그 서버 경로가 아직
                없어 이 화면은 검증 결과를 지어내지 않고 &lsquo;확인한 적 없음&rsquo;으로 둬요.{' '}
                <strong>제공자 공식 문서도 같은 말을 해요</strong> — 키를 브라우저 같은 클라이언트
                코드에 노출하지 말고 자체 백엔드를 거치라고 적어요.
              </Alert>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

/** 정상 — Azure OpenAI 신규(미저장): 키·엔드포인트·배포명·API 버전 네 칸, 사용 켜짐, 자격증명 채워지지 않음 */
export const Default: Story = {
  render: () => <AiConnectionScreen provider={AZURE_OPENAI} initialEnabled />,
};

/** 연동 완료 — OpenAI 저장된 키(마스크 + '변경'), 사용 켜짐 → 자격증명 '채워짐' */
export const Connected: Story = {
  render: () => <AiConnectionScreen provider={OPENAI} storedSecrets={['apiKey']} initialEnabled />,
};

/** 로딩 — 저장된 자격증명을 읽는 동안 폼 자리에 스켈레톤 (STATE-01) */
export const Loading: Story = {
  render: () => <AiConnectionScreen provider={AZURE_OPENAI} loading />,
};
