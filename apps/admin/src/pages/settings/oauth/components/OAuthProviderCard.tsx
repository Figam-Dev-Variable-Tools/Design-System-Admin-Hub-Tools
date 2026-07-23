// OAuth 제공자 한 칸 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [저장된 비밀의 세 상태] — client secret 이든 Apple 의 `.p8` 이든 규칙이 같다
//   ① 저장된 것 없음        → 입력칸(또는 파일 선택)을 바로 보여준다(넣어야 켤 수 있다)
//   ② 저장돼 있고 그대로 둠 → `••••••••••••` + '변경' 버튼. **입력 요소를 아예 렌더하지 않는다** —
//                            평문이 들어갈 자리를 두지 않는 것이 방어다(가리는 것이 아니다)
//   ③ 변경 중              → 빈 입력칸 + '취소'. 빈 채로 저장하면 기존 값이 유지된다
//
// [제공자마다 자격증명의 **모양**이 다르다] 무엇을 그릴지는 이 파일이 판단하지 않는다 —
// validation.ts 의 제공자 메타(providerCredentialKind · providerHasNativeAppKey ·
// providerHasIosUrlScheme)가 정하고 여기서는 따르기만 한다. 그래야 '카카오만 네이티브 앱 키'
// 같은 사실이 한 군데에만 적힌다.
//
//   · client-secret 갈래 (google·kakao·naver·facebook·line) → ClientSecretFields
//   · apple-key    갈래 (apple)                              → AppleKeyFields
//
//   두 갈래를 **한 컴포넌트에서 if 로 뒤섞지 않고** 따로 둔 이유: 각자 자기 갈래로 좁혀진
//   값만 받으므로 '이 제공자에 이 필드가 있던가?' 를 런타임에 되묻지 않는다. 타입이 답한다.
//
// [iOS URL 스키마는 입력이 아니라 **파생**이다] 역순 클라이언트 ID 를 계산해 읽기 전용으로 보여준다
// (근거: ../validation.ts 의 iosUrlScheme). 자유 입력이면 Client ID 와 조용히 어긋나고, 그 어긋남은
// iOS 로그인이 실패하는 순간까지 이 화면 어디에도 드러나지 않는다.
//
//   ⚠ 그 파생값은 `<span>` 이 아니라 **`<output>`** 으로 그린다. FormField 는 항상
//     `<label htmlFor>` 를 렌더하는데 `<span>` 은 labelable 요소가 아니라서, 라벨이 아무것도
//     가리키지 못하는 **고아 라벨**이 된다. `<output>` 은 HTML 명세의 labelable 요소라 라벨이
//     정상적으로 이어지면서도 **편집 가능한 컨트롤이 아니다** — 둘 다 만족하는 유일한 선택이다.
//     `<input readOnly>` 로 바꾸면 안 된다: 편집 컨트롤이 되어 파생값이 손으로 고쳐질 수 있고,
//     그러면 Client ID 와 어긋난다. OAuthProviderCard.test.tsx 가 그 회귀를 막는다.
//
// [Apple `.p8` 파일] **내용은 폼 상태에 들어오지 않는다** — 고른 파일의 이름만 담는다.
// 이름은 비밀이 아니고(무엇을 올렸는지 사람이 알아보는 꼬리표), 내용은 업로드 전용 통로로만
// 서버에 간다(TODO(backend) 는 ../data-source.ts). 그 통로가 아직 없다는 사실을 화면이 **숨기지
// 않는다** — 숨기면 '올렸는데 왜 안 되지' 가 된다.
//
// [연결 테스트] 백엔드가 없으므로 **버튼을 비활성**으로 둔다. 눌러서 아무 일도 없거나 가짜 성공을
// 보여주는 것보다, 왜 못 쓰는지 적어 두는 편이 정직하다 (FEEDBACK-03: no-op 금지).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { UseFormRegister } from 'react-hook-form';

import {
  Alert,
  Button,
  Card,
  CardTitle,
  controlStyle,
  errorIdOf,
  FormField,
  Icon,
  ToggleSwitch,
  useToast,
} from '../../../../shared/ui';
import { copyToClipboard, MASKED_SECRET_TEXT } from '../../_shared/secret';
import {
  appleIdLengthWarning,
  APPLE_ID_MAX,
  APPLE_PRIVATE_KEY_EXTENSION,
  clientIdFormatWarning,
  CLIENT_ID_MAX,
  CLIENT_SECRET_MAX,
  iosUrlScheme,
  isAppleProvider,
  NATIVE_APP_KEY_MAX,
  providerClientIdLabel,
  providerConsoleHint,
  providerConsoleNotice,
  providerHasIosUrlScheme,
  providerHasNativeAppKey,
  providerLabel,
  providerRedirectLabel,
  providerRedirectNote,
  providerSecretLabel,
  providerSecretRecovery,
  providerTitle,
} from '../validation';
import type {
  AppleProviderValues,
  ClientSecretProviderValues,
  OAuthProviderValues,
  OAuthSettingsValues,
} from '../validation';
import { ProviderMark } from './provider-marks';
import { cssVar } from '@tds/ui';

