/**
 * Design System/Templates/Settings/OAuth Provider — 제공자 한 명의 자격증명 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Settings`(시스템 설정)다 — `['시스템 설정', 'Settings', '/settings', …]`.
 * 화면 en = "OAuth Provider"(`/settings/oauth/:provider`).
 *
 * 대응 실화면: apps/admin/src/pages/settings/oauth/OAuthProviderPage.tsx 와 그 하위
 * components/OAuthProviderCard.tsx(chrome='plain') · components/provider-marks.tsx · validation.ts.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin(OAuthProviderCard·SettingsFormShell 등)을 import 하지 않는다. 실화면 논리 ↔ DS 매핑:
 *   목록 복귀 링크        → 토큰만 쓴 <a> + Icon(chevron-left)
 *   화면 제목             → 브랜드 마크 + <h2>(토큰)
 *   자격증명 카드(폼 껍데기) → Card + 토큰 <h2> + 설명(muted) + 저장 Button (SettingsFormShell 갈음)
 *   사용 스위치           → ToggleSwitch(우측 정렬 — 제목이 페이지 h2 에 이미 있다)
 *   발급 위치 안내         → 토큰 박스  ·  콘솔 주의사항 → Alert(info)
 *   자격증명 칸           → TextField(비밀은 마스크 + '변경')  ·  iOS URL 스키마 → 파생 <output>
 *   Redirect URI          → TextField  ·  카카오싱크·연결 테스트 → Button(연결 테스트는 백엔드 전까지 비활성)
 *
 * [비밀 칸의 세 상태] 저장된 적 없음(입력칸) · 저장돼 있음(마스크 + '변경', 입력 요소를 렌더하지 않는다) ·
 * 변경 중(입력칸 + '취소'). [iOS URL 스키마] 입력이 아니라 Client ID 의 파생값이다(어긋날 수 없다).
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 브랜드 마크는 data: URI 안에서만 이름 있는 색을 쓰고, 그 밖의
 * 시각 값은 토큰(cssVar/typography)과 rem·calc 만 참조한다.
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  Icon,
  Skeleton,
  TextField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Settings/OAuth Provider',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

const MASKED = '••••••••••••';

/* ── 브랜드 마크 — 인라인 SVG data: URI, 안에서만 이름 있는 색 (OAuthPage.stories 와 같은 규약) ── */

const BRAND_SVG: Record<string, string> = {
  google: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'><path fill='royalblue' d='M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z'/><path fill='mediumseagreen' d='M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z'/><path fill='gold' d='M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z'/><path fill='tomato' d='M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z'/></svg>`,
  kakao: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7.5' fill='gold'/><path fill='black' d='M16 7.2c-5.08 0-9.2 3.28-9.2 7.32 0 2.6 1.72 4.88 4.31 6.17l-1.03 3.83c-.09.35.3.63.6.42l4.55-3.03c.25.02.5.03.77.03 5.08 0 9.2-3.28 9.2-7.32S21.08 7.2 16 7.2z'/></svg>`,
  apple: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7.5' fill='black'/><path fill='white' d='M21.79 17.2c-.02-2.5 2.04-3.7 2.13-3.76-1.16-1.7-2.97-1.93-3.61-1.95-1.54-.16-3 .9-3.78.9-.78 0-1.99-.88-3.26-.86-1.68.02-3.22.98-4.09 2.48-1.74 3.03-.44 7.52 1.25 9.98.83 1.2 1.82 2.55 3.11 2.51 1.25-.05 1.72-.81 3.23-.81 1.5 0 1.93.81 3.25.78 1.34-.02 2.19-1.22 3.01-2.43.95-1.39 1.34-2.74 1.36-2.81-.03-.02-2.61-1-2.63-3.97zM19.32 9.66c.69-.84 1.16-2.01 1.03-3.18-1 .04-2.2.67-2.92 1.5-.63.74-1.19 1.93-1.04 3.07 1.12.08 2.25-.57 2.93-1.39z'/></svg>`,
};

function BrandMark({
  provider,
  markSize = cssVar('space.7'),
}: {
  provider: string;
  markSize?: string;
}) {
  const svg = BRAND_SVG[provider];
  if (svg === undefined) return null;
  const markStyle: CSSProperties = {
    display: 'inline-block',
    flexShrink: 0,
    width: markSize,
    height: markSize,
  };
  return (
    <img
      src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
      alt=""
      aria-hidden
      style={markStyle}
    />
  );
}

/* ── 데모 데이터 — 실화면 OAUTH_PROVIDER_META / CLIENT_SECRET_META 미러 ────────── */

