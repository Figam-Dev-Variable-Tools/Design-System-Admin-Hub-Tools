// ProgramDetailPage — 펀딩 진행 현황 상세 (라우트: /programs/:id)
//
// [읽는 화면이다] 목록에서 한 건을 열어 '지금 얼마나 모였고 언제 끝나는가' 를 확인한다. 값을 고치는
// 것은 등록/수정 폼(/programs/:id/edit)의 일이라 여기에는 입력 필드가 없다 — 회원 상세와 같은 원칙이다.
//
// [파생값은 계산해서 보여 준다] 달성률·남은 일수는 저장된 값이 아니라 목표·모금액·종료일에서
// 계산되는 값이다(store.ts 머리말). 화면이 자기 식으로 다시 세지 않고 store 의 순수 함수를 그대로 쓴다 —
// 목록의 배지와 상세의 진행바가 서로 다른 숫자를 말할 수 없게 하는 유일한 방법이다.
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Card as TdsCard, cssVar, Skeleton } from '@tds/ui';

import { formatNumber } from '../../shared/format';
import { isNotFound } from '../../shared/errors/http-error';
import { useRouteWritePermissions } from '../../shared/permissions/RequirePermission';
// 후원 CTA 는 이 화면이 정하지 않는다 — 결제(PG) 설정에서 파생되는 값이라 규칙 함수를 그대로 부른다
// (상품 폼의 미리보기도 같은 함수를 쓴다 — 두 화면이 다른 버튼을 말할 수 없게 하는 유일한 방법이다)
import {
  checkoutCta,
  PAYMENT_SETTINGS_PATH,
  readPaymentSettings,
} from '../../shared/commerce/payment-settings';
import {
  Alert,
  alertActionRowStyle,
  Button,
  buttonStyle,
  Card,
  CardTitle,
  ddStyle,
  dlStyle,
  dtStyle,
  hintStyle,
  Icon,
  pageTitleStyle,
  StatusBadge,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../shared/ui';
import { PROGRAM_RESOURCE, programAdapter } from './data-source';
import { daysLeft, fundingRate, isGoalReached } from './_shared/store';
import type { Program } from './_shared/store';
import { fundingTone, programStatusLabel, programStatusTone } from './types';

const LIST_PATH = '/programs';

/**
 * 남은 일수의 기준일 — 목록(ProgramListPage)과 **같은 값**이어야 한다.
 *
 * daysLeft 는 `today` 를 인자로 받는다(store.ts): 시계를 밖에서 주입해야 스토리·테스트가 고정된다.
 * 화면이 `new Date()` 를 읽으면 같은 프로그램의 '남은 일수' 가 목록과 상세에서 날짜 경계를 사이에
 * 두고 갈라질 수 있고, 스토리북 회귀 비교도 매일 깨진다. 백엔드가 붙으면 서버 기준 시각으로 바뀐다.
 */
const TODAY = '2026-07-21';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  textDecoration: 'none',
};

const titleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** 제목 옆 '수정' — 목록의 연필과 같은 곳으로 간다(경로가 갈라지지 않게 같은 상수를 쓴다) */
const editLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  marginLeft: 'auto',
  padding: `${cssVar('space.2')} ${cssVar('space.3')}`,
  border: `${cssVar('border-width.thin')} solid ${cssVar('color.border.default')}`,
  borderRadius: cssVar('radius.md'),
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  textDecoration: 'none',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  // 2단 — 좁은 화면에서는 auto-fit 이 한 단으로 접는다 (회원 상세와 같은 규칙)
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 16), 1fr))`,
  gap: cssVar('space.4'),
  alignItems: 'start',
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/* ── 진행바 (토큰만) ──────────────────────────────────────────────────────
   DS 에는 아직 진행바 컴포넌트가 없다. 프로젝트 목록(ProjectListPage)이 쓰는 것과 **같은 조합**을
   쓴다 — 트랙은 raised 표면, 채움은 액션 색, 폭은 백분율이다(고정 치수를 쓰지 않으므로 어떤 폭에도
   맞는다). 달성률은 100% 를 넘을 수 있으므로(초과 달성) 채움 폭만 100 에서 자른다 — 숫자는 자르지 않는다. */

const progressWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const progressTrackStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: cssVar('space.3'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.raised'),
  overflow: 'hidden',
};

function progressFillStyle(rate: number, reached: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: `${String(Math.max(0, Math.min(100, rate)))}%`,
    // 색은 보조 신호다 — 같은 사실을 바로 옆 문구가 글자로도 말한다
    background: reached
      ? cssVar('color.feedback.success.text')
      : cssVar('color.action.primary.default'),
  };
}

const progressLabelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const rateTextStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontVariantNumeric: 'tabular-nums',
  fontSize: cssVar('typography.title.md.font-size'),
  lineHeight: cssVar('typography.title.md.line-height'),
};

const numericCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/* ── 후원 CTA (고객 화면에서 보이는 버튼) ─────────────────────────────────────
   여기 있는 것은 **버튼처럼 보이는 표시**다 — 이 화면은 읽는 화면이고 관리자가 대신 후원하지
   않는다. 그래서 DS 버튼의 시각 토큰만 빌려 <span> 으로 그린다(누를 것이 없는 자리에 진짜
   버튼을 두면 눌러 보고 아무 일도 없는 것을 확인하게 된다). */

const ctaRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** 스토리는 줄바꿈이 의미다 — 한 문단으로 뭉개지 않는다 */
const storyStyle: CSSProperties = {
  ...ddStyle,
  whiteSpace: 'pre-wrap',
};

/** 리워드 표 (이 화면 전용) — 한정 수량 0 은 '무제한' 이지 '0개' 가 아니다 */
function RewardTable({ program }: { readonly program: Program }) {
  if (program.rewards.length === 0) {
    return (
      <p style={hintStyle}>등록된 리워드가 없습니다. 리워드는 등록/수정 화면에서 추가합니다.</p>
    );
  }

  return (
    <table style={tableStyle}>
      <caption style={visuallyHiddenStyle}>
        {`'${program.title}' 의 리워드 목록 — 후원 금액과 그 대가, 한정 수량과 신청 수입니다.`}
      </caption>
      <thead>
        <tr>
          <th scope="col" style={thStyle}>
            리워드
          </th>
          <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>
            금액
          </th>
          <th scope="col" style={thStyle}>
            설명
          </th>
          <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>
            한정 수량
          </th>
          <th scope="col" style={{ ...thStyle, textAlign: 'right' }}>
            신청 수
          </th>
        </tr>
      </thead>
      <tbody>
        {program.rewards.map((reward) => {
          const soldOut = reward.limitCount > 0 && reward.claimedCount >= reward.limitCount;
          return (
            <tr key={reward.id}>
              <td style={tdStyle}>
                {reward.title}
                {soldOut && <StatusBadge tone="warning" label="마감" />}
              </td>
              <td style={numericCellStyle}>{`${formatNumber(reward.amount)}원`}</td>
              <td style={tdStyle}>{reward.description}</td>
              <td style={numericCellStyle}>
                {reward.limitCount === 0 ? '무제한' : `${formatNumber(reward.limitCount)}개`}
              </td>
              <td style={numericCellStyle}>{`${formatNumber(reward.claimedCount)}건`}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** 최초 로드 자리표시 — 카드 표면은 @tds/ui Card 가 그린다(사본을 쓰지 않는다) */
function LoadingSkeleton() {
  return (
    <div style={gridStyle} aria-busy="true">
      {[0, 1].map((column) => (
        <TdsCard key={`col-${String(column)}`}>
          <div style={skeletonBodyStyle}>
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={`row-${String(row)}`} />
            ))}
          </div>
        </TdsCard>
      ))}
    </div>
  );
}

export default function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { canUpdate } = useRouteWritePermissions();

  const detailQuery = useQuery({
    queryKey: [PROGRAM_RESOURCE, 'detail', id ?? ''],
    queryFn: ({ signal }) => programAdapter.fetchOne(id ?? '', signal),
    enabled: id !== undefined,
  });
  const program = detailQuery.data;

  const backLink = (
    <Link to={LIST_PATH} className="tds-ui-focusable" style={backLinkStyle}>
      <Icon name="chevron-left" />
      현황 목록으로
    </Link>
  );

  /* [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 프로그램에 '다시 시도' 는
     영원히 실패한다. 그래서 없는 건에는 재시도를 권하지 않고 목록으로만 돌려보낸다. */
  if (detailQuery.error !== null) {
    const notFound = isNotFound(detailQuery.error);
    return (
      <div style={pageStyle}>
        {backLink}
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {notFound
                ? '프로그램을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : '프로그램을 불러오지 못했습니다.'}
            </span>
            {!notFound && (
              <Button variant="secondary" onClick={() => void detailQuery.refetch()}>
                다시 시도
              </Button>
            )}
          </div>
        </Alert>
      </div>
    );
  }

  // [STATE-01] 스켈레톤의 유일한 조건은 '아직 데이터가 없다' 이다 — 재조회(isFetching)로는 덮지 않는다.
  if (program === undefined) {
    return (
      <div style={pageStyle}>
        {backLink}
        <LoadingSkeleton />
      </div>
    );
  }

  const rate = fundingRate(program.goalAmount, program.pledgedAmount);
  const reached = isGoalReached(program.goalAmount, program.pledgedAmount);
  const ended = program.status === 'succeeded' || program.status === 'failed';
  const left = daysLeft(program.endDate, TODAY);
  // 끝난 펀딩에 '0일 남음' 은 거짓이다 — 결론이 난 건은 숫자 대신 그 사실을 적는다
  const leftText = ended ? '종료됨' : left === 0 ? '오늘 마감' : `${formatNumber(left)}일 남음`;

  /**
   * 고객이 보게 될 후원 버튼 — PG 를 쓰지 않도록 설정돼 있으면 '후원하기' 가 아니라 '문의하기' 이고,
   * 그 문의는 프로그램 문의로 들어온다. 판정은 shared/commerce 의 규칙 하나가 한다.
   */
  const checkout = checkoutCta(readPaymentSettings(), 'program');

  return (
    <div style={pageStyle}>
      {backLink}

      <div style={titleRowStyle}>
        <h1 style={pageTitleStyle}>{program.title}</h1>
        <StatusBadge
          tone={programStatusTone(program.status)}
          label={programStatusLabel(program.status)}
        />
        {/* 목록에서 행을 눌러 여기로 온다 — 그런데 여기서 고칠 길이 없으면 운영자는 목록으로
            되돌아가 연필을 다시 찾아야 한다. 공지·운영자 상세가 이미 상세에 수정을 두고 있어
            프로그램만 예외였다. 권한이 없으면 버튼 자체를 그리지 않는다 (EXC-03). */}
        {canUpdate && (
          <Link
            to={`${LIST_PATH}/${program.id}/edit`}
            className="tds-ui-focusable"
            style={editLinkStyle}
          >
            <Icon name="pencil" />
            수정
          </Link>
        )}
      </div>

      <Card>
        <CardTitle
          action={
            <StatusBadge tone={fundingTone(program)} label={reached ? '목표 달성' : '모금 중'} />
          }
        >
          펀딩 현황
        </CardTitle>

        <div style={progressWrapStyle}>
          <div style={progressLabelRowStyle}>
            <span style={rateTextStyle}>{`${formatNumber(rate)}%`}</span>
            <span style={hintStyle}>
              {`목표 ${formatNumber(program.goalAmount)}원 중 ${formatNumber(program.pledgedAmount)}원`}
            </span>
          </div>
          {/* 진행바는 값을 **그림으로** 되풀이할 뿐이다 — 같은 사실이 바로 위에 글자로도 있다.
              그래도 progressbar 역할과 valuetext 를 주는 이유: 이 그림만 훑는 사용자에게도
              숫자가 읽혀야 하기 때문이다. 채움 폭만 100 에서 자른다(초과 달성은 숫자가 말한다). */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.max(0, Math.min(100, rate))}
            aria-valuetext={`목표 대비 ${formatNumber(rate)}% 달성`}
            style={progressTrackStyle}
          >
            <span style={progressFillStyle(rate, reached)} />
          </div>
        </div>

        <dl style={dlStyle}>
          <dt style={dtStyle}>목표 금액</dt>
          <dd style={ddStyle}>{`${formatNumber(program.goalAmount)}원`}</dd>
          <dt style={dtStyle}>모금액</dt>
          <dd style={ddStyle}>{`${formatNumber(program.pledgedAmount)}원`}</dd>
          <dt style={dtStyle}>달성률</dt>
          <dd style={ddStyle}>{`${formatNumber(rate)}%`}</dd>
          <dt style={dtStyle}>후원자 수</dt>
          <dd style={ddStyle}>{`${formatNumber(program.backerCount)}명`}</dd>
          <dt style={dtStyle}>남은 일수</dt>
          <dd style={ddStyle}>{leftText}</dd>
          <dt style={dtStyle}>기간</dt>
          <dd style={ddStyle}>{`${program.startDate} ~ ${program.endDate}`}</dd>
        </dl>

        {/* 결론이 난 펀딩에는 후원 버튼이 없다 — 종료된 건에 '후원하기' 를 그리면 거짓이다.
            진행 중인 건에서만, 결제 설정이 정한 그대로 보여 준다. */}
        {!ended && (
          <div style={ctaRowStyle}>
            <span style={buttonStyle(checkout.kind === 'purchase' ? 'primary' : 'secondary')}>
              {checkout.label}
            </span>
            <span style={hintStyle}>
              {checkout.reason}{' '}
              <Link to={PAYMENT_SETTINGS_PATH} className="tds-ui-link tds-ui-focusable">
                결제 설정에서 바꾸기
              </Link>
            </span>
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>프로그램 정보</CardTitle>
        <dl style={dlStyle}>
          <dt style={dtStyle}>창작자</dt>
          <dd style={ddStyle}>{program.creator}</dd>
          <dt style={dtStyle}>카테고리</dt>
          <dd style={ddStyle}>{program.categoryLabel}</dd>
          <dt style={dtStyle}>한 줄 소개</dt>
          <dd style={ddStyle}>{program.summary}</dd>
          <dt style={dtStyle}>스토리</dt>
          <dd style={storyStyle}>{program.story}</dd>
        </dl>
      </Card>

      <Card>
        <CardTitle>{`리워드 ${formatNumber(program.rewards.length)}종`}</CardTitle>
        <RewardTable program={program} />
      </Card>
    </div>
  );
}