/** 카카오싱크 '간편 설정' 이 실제로 있는 자리 — 우리 화면이 흉내 낼 수 있는 동작이 아니다 */
const KAKAO_SYNC_CONSOLE_URL = 'https://developers.kakao.com/console/app';

/** 이 카드가 그릴 수 있는 필드 오류들 — 키는 필드명(두 갈래를 합쳐 둔다) */
type ProviderFieldErrors = Partial<
  Record<
    | 'clientId'
    | 'secret'
    | 'nativeAppKey'
    | 'redirectUri'
    | 'servicesId'
    | 'teamId'
    | 'keyId'
    | 'privateKeyFileName',
    string
  >
>;

const hintStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const warningStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.feedback.warning.text'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const secretRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const maskedStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
};

/**
 * 파생값 표시칸 — 입력칸과 구분되게 배경을 깔고 고정폭(code)으로 읽히게 한다.
 * 고정폭이라야 0/O·1/l 이 구분된다 — 한 글자만 달라도 iOS 로그인이 실패하는 값이다.
 */
const derivedValueStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflowWrap: 'anywhere',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.default'),
  fontFamily: cssVar('typography.code.md.font-family'),
  fontSize: cssVar('typography.code.md.font-size'),
  lineHeight: cssVar('typography.code.md.line-height'),
};

/** 아직 파생할 근거가 없을 때 — 값이 아니라 안내문이라 본문 서체로 되돌린다 */
const derivedEmptyStyle: CSSProperties = {
  ...derivedValueStyle,
  color: cssVar('color.text.muted'),
  fontFamily: cssVar('typography.body.md.font-family'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
};

const testRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** 제목 줄 — 브랜드 글리프와 이름을 나란히 */
const titleRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

/** 글리프 자리 — 이름과 같은 색을 물려받아(currentColor) 톤을 맞춘다 */
const brandIconStyle: CSSProperties = {
  display: 'inline-flex',
  color: cssVar('color.text.default'),
};

/** '발급 위치' 안내 — 운영자가 콘솔에서 어디를 열어야 하는지 한 줄로 */
const consoleHintStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const consoleHintTagStyle: CSSProperties = {
  flexShrink: 0,
  fontWeight: cssVar('typography.label.md.font-weight'),
  color: cssVar('color.text.default'),
};

/** 제목 = 이 제공자 설정을 펼치거나 접는 disclosure 버튼 */
const disclosureButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  padding: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  cursor: 'pointer',
};

/** 펼치면 오른쪽 화살표가 아래를 가리키도록 90° 회전 */
const chevronStyle = (expanded: boolean): CSSProperties => ({
  display: 'inline-flex',
  color: cssVar('color.text.muted'),
  transform: expanded ? 'rotate(90deg)' : 'none',
});

/**
 * 설정 영역 — 접힘은 `display:none`.
 * `hidden` 속성 대신 display 로 토글하는 이유: 내부에 `display:flex` 를 주면 `hidden`(=display:none)이
 * 덮여 접히지 않는다. display:none 이어도 DOM 에는 남으므로(querySelector 로 찾힌다) 시크릿 필수
 * 여부를 검증하는 회귀 테스트(OAuthProviderCard.test.tsx)가 그대로 통과한다.
 */
const configRegionStyle = (expanded: boolean): CSSProperties => ({
  display: expanded ? 'flex' : 'none',
  flexDirection: 'column',
  gap: cssVar('space.4'),
});

/**
 * 껍데기 없는 모드(chrome='plain')의 토글 줄 — 카드 제목이 없으므로 토글이 맨 위 한 줄을 차지한다.
 * 오른쪽 정렬로 두면 제목 줄의 action 자리와 눈높이가 같아, 두 모드가 같은 화면처럼 읽힌다.
 */
const plainToggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
};

/** 파일 선택 줄 — 선택 컨트롤과 '취소' 를 나란히 */
const fileRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
  minWidth: 0,
};