type CredentialKind = 'client-secret' | 'apple-key';

interface ProviderMeta {
  readonly id: string;
  readonly title: string;
  readonly credentialKind: CredentialKind;
  readonly redirectLabel: string;
  readonly consoleHint: string;
  readonly consoleNotice: string | null;
  /** client-secret 갈래에서만 뜻이 있다 */
  readonly clientIdLabel?: string;
  readonly secretLabel?: string;
  readonly hasNativeAppKey?: boolean;
  readonly hasIosUrlScheme?: boolean;
}

const GOOGLE: ProviderMeta = {
  id: 'google',
  title: '구글 로그인',
  credentialKind: 'client-secret',
  clientIdLabel: '클라이언트 ID (client_id)',
  secretLabel: '클라이언트 보안 비밀번호 (client_secret)',
  redirectLabel: '승인된 리디렉션 URI',
  consoleHint: 'Google Cloud Console → API 및 서비스 → 사용자 인증 정보',
  consoleNotice: null,
  hasIosUrlScheme: true,
};

const KAKAO: ProviderMeta = {
  id: 'kakao',
  title: '카카오 로그인 · 싱크',
  credentialKind: 'client-secret',
  clientIdLabel: 'REST API 키 (client_id)',
  secretLabel: 'Client Secret (client_secret)',
  redirectLabel: 'Redirect URI',
  consoleHint: 'Kakao Developers → 내 애플리케이션 → 앱 키 · 카카오 로그인',
  consoleNotice: null,
  hasNativeAppKey: true,
};

const APPLE: ProviderMeta = {
  id: 'apple',
  title: 'Apple 로그인',
  credentialKind: 'apple-key',
  redirectLabel: 'Return URL',
  consoleHint:
    'Apple Developer → Certificates, Identifiers & Profiles → Identifiers(Services IDs) · Keys',
  consoleNotice:
    'Apple 은 고정된 시크릿을 주지 않아요. 아래 네 값으로 서버가 client_secret(JWT)을 서명해 만들고, 그 JWT 는 최대 6개월까지만 유효해 주기적으로 다시 만들어야 해요. 유료 Apple Developer Program 멤버십이 필요해요.',
};

const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

/** iOS URL 스키마 — 입력이 아니라 Client ID 에서 파생한다(역순 클라이언트 ID) */
function iosUrlScheme(clientId: string): string | null {
  const trimmed = clientId.trim();
  if (!trimmed.endsWith(GOOGLE_CLIENT_ID_SUFFIX)) return null;
  const bare = trimmed.slice(0, -GOOGLE_CLIENT_ID_SUFFIX.length);
  if (bare === '') return null;
  return `com.googleusercontent.apps.${bare}`;
}

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

const plainToggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
};

const configRegionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const consoleHintStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  margin: 0,
  padding: `${cssVar('space.2')} ${cssVar('space.3')}`,
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  ...typography('typography.caption.md'),
};

const consoleHintTagStyle: CSSProperties = {
  flexShrink: 0,
  color: cssVar('color.text.default'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
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

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  margin: 0,
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
  padding: `${cssVar('space.2')} ${cssVar('space.3')}`,
  border: `${cssVar('border-width.thin')} solid ${cssVar('color.border.default')}`,
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
};

const derivedValueStyle: CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflowWrap: 'anywhere',
  padding: `${cssVar('space.2')} ${cssVar('space.3')}`,
  border: `${cssVar('border-width.thin')} solid ${cssVar('color.border.default')}`,
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.default'),
  ...typography('typography.code.md'),
};

const derivedEmptyStyle: CSSProperties = {
  ...derivedValueStyle,
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
};

const filePickerStyle: CSSProperties = {
  minWidth: 0,
  padding: `${cssVar('space.2')} ${cssVar('space.3')}`,
  border: `${cssVar('border-width.thin')} solid ${cssVar('color.border.default')}`,
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
};

const testRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const footerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  borderTop: `${cssVar('border-width.thin')} solid ${cssVar('color.border.subtle')}`,
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/* ── 조립 ─────────────────────────────────────────────────────────────────────── */

