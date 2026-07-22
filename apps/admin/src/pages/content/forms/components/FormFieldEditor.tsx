// 폼 항목 편집기 — 순서 · 종류 · 필수 · 선택지 · 숨김 · 삭제
//
// [도메인 규칙을 다시 쓰지 않는다] 무엇을 지울 수 있고 무엇을 숨길 수 있는지는 전부 types.ts 의
// 술어가 답한다(fieldDeleteBlock · fieldHideBlock · addFieldBlock · fieldBlock). 이 컴포넌트는
// 그 답을 **버튼의 disabled 와 그 옆 문장에 그대로 옮길 뿐**이다 — 규칙이 두 벌이 되지 않는다.
//
// [값을 소유하지 않는다] fields 는 폼(RHF)이 들고 있고 여기는 받아서 그리고 바뀐 배열을 돌려준다.
// 그래야 '저장하지 않고 나가기' 가드가 항목 편집까지 함께 지킨다.
import type { CSSProperties } from 'react';

import { cssVar, SelectField } from '@tds/ui';

import {
  Button,
  buttonStyle,
  controlStyle,
  hintStyle,
  Icon,
  moveArrayItem,
  ReorderMoveButtons,
  StatusBadge,
  ToggleSwitch,
} from '../../../../shared/ui';
import {
  addFieldBlock,
  CONSENT_FIELD_KIND,
  FIELD_KIND_LABEL,
  FIELD_LABEL_MAX,
  fieldBlock,
  fieldDeleteBlock,
  fieldHideBlock,
  FORM_FIELD_TYPES,
  isConsentKind,
  needsOptions,
} from '../types';
import type { ContentFormStatus, FormFieldDef, FormFieldKind } from '../types';

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  listStyleType: 'none',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const headRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 7), 1fr))`,
  gap: cssVar('space.3'),
};

const controlsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const dangerGhostStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  color: cssVar('color.feedback.danger.text'),
};

const errorTextStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.feedback.danger.text'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
};

const addRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const labelSlotStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
};

const fieldLabelStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
};

let localSeq = 0;

/** 새 항목 — id 는 화면에서만 쓰는 임시 키다(저장될 때 서버가 정본 id 를 준다) */
function makeField(kind: FormFieldKind): FormFieldDef {
  localSeq += 1;
  return {
    id: `new-${String(Date.now())}-${String(localSeq)}`,
    kind,
    label: kind === CONSENT_FIELD_KIND ? '개인정보 수집·이용에 동의합니다' : '',
    // 동의 항목은 처음부터 필수다 — 끌 수도 없다(types.fieldBlock)
    required: kind === CONSENT_FIELD_KIND,
    options: needsOptions(kind) ? ['선택지 1'] : [],
    hidden: false,
  };
}

interface FormFieldEditorProps {
  readonly fields: readonly FormFieldDef[];
  readonly status: ContentFormStatus;
  readonly disabled: boolean;
  readonly onChange: (next: readonly FormFieldDef[]) => void;
}

export function FormFieldEditor({ fields, status, disabled, onChange }: FormFieldEditorProps) {
  const patch = (id: string, changes: Partial<FormFieldDef>) => {
    onChange(fields.map((field) => (field.id === id ? { ...field, ...changes } : field)));
  };

  const move = (index: number, delta: number) => {
    onChange(moveArrayItem([...fields], index, index + delta));
  };

  const remove = (id: string) => {
    onChange(fields.filter((field) => field.id !== id));
  };

  const consentBlocked = addFieldBlock(fields, CONSENT_FIELD_KIND);

  return (
    <section style={sectionStyle}>
      <p style={hintStyle}>
        방문자가 채우는 항목입니다. 위/아래 버튼으로 순서를 바꿉니다. 발행된 폼의 항목은 지울 수
        없고 숨기기만 할 수 있습니다 — 지우면 이미 들어온 응답의 답이 어느 질문에 대한 것인지 알 수
        없게 됩니다.
      </p>

      <ul style={listStyle}>
        {fields.map((field, index) => {
          const problem = fieldBlock(field);
          const deleteBlocked = fieldDeleteBlock(status);
          const hideBlocked = fieldHideBlock(field);
          const consent = isConsentKind(field.kind);
          const inputId = `form-field-label-${field.id}`;
          /* 이유를 컨트롤에 **연결**한다 — aria-invalid 만 붙으면 스크린리더가 '잘못됨' 이라고만
             말하고 무엇이 잘못됐는지는 끝내 읽어 주지 않는다 (A11Y-11). */
          const problemId = `${inputId}-error`;
          const optionsId = `form-field-options-${field.id}`;

          return (
            <li key={field.id} style={cardStyle}>
              <div style={headRowStyle}>
                <span style={controlsStyle}>
                  <StatusBadge
                    tone={consent ? 'warning' : 'neutral'}
                    label={FIELD_KIND_LABEL[field.kind]}
                  />
                  {field.hidden && <StatusBadge tone="neutral" label="숨김" />}
                </span>
                <span style={controlsStyle}>
                  <ReorderMoveButtons
                    label={field.label === '' ? '이름 없는 항목' : field.label}
                    index={index}
                    count={fields.length}
                    locked={disabled}
                    onMove={move}
                  />
                  <button
                    type="button"
                    className="tds-ui-btn-ghost tds-ui-focusable"
                    style={deleteBlocked !== null ? buttonStyle('ghost', true) : dangerGhostStyle}
                    aria-label={
                      deleteBlocked !== null
                        ? `${field.label} — ${deleteBlocked}`
                        : `${field.label} 항목 삭제`
                    }
                    {...(deleteBlocked !== null && { title: deleteBlocked })}
                    disabled={deleteBlocked !== null || disabled}
                    onClick={() => remove(field.id)}
                  >
                    <Icon name="trash" />
                  </button>
                </span>
              </div>

              <div style={gridStyle}>
                <span style={labelSlotStyle}>
                  <label style={fieldLabelStyle} htmlFor={inputId}>
                    항목 이름
                  </label>
                  <input
                    id={inputId}
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(problem !== null)}
                    maxLength={FIELD_LABEL_MAX}
                    placeholder="예: 회사명"
                    value={field.label}
                    disabled={disabled}
                    aria-invalid={problem !== null}
                    {...(problem !== null && { 'aria-describedby': problemId })}
                    onChange={(event) => patch(field.id, { label: event.target.value })}
                  />
                </span>

                <span style={labelSlotStyle}>
                  <label style={fieldLabelStyle} htmlFor={`form-field-kind-${field.id}`}>
                    종류
                  </label>
                  {/* 동의 항목의 종류는 바꿀 수 없다 — 바꾸는 순간 법적 요구가 달라진다 */}
                  <SelectField
                    id={`form-field-kind-${field.id}`}
                    value={field.kind}
                    disabled={disabled || consent}
                    onChange={(event) => {
                      const next = event.target.value as FormFieldKind;
                      patch(field.id, {
                        kind: next,
                        options: needsOptions(next) ? field.options : [],
                      });
                    }}
                  >
                    {consent ? (
                      <option value={CONSENT_FIELD_KIND}>
                        {FIELD_KIND_LABEL[CONSENT_FIELD_KIND]}
                      </option>
                    ) : (
                      FORM_FIELD_TYPES.map((kind) => (
                        <option key={kind} value={kind}>
                          {FIELD_KIND_LABEL[kind]}
                        </option>
                      ))
                    )}
                  </SelectField>
                </span>
              </div>

              {needsOptions(field.kind) && (
                <span style={labelSlotStyle}>
                  <label style={fieldLabelStyle} htmlFor={optionsId}>
                    선택지 (한 줄에 하나)
                  </label>
                  <textarea
                    id={optionsId}
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(problem !== null)}
                    rows={3}
                    value={field.options.join('\n')}
                    disabled={disabled}
                    onChange={(event) =>
                      patch(field.id, { options: event.target.value.split('\n') })
                    }
                  />
                </span>
              )}

              <div style={controlsStyle}>
                <ToggleSwitch
                  label={`${field.label} 필수 여부`}
                  onLabel="필수"
                  offLabel="선택"
                  checked={field.required}
                  // 동의 항목은 필수에서 내려올 수 없다(types.fieldBlock 이 같은 것을 말한다)
                  disabled={disabled || consent}
                  onChange={(next) => patch(field.id, { required: next })}
                />
                <ToggleSwitch
                  label={`${field.label} 노출 여부`}
                  onLabel="노출"
                  offLabel="숨김"
                  checked={!field.hidden}
                  disabled={disabled || hideBlocked !== null}
                  onChange={(next) => patch(field.id, { hidden: !next })}
                />
                {hideBlocked !== null && <span style={hintStyle}>{hideBlocked}</span>}
              </div>

              {problem !== null && (
                <p id={problemId} role="alert" style={errorTextStyle}>
                  {problem}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div style={addRowStyle}>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          onClick={() => onChange([...fields, makeField('text')])}
        >
          <Icon name="plus-circle" />
          항목 추가
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={disabled || consentBlocked !== null}
          {...(consentBlocked !== null && { title: consentBlocked })}
          onClick={() => onChange([...fields, makeField(CONSENT_FIELD_KIND)])}
        >
          <Icon name="lock" />
          개인정보 동의 항목 추가
        </Button>
        {consentBlocked !== null && <span style={hintStyle}>{consentBlocked}</span>}
      </div>
    </section>
  );
}