/**
 * 파일 선택기의 바깥 상자 — 다른 입력칸과 같은 테두리·여백을 준다.
 * `controlStyle` 을 그대로 쓰지 않는 이유: 그것은 한 줄 텍스트 입력의 높이를 전제하는데
 * 파일 선택기는 안쪽 버튼 때문에 그 높이에 눌린다. 상자 규격만 같은 토큰으로 맞춘다.
 */
const filePickerStyle = (invalid: boolean): CSSProperties => ({
  flex: 1,
  minWidth: 0,
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: invalid ? cssVar('color.feedback.danger.border') : cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
});

/** 고른 파일 이름 — 값이 아니라 꼬리표라 고정폭으로 두지 않는다 */
const pickedFileStyle: CSSProperties = {
  minWidth: 0,
  overflowWrap: 'anywhere',
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

/* ── client-secret 갈래 ─────────────────────────────────────────────────── */

interface ClientSecretFieldsProps {
  readonly index: number;
  readonly value: ClientSecretProviderValues;
  readonly register: UseFormRegister<OAuthSettingsValues>;
  readonly disabled: boolean;
  readonly errors: ProviderFieldErrors;
  readonly changingSecret: boolean;
  readonly idBase: string;
  readonly onChangeSecretStart: () => void;
  readonly onChangeSecretCancel: () => void;
}

function ClientSecretFields({
  index,
  value,
  register,
  disabled,
  errors,
  changingSecret,
  idBase,
  onChangeSecretStart,
  onChangeSecretCancel,
}: ClientSecretFieldsProps) {
  const toast = useToast();

  const label = providerLabel(value.provider);
  const clientIdLabel = providerClientIdLabel(value.provider);
  const secretLabel = providerSecretLabel(value.provider);
  const secretRecovery = providerSecretRecovery(value.provider);
  const showNativeAppKey = providerHasNativeAppKey(value.provider);
  const showIosScheme = providerHasIosUrlScheme(value.provider);

  const clientIdInvalid = errors.clientId !== undefined;
  const secretInvalid = errors.secret !== undefined;
  const nativeAppKeyInvalid = errors.nativeAppKey !== undefined;

  /** 형식이 '평소와 다르다' 는 알림 — 저장을 막지 않는다 (validation.ts 머리말) */
  const clientIdWarning = clientIdFormatWarning(value.provider, value.clientId);

  /** 저장된 시크릿이 있고 변경 중이 아니면 마스킹만 보여준다 — 평문을 채우지 않는다 */
  const showMasked = value.hasSecret && !changingSecret;

  /** 파생 iOS URL 스키마 — 입력이 아니라 Client ID 의 함수다 */
  const derivedScheme = showIosScheme ? iosUrlScheme(value.clientId) : null;

  /**
   * 시크릿을 새로 넣어야만 켤 수 있다 — 이미 저장돼 있으면 비워 둬도 기존 값이 유지되므로 필수가 아니다.
   *
   * [A11Y-11] FormField 는 required 를 **단일 컨트롤 자식**의 aria-required 로 주입하는데(withAriaRequired),
   * 이 필드의 자식은 입력과 '변경/취소' 버튼을 나란히 놓는 <span> 래퍼라 주입 대상이 아니다 —
   * 래퍼에 aria-required 를 얹으면 거짓 시맨틱이 되므로 FormField 가 의도적으로 거부한다.
   * 그래서 **호출부인 이 카드가 진짜 컨트롤인 <input> 에 직접 준다**(FormField 는 호출부 값을 우선한다).
   * required 일 때 showMasked 는 반드시 false 이므로(!hasSecret) 그 <input> 은 항상 렌더된다.
   * 값이 false 일 때는 속성을 남기지 않는다 — aria-invalid 를 짝지어 다루는 방식과 같다(DateRangeField 선례).
   */
  const secretRequired = value.enabled && !value.hasSecret;
  const secretRequiredProps = secretRequired ? { 'aria-required': true } : {};

  /** 파생 스키마 복사 — 실패를 삼키지 않는다(보안 컨텍스트가 아니면 클립보드 API 가 없다) */
  const copyScheme = useCallback(() => {
    if (derivedScheme === null) return;
    void copyToClipboard(derivedScheme).then((ok) => {
      if (ok) {
        toast.success('iOS URL 스키마를 복사했어요.');
        return;
      }
      toast.error('클립보드를 쓸 수 없어요. 값을 직접 선택해 복사해 주세요.');
    });
  }, [derivedScheme, toast]);

  return (
    <>
      <FormField
        htmlFor={`${idBase}-client-id`}
        label={clientIdLabel}
        required={value.enabled}
        error={errors.clientId ?? ''}
        hint={`${label} 콘솔의 '${clientIdLabel}' 값을 붙여넣으세요.`}
      >
        <input
          id={`${idBase}-client-id`}
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(clientIdInvalid)}
          disabled={disabled}
          maxLength={CLIENT_ID_MAX}
          aria-invalid={clientIdInvalid}
          aria-describedby={clientIdInvalid ? errorIdOf(`${idBase}-client-id`) : undefined}
          {...register(`providers.${String(index)}.clientId` as `providers.${number}.clientId`)}
        />
      </FormField>

      {/* 경고는 오류가 아니다 — 저장을 막지 않고 '확인해 보라' 고만 한다 */}
      {clientIdWarning !== null && !clientIdInvalid && (
        <p style={warningStyle}>{clientIdWarning}</p>
      )}

      <FormField
        htmlFor={`${idBase}-secret`}
        label={secretLabel}
        required={secretRequired}
        error={errors.secret ?? ''}
        hint={showMasked ? secretRecovery : '입력한 값은 저장 후 다시 표시되지 않아요.'}
      >
        {showMasked ? (
          <span style={secretRowStyle}>
            {/* 저장돼 있다는 사실만 보여준다 — 값은 우리도 모른다.
                입력 요소를 아예 렌더하지 않는 것이 핵심이다: 평문이 들어갈 자리가 없다. */}
            <span style={maskedStyle}>{MASKED_SECRET_TEXT}</span>
            <Button variant="secondary" size="sm" disabled={disabled} onClick={onChangeSecretStart}>
              변경
            </Button>
          </span>
        ) : (
          <span style={secretRowStyle}>
            <input
              id={`${idBase}-secret`}
              type="password"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(secretInvalid)}
              disabled={disabled}
              maxLength={CLIENT_SECRET_MAX}
              autoComplete="new-password"
              placeholder={value.hasSecret ? '비워 두면 기존 시크릿을 유지해요' : ''}
              {...secretRequiredProps}
              aria-invalid={secretInvalid}
              aria-describedby={secretInvalid ? errorIdOf(`${idBase}-secret`) : undefined}
              {...register(`providers.${String(index)}.secret` as `providers.${number}.secret`)}
            />
            {value.hasSecret && (
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={onChangeSecretCancel}
              >
                취소
              </Button>
            )}
          </span>
        )}
      </FormField>

      {/* ── iOS URL 스키마 (Google) — 입력이 아니라 파생값이다 ─────────────── */}
      {showIosScheme && (
        <FormField
          htmlFor={`${idBase}-ios-scheme`}
          label="iOS URL 스키마"
          hint="클라이언트 ID를 뒤집어 만든 값이에요. Xcode의 URL Types에 그대로 넣으세요. 직접 입력하는 값이 아니므로 클라이언트 ID를 바꾸면 함께 바뀌어요."
        >
          <span style={secretRowStyle}>
            {derivedScheme === null ? (
              <output id={`${idBase}-ios-scheme`} style={derivedEmptyStyle}>
                클라이언트 ID를 먼저 입력하면 여기에 자동으로 만들어져요.
              </output>
            ) : (
              <>
                <output id={`${idBase}-ios-scheme`} style={derivedValueStyle}>
                  {derivedScheme}
                </output>
                <Button variant="secondary" size="sm" onClick={copyScheme}>
                  복사
                </Button>
              </>
            )}
          </span>
        </FormField>
      )}

      {/* ── 네이티브 앱 키 (카카오) — 비밀이 아니다(앱에 심겨 배포된다) ────── */}
      {showNativeAppKey && (
        <FormField
          htmlFor={`${idBase}-native-app-key`}
          label="네이티브 앱 키"
          error={errors.nativeAppKey ?? ''}
          hint="모바일 앱에서 카카오톡으로 로그인할 때 써요. 웹에서만 쓴다면 비워 두어도 돼요."
        >
          <input
            id={`${idBase}-native-app-key`}
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(nativeAppKeyInvalid)}
            disabled={disabled}
            maxLength={NATIVE_APP_KEY_MAX}
            aria-invalid={nativeAppKeyInvalid}
            aria-describedby={
              nativeAppKeyInvalid ? errorIdOf(`${idBase}-native-app-key`) : undefined
            }
            {...register(
              `providers.${String(index)}.nativeAppKey` as `providers.${number}.nativeAppKey`,
            )}
          />
        </FormField>
      )}
    </>
  );
}