/** 저장된 비밀의 세 상태(마스크 + '변경' / 입력칸 + '취소')를 그린다 */
function SecretField({
  id,
  label,
  stored,
  hint,
}: {
  id: string;
  label: string;
  stored: boolean;
  hint: string;
}) {
  const [value, setValue] = useState('');
  const [changing, setChanging] = useState(false);
  const showMasked = stored && !changing;

  if (showMasked) {
    return (
      <div style={fieldStyle}>
        <span style={fieldLabelStyle}>{label}</span>
        <span style={secretRowStyle}>
          <span style={maskedStyle}>{MASKED}</span>
          <Button variant="secondary" size="sm" onClick={() => setChanging(true)}>
            변경
          </Button>
        </span>
        <p style={hintStyle}>{hint}</p>
      </div>
    );
  }

  return (
    <div style={fieldStyle}>
      <span style={secretRowStyle}>
        <TextField
          id={id}
          label={label}
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          {...(stored ? { placeholder: '비워 두면 기존 시크릿을 유지해요' } : {})}
        />
        {stored ? (
          <Button variant="secondary" size="sm" onClick={() => setChanging(false)}>
            취소
          </Button>
        ) : null}
      </span>
      <p style={hintStyle}>{hint}</p>
    </div>
  );
}

function ClientSecretFields({
  meta,
  clientIdValue,
}: {
  meta: ProviderMeta;
  clientIdValue: string;
}) {
  const [clientId, setClientId] = useState(clientIdValue);
  const [nativeAppKey, setNativeAppKey] = useState('');
  const derivedScheme = meta.hasIosUrlScheme === true ? iosUrlScheme(clientId) : null;

  return (
    <>
      <div style={fieldStyle}>
        <TextField
          id="oauth-client-id"
          label={meta.clientIdLabel ?? 'Client ID'}
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
        />
        <p style={hintStyle}>
          {`${meta.title} 콘솔의 '${meta.clientIdLabel ?? 'Client ID'}' 값을 붙여넣으세요.`}
        </p>
      </div>

      <SecretField
        id="oauth-secret"
        label={meta.secretLabel ?? 'Client Secret'}
        stored={false}
        hint="입력한 값은 저장 후 다시 표시되지 않아요."
      />

      {meta.hasIosUrlScheme === true ? (
        <div style={fieldStyle}>
          <span style={fieldLabelStyle}>iOS URL 스키마</span>
          {derivedScheme === null ? (
            <output style={derivedEmptyStyle}>
              클라이언트 ID를 먼저 입력하면 여기에 자동으로 만들어져요.
            </output>
          ) : (
            <output style={derivedValueStyle}>{derivedScheme}</output>
          )}
          <p style={hintStyle}>
            클라이언트 ID를 뒤집어 만든 값이에요. 직접 입력하는 값이 아니므로 클라이언트 ID를 바꾸면
            함께 바뀌어요.
          </p>
        </div>
      ) : null}

      {meta.hasNativeAppKey === true ? (
        <div style={fieldStyle}>
          <TextField
            id="oauth-native-app-key"
            label="네이티브 앱 키"
            value={nativeAppKey}
            onChange={(event) => setNativeAppKey(event.target.value)}
          />
          <p style={hintStyle}>
            모바일 앱에서 카카오톡으로 로그인할 때 써요. 웹에서만 쓴다면 비워 두어도 돼요.
          </p>
        </div>
      ) : null}
    </>
  );
}

