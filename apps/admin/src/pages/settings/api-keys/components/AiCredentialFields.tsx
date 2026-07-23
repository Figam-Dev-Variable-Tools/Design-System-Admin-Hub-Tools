// 자격증명 입력 칸 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/api-keys/**)
//
// ┌ 칸을 손으로 나열하지 않는다 ───────────────────────────────────────────────┐
// │ 그리는 칸은 전부 **카탈로그가 정한다**(`fields` = entry.credentials).         │
// │ 그래서 이 파일에는 'Azure 면 배포명을 그린다' 같은 분기가 **없다** — 분기를     │
// │ 여기 두는 순간 요구(카탈로그)와 폼(화면)이 갈라지고, 갈라진 채로 저장이 되면    │
// │ Azure 는 저장은 되는데 호출이 404 가 난다(../integrations.ts 머리말).         │
// │                                                                          │
// │ 카테고리별로 폼이 다르게 보이는 것은 **분기 때문이 아니라 요구가 달라서**다:    │
// │ OpenAI 는 다섯 칸(키·베이스 URL·기본 모델·조직 ID·프로젝트 ID), 나머지 모델      │
// │ 3종은 세 칸, Azure 는 네 칸, Bedrock 은 두 칸, CJ 는 두 칸이 그려진다.          │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 비밀 칸은 세 상태를 갖는다 ────────────────────────────────────────────────┐
// │ ① 저장된 적 없음      → 입력칸                                             │
// │ ② 저장돼 있음         → 고정 길이 마스크 + '변경' (입력 요소를 아예 렌더하지    │
// │                        않는다 — 평문이 들어갈 자리가 없는 것이 방어다)         │
// │ ③ 저장돼 있고 변경 중 → 입력칸 + '취소'                                     │
// │                                                                          │
// │ ../../oauth/components/OAuthProviderCard.tsx 의 client secret 과 **같은 상태  │
// │ 기계**다. 두 화면이 비밀을 다르게 다루면 어느 쪽이 옳은지 아무도 답하지 못한다.  │
// └──────────────────────────────────────────────────────────────────────────┘
import type { CSSProperties } from 'react';
import type { UseFormRegister } from 'react-hook-form';

import { Button, controlStyle, errorIdOf, FormField, hintIdOf } from '../../../../shared/ui';
import { MASKED_SECRET_TEXT } from '../../_shared/secret';
import {
  baseUrlWarning,
  CREDENTIAL_VALUE_MAX,
  customerCodeWarning,
  endpointWarning,
  modelIdWarning,
  regionWarning,
} from '../validation';
import type { AiConnectionFormValues } from '../validation';
import { credentialIsSecret } from '../ai-connections';
import type { AiCredentialField, AiCredentialFieldKey } from '../ai-connections';
import { cssVar } from '@tds/ui';

/** 입력칸과 옆 버튼('변경'·'취소')을 한 줄에 — 버튼이 아래로 떨어지지 않게 한다 */
const secretRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

/**
 * 저장돼 있다는 **사실**의 표시. 값이 아니라 고정 길이 글리프다 —
 * 자릿수도 마지막 네 자도 정보이므로 남기지 않는다(../../_shared/secret.ts).
 */
const maskedStyle: CSSProperties = {
  flex: '1 1 auto',
  minWidth: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  letterSpacing: cssVar('space.1'),
};

