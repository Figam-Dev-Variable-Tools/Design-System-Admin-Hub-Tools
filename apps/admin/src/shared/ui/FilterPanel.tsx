// 좌측 분류 필터 패널
//
// [왜 이 파일이 있나 — 같은 것이 아홉 벌이었다]
// ESG 분류·알림 이벤트 분류로 시작했지만, 조사해 보니 같은 골격이 화면마다 따로 자라 있었다:
// 회원(등급·그룹)·상품·상품 카테고리·권한·관리자 그룹·로그인 이력·로그·공지·FAQ·약관.
// 골격은 글자까지 같다 — `div > nav > h2 > ul > li > button[aria-pressed] + 배지`.
// 다른 것은 nav 의 aria-label, 제목, 항목 목록뿐이고 그건 **데이터이지 구조가 아니다**.
//
// 아홉 벌이면 규칙이 아홉 갈래로 갈라진다. 실제로 갈라져 있었다: 한쪽은 aria-current 를, 다른 쪽은
// aria-pressed 를 썼다(A11Y-12 위반 + 공유 hover 규칙이 비껴가던 시각 버그). 한 벌이면 답이 하나다.
//
// [무엇까지 이 한 벌이 떠안는가] 화면들이 따로 구현한 이유는 대개 '골격이 달라서'가 아니라 곁가지
// 하나가 없어서였다 — 건수를 아직 못 셌거나(—), 항목이 많아 스크롤이 필요하거나, 조회가 실패해
// 재시도 줄이 필요하거나, 목록 아래 '+ 새로 만들기' 가 붙거나. 그 넷을 여기서 받는다. 그보다 큰
// 차이(예: 항목마다 다른 아이콘)가 생기면 그때 다시 이야기한다 — 지금 없는 축을 미리 열지 않는다.
//
// [A11Y-12] 선택 상태는 **aria-pressed** 하나로 말한다. 이 버튼은 '토글 필터'이지 '현재 위치'가
// 아니다 — aria-current 는 내비게이션의 것이다. 공유 hover 규칙
// `.tds-ui-listitem[aria-pressed='false']` 도 이 표기에 맞춰져 있다.
import type { CSSProperties, ReactNode } from 'react';
import { cssVar, Panel } from '@tds/ui';

import { formatNumber } from '../format';
import {
  countBadgeStyle,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  filterNavStyle,
} from './styles';

/** 건수를 아직 모를 때 배지에 띄우는 글자 — '0 건' 과 '못 셌음' 은 다른 사실이다 */
const UNKNOWN_COUNT = '—';

/**
 * 항목이 많은 축의 목록 최대 높이 — 10줄 남짓(space.6 × 10).
 * 그룹처럼 수십 개가 붙는 축이 사이드바 전체를 밀어내지 않게 한다.
 */
const SCROLL_MAX_HEIGHT = `calc(${cssVar('space.6')} * 10)`;

const scrollListStyle: CSSProperties = {
  ...filterListStyle,
  maxHeight: SCROLL_MAX_HEIGHT,
  overflowY: 'auto',
};

const footerStyle: CSSProperties = {
  display: 'flex',
  marginTop: cssVar('space.1'),
};

const retryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const retryButtonStyle: CSSProperties = {
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.action.primary.default'),
  fontSize: cssVar('typography.caption.md.font-size'),
  cursor: 'pointer',
  textDecoration: 'underline',
};

/** 필터 항목 — id 는 화면이 정한 유니온이라 제네릭으로 열어 둔다('as' 없이 좁혀 돌려준다) */
export interface FilterOption<T extends string> {
  readonly id: T;
  readonly label: string;
  /**
   * 건수 배지를 숨긴다. '전체 그룹' 처럼 **셀 대상이 없는** 항목용 —
   * 0 을 띄우면 '해당 없음' 으로 읽혀 거짓말이 된다.
   */
  readonly hideCount?: boolean;
}

