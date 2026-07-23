// 거래처 담당자(복수) 편집기
//
// 담당자 행을 추가·삭제하고 대표담당 1명을 라디오로 지정한다. 거래처 폼 1곳만 쓰므로 페이지 전용으로
// 둔다(shared/ui README 규칙 — 소비자 1개). 도메인 값/콜백만 다루고 표면은 shared/ui 프리미티브를 쓴다.
import type { CSSProperties } from 'react';

import {
  Button,
  checkboxStyle,
  controlStyle,
  errorTextStyle,
  fieldLabelStyle,
  formRowStyle,
  hintStyle,
  Icon,
} from '../../../../shared/ui';
import { ACCOUNT_MAX_CONTACTS } from '../types';
import type { AccountContact } from '../types';
import { cssVar } from '@tds/ui';

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const rowsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const primaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const primaryLabelStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  cursor: 'pointer',
};

const iconButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.feedback.danger.text'),
  fontSize: cssVar('typography.label.sm.font-size'),
  cursor: 'pointer',
};

const cellLabelStyle: CSSProperties = {
  ...fieldLabelStyle,
  fontSize: cssVar('typography.label.sm.font-size'),
};

const cellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const newContact = (): AccountContact => ({
  id: `ct-new-${String(Date.now())}-${String(Math.round(Math.random() * 1000))}`,
  name: '',
  department: '',
  position: '',
  phone: '',
  email: '',
  primary: false,
});

interface ContactCellProps {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly disabled: boolean;
  readonly placeholder: string;
  readonly onChange: (value: string) => void;
}

function ContactCell({ id, label, value, disabled, placeholder, onChange }: ContactCellProps) {
  return (
    <label style={cellStyle} htmlFor={id}>
      <span style={cellLabelStyle}>{label}</span>
      <input
        id={id}
        type="text"
        className="tds-ui-input tds-ui-focusable"
        style={controlStyle(false)}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface AccountContactsFieldProps {
  readonly contacts: readonly AccountContact[];
  readonly disabled: boolean;
  readonly onChange: (next: readonly AccountContact[]) => void;
  readonly error?: string | undefined;
}

export function AccountContactsField({
  contacts,
  disabled,
  onChange,
  error,
}: AccountContactsFieldProps) {
  const patch = (id: string, part: Partial<AccountContact>) => {
    onChange(contacts.map((contact) => (contact.id === id ? { ...contact, ...part } : contact)));
  };

  const setPrimary = (id: string) => {
    onChange(contacts.map((contact) => ({ ...contact, primary: contact.id === id })));
  };

  const remove = (id: string) => {
    const next = contacts.filter((contact) => contact.id !== id);
    // 대표담당을 지웠으면 첫 담당자를 대표로 승격한다.
    if (next.length > 0 && !next.some((contact) => contact.primary)) {
      onChange(next.map((contact, index) => ({ ...contact, primary: index === 0 })));
      return;
    }
    onChange(next);
  };

  const add = () => {
    if (contacts.length >= ACCOUNT_MAX_CONTACTS) return;
    const created = newContact();
    onChange([...contacts, { ...created, primary: contacts.length === 0 }]);
  };

  return (
    <div style={sectionStyle}>
      <span style={fieldLabelStyle}>담당자 *</span>
      <p style={hintStyle}>
        거래처 담당자를 등록하세요. 대표담당 1명이 목록·견적서에 노출돼요. (최대{' '}
        {ACCOUNT_MAX_CONTACTS}명)
      </p>

      <div style={rowsStyle}>
        {contacts.map((contact, index) => (
          <div key={contact.id} style={sectionStyle}>
            <div style={formRowStyle}>
              <ContactCell
                id={`contact-name-${contact.id}`}
                label={`담당자 ${String(index + 1)} 이름`}
                value={contact.name}
                disabled={disabled}
                placeholder="예: 홍길동"
                onChange={(value) => patch(contact.id, { name: value })}
              />
              <ContactCell
                id={`contact-dept-${contact.id}`}
                label="부서"
                value={contact.department}
                disabled={disabled}
                placeholder="예: 구매팀"
                onChange={(value) => patch(contact.id, { department: value })}
              />
              <ContactCell
                id={`contact-position-${contact.id}`}
                label="직급"
                value={contact.position}
                disabled={disabled}
                placeholder="예: 팀장"
                onChange={(value) => patch(contact.id, { position: value })}
              />
              <ContactCell
                id={`contact-phone-${contact.id}`}
                label="연락처"
                value={contact.phone}
                disabled={disabled}
                placeholder="예: 010-0000-0000"
                onChange={(value) => patch(contact.id, { phone: value })}
              />
              <ContactCell
                id={`contact-email-${contact.id}`}
                label="이메일"
                value={contact.email}
                disabled={disabled}
                placeholder="예: user@company.com"
                onChange={(value) => patch(contact.id, { email: value })}
              />
            </div>
            <div style={primaryRowStyle}>
              <label style={primaryLabelStyle}>
                <input
                  type="radio"
                  name="primary-contact"
                  style={checkboxStyle}
                  checked={contact.primary}
                  disabled={disabled}
                  onChange={() => setPrimary(contact.id)}
                />
                대표담당으로 지정
              </label>
              {contacts.length > 1 && (
                <button
                  type="button"
                  className="tds-ui-focusable"
                  style={iconButtonStyle}
                  disabled={disabled}
                  onClick={() => remove(contact.id)}
                >
                  <Icon name="trash" />
                  담당자 삭제
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {contacts.length < ACCOUNT_MAX_CONTACTS && (
        <span>
          <Button variant="secondary" size="md" disabled={disabled} onClick={add}>
            <Icon name="plus-circle" />
            담당자 추가
          </Button>
        </span>
      )}

      {error !== undefined && error !== '' && (
        <p role="alert" style={errorTextStyle}>
          {error}
        </p>
      )}
    </div>
  );
}
