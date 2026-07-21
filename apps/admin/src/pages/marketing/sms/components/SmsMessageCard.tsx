// SmsMessageCard — SMS 발송 폼의 '메시지' 섹션 카드
//
// SmsFormPage 에서 분리한 도메인 필드 조각이다(순환복잡도 완화 · 단일 책임). 본문·템플릿·이미지 첨부·
// 바이트 안내·광고요건 경고를 그린다. 광고 경고(adWarning)는 이 카드만 쓰므로 여기서 파생한다.
// 검증 정본은 페이지(스키마)가 소유하고, 여기는 배치만 한다.
import type { FieldErrors, UseFormSetValue } from 'react-hook-form';

import {
  Alert,
  Card,
  CardTitle,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  hintStyle,
  SelectField,
  TextareaField,
  ToggleSwitch,
} from '../../../../shared/ui';
import { VariableInsertBar } from '../../_shared/VariableInsertBar';
import {
  hasAdPrefix,
  hasOptOut,
  meetsAdRequirements,
  smsByteLimit,
  smsKindLabel,
} from '../../_shared/messaging';
import type { SmsKind } from '../../_shared/messaging';
import type { TemplateOption } from '../../message-templates/store';
import { SMS_BODY_MAX } from '../types';
import type { SmsFormValues } from '../validation';

const NO_TEMPLATE = '';

interface SmsMessageCardProps {
  readonly disabled: boolean;
  readonly templates: readonly TemplateOption[];
  readonly templatePick: string;
  readonly onApplyTemplate: (id: string) => void;
  readonly body: string;
  readonly isAd: boolean;
  readonly hasImage: boolean;
  readonly kind: SmsKind;
  /** 발송 본문(접두 포함) 기준 바이트 — 입력칸에 쓴 글자만 센 값이 아니다 */
  readonly bytes: number;
  /**
   * 본문 앞에 붙는 발신 표시 이름 — 설정하지 않았으면 ''.
   *
   * 아래 바이트 안내가 **접두를 포함한** 수를 말하므로, 무엇이 더해졌는지 함께 적지 않으면
   * 운영자는 자기가 쓴 글자보다 큰 수를 보고 계산이 틀렸다고 읽는다.
   */
  readonly messagingName: string;
  readonly errors: FieldErrors<SmsFormValues>;
  readonly setValue: UseFormSetValue<SmsFormValues>;
}

export function SmsMessageCard({
  disabled,
  templates,
  templatePick,
  onApplyTemplate,
  body,
  isAd,
  hasImage,
  kind,
  bytes,
  messagingName,
  errors,
  setValue,
}: SmsMessageCardProps) {
  const adWarning = isAd && body.trim() !== '' && !meetsAdRequirements(body);

  return (
    <Card>
      <CardTitle>메시지</CardTitle>
      {/*
        [문구에서 '승인' 이 빠진 이유] 예전에는 '승인된 SMS 템플릿' 이었다. 승인은 **카카오 알림톡의
        사전 심사** 개념이라 문자에는 애초에 해당이 없었고, 지금 이 목록의 기준은 운영자가 켜고 끄는
        발행 상태(Active)다 (message-templates/types.ts 머리말).

        [왜 비어 있어도 자리를 지우지 않는가] 목록이 비면 칸이 통째로 사라져 '템플릿 기능이 없는
        화면' 으로 보였다. 고를 것이 없다는 것도 정보다.
      */}
      <FormField
        htmlFor="sms-template"
        label="템플릿 불러오기"
        hint="발행되어 켜져 있는(Active) 문자 템플릿을 본문에 채웁니다."
      >
        <SelectField
          id="sms-template"
          disabled={disabled || templates.length === 0}
          value={templatePick}
          onChange={(event) => onApplyTemplate(event.target.value)}
        >
          {templates.length === 0 ? (
            <option value={NO_TEMPLATE}>발행된 템플릿이 없습니다</option>
          ) : (
            <>
              <option value={NO_TEMPLATE}>템플릿 선택 안 함</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </>
          )}
        </SelectField>
      </FormField>
      <TextareaField
        label="본문"
        required
        value={body}
        onChange={(value) => setValue('body', value, { shouldDirty: true, shouldValidate: true })}
        maxLength={SMS_BODY_MAX}
        disabled={disabled}
        error={errors.body?.message}
        placeholder="발송할 문구를 입력하세요. #{이름} 등 치환변수를 넣을 수 있습니다."
        rows={5}
      />
      <p style={hintStyle}>
        {`${String(bytes)} byte · ${smsKindLabel(kind)} (한도 ${String(smsByteLimit(kind))} byte)`}
        {kind === 'lms' && ' — 90 byte 초과로 LMS 로 발송됩니다.'}
      </p>
      {/*
        접두가 실제로 붙을 때만 말한다. 늘 띄우면 '설정한 적 없다' 는 사실까지 안내문으로 바뀌어,
        읽어야 할 때 읽히지 않는다. (기본 설정을 고치는 길도 함께 적는다 — 여기서는 못 고친다.)
      */}
      {messagingName !== '' && (
        <p style={hintStyle}>
          {`발송 시 본문 앞에 "[${messagingName}] " 가 붙습니다 — 위 byte 는 이 접두를 포함한 수입니다. (시스템 설정 › 기본 설정)`}
        </p>
      )}
      <VariableInsertBar
        onInsert={(token) =>
          setValue('body', `${body}${token}`, { shouldDirty: true, shouldValidate: true })
        }
        disabled={disabled}
      />
      <div style={fieldStyle}>
        <span style={fieldLabelStyle}>이미지 첨부(MMS)</span>
        <ToggleSwitch
          checked={hasImage}
          onChange={(next) =>
            setValue('hasImage', next, { shouldDirty: true, shouldValidate: true })
          }
          disabled={disabled}
          label="이미지 첨부 여부"
          onLabel="첨부"
          offLabel="없음"
        />
      </div>
      {adWarning && (
        <Alert tone="warning">
          광고성 메시지입니다. 본문에 &quot;(광고)&quot; 표기와 무료수신거부(예: 080) 안내를
          포함하세요{hasAdPrefix(body) ? '' : ' — (광고) 표기 누락'}
          {hasOptOut(body) ? '' : ' — 수신거부 문구 누락'}.
        </Alert>
      )}
    </Card>
  );
}
