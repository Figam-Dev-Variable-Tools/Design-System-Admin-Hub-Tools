// 관리자 메모 카드
//
// 회원 본인에게는 보이지 않는 운영 메모. 회원 정보 중 유일하게 '쓰기'가 있는 곳처럼 보이지만,
// 이건 회원의 데이터가 아니라 **관리자가 붙이는 주석**이다 — 회원 정보 자체는 여전히 읽기 전용이다.
import { useId, useState } from 'react';
import type { CSSProperties } from 'react';

import {
  Button,
  Card,
  CardTitle,
  controlStyle,
  errorTextStyle,
  hintStyle,
  useToast,
} from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
import { useSaveMemo } from '../queries';
import { MEMO_MAX_LENGTH } from '../types';
import { cssVar } from '@tds/ui';

const textareaStyle: CSSProperties = {
  ...controlStyle(false),
  minHeight: `calc(${cssVar('space.6')} * 5)`,
  resize: 'vertical',
};

const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
};

const counterStyle: CSSProperties = {
  ...hintStyle,
  fontVariantNumeric: 'tabular-nums',
};

interface MemoCardProps {
  readonly memberId: string;
  readonly initialMemo: string;
  /** 메모 저장 권한 (EXC-03) — 없으면 읽기 전용이 된다(저장 버튼 없음 · 입력 잠금) */
  readonly canUpdate: boolean;
}

export function MemoCard({ memberId, initialMemo, canUpdate }: MemoCardProps) {
  // 저장 성공은 토스트로, 저장 실패는 **폼 안 인라인 에러**로 알린다 —
  // 실패하면 사용자가 이 카드에서 다시 저장해야 하므로 안내가 카드를 떠나면 안 된다.
  const toast = useToast();

  const [memo, setMemo] = useState(initialMemo);
  const [error, setError] = useState<string | null>(null);

  const save = useSaveMemo();
  const saving = save.isPending;

  const memoId = useId();
  const counterId = useId();
  const overflow = memo.length > MEMO_MAX_LENGTH;

  const submit = () => {
    if (overflow) {
      setError(`메모는 ${formatNumber(MEMO_MAX_LENGTH)}자를 넘을 수 없습니다.`);
      return;
    }

    setError(null);
    save.mutate(
      { memberId, memo },
      {
        onSuccess: () => {
          toast.success('관리자 메모를 저장했습니다.');
        },
        onError: () => {
          setError('저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  return (
    <Card aria-labelledby="member-memo-title">
      <CardTitle id="member-memo-title">관리자 메모</CardTitle>

      <textarea
        id={memoId}
        className="tds-ui-input tds-ui-focusable"
        style={{ ...textareaStyle, ...controlStyle(overflow) }}
        value={memo}
        // maxLength 로 잘라내면 붙여넣기가 조용히 잘린다 — 넘치면 알려주고 저장만 막는다
        aria-describedby={counterId}
        aria-invalid={overflow}
        aria-label="관리자 메모"
        // 저장 요청 중에 본문을 고치면 전송한 값과 화면 값이 어긋난다 — 응답까지 잠근다.
        // 저장 권한이 없으면 readOnly 다 — 고칠 수 있는 것처럼 보이면서 저장할 길이 없으면 거짓말이
        // 된다. disabled 가 아니라 readOnly 인 이유는 **읽는 것은 허용된 정보**이기 때문이다
        // (disabled 텍스트는 흐려지고 일부 브라우저에서 선택·복사도 막힌다).
        readOnly={!canUpdate}
        disabled={saving}
        onChange={(event) => setMemo(event.target.value)}
      />

      {error !== null && (
        <p role="alert" style={errorTextStyle}>
          {error}
        </p>
      )}

      <div style={footerStyle}>
        <span id={counterId} style={counterStyle}>
          {`${formatNumber(memo.length)}/${formatNumber(MEMO_MAX_LENGTH)}`}
        </span>
        {canUpdate && (
          <Button variant="primary" disabled={saving || overflow} onClick={submit}>
            {saving ? '저장 중…' : '저장'}
          </Button>
        )}
      </div>
    </Card>
  );
}
