// Empty — 빈 결과 상태 (molecule · contracts/Empty.contract.json@1.1.0)
//
// Props 타입은 계약에서 생성된 generated/types/Empty.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// data view 가 0행일 때 '왜 비었는지'를 3가지로 구분한다 (STATE-05): 진짜 비어있음 / 검색 결과 없음 / 필터 결과 없음.
// 각 상태는 서로 다른 copy 와 복구 수단을 준다. 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
//
// [조사(助詞) — ERP-13] label 의 마지막 한글 음절 받침 유무로 '이/가' 를 고른다. @tds/ui 는 앱 shared/format 을
//   import 할 수 없으므로(레이어 경계) 자족 헬퍼로 구현한다. 리터럴 '이(가)' 를 절대 출하하지 않는다.
//
// [a11y] role="status"(=aria-live polite) — 빈 상태가 렌더되면 스크린리더가 사유를 읽는다. 삽화는 aria-hidden.
//   복구 버튼은 DS Button 이라 focus-visible 링·키보드 활성화를 상속한다 (계약 dependencies: Button).
import { Button } from '../../atoms/Button';
import type { EmptyProps } from '../../../generated/types/Empty.types';
import './Empty.css';

/** 마지막 문자가 받침 있는 한글 음절인지 — 한글 음절 U+AC00–U+D7A3, (코드-0xAC00)%28 !== 0 이면 종성 있음 */
function hasBatchim(word: string): boolean {
  if (word.length === 0) return false;
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

/** 주격 조사 '이/가' — 받침 있으면 '이', 없으면 '가' (한글 아님/빈 문자열은 받침 없음으로 간주) */
function subjectParticle(word: string): string {
  return hasBatchim(word) ? '이' : '가';
}

/** 빈 상자 삽화 — 자산 패키지에 의존하지 않는 인라인 SVG (px 리터럴 0건, 장식) */
function EmptyGlyph() {
  return (
    <svg
      className="tds-empty__glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5Z" />
      <path d="M3 8.5 12 13l9-4.5" />
      <path d="M12 13v7" />
    </svg>
  );
}

type EmptyMode = 'search' | 'filter' | 'empty';

/** context(hasQuery/hasActiveFilters) → 상태. 우선순위: 검색 > 필터 > 진짜 비어있음 */
function resolveMode(hasQuery: boolean, hasActiveFilters: boolean): EmptyMode {
  if (hasQuery) return 'search';
  if (hasActiveFilters) return 'filter';
  return 'empty';
}

export function Empty({
  label,
  createVerb = '등록',
  hasQuery = false,
  hasActiveFilters = false,
  action = null,
  onClearSearch,
  onResetFilters,
}: EmptyProps) {
  const particle = subjectParticle(label);
  const mode = resolveMode(hasQuery, hasActiveFilters);

  const title =
    mode === 'search'
      ? `조건에 맞는 ${label}${particle} 없습니다`
      : mode === 'filter'
        ? `필터에 맞는 ${label}${particle} 없습니다`
        : `${createVerb}된 ${label}${particle} 없습니다`;

  const description =
    mode === 'search'
      ? '검색어를 바꾸거나 지워 보세요.'
      : mode === 'filter'
        ? '필터를 바꾸거나 초기화해 보세요.'
        : '새로 추가하면 여기에 표시됩니다.';

  // 복구 수단 — 검색: '검색 지우기', 필터: '필터 초기화'(콜백이 있을 때만), 진짜 비어있음: 생성 CTA 슬롯
  const recovery =
    mode === 'search'
      ? onClearSearch !== undefined && (
          <Button variant="secondary" onClick={() => onClearSearch()}>
            검색 지우기
          </Button>
        )
      : mode === 'filter'
        ? onResetFilters !== undefined && (
            <Button variant="secondary" onClick={() => onResetFilters()}>
              필터 초기화
            </Button>
          )
        : action;

  const hasRecovery = recovery !== null && recovery !== undefined && recovery !== false;

  return (
    <div className="tds-empty" role="status">
      <span className="tds-empty__icon" aria-hidden="true">
        <EmptyGlyph />
      </span>
      <p className="tds-empty__title">{title}</p>
      <p className="tds-empty__description">{description}</p>
      {hasRecovery ? <div className="tds-empty__action">{recovery}</div> : null}
    </div>
  );
}
