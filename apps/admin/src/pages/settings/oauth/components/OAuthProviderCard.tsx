// OAuth 제공자 한 칸 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [시크릿 입력의 세 상태]
//   ① 저장된 것 없음        → 입력칸을 바로 보여준다(넣어야 켤 수 있다)
//   ② 저장돼 있고 그대로 둠 → `••••••••••••` + '변경' 버튼. **입력칸에 평문을 채우지 않는다**
//   ③ 변경 중              → 빈 입력칸 + '취소'. 빈 채로 저장하면 기존 값이 유지된다
//
// [연결 테스트] 백엔드가 없으므로 **버튼을 비활성**으로 둔다. 눌러서 아무 일도 없거나 가짜 성공을
// 보여주는 것보다, 왜 못 쓰는지 적어 두는 편이 정직하다 (FEEDBACK-03: no-op 금지).
import { useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { UseFormRegister } from 'react-hook-form';

import {
  Button,
  Card,
  CardTitle,
  controlStyle,
  errorIdOf,
  FormField,
  ToggleSwitch,
} from '../../../../shared/ui';
import { MASKED_SECRET_TEXT } from '../../_shared/secret';
import { CLIENT_ID_MAX, CLIENT_SECRET_MAX, providerLabel } from '../validation';
import type { OAuthProviderValues, OAuthSettingsValues } from '../validation';

const hintStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const secretRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-3)',
  minWidth: 0,
};

const maskedStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

const testRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

interface OAuthProviderCardProps {
  readonly index: number;
  readonly value: OAuthProviderValues;
  readonly register: UseFormRegister<OAuthSettingsValues>;
  readonly disabled: boolean;
  /** 이 제공자의 필드 오류 — 키는 필드명 */
  readonly errors: Partial<Record<'clientId' | 'secret' | 'redirectUri', string>>;
  /** 시크릿을 '변경 중' 인가 */
  readonly changingSecret: boolean;
  readonly onToggleEnabled: (next: boolean) => void;
  readonly onChangeSecretStart: () => void;
  readonly onChangeSecretCancel: () => void;
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
}: OAuthProviderCardProps) {
  const label = providerLabel(value.provider);
  const idBase = `oauth-${value.provider}`;

  /** 저장된 시크릿이 있고 변경 중이 아니면 마스킹만 보여준다 — 평문을 채우지 않는다 */
  const showMasked = value.hasSecret && !changingSecret;

  const clientIdInvalid = errors.clientId !== undefined;
  const secretInvalid = errors.secret !== undefined;
  const redirectInvalid = errors.redirectUri !== undefined;

  /**
   * 시크릿을 새로 넣어야만 켤 수 있다 — 이미 저장돼 있으면(②③) 비워 둬도 기존 값이 유지되므로 필수가 아니다.
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

  const startChange = useCallback(() => {
    onChangeSecretStart();
  }, [onChangeSecretStart]);

  return (
    <Card>
      {/* Card(shared/ui)가 이미 자식을 space-4 세로 스택으로 쌓는다 — 여기서 다시 감싸지 않는다 */}
      <CardTitle
        action={
          <ToggleSwitch
            checked={value.enabled}
            label={`${label} 로그인 사용`}
            disabled={disabled}
            onChange={onToggleEnabled}
          />
        }
      >
        {label}
      </CardTitle>

      <FormField
        htmlFor={`${idBase}-client-id`}
        label="Client ID"
        required={value.enabled}
        error={errors.clientId ?? ''}
        hint={`${label} 개발자 콘솔에서 발급받은 값입니다.`}
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

      <FormField
        htmlFor={`${idBase}-secret`}
        label="Client Secret"
        required={secretRequired}
        error={errors.secret ?? ''}
        hint={
          showMasked
            ? '저장된 시크릿은 다시 볼 수 없습니다. 바꾸려면 새 값을 넣으세요.'
            : '입력한 값은 저장 후 다시 표시되지 않습니다.'
        }
      >
        {showMasked ? (
          <span style={secretRowStyle}>
            {/* 저장돼 있다는 사실만 보여준다 — 값은 우리도 모른다 */}
            <span style={maskedStyle}>{MASKED_SECRET_TEXT}</span>
            <Button variant="secondary" size="sm" disabled={disabled} onClick={startChange}>
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
              placeholder={value.hasSecret ? '비워 두면 기존 시크릿을 유지합니다' : ''}
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

      <FormField
        htmlFor={`${idBase}-redirect`}
        label="Redirect URI"
        required={value.enabled}
        error={errors.redirectUri ?? ''}
        hint={`이 주소를 ${label} 콘솔에도 똑같이 등록해야 합니다.`}
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

      <div style={testRowStyle}>
        {/* TODO(backend): POST /api/settings/oauth/:provider/test —
              서버가 제공자에게 실제로 토큰 교환을 시도하고 결과를 돌려준다.
              프론트가 흉내 낼 수 없다(시크릿은 서버에만 있고 CORS 도 막힌다).
              백엔드가 붙으면 이 버튼이 활성화되고 결과는 인라인 배너로 표시한다. */}
        <Button variant="secondary" size="sm" disabled>
          연결 테스트
        </Button>
        <p style={hintStyle}>연결 테스트는 백엔드 연동 후 제공됩니다.</p>
      </div>
    </Card>
  );
}