/** 경고는 오류가 아니다 — 저장을 막지 않고 '확인해 보라' 고만 한다 */
const warningStyle: CSSProperties = {
  marginTop: `calc(${cssVar('space.1')} * -1)`,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

/** 입력칸이 늘어나도 한 줄 폭이 흔들리지 않게 — 비밀 칸의 마스크와 같은 자리를 쓴다 */
const inputStyle = (invalid: boolean): CSSProperties => ({
  ...controlStyle(invalid),
  flex: '1 1 auto',
  minWidth: 0,
});

/**
 * 값이 아니라 **성격**으로 입력 타입을 고른다.
 *
 * 비밀이면 `password` — 어깨너머로 읽히지 않게 하고 브라우저가 저장을 제안하지 않게 한다
 * (autoComplete="new-password"). 나머지는 주소·이름이므로 평범한 텍스트다.
 */
function inputTypeOf(field: AiCredentialField): 'text' | 'password' {
  return credentialIsSecret(field.key) ? 'password' : 'text';
}

/**
 * 이 칸에 붙는 경고 — **칸 이름**이 정한다(값의 모양을 되묻는 자리).
 *
 * 여기 늘어선 것은 전부 같은 규율의 형제다: **막지 않고 되묻는다**(../validation.ts 머리말).
 * 새 칸이 형식 검사를 원하면 오류가 아니라 이 표에 한 줄을 더하는 것이 옳은 길이다.
 */
function warningOf(key: AiCredentialFieldKey, value: string): string | null {
  if (key === 'endpoint') return endpointWarning(value);
  if (key === 'region') return regionWarning(value);
  if (key === 'customerCode') return customerCodeWarning(value);
  if (key === 'baseUrl') return baseUrlWarning(value);
  if (key === 'defaultModel') return modelIdWarning(value);
  return null;
}

interface AiCredentialFieldsProps {
  /** 그릴 칸 — **카탈로그가 정한다**. 이 배열 밖의 칸은 그리지 않는다 */
  readonly fields: readonly AiCredentialField[];
  readonly values: AiConnectionFormValues;
  readonly register: UseFormRegister<AiConnectionFormValues>;
  readonly disabled: boolean;
  /** 칸별 오류 문구 — 키는 자격증명 칸 이름 */
  readonly errors: Partial<Record<AiCredentialFieldKey, string>>;
  /** 지금 새 값을 입력 중인 비밀 칸들 — 화면 상태이지 저장값이 아니다 */
  readonly changingSecrets: readonly AiCredentialFieldKey[];
  readonly onChangeSecretStart: (key: AiCredentialFieldKey) => void;
  readonly onChangeSecretCancel: (key: AiCredentialFieldKey) => void;
}

export function AiCredentialFields({
  fields,
  values,
  register,
  disabled,
  errors,
  changingSecrets,
  onChangeSecretStart,
  onChangeSecretCancel,
}: AiCredentialFieldsProps) {
  return (
    <>
      {fields.map((field) => {
        const id = `ai-credential-${field.key}`;
        const error = errors[field.key];
        const invalid = error !== undefined;
        // 비밀 여부는 항목이 아니라 **칸 이름**이 정한다(../ai-connections.ts 의 CREDENTIAL_SECRECY)
        const secret = credentialIsSecret(field.key);
        const stored = values.storedSecrets.includes(field.key);
        const changing = changingSecrets.includes(field.key);

        /** 저장된 비밀이 있고 변경 중이 아니면 **입력 요소를 렌더하지 않는다** */
        const showMasked = secret && stored && !changing;

        /**
         * 새 값을 넣어야만 켤 수 있는가 — 이미 저장돼 있으면 비워 둬도 유지되므로 필수가 아니다.
         * 꺼진 연동에는 필수 표식을 달지 않는다: 끄는 것은 언제나 허용된다(../validation.ts).
         */
        const required = values.enabled && field.required && !(secret && stored);

        const warning = showMasked ? null : warningOf(field.key, values.credentials[field.key]);

        return (
          <div key={field.key}>
            <FormField
              htmlFor={id}
              label={field.label}
              required={required}
              error={error ?? ''}
              hint={
                showMasked
                  ? '저장돼 있어요. 값은 다시 표시할 수 없어요 — 바꾸려면 연동 상대의 콘솔에서 새로 발급해 넣으세요.'
                  : field.hint
              }
            >
              {showMasked ? (
                <span style={secretRowStyle}>
                  {/* 저장돼 있다는 사실만 보여준다 — 값은 우리도 모른다 */}
                  <span style={maskedStyle}>{MASKED_SECRET_TEXT}</span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={disabled}
                    onClick={() => {
                      onChangeSecretStart(field.key);
                    }}
                  >
                    변경
                  </Button>
                </span>
              ) : (
                <span style={secretRowStyle}>
                  <input
                    id={id}
                    type={inputTypeOf(field)}
                    className="tds-ui-input tds-ui-focusable"
                    style={inputStyle(invalid)}
                    disabled={disabled}
                    maxLength={CREDENTIAL_VALUE_MAX}
                    aria-invalid={invalid}
                    aria-describedby={invalid ? errorIdOf(id) : hintIdOf(id)}
                    {...(required ? { 'aria-required': true } : {})}
                    {...(secret ? { autoComplete: 'new-password' as const } : {})}
                    {...(secret && stored
                      ? { placeholder: '비워 두면 저장된 키를 그대로 써요' }
                      : {})}
                    {...register(`credentials.${field.key}` as const)}
                  />
                  {secret && stored && (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={disabled}
                      onClick={() => {
                        onChangeSecretCancel(field.key);
                      }}
                    >
                      취소
                    </Button>
                  )}
                </span>
              )}
            </FormField>

            {/* 형식이 '평소와 다르다' 는 알림 — 오류가 있을 때는 오류가 이긴다 */}
            {warning !== null && !invalid && <p style={warningStyle}>{warning}</p>}
          </div>
        );
      })}
    </>
  );
}
