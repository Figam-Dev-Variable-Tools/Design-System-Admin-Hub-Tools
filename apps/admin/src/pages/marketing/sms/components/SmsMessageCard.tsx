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
import type { MessageTemplate, SmsKind } from '../../_shared/messaging';
import { SMS_BODY_MAX } from '../types';
import type { SmsFormValues } from '../validation';

const NO_TEMPLATE = '';

interface SmsMessageCardProps {
  readonly disabled: boolean;
  readonly templates: readonly MessageTemplate[];
  readonly templatePick: string;
  readonly onApplyTemplate: (id: string) => void;
  readonly body: string;
  readonly isAd: boolean;
  readonly hasImage: boolean;
  readonly kind: SmsKind;
  readonly bytes: number;
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
  errors,
  setValue,
}: SmsMessageCardProps) {
  const adWarning = isAd && body.trim() !== '' && !meetsAdRequirements(body);

  return (
    <Card>
      <CardTitle>메시지</CardTitle>
      {templates.length > 0 && (
        <FormField
          htmlFor="sms-template"
          label="템플릿 불러오기"
          hint="승인된 SMS 템플릿을 본문에 채웁니다."
        >
          <SelectField
            id="sms-template"
            disabled={disabled}
            value={templatePick}
            onChange={(event) => onApplyTemplate(event.target.value)}
          >
            <option value={NO_TEMPLATE}>템플릿 선택 안 함</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </SelectField>
        </FormField>
      )}
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
