// RuleFormPage — 발송 규칙 등록/수정 (라우트: /notifications/send/new · /:id/edit)
//
// [IA-05] 등록·수정이 한 컴포넌트다 — useCrudForm 이 :id 유무로 갈린다. 레이아웃은 같고 제목·프리필만 다르다.
//
// [무엇을 고르는 폼인가] '언제(이벤트) → 어떻게(채널) → 무슨 문구(템플릿) → 실패하면(재시도)'. 마케팅
// 발송 폼의 '누구에게(세그먼트)·언제(예약시각)'가 여기엔 없다 — 이벤트가 둘 다 정한다.
import { useEffect, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  Alert,
  errorIdOf,
  FormField,
  hintIdOf,
  hintStyle,
  SelectField,
  ToggleSwitch,
} from '../../../shared/ui';
import { useCrudForm, FormPageShell } from '../../../shared/crud';
import { ruleAdapter, RULE_RESOURCE } from './data-source';
import { createRuleSchema } from './validation';
import type { RuleFormValues } from './validation';
import { templateOptionsFor } from '../_shared/store';
import { useInitialFocus } from '../_shared/useInitialFocus';
import { noticeBodyStyle } from '../_shared/styles';
import {
  findTrigger,
  NOTIFICATION_CHANNEL_OPTIONS,
  notificationChannelLabel,
  NOTIFICATION_TRIGGERS,
  RETRY_POLICY_OPTIONS,
  triggerCategoryLabel,
  triggerLabel,
} from '../_shared/notification';
import type { NotificationRule, NotificationRuleInput } from '../_shared/notification';

const ENTITY_LABEL = '발송 규칙';
const LIST_PATH = '/notifications/send';
const UNSAVED_MESSAGE =
  '발송 규칙에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const EMPTY: RuleFormValues = {
  trigger: 'order.placed',
  channel: 'email',
  templateId: '',
  enabled: true,
  retryPolicy: 'once',
};

const toggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

function toInput(values: RuleFormValues): NotificationRuleInput {
  return {
    trigger: values.trigger,
    channel: values.channel,
    templateId: values.templateId,
    enabled: values.enabled,
    retryPolicy: values.retryPolicy,
  };
}

function toValues(rule: NotificationRule): RuleFormValues {
  return {
    trigger: rule.trigger,
    channel: rule.channel,
    templateId: rule.templateId,
    enabled: rule.enabled,
    retryPolicy: rule.retryPolicy,
  };
}

