// 거래처 선택 필드 — 계약·견적·프로젝트 폼이 공유하는 거래처 참조 컨트롤
//
// [무엇을 대체했나] 세 폼 모두 거래처를 `<input type="text" placeholder="예: (주)한빛소프트웨어">`
// 로 받고 있었다. 그래서 같은 거래처가 표기 하나로 둘이 되고, 저장된 뒤에는 어느 거래처인지
// 앱이 알 수 없었다(./account-reference 머리말). 이제 **거래처 마스터에서 고른다** — 고르면
// accountId 와 accountName 이 함께 채워지고, 견적처럼 사업자번호·대표자를 함께 쓰는 폼은
// onChange 로 함께 오는 마스터 레코드에서 그 값까지 승계한다.
//
// [미등록 거래처를 남겨 둔 이유와 그 대가를 드러내는 방식]
// 아직 등록되지 않은 회사와의 첫 견적/상담은 실제로 존재하고, 문의 → 견적 자동 발행은 회사명
// 문자열만 승계한다. 그래서 '미등록 거래처(이름 직접 입력)' 를 남겼다 — 다만 **대가를 숨기지
// 않는다**: 고르는 순간 경고 톤 안내가 뜨고(역방향 조회·거래처 상세에서 빠진다) 바로 옆에
// '거래처 등록' 경로를 준다. 조용히 문자열만 저장되던 예전 동작과 다른 점이 이것이다.
//
// [연결 끊김] 저장된 accountId 가 마스터에 없을 수 있다(다른 관리자가 삭제). 목록에서 조용히
// 사라지면 운영자는 거래처가 바뀐 줄 모른다 — 선택지에 그 값을 남겨 두고 경고로 알린다.
import { useId } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { cssVar } from '@tds/ui';

import {
  Alert,
  Button,
  controlStyle,
  errorIdOf,
  FormField,
  hintStyle,
  SelectField,
} from '../../../shared/ui';
import { useCrudListQuery } from '../../../shared/crud';
import { accountAdapter } from '../accounts/data-source';
import type { Account } from '../accounts/types';
import { ACCOUNT_LIST_PATH, indexById, UNREGISTERED_ACCOUNT_ID } from './account-reference';
import type { AccountRef } from './account-reference';

const RESOURCE = 'sales-accounts';

/** '미등록 거래처' 를 고른 상태를 나타내는 <option> 값 — 거래처 id 는 'acc-*' 라 충돌하지 않는다 */
const UNREGISTERED_OPTION = '__unregistered__';

/** 거래처를 고르면 함께 오는 것 — 마스터 레코드가 있으면 폼이 부속 필드까지 승계할 수 있다 */
export interface AccountSelection extends AccountRef {
  /** 마스터에서 고른 경우의 원본 레코드(미등록이면 없다) */
  readonly account?: Account;
}

interface AccountSelectFieldProps {
  /** 필드 id — 한 폼에 하나이므로 호출부가 정한다(폼 스타일 규약) */
  readonly id: string;
  readonly accountId: string;
  readonly accountName: string;
  /** 라벨 — 견적은 '거래처(공급받는자)' 처럼 도메인 문구를 쓴다 */
  readonly label?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  /**
   * 이름을 **사람이 자유 입력할 수 없다** — 문의에서 승계된 견적이 그렇다.
   * 마스터에서 고르는 것은 여전히 허용된다: 승계 값과 어긋나는 것이 아니라, 문의가 갖지 못한
   * '어느 거래처인가' 를 뒤늦게 채우는 일이기 때문이다(그때 이름은 마스터의 정식 상호로 맞춘다).
   */
  readonly nameLocked?: boolean;
  readonly error?: string | undefined;
  readonly onChange: (next: AccountSelection) => void;
}

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const noticeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/** 승계 값의 읽기 전용 표면 — 죽은 배경·흐린 글자로 '편집 불가' 를 시각으로 알린다(토큰만) */
const lockedValueStyle: CSSProperties = {
  ...controlStyle(false),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  cursor: 'default',
};

