// PG 타일 목록 (결제 설정 화면 전용 — apps/admin/src/pages/settings/payment/**)
//
// [무엇을 그리나] 연동할 수 있는 결제 서비스를 **상태별 두 묶음**(사용 중 / 연동 가능)으로 나눠
// **세로로 한 줄에 하나씩** 쌓아 보여준다. 타일을 누르면 그 PG 의 자격증명 화면으로 **주소가
// 바뀐다** — 소셜 로그인 목록(../../oauth)과 같은 관례다.
//
// [묶음은 파생이다 — 목록을 복제하지 않는다] 어느 묶음에 들어갈지는 `pgTileStatus` 하나가 정한다
// (../validation.ts). 그래서 '사용 중 목록' 과 '연동 가능 목록' 이 따로 저장되는 일이 없고,
// 마스터 스위치를 내리면 타일이 저절로 옮겨 간다.
//
// [a11y]
//   · 격자는 목록이다 — `<ul>/<li>`. 스크린리더가 항목 수를 먼저 알려 준다.
//   · 타일은 **링크다**(`<Link>` = `<a href>`) — 키보드·중간 클릭·새 탭·'링크 주소 복사' 가
//     앱의 다른 목록과 똑같이 동작하고, 미저장 이탈 가드도 앵커 클릭을 가로챈다.
//   · **알약이 상태의 유일한 신호가 아니다**: 접근 이름에 상태 문구가 들어가고
//     (`토스페이먼츠, 사용 중 · 자격증명 미완성`), 묶음 제목이 또 한 번 말하며, 테두리 톤이
//     시각적 보조로 붙는다. 색·알약만으로 상태를 전달하지 않는다.
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { cssVar } from '@tds/ui';

import { pgLabel, pgMeta } from '../../../../shared/commerce/pg-catalog';
import type { PgTargetId } from '../../../../shared/commerce/pg-catalog';
import { PgMark } from './PgMark';

/** 타일 하나가 알아야 할 사실 — 판정은 호출부(순수 함수)가 하고 여기서는 그리기만 한다 */
export interface PgTileItem {
  readonly target: PgTargetId;
  /** 마스터 스위치가 켜져 있고 이 대상이 지금 연결인가 */
  readonly inUse: boolean;
  /** 값은 저장돼 있지만 마스터 스위치가 꺼져 있는가 */
  readonly ready: boolean;
  /** 필수 자격증명이 다 찼는가 — 사용 중인데 false 면 결제가 열리지 않는다 */
  readonly complete: boolean;
}

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

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
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('typography.label.md.font-weight'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

/**
 * **세로 목록**이다 — PG 한 줄에 하나씩 아래로 쌓인다.
 * 가로 격자로 늘어놓으면 폭에 따라 열 수가 바뀌어 같은 화면이 사람마다 다르게 보인다
 * (../../oauth/components/ProviderTileList.tsx 가 같은 판단을 적어 두었다).
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

/**
 * 타일 테두리 톤 — 세 번째 신호다(접근 이름·묶음 제목이 앞의 둘).
 * 사용 중이면 성공 톤, 사용 중인데 값이 반쪽이면 경고 톤.
 */
function borderColorOf(item: PgTileItem): string {
  if (!item.inUse) return cssVar('color.border.default');
  return item.complete
    ? cssVar('color.feedback.success.border')
    : cssVar('color.feedback.warning.border');
}

const tileStyle = (item: PgTileItem): CSSProperties => ({
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
  borderColor: borderColorOf(item),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  boxShadow: cssVar('shadow.raised'),
  cursor: 'pointer',
  // 링크지만 생김새는 타일이다 — 밑줄이 붙으면 목록이 링크 더미처럼 보인다
  textDecoration: 'none',
});

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

/** 이름 묶음 — 이름과 한 줄 설명을 쌓는다. `keep-all` 이라야 한국어가 어절 단위로 끊긴다 */
const nameGroupStyle: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
  wordBreak: 'keep-all',
};