interface FilterPanelProps<T extends string> {
  /** nav 의 접근성 이름 — 한 화면에 패널이 둘 이상일 수 있어 각자 이름을 갖는다 */
  readonly navLabel: string;
  readonly heading: string;
  readonly options: readonly FilterOption<T>[];
  readonly value: T;
  /**
   * 항목 id → 건수. 없는 항목은 0 으로 본다.
   * **null 은 '아직 못 셌다'** — 0 이 아니라 '—' 를 띄운다(로딩·실패를 0 으로 위장하지 않는다).
   */
  readonly counts: Readonly<Record<string, number>> | null;
  readonly onChange: (next: T) => void;
  /** 항목이 많은 축 — 목록에 최대 높이를 주고 스크롤시킨다 */
  readonly scroll?: boolean;
  /** 건수 조회 실패 — 재시도 줄을 띄운다 (role="alert") */
  readonly failed?: boolean;
  readonly onRetry?: () => void;
  /** 목록 아래 액션 — 예: '+ 새 그룹 만들기' 버튼 */
  readonly footer?: ReactNode;
}

export function FilterPanel<T extends string>({
  navLabel,
  heading,
  options,
  value,
  counts,
  onChange,
  scroll = false,
  failed = false,
  onRetry,
  footer,
}: FilterPanelProps<T>) {
  return (
    <nav style={filterNavStyle} aria-label={navLabel}>
      <h2 style={filterHeadingStyle}>{heading}</h2>

      {failed && (
        // role="alert" — 목록이 조용히 비는 대신 실패를 말한다 (EXC: 조회 실패)
        <div style={retryRowStyle} role="alert">
          <span>건수를 불러오지 못했어요.</span>
          {onRetry !== undefined && (
            <button type="button" style={retryButtonStyle} onClick={onRetry}>
              다시 시도
            </button>
          )}
        </div>
      )}

      <ul style={scroll ? scrollListStyle : filterListStyle}>
        {options.map((option) => {
          const active = value === option.id;
          return (
            <li key={option.id}>
              <button
                type="button"
                className="tds-ui-listitem tds-ui-focusable"
                style={filterItemStyle(active)}
                aria-pressed={active}
                onClick={() => {
                  onChange(option.id);
                }}
              >
                <span>{option.label}</span>
                {option.hideCount !== true && (
                  <span style={countBadgeStyle}>
                    {counts === null ? UNKNOWN_COUNT : formatNumber(counts[option.id] ?? 0)}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {footer !== undefined && <div style={footerStyle}>{footer}</div>}
    </nav>
  );
}

interface FilterRailProps {
  /** 필터 축들 — FilterPanel 하나 이상 */
  readonly children: ReactNode;
  /**
   * 목록 아래 안내문 — 위쪽 구분선으로 갈라 놓는다. 문단(`<p style={hintStyle}>`)을 넘긴다.
   *
   * 여러 문단을 받는다 — 운영진 그룹·역할·로그는 안내가 세 문단이다. 그래서 껍데기는 `<div>` 다:
   * `<p>` 로 감싸면 문단 안에 문단이 들어가 브라우저가 태그를 강제로 닫아 버린다.
   */
  readonly notice?: ReactNode;
}

/**
 * 필터 레일 — 목록 화면 좌측의 `<aside>` 껍데기.
 *
 * 축이 둘 이상인 화면(회원: 등급 + 그룹)이 여럿이라 축을 담는 그릇이 따로 필요하다. 그릇을 화면마다
 * 만들면 축 사이 간격과 안내문 구분선이 화면마다 어긋난다 — 실제로 어긋나 있었다.
 *
 * [지금은 @tds/ui 의 Panel 이 실체다] 껍데기가 아는 것은 '곁에 서는 세로 스택 + 아래 안내문' 뿐이고
 * '필터' 는 가장 흔한 내용물의 이름이었다 — 소비처 12곳 중 둘(권한 화면의 역할 목록 · 상품 폼의
 * 섹션 내비게이션)은 필터를 담지 않는다. 그래서 DS 로는 배치에서 온 이름(Panel)으로 올라갔다.
 * 이 이름은 기존 호출부 12곳의 API 를 보존하는 얇은 껍질로 남는다 (Sidebar 승격과 같은 형태).
 */
export function FilterRail({ children, notice }: FilterRailProps) {
  // exactOptionalPropertyTypes — notice 가 undefined 면 키 자체를 넘기지 않는다
  return <Panel {...(notice !== undefined && { notice })}>{children}</Panel>;
}
