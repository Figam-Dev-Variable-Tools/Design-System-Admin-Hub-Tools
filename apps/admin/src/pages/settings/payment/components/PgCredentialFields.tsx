// PG 자격증명 입력칸 (결제 설정 화면 전용 — apps/admin/src/pages/settings/payment/**)
//
// ┌ 무엇을 그릴지 이 파일이 정하지 않는다 ────────────────────────────────────┐
// │ 칸의 개수·이름·필수 여부·**비밀 여부**는 전부 카탈로그가 정한다               │
// │ (shared/commerce/pg-catalog.ts). 여기서는 그 목록을 순서대로 그리기만 한다 —  │
// │ PG 별 `if` 를 화면에 쓰면 PG 를 하나 더할 때 화면도 함께 틀린다.              │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 저장된 비밀의 세 상태 — OAuth 카드와 **같은 상태 기계**다 ─────────────────┐
// │ ① 저장된 것 없음        → 입력칸을 바로 보여준다(넣어야 결제를 열 수 있다)     │
// │ ② 저장돼 있고 그대로 둠 → `••••••••••••` + '변경'.                          │
// │                          **입력 요소를 아예 렌더하지 않는다** — 평문이 들어갈  │
// │                          자리를 두지 않는 것이 방어다(가리는 것이 아니다)      │
// │ ③ 변경 중              → 빈 입력칸 + '취소'. 빈 채로 저장하면 기존 값이 유지    │
// │                                                                          │
// │ ⚠ `signkey` · `site_key` 처럼 **이름이 '키' 인 서명 재료도 여기로 온다.**     │
// │   식별자처럼 읽힌다고 평문 텍스트 칸으로 그리면, 유출된 순간 결제 요청이       │
// │   위조된다. 판정은 카탈로그의 `visibility` 하나가 한다.                      │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [연결 테스트 버튼이 없는 이유] 브라우저에서 PG 를 부르려면 시크릿이 브라우저로 내려와야 하고,
// 그 순간 위 규약이 통째로 거짓이 된다. 서명·승인·웹훅은 전부 서버의 일이다
// (shared/commerce/payment-settings.ts 의 TODO(backend)). 가짜 성공을 보여주는 버튼을 두느니
// 없는 편이 정직하다 (FEEDBACK-03: no-op 금지).
import type { CSSProperties } from 'react';
import type { UseFormRegister } from 'react-hook-form';

import { cssVar } from '@tds/ui';

import { Button, controlStyle, errorIdOf, FormField } from '../../../../shared/ui';
import { pgMeta } from '../../../../shared/commerce/pg-catalog';
import type { PgTargetId } from '../../../../shared/commerce/pg-catalog';
import { MASKED_SECRET_TEXT } from '../../_shared/secret';
import { credentialFormatWarning, PG_CREDENTIAL_MAX } from '../validation';
import type { PaymentSettingsValues } from '../validation';

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

/** 발급 위치 — 운영자가 두 창을 오가며 헤매지 않게 */
function hintOf(consoleHint: string, testValue: string | null): string {
  const base = `발급 위치: ${consoleHint}`;
  return testValue === null ? base : `${base} · 테스트 고정값: ${testValue}`;
}

interface PgCredentialFieldsProps {
  readonly target: PgTargetId;
  readonly register: UseFormRegister<PaymentSettingsValues>;
  readonly disabled: boolean;
  /** PG 를 실제로 쓰는가 — 필수 표시가 여기서 갈린다(꺼 두고 미리 적어 두는 것은 정상이다) */
  readonly usePg: boolean;
  /** 지금 폼에 들어 있는 공개 값 — 카운터와 경고가 읽는다 */
  readonly publicValues: Readonly<Record<string, string>>;
  /** 저장된 비밀의 이름들 */
  readonly storedSecrets: readonly string[];
  /** '변경 중' 인 비밀의 이름들 — 화면 상태이지 저장값이 아니다 */
  readonly changingSecrets: ReadonlySet<string>;
  /** 필드 경로별 오류 문구 — 키는 `publicValues.mid` 처럼 카탈로그 키다 */
  readonly errors: Readonly<Record<string, string>>;
  readonly onChangeSecretStart: (key: string) => void;
  readonly onChangeSecretCancel: (key: string) => void;
}

