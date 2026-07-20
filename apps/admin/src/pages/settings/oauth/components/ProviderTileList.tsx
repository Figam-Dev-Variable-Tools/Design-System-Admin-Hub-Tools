// 제공자 타일 목록 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/oauth/**)
//
// [무엇을 그리나] 소셜 로그인 제공자를 **상태별 두 묶음**(사용 중 / 이용 가능)으로 나눠
// **세로로 한 줄에 하나씩** 쌓아 보여준다. 타일을 누르면 그 제공자의 자격증명 폼이 아래에서 열린다.
// (가로 격자가 아닌 이유는 listStyle 주석에 적었다.)
//
// [묶음은 파생이다 — 목록을 복제하지 않는다] 어느 묶음에 들어갈지는 오직 `enabled` 가 정한다.
// 그래서 '사용 중 목록' 과 '이용 가능 목록' 이 따로 저장되는 일이 없고, 켜고 끄면 타일이
// 저절로 옮겨 간다. 두 벌로 관리하면 언젠가 두 목록이 어긋나서 같은 제공자가 양쪽에 뜬다.
//
// [a11y]
//   · 격자는 목록이다 — `<ul>/<li>`. 스크린리더가 '3개 항목' 을 먼저 알려 준다.
//   · 타일은 **링크다**(`<Link>` = `<a href>`) — 누르면 그 제공자의 상세 라우트로 간다.
//     예전에는 `aria-expanded`/`aria-controls` 를 단 disclosure 버튼이었다. 지금은 주소가 바뀌므로
//     그 속성을 달면 **거짓말**이 된다: 여는 영역이 이 문서에 없는데 가리키는 셈이다.
//     링크라서 키보드·중간 클릭·새 탭·'링크 주소 복사' 가 앱의 다른 목록과 똑같이 동작하고,
//     미저장 이탈 가드(useUnsavedChangesDialog)도 앵커 클릭을 가로채므로 그대로 성립한다.
//   · **'사용중' 알약이 상태의 유일한 신호가 아니다**: 접근 이름에 상태 문구가 들어가고
//     (`카카오 로그인 · 싱크, 사용 중`), 묶음 제목(사용하고 있는 서비스)이 또 한 번 말하며,
//     테두리 색이 시각적 보조로 붙는다. 색·알약만으로 상태를 전달하지 않는다.
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ReorderMoveButtons } from '../../../../shared/ui';
import { providerTitle } from '../validation';
import type { OAuthProviderId, OAuthProviderValues } from '../validation';
import { ProviderMark } from './provider-marks';
import { cssVar } from '@tds/ui';

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/** 묶음 제목 줄 — 오른쪽에 액션(순서 변경) 슬롯을 둔다 */
const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const headingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

/**
 * **세로 목록**이다 — 제공자 한 줄에 하나씩 아래로 쌓인다.
 *
 * [가로 격자가 아닌 이유] 여러 칸을 가로로 늘어놓으면 ① 읽는 순서가 좌→우·위→아래로 꺾여
 * '로그인 버튼 순서' 와 눈으로 대조하기 어렵고(이 목록의 순서가 곧 버튼 순서다 · OAuthPage 머리말),
 * ② 순서 변경의 위/아래 버튼이 가로 배치와 어긋나며, ③ 폭에 따라 열 수가 바뀌어 같은 화면이
 * 사람마다 다르게 보인다. 세로 한 줄씩이면 셋 다 사라진다.
 */
const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  listStyle: 'none',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

/**
 * 타일. 켜져 있으면 테두리가 성공 톤이 된다 — 알약 하나에 상태를 몰아 두지 않기 위한 이중 신호다.
 * ('열림' 톤은 없앴다: 이제 열리는 것이 아니라 **다른 화면으로 간다**.)
 */