function AppleKeyFields() {
  const [servicesId, setServicesId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [keyId, setKeyId] = useState('');

  return (
    <>
      <div style={fieldStyle}>
        <TextField
          id="oauth-services-id"
          label="Services ID (client_id)"
          value={servicesId}
          onChange={(event) => setServicesId(event.target.value)}
        />
        <p style={hintStyle}>
          Apple Developer의 Identifiers에서 만든 Services ID예요. com.example.web 처럼 도메인을
          뒤집은 모양이에요.
        </p>
      </div>
      <div style={fieldStyle}>
        <TextField
          id="oauth-team-id"
          label="Team ID"
          value={teamId}
          onChange={(event) => setTeamId(event.target.value)}
        />
        <p style={hintStyle}>Apple Developer 계정의 팀 식별자예요. 서명할 JWT의 iss에 들어가요.</p>
      </div>
      <div style={fieldStyle}>
        <TextField
          id="oauth-key-id"
          label="Key ID"
          value={keyId}
          onChange={(event) => setKeyId(event.target.value)}
        />
        <p style={hintStyle}>
          아래 .p8 키를 만들 때 함께 발급된 식별자예요. 서명할 JWT 헤더의 kid에 들어가요.
        </p>
      </div>
      <div style={fieldStyle}>
        <span style={fieldLabelStyle}>개인키 파일 (.p8)</span>
        <input type="file" accept=".p8" style={filePickerStyle} />
        <p style={hintStyle}>
          Apple Developer → Keys에서 내려받은 .p8 파일을 고르세요. 이 파일은 발급 직후 단 한 번만
          내려받을 수 있고 Apple에서 다시 받을 수 없으니, 잃어버렸다면 새 키를 발급해야 해요.
        </p>
      </div>
    </>
  );
}

interface ProviderScreenProps {
  readonly meta: ProviderMeta;
  readonly initialEnabled?: boolean;
  readonly clientIdValue?: string;
  readonly loading?: boolean;
}

function ProviderScreen({
  meta,
  initialEnabled = false,
  clientIdValue = '',
  loading = false,
}: ProviderScreenProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [redirectUri, setRedirectUri] = useState('https://admin.example.com/auth/callback');
  const isKakao = meta.id === 'kakao';

  return (
    <div style={pageStyle}>
      <a href="#oauth-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <h2 style={titleStyle}>
        <BrandMark provider={meta.id} />
        {meta.title}
      </h2>

      <Card>
        <form style={cardBodyStyle} onSubmit={(event) => event.preventDefault()}>
          <h3 style={cardTitleStyle}>자격증명</h3>
          <p style={cardDescriptionStyle}>
            {`${meta.title}의 자격증명과 Redirect URI를 관리해요. 켠 제공자만 검증해요.`}
          </p>

          {loading ? (
            <div
              style={skeletonBodyStyle}
              role="status"
              aria-busy="true"
              aria-label="자격증명을 불러오는 중"
            >
              <Skeleton />
              <Skeleton />
              <Skeleton />
            </div>
          ) : (
            <>
              <div style={plainToggleRowStyle}>
                <ToggleSwitch
                  checked={enabled}
                  label={`${meta.title} 사용`}
                  onChange={setEnabled}
                />
              </div>

              <div style={configRegionStyle}>
                <p style={consoleHintStyle}>
                  <span style={consoleHintTagStyle}>발급 위치</span>
                  {meta.consoleHint}
                </p>

                {meta.consoleNotice !== null ? (
                  <Alert tone="info">{meta.consoleNotice}</Alert>
                ) : null}

                {meta.credentialKind === 'apple-key' ? (
                  <AppleKeyFields />
                ) : (
                  <ClientSecretFields meta={meta} clientIdValue={clientIdValue} />
                )}

                <div style={fieldStyle}>
                  <TextField
                    id="oauth-redirect"
                    label={meta.redirectLabel}
                    value={redirectUri}
                    onChange={(event) => setRedirectUri(event.target.value)}
                  />
                  <p style={hintStyle}>
                    {`이 주소를 ${meta.title} 콘솔의 '${meta.redirectLabel}'에도 한 글자도 다르지 않게 등록해야 해요.`}
                  </p>
                </div>

                {isKakao ? (
                  <div style={testRowStyle}>
                    <Button variant="secondary" size="sm">
                      카카오싱크 간편 설정
                    </Button>
                    <p style={hintStyle}>
                      동의항목·약관 연결은 Kakao Developers 콘솔에서 설정해요. 새 창으로 열어요.
                    </p>
                  </div>
                ) : null}

                <div style={testRowStyle}>
                  {/* 백엔드가 없으므로 비활성 — 눌러서 가짜 성공을 보여주지 않는다(FEEDBACK-03) */}
                  <Button variant="secondary" size="sm" disabled>
                    연결 테스트
                  </Button>
                  <p style={hintStyle}>연결 테스트는 백엔드 연동 후 제공돼요.</p>
                </div>
              </div>

              <div style={footerStyle}>
                <Button variant="primary" type="submit">
                  저장
                </Button>
              </div>
            </>
          )}
        </form>
      </Card>
    </div>
  );
}

/** 정상 — 구글: Client ID + 새 시크릿 입력 + iOS URL 스키마(파생) + Redirect URI, 사용 켜짐 */
export const Google: Story = {
  render: () => (
    <ProviderScreen
      meta={GOOGLE}
      initialEnabled
      clientIdValue="1234567890-abcdefg.apps.googleusercontent.com"
    />
  ),
};

/** 카카오 — REST API 키 + 네이티브 앱 키 + 카카오싱크 간편 설정 버튼 */
export const Kakao: Story = {
  render: () => <ProviderScreen meta={KAKAO} initialEnabled clientIdValue="abcdef0123456789" />,
};

/** Apple — 시크릿 한 칸이 아니라 서명 재료 넷(Services ID·Team ID·Key ID·.p8 파일) */
export const Apple: Story = {
  render: () => <ProviderScreen meta={APPLE} initialEnabled />,
};

/** 로딩 — 설정을 읽는 동안 폼 자리에 스켈레톤 (STATE-01) */
export const Loading: Story = {
  render: () => <ProviderScreen meta={GOOGLE} loading />,
};