/* ── apple-key 갈래 ─────────────────────────────────────────────────────── */

interface AppleKeyFieldsProps {
  readonly index: number;
  readonly value: AppleProviderValues;
  readonly register: UseFormRegister<OAuthSettingsValues>;
  readonly disabled: boolean;
  readonly errors: ProviderFieldErrors;
  readonly changingSecret: boolean;
  readonly idBase: string;
  readonly onChangeSecretStart: () => void;
  readonly onChangeSecretCancel: () => void;
  /** 고른 `.p8` 파일의 **이름만** 넘긴다 — 내용은 폼에 들어오지 않는다 */
  readonly onPickPrivateKey: (fileName: string) => void;
}

/**
 * Apple — 시크릿 한 칸이 아니라 **서명 재료 넷**이다.
 *
 * Services ID · Team ID · Key ID 는 비밀이 아니라 식별자이므로 평문 텍스트 입력이고
 * 마스킹하지 않는다 — 비밀이 아닌 값을 비밀처럼 다루면 진짜 비밀(.p8)의 취급이 헐거워진다.
 */
function AppleKeyFields({
  index,
  value,
  register,
  disabled,
  errors,
  changingSecret,
  idBase,
  onChangeSecretStart,
  onChangeSecretCancel,
  onPickPrivateKey,
}: AppleKeyFieldsProps) {
  /**
   * 파일 입력을 비우려면 DOM 을 직접 만져야 한다 — `<input type="file">` 의 값은 React 상태로
   * 되돌릴 수 없다(보안상 프로그램이 값을 설정할 수 없게 돼 있다). '취소' 가 이름만 지우고
   * 파일 선택기는 여전히 파일을 물고 있으면 화면과 실제가 어긋난다.
   */
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const servicesIdInvalid = errors.servicesId !== undefined;
  const teamIdInvalid = errors.teamId !== undefined;
  const keyIdInvalid = errors.keyId !== undefined;
  const privateKeyInvalid = errors.privateKeyFileName !== undefined;

  /** 저장된 키가 있고 변경 중이 아니면 '저장됨' 만 보여준다 — 파일 선택기를 렌더하지 않는다 */
  const showStored = value.hasPrivateKey && !changingSecret;

  const teamIdWarning = appleIdLengthWarning(value.teamId, 'Team ID');
  const keyIdWarning = appleIdLengthWarning(value.keyId, 'Key ID');

  const picked = value.privateKeyFileName.trim();

  const cancelPick = useCallback(() => {
    if (fileInputRef.current !== null) fileInputRef.current.value = '';
    onChangeSecretCancel();
  }, [onChangeSecretCancel]);

  return (
    <>
      <FormField
        htmlFor={`${idBase}-services-id`}
        label="Services ID (client_id)"
        required={value.enabled}
        error={errors.servicesId ?? ''}
        hint="Apple Developer의 Identifiers에서 만든 Services ID예요. com.example.web 처럼 도메인을 뒤집은 모양이며 대소문자를 구분해요."
      >
        <input
          id={`${idBase}-services-id`}
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(servicesIdInvalid)}
          disabled={disabled}
          maxLength={APPLE_ID_MAX}
          aria-invalid={servicesIdInvalid}
          aria-describedby={servicesIdInvalid ? errorIdOf(`${idBase}-services-id`) : undefined}
          {...register(`providers.${String(index)}.servicesId` as `providers.${number}.servicesId`)}
        />
      </FormField>

      <FormField
        htmlFor={`${idBase}-team-id`}
        label="Team ID"
        required={value.enabled}
        error={errors.teamId ?? ''}
        hint="Apple Developer 계정의 팀 식별자예요. 서명할 JWT의 iss에 들어가요."
      >
        <input
          id={`${idBase}-team-id`}
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(teamIdInvalid)}
          disabled={disabled}
          maxLength={APPLE_ID_MAX}
          aria-invalid={teamIdInvalid}
          aria-describedby={teamIdInvalid ? errorIdOf(`${idBase}-team-id`) : undefined}
          {...register(`providers.${String(index)}.teamId` as `providers.${number}.teamId`)}
        />
      </FormField>
      {teamIdWarning !== null && !teamIdInvalid && <p style={warningStyle}>{teamIdWarning}</p>}

      <FormField
        htmlFor={`${idBase}-key-id`}
        label="Key ID"
        required={value.enabled}
        error={errors.keyId ?? ''}
        hint="아래 .p8 키를 만들 때 함께 발급된 식별자예요. 서명할 JWT 헤더의 kid에 들어가요."
      >
        <input
          id={`${idBase}-key-id`}
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(keyIdInvalid)}
          disabled={disabled}
          maxLength={APPLE_ID_MAX}
          aria-invalid={keyIdInvalid}
          aria-describedby={keyIdInvalid ? errorIdOf(`${idBase}-key-id`) : undefined}
          {...register(`providers.${String(index)}.keyId` as `providers.${number}.keyId`)}
        />
      </FormField>
      {keyIdWarning !== null && !keyIdInvalid && <p style={warningStyle}>{keyIdWarning}</p>}

      {/* ── `.p8` 개인키 — 이 화면의 유일한 '진짜 비밀' ─────────────────────
          [한 번만 받을 수 있다는 사실을 화면이 말한다] Apple 은 `.p8` 을 만든 직후 한 번만
          내려 주고 다시 받을 수 없다. 이 사실을 적어 두지 않으면, 파일을 잃어버린 운영자가
          존재하지 않는 '다시 받기' 버튼을 콘솔에서 찾아 헤맨다. 답은 '새 키 발급' 뿐이다. */}
      <FormField
        htmlFor={`${idBase}-private-key`}
        label={`개인키 파일 (${APPLE_PRIVATE_KEY_EXTENSION})`}
        required={value.enabled && !value.hasPrivateKey}
        error={errors.privateKeyFileName ?? ''}
        hint={
          showStored
            ? '저장된 키 파일은 다시 내려받을 수 없어요. 파일을 잃어버렸다면 Apple Developer의 Keys에서 새 키를 발급하고 Key ID와 함께 교체하세요.'
            : 'Apple Developer → Keys에서 내려받은 .p8 파일을 고르세요. 이 파일은 발급 직후 단 한 번만 내려받을 수 있고 Apple에서 다시 받을 수 없으니, 잃어버렸다면 새 키를 발급해야 해요.'
        }
      >
        {showStored ? (
          <span style={secretRowStyle}>
            {/* 저장돼 있다는 사실만 보여준다 — 파일 내용은 화면으로 돌아오지 않는다 */}
            <span style={maskedStyle}>{MASKED_SECRET_TEXT}</span>
            <Button variant="secondary" size="sm" disabled={disabled} onClick={onChangeSecretStart}>
              변경
            </Button>
          </span>
        ) : (
          <span style={fileRowStyle}>
            {/*
              RHF 에 register 하지 않는다 — 파일 입력의 값은 FileList 이고, 그것을 폼 상태에
              담으면 **키 내용이 폼 상태에 사는** 셈이 된다. 여기서는 이름만 꺼내 올린다.
            */}
            <input
              id={`${idBase}-private-key`}
              ref={fileInputRef}
              type="file"
              accept={APPLE_PRIVATE_KEY_EXTENSION}
              className="tds-ui-focusable"
              /* 파일 선택기의 **바깥 상자**는 다른 입력칸과 같은 모양으로 맞춘다.
                 안쪽 '파일 선택' 버튼은 브라우저가 그리는 부분이라 인라인 스타일이 닿지 않는다
                 (::file-selector-button 이 필요한데, 그 규칙은 DS 스타일시트의 몫이다). */
              style={filePickerStyle(privateKeyInvalid)}
              disabled={disabled}
              aria-invalid={privateKeyInvalid}
              aria-describedby={privateKeyInvalid ? errorIdOf(`${idBase}-private-key`) : undefined}
              onChange={(event) => {
                const file = event.target.files?.[0];
                onPickPrivateKey(file?.name ?? '');
              }}
            />
            {picked !== '' && <span style={pickedFileStyle}>{picked}</span>}
            {value.hasPrivateKey && (
              <Button variant="secondary" size="sm" disabled={disabled} onClick={cancelPick}>
                취소
              </Button>
            )}
          </span>
        )}
      </FormField>

      {/*
        [숨기지 않는다] 업로드 통로(TODO(backend) · ../data-source.ts)가 아직 없다.
        '올렸다' 고만 말하고 넘어가면 운영자는 다 됐다고 믿고 로그인이 깨진 뒤에야 알게 된다.
      */}
      {!showStored && (
        <p style={hintStyle}>
          지금은 고른 파일의 이름만 저장돼요. 키 파일 자체를 서버에 올리는 기능은 백엔드 연동 후
          제공돼요.
        </p>
      )}
    </>
  );
}

