// EmailBodyCard — 이메일 발송 폼의 '본문' 섹션 카드
//
// EmailFormPage 에서 분리한 도메인 필드 조각이다(순환복잡도 완화 · 단일 책임). 템플릿·본문·치환변수·
// 광고 제목 경고·수신거부 링크를 그린다. 광고 경고(adSubjectWarning)는 이 카드만 쓰므로 여기서 파생한다.
// 검증 정본은 페이지(스키마)가 소유하고, 여기는 배치만 한다.
import type { FieldErrors, UseFormSetValue } from 'react-hook-form';

import {
  Alert,
  Card,
  CardTitle,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  hintStyle,
  SelectField,
  TextareaField,
  ToggleSwitch,
} from '../../../../shared/ui';
import { VariableInsertBar } from '../../_shared/VariableInsertBar';
import { hasAdPrefix } from '../../_shared/messaging';
import type { TemplateOption } from '../../message-templates/store';
import { EMAIL_BODY_MAX } from '../types';
import type { EmailFormValues } from '../validation';

const NO_TEMPLATE = '';

interface EmailBodyCardProps {
  readonly disabled: boolean;
  readonly templates: readonly TemplateOption[];
  readonly templatePick: string;
  readonly onApplyTemplate: (id: string) => void;
  readonly body: string;
  readonly subject: string;
  readonly isAd: boolean;
  readonly includeUnsubscribe: boolean;
  readonly errors: FieldErrors<EmailFormValues>;
  readonly setValue: UseFormSetValue<EmailFormValues>;
}

export function EmailBodyCard({
  disabled,
  templates,
  templatePick,
  onApplyTemplate,
  body,
  subject,
  isAd,
  includeUnsubscribe,
  errors,
  setValue,
}: EmailBodyCardProps) {
  const adSubjectWarning = isAd && subject.trim() !== '' && !hasAdPrefix(subject);

  return (
    <Card>
      <CardTitle>본문</CardTitle>
      {/*
        [왜 비어 있어도 자리를 지우지 않는가] 예전에는 목록이 비면 이 칸이 통째로 사라졌다 —
        운영자에게는 '템플릿 기능이 없는 화면' 으로 보이고, 왜 없는지 알 수 없다. 고를 것이 없다는
        것도 정보이므로 칸은 남기고 이유를 적는다.
      */}
      <FormField
        htmlFor="email-template"
        label="템플릿 불러오기"
        hint="발행되어 켜져 있는(Active) 이메일 템플릿의 제목·본문을 채워요."
      >
        <SelectField
          id="email-template"
          disabled={disabled || templates.length === 0}
          value={templatePick}
          onChange={(event) => onApplyTemplate(event.target.value)}
        >
          {templates.length === 0 ? (
            <option value={NO_TEMPLATE}>발행된 템플릿이 없어요</option>
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
        maxLength={EMAIL_BODY_MAX}
        disabled={disabled}
        error={errors.body?.message}
        placeholder="메일 본문을 입력하세요. #{이름} 등 치환변수를 넣을 수 있어요."
        rows={6}
      />
      <VariableInsertBar
        onInsert={(token) =>
          setValue('body', `${body}${token}`, { shouldDirty: true, shouldValidate: true })
        }
        disabled={disabled}
      />
      {adSubjectWarning && (
        <Alert tone="warning">
          광고성 메일이에요. 제목을 &quot;(광고)&quot;로 시작하도록 수정하세요.
        </Alert>
      )}
      <div style={fieldStyle}>
        <span style={fieldLabelStyle}>수신거부 링크</span>
        <ToggleSwitch
          checked={includeUnsubscribe}
          onChange={(next) =>
            setValue('includeUnsubscribe', next, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
          disabled={disabled}
          label="수신거부 링크 포함 여부"
          onLabel="포함"
          offLabel="미포함"
        />
        {errors.includeUnsubscribe !== undefined ? (
          <p role="alert" style={errorTextStyle}>
            {errors.includeUnsubscribe.message}
          </p>
        ) : (
          <p style={hintStyle}>마케팅 이메일에는 수신거부 링크가 반드시 포함되어야 해요.</p>
        )}
      </div>
    </Card>
  );
}