const nameStyle: CSSProperties = {
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('typography.label.md.font-weight'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const subStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

/** 알약 — 시각 보조다. 상태의 유일한 신호가 아니다(파일 머리말) */
const pillStyle = (tone: 'success' | 'warning' | 'neutral'): CSSProperties => ({
  flexShrink: 0,
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor:
    tone === 'success'
      ? cssVar('color.feedback.success.border')
      : tone === 'warning'
        ? cssVar('color.feedback.warning.border')
        : cssVar('color.border.default'),
  borderRadius: cssVar('radius.full'),
  background:
    tone === 'success'
      ? cssVar('color.feedback.success.surface')
      : tone === 'warning'
        ? cssVar('color.feedback.warning.surface')
        : cssVar('color.surface.raised'),
  color:
    tone === 'success'
      ? cssVar('color.feedback.success.text')
      : tone === 'warning'
        ? cssVar('color.feedback.warning.text')
        : cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
  whiteSpace: 'nowrap',
});

const emptyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
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
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

/** 타일이 말하는 상태 — 접근 이름과 알약이 **같은 문장**을 쓴다(둘이 갈라지면 신호가 셋이 아니다) */
function statusTextOf(item: PgTileItem): string {
  if (item.inUse) return item.complete ? '사용 중' : '사용 중 · 자격증명 미완성';
  return item.ready ? '값 저장됨 · 사용 안 함' : '연동 안 함';
}

interface PgTileListProps {
  /** 이 묶음의 안정적인 id — 제목이 한국어라 제목에서 id 를 만들지 않는다 */
  readonly groupId: string;
  readonly heading: string;
  readonly items: readonly PgTileItem[];
  readonly hrefOf: (target: PgTargetId) => string;
  /** 비었을 때 보여줄 내용 — 이 화면에서는 '결제 없이 운영한다' 는 사실과 그 결과를 말한다 */
  readonly emptyNote: ReactNode;
}

export function PgTileList({ groupId, heading, items, hrefOf, emptyNote }: PgTileListProps) {
  const headingId = `payment-group-${groupId}`;

  return (
    <section style={sectionStyle} aria-labelledby={headingId}>
      <div style={headerStyle}>
        <h3 id={headingId} style={headingStyle}>
          {heading}
        </h3>
      </div>

      {items.length === 0 ? (
        <div style={emptyStyle}>{emptyNote}</div>
      ) : (
        <ul style={listStyle}>
          {items.map((item) => {
            const label = pgLabel(item.target);
            const meta = pgMeta(item.target);
            const status = statusTextOf(item);

            return (
              <li key={item.target} style={itemStyle}>
                <Link
                  to={hrefOf(item.target)}
                  className="tds-ui-focusable"
                  style={tileStyle(item)}
                  // 상태를 이름에 싣는다 — 알약이 보이지 않는 경로에서도 상태가 전달된다
                  aria-label={`${label}, ${status}. 자격증명 화면으로 이동`}
                >
                  <PgMark target={item.target} />

                  <span style={nameGroupStyle}>
                    <span style={nameStyle}>{label}</span>
                    <span style={subStyle}>
                      {meta.integrationMode === 'gateway'
                        ? '통합 게이트웨이 — 개별 PG 자격증명은 이 회사 콘솔의 채널에 넣어요.'
                        : `${meta.credentials.filter((field) => field.required).length}개 필수 값 · ${meta.supportedMethods.length}개 결제수단`}
                    </span>
                  </span>

                  {item.inUse && (
                    <span
                      style={pillStyle(item.complete ? 'success' : 'warning')}
                      aria-hidden="true"
                    >
                      {item.complete ? '사용중' : '미완성'}
                    </span>
                  )}
                  {!item.inUse && item.ready && (
                    <span style={pillStyle('neutral')} aria-hidden="true">
                      값 저장됨
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