/* ── 카드 ────────────────────────────────────────────────────────────────── */

interface OAuthProviderCardProps {
  readonly index: number;
  readonly value: OAuthProviderValues;
  readonly register: UseFormRegister<OAuthSettingsValues>;
  readonly disabled: boolean;
  /** 이 제공자의 필드 오류 — 키는 필드명 */
  readonly errors: ProviderFieldErrors;
  /**
   * 저장된 비밀을 '변경 중' 인가.
   * client secret 과 Apple 의 `.p8` 이 같은 상태 기계를 쓴다(파일 머리말의 세 상태).
   */
  readonly changingSecret: boolean;
  readonly onToggleEnabled: (next: boolean) => void;
  readonly onChangeSecretStart: () => void;
  readonly onChangeSecretCancel: () => void;
  /** Apple 전용 — 고른 `.p8` 파일의 이름. 다른 제공자에서는 호출되지 않는다 */
  readonly onPickPrivateKey: (fileName: string) => void;
  /**
   * 카드가 **이미 열려서 렌더된** 경우 — 접을 이유가 없는 자리다.
   *
   * 이때는 제목을 disclosure 버튼이 아닌 **텍스트**로 그리고 설정 영역을 항상 펼쳐 둔다.
   * 버튼으로 두면 접을 수 있는 것처럼 보이지만 접히지 않아, 스크린리더에 모순된 상태가 들린다.
   */
  readonly alwaysExpanded?: boolean;
  /**
   * 바깥 껍데기를 그리는가.
   *
   * `'card'`(기본) — 자기 `<Card>` 와 제목 줄(브랜드 마크 + 이름 + 토글)을 그린다.
   * `'plain'`      — 껍데기 없이 **토글 줄과 필드만** 낸다. 제공자 상세 화면
   *                  (/settings/oauth/:provider)이 그렇다: 그 화면은 **제공자 한 명의 페이지**라
   *                  이름과 브랜드 마크가 이미 페이지 제목에 있다. 카드가 제목을 또 그리면
   *                  같은 이름이 한 화면에 두 번 뜨고, 카드가 카드 안에 중첩된다.
   */
  readonly chrome?: 'card' | 'plain';
}