export function AccountSelectField({
  id,
  accountId,
  accountName,
  label = '거래처',
  required = false,
  disabled = false,
  nameLocked = false,
  error,
  onChange,
}: AccountSelectFieldProps) {
  const nameFieldId = `${id}-name`;
  const noticeId = useId();

  const accountsQuery = useCrudListQuery(RESOURCE, accountAdapter);
  const accounts = accountsQuery.data;
  // 아직 못 읽었으면 '없다' 가 아니라 '모른다' 다 — 연결 끊김 경고를 이 사이에 띄우지 않는다.
  const loaded = accounts !== undefined;
  const byId = indexById(accounts ?? []);
  const selected = byId[accountId];

  const unregistered = accountId === UNREGISTERED_ACCOUNT_ID;
  /**
   * 지금 고른 값에 대응하는 <option> 이 목록에 없다 — 목록을 아직 못 읽었거나(로딩) 정말 없다.
   * 어느 쪽이든 자리표시 option 을 만들어야 한다: 없으면 브라우저가 **첫 옵션을 대신 고른 것처럼
   * 그려** 수정 폼이 잠깐 '미등록 거래처' 로 보인다(값은 그대로인데 화면만 거짓말을 한다).
   */
  const missingOption = !unregistered && selected === undefined;
  /** 저장된 id 가 마스터에 없다 — 다른 관리자가 지웠거나 시드가 어긋났다(로딩 중은 아직 모른다) */
  const dangling = loaded && missingOption;

  const selectValue = unregistered ? UNREGISTERED_OPTION : accountId;

  const onSelect = (value: string) => {
    if (value === UNREGISTERED_OPTION) {
      // 미등록으로 되돌아가도 이름은 남긴다 — 방금까지 보던 상호가 사라지면 다시 타이핑해야 한다.
      onChange({ accountId: UNREGISTERED_ACCOUNT_ID, accountName });
      return;
    }
    const next = byId[value];
    if (next === undefined) return;
    // 고르는 순간 두 값이 함께 채워진다 — 이름은 마스터의 정식 상호가 정본이다.
    onChange({ accountId: next.id, accountName: next.name, account: next });
  };

  return (
    <div style={wrapStyle}>
      <FormField
        htmlFor={id}
        label={label}
        required={required}
        {...(unregistered
          ? { hint: '마스터에 없는 거래처는 아래에 이름을 직접 적습니다.' }
          : { hint: '거래처 마스터에서 고르면 상호·사업자번호가 함께 채워집니다.' })}
      >
        <SelectField
          id={id}
          value={selectValue}
          disabled={disabled || !loaded}
          aria-describedby={noticeId}
          onChange={(event) => onSelect(event.target.value)}
        >
          {/* 지금 값의 자리표시 — 목록에서 빼면 값이 조용히 다른 거래처로 튄다.
              '연결 끊김' 은 **다 읽고 나서도 없을 때만** 붙인다(로딩 중에 단정하지 않는다). */}
          {missingOption && (
            <option value={accountId}>
              {`${accountName === '' ? '(이름 없음)' : accountName}${dangling ? ' — 연결 끊김' : ''}`}
            </option>
          )}
          {(accounts ?? []).map((account) => (
            <option key={account.id} value={account.id}>
              {account.active ? account.name : `${account.name} (거래중지)`}
            </option>
          ))}
          <option value={UNREGISTERED_OPTION}>미등록 거래처 — 이름 직접 입력</option>
        </SelectField>
      </FormField>

      {unregistered && (
        <FormField
          htmlFor={nameFieldId}
          label="거래처명"
          required={required}
          {...(error !== undefined && { error })}
        >
          <input
            id={nameFieldId}
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={nameLocked ? lockedValueStyle : controlStyle(error !== undefined)}
            maxLength={60}
            placeholder="예: (주)한빛소프트웨어"
            value={accountName}
            disabled={disabled}
            readOnly={nameLocked}
            aria-readonly={nameLocked || undefined}
            aria-invalid={error !== undefined}
            aria-describedby={error !== undefined ? errorIdOf(nameFieldId) : noticeId}
            onChange={(event) =>
              onChange({
                accountId: UNREGISTERED_ACCOUNT_ID,
                accountName: event.target.value,
              })
            }
          />
        </FormField>
      )}

      <div id={noticeId}>
        {accountsQuery.error !== null ? (
          <Alert tone="danger">
            <span style={noticeRowStyle}>
              <span>거래처 목록을 불러오지 못해 지금은 고를 수 없습니다.</span>
              <Button variant="secondary" onClick={() => void accountsQuery.refetch()}>
                다시 시도
              </Button>
            </span>
          </Alert>
        ) : dangling ? (
          <Alert tone="warning">
            연결된 거래처를 찾을 수 없습니다. 이미 삭제되었을 수 있으니 거래처를 다시 고르세요.
          </Alert>
        ) : unregistered ? (
          <Alert tone="warning">
            <span style={noticeRowStyle}>
              <span>
                거래처 마스터에 연결되지 않습니다 — 거래처 상세의 계약·견적·프로젝트·상담 이력에 이
                건이 나타나지 않습니다.
              </span>
              <Link to={`${ACCOUNT_LIST_PATH}/new`} className="tds-ui-link tds-ui-focusable">
                거래처 등록
              </Link>
            </span>
          </Alert>
        ) : (
          <p style={hintStyle}>
            {selected === undefined
              ? '거래처 목록을 불러오는 중입니다…'
              : `사업자 ${selected.bizNo} · 대표 ${selected.ceoName}`}
          </p>
        )}
      </div>
    </div>
  );
}