export function PgCredentialFields({
  target,
  register,
  disabled,
  usePg,
  publicValues,
  storedSecrets,
  changingSecrets,
  errors,
  onChangeSecretStart,
  onChangeSecretCancel,
}: PgCredentialFieldsProps) {
  const meta = pgMeta(target);

  return (
    <>
      {meta.credentials.map((field) => {
        const id = `payment-${target}-${field.key}`;
        const hint = hintOf(field.consoleHint, field.testValue);

        /* ── 비밀 — 값이 아니라 '저장돼 있는가' 만 안다 ─────────────────── */
        if (field.visibility === 'secret') {
          const stored = storedSecrets.includes(field.key);
          const changing = changingSecrets.has(field.key);
          const showMasked = stored && !changing;
          const error = errors[`secretInputs.${field.key}`];
          const invalid = error !== undefined;
          const path: `connection.secretInputs.${string}` = `connection.secretInputs.${field.key}`;

          return (
            <FormField
              key={field.key}
              htmlFor={id}
              label={field.label}
              // 저장돼 있으면 비워 둬도 유지되므로 필수가 아니다
              required={usePg && field.required && !stored}
              error={error ?? ''}
              hint={
                showMasked
                  ? `저장된 값은 다시 볼 수 없어요. 잃어버렸다면 PG 콘솔에서 재발급한 뒤 새 값을 넣으세요. (${hint})`
                  : `입력한 값은 저장 후 다시 표시되지 않아요. (${hint})`
              }
            >
              {showMasked ? (
                <span style={secretRowStyle}>
                  {/* 저장돼 있다는 사실만 보여준다 — 값은 우리도 모른다.
                      입력 요소를 아예 렌더하지 않는 것이 핵심이다: 평문이 들어갈 자리가 없다. */}
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
                    type="password"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(invalid)}
                    disabled={disabled}
                    maxLength={PG_CREDENTIAL_MAX}
                    autoComplete="new-password"
                    placeholder={stored ? '비워 두면 기존 값을 유지해요' : ''}
                    aria-invalid={invalid}
                    aria-describedby={invalid ? errorIdOf(id) : undefined}
                    {...register(path)}
                  />
                  {stored && (
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
          );
        }

        /* ── 공개 — 값을 그대로 저장하고 화면에 되돌려준다 ─────────────── */
        const value = publicValues[field.key] ?? '';
        const error = errors[`publicValues.${field.key}`];
        const invalid = error !== undefined;
        const warning = credentialFormatWarning(value);
        const path: `connection.publicValues.${string}` = `connection.publicValues.${field.key}`;

        return (
          <div key={field.key}>
            <FormField
              htmlFor={id}
              label={field.label}
              required={usePg && field.required}
              error={error ?? ''}
              hint={hint}
              counter={`${String(value.length)}/${String(PG_CREDENTIAL_MAX)}`}
            >
              <input
                id={id}
                type="text"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(invalid)}
                disabled={disabled}
                maxLength={PG_CREDENTIAL_MAX}
                aria-invalid={invalid}
                aria-describedby={invalid ? errorIdOf(id) : undefined}
                {...(field.testValue === null ? {} : { placeholder: `예: ${field.testValue}` })}
                {...register(path)}
              />
            </FormField>

            {/* 경고는 오류가 아니다 — 저장을 막지 않고 '확인해 보라' 고만 한다 */}
            {warning !== null && !invalid && <p style={warningStyle}>{warning}</p>}
          </div>
        );
      })}
    </>
  );
}
