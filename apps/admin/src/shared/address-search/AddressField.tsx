// 주소 필드 — 읽기 전용 입력 + '주소 검색' 버튼 + 검색 모달을 한 부품으로 묶는다
//
// [왜 부품인가] 오시는 길과 회사 정보가 같은 30여 줄(행 레이아웃·키보드 처리·모달 열고 닫기)을
// 나란히 들고 있었다. 사본이 둘이면 한쪽만 고쳐지는 날이 반드시 온다 — 특히 a11y 처리처럼
// 눈에 띄지 않는 부분이 그렇다. 주소를 받는 화면은 앞으로도 늘어난다.
//
// [주소는 검색으로 고른다 — 그래서 입력은 readOnly 다]
// 자유 입력을 함께 열어 두면 우편번호 체계에 없는 주소가 저장될 수 있고, 그 값은 홈페이지·견적서로
// 그대로 나간다. 고칠 것이 있으면 다시 검색하거나 상세주소에 적는다.
//
// [a11y] '누르면 열린다' 를 클릭에만 걸지 않았다. 읽기 전용 입력도 포커스를 받으므로 Enter·Space
// 로 열리고(폼 제출은 preventDefault 로 막는다), 옆의 버튼이 스크린리더에 보이는 정식 트리거다.
// 모달을 닫으면 DS Modal 이 초점을 원래 자리로 돌려준다.
import { useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import { cssVar } from '@tds/ui';

import { Button, controlStyle, errorIdOf, FormField } from '../ui';
import { AddressSearchModal } from './AddressSearchModal';
import type { PostalAddress } from './contract';

/**
 * 입력이 남는 폭을 가져가고(`flex: 1 1 auto` · `minWidth: 0`), 버튼은 레이블 폭 아래로 눌리지
 * 않는다 — DS Button 이 `white-space: nowrap` 이라 min-content 폭이 레이블 전체이기 때문이다.
 * (그 선언이 없던 동안 '주소 검색' 이 좁은 화면에서 두 줄로 접혔다 — 고친 자리는 Button.css.)
 */
const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const inputStyle = (invalid: boolean): CSSProperties => ({
  ...controlStyle(invalid),
  flex: '1 1 auto',
  minWidth: 0,
  cursor: 'pointer',
});

const HINT =
  "주소 칸이나 '주소 검색' 버튼을 누르면 검색창이 열려요. 층·호수는 아래 상세주소에 적어 주세요.";

interface AddressFieldProps {
  /** 입력의 DOM id — 화면마다 다르다(dir-address · profile-address) */
  readonly id: string;
  /** react-hook-form 의 register('address') 결과 — 값의 소유자는 여전히 폼이다 */
  readonly field: UseFormRegisterReturn;
  readonly error: string | undefined;
  readonly disabled: boolean;
  /** 주소를 고른 순간 — 폼에 값을 넣는 일은 화면이 한다(상세주소 제안 규칙이 화면마다 붙는다) */
  readonly onSelect: (address: PostalAddress) => void;
  readonly maxLength: number;
}

export function AddressField({
  id,
  field,
  error,
  disabled,
  onSelect,
  maxLength,
}: AddressFieldProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const invalid = error !== undefined;

  const openSearch = () => {
    if (disabled) return;
    setSearchOpen(true);
  };

  /** 읽기 전용 입력에서도 키보드로 열린다 — Enter 가 폼을 제출해 버리지 않도록 막는다 */
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openSearch();
  };

  return (
    <>
      <FormField htmlFor={id} label="주소" required error={error} hint={HINT}>
        <div style={rowStyle}>
          <input
            id={id}
            type="text"
            readOnly
            className="tds-ui-input tds-ui-focusable"
            style={inputStyle(invalid)}
            maxLength={maxLength}
            placeholder="주소 검색으로 선택하세요"
            disabled={disabled}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorIdOf(id) : undefined}
            onClick={openSearch}
            onKeyDown={onKeyDown}
            name={field.name}
            ref={field.ref}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
          <Button variant="secondary" size="md" disabled={disabled} onClick={openSearch}>
            주소 검색
          </Button>
        </div>
      </FormField>

      {/* 폼 바깥이 아니라 여기에 둔다 — DS Modal 이 내용물을 포털로 옮기므로 <form> 안에 남지 않는다.
          (포털이 없었다면 모달 안의 Enter 가 폼 저장을 제출했을 것이다.) */}
      {searchOpen && (
        <AddressSearchModal
          onSelect={(address) => {
            setSearchOpen(false);
            onSelect(address);
          }}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}