const tileStyle = (enabled: boolean): CSSProperties => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  minWidth: 0,
  textAlign: 'left',
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: enabled ? cssVar('color.feedback.success.border') : cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  boxShadow: cssVar('shadow.raised'),
  cursor: 'pointer',
  // 링크지만 생김새는 타일이다 — 밑줄이 붙으면 목록이 링크 더미처럼 보인다
  textDecoration: 'none',
});

/**
 * 이름 — 굵게. 길면 잘라내지 않고 감싼다(제공자 이름이 잘리면 무엇인지 알 수 없다).
 * `keep-all` 이라야 한국어가 어절 단위로 끊긴다 — 없으면 '카카오 로 / 그인 · 싱크' 처럼
 * 낱말 한가운데가 갈라진다.
 */
const nameStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  wordBreak: 'keep-all',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

/** '사용중' 알약 — 시각 보조다. 상태의 유일한 신호가 아니다(파일 머리말) */
const pillStyle: CSSProperties = {
  flexShrink: 0,
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.feedback.success.border'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.feedback.success.surface'),
  color: cssVar('color.feedback.success.text'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  whiteSpace: 'nowrap',
};

const emptyStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.subtle'),
  borderRadius: cssVar('radius.lg'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

interface ProviderTileListProps {
  /** 이 묶음의 안정적인 id — 제목이 한국어라 제목에서 id 를 만들지 않는다 */
  readonly groupId: string;
  readonly heading: string;
  /** 이 묶음에 들어갈 제공자들 — 호출부가 `enabled` 로 갈라서 넘긴다 */
  readonly items: readonly OAuthProviderValues[];
  /** 이 제공자의 상세 라우트 — 타일이 곧 이 주소로 가는 링크다 */
  readonly hrefOf: (provider: OAuthProviderId) => string;
  /** 비었을 때 보여줄 한 줄 */
  readonly emptyNote: string;
  /** 제목 오른쪽 액션 슬롯 (순서 변경 버튼). 없으면 넘기지 않는다 */
  readonly action?: ReactNode;
  /**
   * 순서 변경 모드 — 타일 옆에 위/아래 버튼이 붙는다.
   * 넘기지 않으면 순서를 바꿀 수 없는 묶음이다(이용 가능한 서비스에는 순서가 없다).
   */
  readonly onMove?: (position: number, delta: number) => void;
  readonly moveLocked?: boolean;
}

export function ProviderTileList({
  groupId,
  heading,
  items,
  hrefOf,
  emptyNote,
  action,
  onMove,
  moveLocked = false,
}: ProviderTileListProps) {
  const headingId = `oauth-group-${groupId}`;

  return (
    <section style={sectionStyle} aria-labelledby={headingId}>
      <div style={headerStyle}>
        <h3 id={headingId} style={headingStyle}>
          {heading}
        </h3>
        {action}
      </div>

      {items.length === 0 ? (
        <p style={emptyStyle}>{emptyNote}</p>
      ) : (
        <ul style={listStyle}>
          {items.map((item, position) => {
            const title = providerTitle(item.provider);

            return (
              <li key={item.provider} style={itemStyle}>
                <Link
                  to={hrefOf(item.provider)}
                  className="tds-ui-focusable"
                  style={tileStyle(item.enabled)}
                  // 상태를 이름에 싣는다 — 알약이 보이지 않는 경로에서도 '사용 중' 이 전달된다.
                  // '설정 열기' 가 아니라 '설정 화면으로 이동' 이다: 실제로 주소가 바뀐다.
                  aria-label={`${title}, ${item.enabled ? '사용 중' : '사용 안 함'}. 설정 화면으로 이동`}
                >
                  <ProviderMark provider={item.provider} />
                  <span style={nameStyle}>{title}</span>
                  {item.enabled && (
                    <span style={pillStyle} aria-hidden="true">
                      사용중
                    </span>
                  )}
                </Link>

                {onMove !== undefined && (
                  <ReorderMoveButtons
                    label={title}
                    index={position}
                    count={items.length}
                    locked={moveLocked}
                    onMove={onMove}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