export default function RuleFormPage() {
  // 중복 검사가 '자기 자신 제외'를 해야 해서 스키마가 :id 를 알아야 한다. 라우트 파라미터라
  // 이 폼이 살아있는 동안 안정적이다(useForm 의 resolver 는 첫 렌더에 고정된다).
  const { id } = useParams<{ id: string }>();
  const schema = useMemo(() => createRuleSchema(id ?? null), [id]);

  const {
    form,
    isEdit,
    saving,
    loadingDetail,
    loadFailure,
    retryLoad,
    serverError,
    errorReference,
    conflict,
    submit,
    isDirty,
  } = useCrudForm<NotificationRule, NotificationRuleInput, RuleFormValues>({
    resource: RULE_RESOURCE,
    adapter: ruleAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema,
    empty: EMPTY,
    toInput,
    toValues,
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;

  // A11Y-13 — 상세 로딩이 끝나 필드가 실제로 그려진 뒤 첫 필드에 포커스한다.
  const triggerFocusRef = useInitialFocus<HTMLSelectElement>(!loadingDetail);
  const { ref: triggerRegisterRef, ...triggerField } = register('trigger');

  const trigger = watch('trigger');
  const channel = watch('channel');
  const templateId = watch('templateId');
  const enabled = watch('enabled');
  const retryPolicy = watch('retryPolicy');

  const triggerInfo = findTrigger(trigger);
  // 템플릿 후보는 채널·트리거에 **둘 다** 맞는 것만 — 다른 이벤트의 문구를 걸면 그 이벤트가 주지 않는
  // 변수가 빈칸으로 나간다.
  const templates = useMemo(() => templateOptionsFor(channel, trigger), [channel, trigger]);

  // 채널/이벤트를 바꾸면 이전 선택이 후보에 없을 수 있다 — 조용히 깨진 값을 남기지 않고 비운다.
  useEffect(() => {
    if (templateId === '') return;
    if (templates.some((template) => template.id === templateId)) return;
    setValue('templateId', '', { shouldDirty: true });
  }, [templates, templateId, setValue]);

  const templatesPath =
    channel === 'email' ? '/notifications/email-templates' : '/notifications/sms-templates';

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="규칙 내용"
      description="이벤트가 발생하면 시스템이 당사자에게 자동 발송합니다. 이 화면에서 직접 발송하지는 않습니다."
      listPath={LIST_PATH}
      isEdit={isEdit}
      loadingDetail={loadingDetail}
      loadFailure={loadFailure}
      onRetryLoad={retryLoad}
      errorReference={errorReference}
      conflict={conflict}
      serverError={serverError}
      saving={saving}
      isDirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={submit}
    >
      <FormField
        htmlFor="rule-trigger"
        label="이벤트"
        required
        hint={
          triggerInfo === undefined
            ? '이 규칙을 발동시킬 이벤트를 고릅니다.'
            : `${triggerCategoryLabel(triggerInfo.category)} · ${triggerInfo.description}`
        }
      >
        <SelectField
          id="rule-trigger"
          disabled={disabled}
          aria-describedby={hintIdOf('rule-trigger')}
          {...triggerField}
          ref={(element: HTMLSelectElement | null) => {
            triggerRegisterRef(element);
            triggerFocusRef.current = element;
          }}
        >
          {NOTIFICATION_TRIGGERS.map((option) => (
            <option key={option.id} value={option.id}>
              {`${triggerCategoryLabel(option.category)} · ${option.label}`}
            </option>
          ))}
        </SelectField>
      </FormField>

      <FormField
        htmlFor="rule-channel"
        label="채널"
        required
        error={errors.channel?.message}
        hint="한 이벤트에 이메일·SMS 규칙을 하나씩 둘 수 있습니다. 같은 채널을 두 번 두면 알림이 두 번 나갑니다."
      >
        <SelectField
          id="rule-channel"
          disabled={disabled}
          isInvalid={errors.channel !== undefined}
          aria-describedby={
            errors.channel !== undefined ? errorIdOf('rule-channel') : hintIdOf('rule-channel')
          }
          {...register('channel')}
        >
          {NOTIFICATION_CHANNEL_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </FormField>

      <FormField
        htmlFor="rule-template"
        label="템플릿"
        required
        error={errors.templateId?.message}
        hint={`'${triggerLabel(trigger)}' 이벤트의 ${notificationChannelLabel(channel)} 템플릿만 고를 수 있습니다.`}
      >
        <SelectField
          id="rule-template"
          disabled={disabled || templates.length === 0}
          isInvalid={errors.templateId !== undefined}
          aria-describedby={
            errors.templateId !== undefined ? errorIdOf('rule-template') : hintIdOf('rule-template')
          }
          {...register('templateId')}
        >
          <option value="">템플릿을 고르세요</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </SelectField>
      </FormField>

      {/* 후보가 없으면 규칙을 만들 수 없다 — 막다른 길에 두지 않고 템플릿 화면으로 보낸다. */}
      {templates.length === 0 && (
        <Alert tone="warning">
          <div style={noticeBodyStyle}>
            <span>
              {`'${triggerLabel(trigger)}' 이벤트의 ${notificationChannelLabel(channel)} 템플릿이 아직 없습니다. 먼저 템플릿을 등록해 주세요.`}
            </span>
            <Link to={`${templatesPath}/new`} className="tds-ui-link tds-ui-focusable">
              {`${notificationChannelLabel(channel)} 템플릿 등록`}
            </Link>
          </div>
        </Alert>
      )}

      <FormField
        htmlFor="rule-retry"
        label="실패 시 재시도"
        hint="거래 알림은 반드시 도달해야 합니다. 인증번호·보안 알림은 3회 재시도를 권합니다."
      >
        <SelectField
          id="rule-retry"
          disabled={disabled}
          aria-describedby={hintIdOf('rule-retry')}
          {...register('retryPolicy')}
        >
          {RETRY_POLICY_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </FormField>

      <FormField
        htmlFor="rule-enabled"
        label="자동 발송"
        hint="끄면 이 이벤트가 발생해도 알림이 나가지 않습니다. 점검·장애 대응 중에 잠시 끌 수 있습니다."
      >
        <div style={toggleRowStyle}>
          <ToggleSwitch
            checked={enabled}
            disabled={disabled}
            onChange={(next) => setValue('enabled', next, { shouldDirty: true })}
            label="자동 발송 여부"
            onLabel="켜짐"
            offLabel="꺼짐"
          />
          <span style={hintStyle}>
            {enabled
              ? `'${triggerLabel(trigger)}' 이벤트가 발생하면 ${notificationChannelLabel(channel)}로 자동 발송합니다(${RETRY_POLICY_OPTIONS.find((option) => option.id === retryPolicy)?.label ?? ''}).`
              : '지금은 발송하지 않습니다.'}
          </span>
        </div>
      </FormField>
    </FormPageShell>
  );
}