export function OAuthProviderCard({
  index,
  value,
  register,
  disabled,
  errors,
  changingSecret,
  onToggleEnabled,
  onChangeSecretStart,
  onChangeSecretCancel,
  onPickPrivateKey,
  alwaysExpanded = false,
  chrome = 'card',
}: OAuthProviderCardProps) {
  const label = providerLabel(value.provider);
  const title = providerTitle(value.provider);
  const redirectLabel = providerRedirectLabel(value.provider);
  const redirectNote = providerRedirectNote(value.provider);
  const consoleHint = providerConsoleHint(value.provider);
  const consoleNotice = providerConsoleNotice(value.provider);
  const idBase = `oauth-${value.provider}`;
  const regionId = `${idBase}-config`;

  /**
   * 설정 펼침/접힘. 기본은 켜짐 여부를 따른다 — 켜면 펼치고 끄면 접는다(ON/OFF = 펼침/접힘).
   * 켜짐이 바뀌면 그에 맞춰 다시 동기화하고, 그 사이 제목을 눌러 수동으로 여닫을 수도 있다
   * (꺼진 제공자를 미리 설정하려는 경우).
   */
  const [selfExpanded, setSelfExpanded] = useState(value.enabled);
  useEffect(() => {
    setSelfExpanded(value.enabled);
  }, [value.enabled]);

  const expanded = alwaysExpanded || selfExpanded;

  const redirectInvalid = errors.redirectUri !== undefined;

  /** 네이티브 앱 키를 받는 제공자(카카오)만 카카오싱크 안내를 단다 */
  const isKakao = value.provider === 'kakao';

  const toggle = (
    <ToggleSwitch
      checked={value.enabled}
      label={`${title} 사용`}
      disabled={disabled}
      onChange={onToggleEnabled}
    />
  );

  const cardHeading = alwaysExpanded ? (
    // 접히지 않는 자리다 — 이름만 말한다(누를 수 없는 것을 버튼으로 그리지 않는다)
    <span style={titleRowStyle}>
      <span style={brandIconStyle}>
        <ProviderMark provider={value.provider} size="var(--tds-space-6)" />
      </span>
      {title}
    </span>
  ) : (
    <button
      type="button"
      className="tds-ui-focusable"
      style={disclosureButtonStyle}
      aria-expanded={expanded}
      aria-controls={regionId}
      onClick={() => setSelfExpanded((prev) => !prev)}
    >
      <span style={brandIconStyle}>
        <ProviderMark provider={value.provider} size="var(--tds-space-6)" />
      </span>
      <span style={titleRowStyle}>{title}</span>
      <span style={chevronStyle(expanded)} aria-hidden="true">
        <Icon name="chevron-right" />
      </span>
    </button>
  );

  const region = (
    <div id={regionId} style={configRegionStyle(expanded)}>
      {/* 어느 콘솔의 어느 화면에서 이 값들을 발급받는지 — 두 창을 오가는 운영자를 위한 이정표 */}
      <p style={consoleHintStyle}>
        <span style={consoleHintTagStyle}>발급 위치</span>
        {consoleHint}
      </p>

      {/* 자격증명을 다 채워도 로그인이 안 되는 이유는 대개 여기 있다(심사·채널 상태 등) */}
      {consoleNotice !== null && <Alert tone="info">{consoleNotice}</Alert>}

      {/* 갈래마다 자격증명의 모양이 다르다 — 타입이 좁혀진 채로 각자에게 넘긴다 */}
      {isAppleProvider(value) ? (
        <AppleKeyFields
          index={index}
          value={value}
          register={register}
          disabled={disabled}
          errors={errors}
          changingSecret={changingSecret}
          idBase={idBase}
          onChangeSecretStart={onChangeSecretStart}
          onChangeSecretCancel={onChangeSecretCancel}
          onPickPrivateKey={onPickPrivateKey}
        />
      ) : (
        <ClientSecretFields
          index={index}
          value={value}
          register={register}
          disabled={disabled}
          errors={errors}
          changingSecret={changingSecret}
          idBase={idBase}
          onChangeSecretStart={onChangeSecretStart}
          onChangeSecretCancel={onChangeSecretCancel}
        />
      )}

      <FormField
        htmlFor={`${idBase}-redirect`}
        label={redirectLabel}
        required={value.enabled}
        error={errors.redirectUri ?? ''}
        hint={`이 주소를 ${label} 콘솔의 '${redirectLabel}'에도 한 글자도 다르지 않게 등록해야 해요. 대소문자와 끝 슬래시까지 정확히 일치해야 해요.${
          redirectNote === null ? '' : ` ${redirectNote}`
        }`}
      >
        <input
          id={`${idBase}-redirect`}
          type="url"
          inputMode="url"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(redirectInvalid)}
          disabled={disabled}
          aria-invalid={redirectInvalid}
          aria-describedby={redirectInvalid ? errorIdOf(`${idBase}-redirect`) : undefined}
          {...register(
            `providers.${String(index)}.redirectUri` as `providers.${number}.redirectUri`,
          )}
        />
      </FormField>

      {/* ── 카카오싱크 간편 설정 — 우리가 흉내 낼 수 없는 동작이라 콘솔로 보낸다 ── */}
      {isKakao && (
        <div style={testRowStyle}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              window.open(KAKAO_SYNC_CONSOLE_URL, '_blank', 'noopener,noreferrer');
            }}
          >
            카카오싱크 간편 설정
          </Button>
          <p style={hintStyle}>
            동의항목·약관 연결은 Kakao Developers 콘솔에서 설정해요. 새 창으로 열어요.
          </p>
        </div>
      )}

      <div style={testRowStyle}>
        {/* TODO(backend): POST /api/settings/oauth/:provider/test —
              서버가 제공자에게 실제로 토큰 교환을 시도하고 결과를 돌려준다.
              프론트가 흉내 낼 수 없다(시크릿은 서버에만 있고 CORS 도 막혔다).
              백엔드가 붙으면 이 버튼이 활성화되고 결과는 인라인 배너로 표시한다. */}
        <Button variant="secondary" size="sm" disabled>
          연결 테스트
        </Button>
        <p style={hintStyle}>연결 테스트는 백엔드 연동 후 제공돼요.</p>
      </div>
    </div>
  );

  // 제공자 상세 화면 — 이름·마크는 페이지 제목이 이미 말했다. 여기서는 토글 줄과 필드만 낸다.
  if (chrome === 'plain') {
    return (
      <>
        <div style={plainToggleRowStyle}>{toggle}</div>
        {region}
      </>
    );
  }

  return (
    <Card>
      {/* 제목을 눌러 설정을 여닫는다. 토글은 켜짐(그리고 켜짐이 펼침을 이끈다) */}
      <CardTitle action={toggle}>{cardHeading}</CardTitle>
      {region}
    </Card>
  );
}
