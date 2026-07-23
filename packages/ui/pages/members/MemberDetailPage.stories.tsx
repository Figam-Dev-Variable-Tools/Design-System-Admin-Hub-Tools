/**
 * Design System/Templates/Users/Member Detail — 사용자 상세 화면 (SCR · 조립 전용, 담당: 스토리북 페이지 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 `Users`(사용자 관리)다 — packages/ui/pages/_data/pages.ts 의 GROUPS 에서
 * `['사용자 관리', 'Users', '/users', …]` 로 확정된다. 메뉴 개요는 같은 카테고리의
 * pages/menus/UsersOverview.stories.tsx 에 있다.
 *
 * 대응 실화면: apps/admin/src/pages/members/MemberDetailPage.tsx (라우트 /users/members/:id) 와
 * 그 하위 카드 6종(MemberInfoCard·ConsentCard·ActivityCard·PointsCard·CouponsCard·MemoCard).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 컴포넌트를 만들지 않는다.
 * 실화면 논리 카드 ↔ DS 컴포넌트 매핑:
 *   화면 제목/액션 → Header(meta 슬롯에 Menu)   ·   각 카드 표면 → Card(제목은 토큰만 쓴 <h2> 로 조립)
 *   회원 정보(읽기 전용) → dl/dt/dd + 등급 StatusBadge + 비밀번호 변경 Button
 *   동의 정보 → 비활성 Checkbox(읽기 전용) + 동의 일시 문구(색/체크만으로 의미 전달 금지, WCAG 1.4.1)
 *   활동 정보 → dl/dt/dd   ·   적립금 → 지급/차감 폼(FormField+SelectField·TextField) + Table + Pagination
 *   보유 쿠폰 → 토큰만 쓴 목록 + Pagination   ·   관리자 메모 → TextareaField + 저장 Button
 * (CardTitle·dl 헬퍼는 대응 DS 컴포넌트가 없어 토큰만 쓴 로컬 레이아웃으로 대체한다 — 신규 DS 컴포넌트가 아니다.
 *  실화면 동의 카드는 ToggleSwitch 가 아니라 '비활성 체크박스'를 쓰므로 여기서도 Checkbox 로 충실히 미러한다.)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(cssVar/typography)만 참조한다.
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Button,
  Card,
  Checkbox,
  FormField,
  Header,
  Icon,
  Menu,
  Pagination,
  SelectField,
  Skeleton,
  StatusBadge,
  Table,
  TextField,
  TextareaField,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Users/Member Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ────────────────────────────────────────────────────────────────────────────
 * 토큰 유틸 · 포맷터 (px/hex 리터럴 금지 — space 토큰의 calc 배수와 Intl 만 쓴다)
 * ──────────────────────────────────────────────────────────────────────────── */

/** 토큰 배수 치수 — px 리터럴 대신 space 토큰의 calc 배수만 쓴다 */
const size = (multiple: number): string => `calc(${cssVar('space.6')} * ${multiple})`;

const KO_NUMBER = new Intl.NumberFormat('ko-KR');
const formatNumber = (value: number): string => KO_NUMBER.format(value);
/** 증감 표기 — 양수 +, 음수 −(U+2212), 0 은 부호 없음 */
const formatSigned = (value: number): string => {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${KO_NUMBER.format(Math.abs(value))}`;
};

const MEMO_MAX_LENGTH = 500;
const PAGE_SIZE = 10;

const TIER_LABEL = { normal: '일반회원', vip: 'VIP', vvip: 'VVIP' } as const;
type MemberTier = keyof typeof TIER_LABEL;
/** 등급 배지 색 의도 — VVIP 강조(info) · VIP 성공톤 · 일반 중립 */
const TIER_TONE: Record<MemberTier, StatusBadgeTone> = {
  normal: 'neutral',
  vip: 'success',
  vvip: 'info',
};

/* ────────────────────────────────────────────────────────────────────────────
 * 데모 데이터 — 실화면 MemberDetail 형태를 대표값으로 인라인
 * ──────────────────────────────────────────────────────────────────────────── */

interface DemoMember {
  readonly nickname: string;
  readonly account: string;
  readonly tier: MemberTier;
  readonly referralCode: string;
  readonly name: string;
  readonly phone: string;
  readonly country: string;
  readonly address: string;
  readonly addressDetail: string;
  readonly birthday: string;
  readonly socialLogin: string;
  readonly referrer: string;
}

const MEMBER: DemoMember = {
  nickname: '김하루',
  account: 'haru.kim@example.com',
  tier: 'vip',
  referralCode: 'HARU2026',
  name: '김하루',
  phone: '010-1234-5678',
  country: '대한민국',
  address: '서울특별시 강남구 테헤란로 123',
  addressDetail: '10층 스페이스플래닝',
  birthday: '1993-05-14',
  socialLogin: '카카오',
  referrer: '이서준',
};

interface ConsentItem {
  readonly id: string;
  readonly label: string;
  readonly agreed: boolean;
  readonly agreedAt: string | null;
}
interface ConsentGroup {
  readonly id: string;
  readonly label: string;
  readonly items: readonly ConsentItem[];
}

const CONSENTS: readonly ConsentGroup[] = [
  {
    id: 'required',
    label: '필수 약관',
    items: [
      { id: 'tos', label: '이용약관 동의', agreed: true, agreedAt: '2024-03-02 10:12' },
      {
        id: 'privacy',
        label: '개인정보 수집·이용 동의',
        agreed: true,
        agreedAt: '2024-03-02 10:12',
      },
    ],
  },
  {
    id: 'marketing',
    label: '마케팅 활용 및 광고 수신 동의',
    items: [
      { id: 'email', label: '이메일 수신', agreed: true, agreedAt: '2024-05-11 09:03' },
      { id: 'sms', label: 'SMS 수신', agreed: false, agreedAt: null },
    ],
  },
];

interface PointEntry {
  readonly id: string;
  readonly date: string;
  readonly reason: string;
  readonly orderNo: string | null;
  readonly amount: number;
}

const POINT_BALANCE = 12500;
const POINT_HISTORY: readonly PointEntry[] = [
  { id: 'p1', date: '2026-07-18', reason: '구매 적립', orderNo: 'ORD-24817', amount: 1250 },
  { id: 'p2', date: '2026-07-02', reason: '이벤트 참여 보상', orderNo: null, amount: 3000 },
  { id: 'p3', date: '2026-06-21', reason: '적립금 사용', orderNo: 'ORD-24390', amount: -2000 },
  { id: 'p4', date: '2026-06-05', reason: '리뷰 작성 보상', orderNo: null, amount: 500 },
];

interface Coupon {
  readonly id: string;
  readonly name: string;
  readonly benefit: string;
  readonly expiresAt: string;
}

const COUPONS: readonly Coupon[] = [
  { id: 'c1', name: '신규 가입 축하 쿠폰', benefit: '10% 할인', expiresAt: '2026-08-31' },
  { id: 'c2', name: 'VIP 전용 무료배송', benefit: '배송비 무료', expiresAt: '2026-12-31' },
  { id: 'c3', name: '생일 축하 쿠폰', benefit: '5,000원 할인', expiresAt: '2026-05-31' },
];

const INITIAL_MEMO =
  '2026-06 결제 오류 문의 이력 있음 — 환불 처리 완료. VIP 승급 후 재구매율이 높아 프로모션 우선 대상.';

/* ────────────────────────────────────────────────────────────────────────────
 * 로컬 레이아웃 조립 (신규 DS 컴포넌트 아님 — 토큰만 쓴 표면/타이포)
 * ──────────────────────────────────────────────────────────────────────────── */

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

/** DS Card 는 표면만 소유한다(CardTitle 부재) — 제목 <h2> 는 여기서 토큰만으로 조립하고 aria 로 잇는다 */
function DetailCard({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={cardTitleStyle}>
          {title}
        </h2>
        {children}
      </div>
    </Card>
  );
}

const dlStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `minmax(0, max-content) minmax(0, 1fr)`,
  columnGap: cssVar('space.4'),
  rowGap: cssVar('space.3'),
  margin: 0,
};

const dtStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
};

const ddStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  margin: 0,
  overflowWrap: 'anywhere',
};

const mutedTextStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

/** 값이 비면 '—' — 빈칸이 누락처럼 보이지 않게 한다 (실화면 규칙 미러) */
const orDash = (value: string): string => (value.trim() === '' ? '—' : value);

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt style={dtStyle}>{label}</dt>
      <dd style={ddStyle}>{children}</dd>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 카드 1 — 회원 정보 (전부 읽기 전용, 유일한 쓰기는 비밀번호 변경 버튼)
 * ──────────────────────────────────────────────────────────────────────────── */

const identityStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.4'),
};

const avatarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  width: size(2),
  height: size(2),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.action.primary.default'),
  color: cssVar('color.text.on-primary'),
  ...typography('typography.title.lg'),
};

const identityMetaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const nicknameRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const nicknameStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  color: cssVar('color.text.default'),
  overflowWrap: 'anywhere',
};

const passwordRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
};

function MemberInfoCard({ onChangePassword }: { onChangePassword: () => void }) {
  return (
    <DetailCard title="회원 정보">
      <div style={identityStyle}>
        <span style={avatarStyle} aria-hidden="true">
          {MEMBER.nickname.slice(0, 1)}
        </span>
        <span style={identityMetaStyle}>
          <span style={nicknameRowStyle}>
            <span style={nicknameStyle}>{MEMBER.nickname}</span>
            <StatusBadge tone={TIER_TONE[MEMBER.tier]} label={TIER_LABEL[MEMBER.tier]} />
          </span>
          <span style={mutedTextStyle}>{MEMBER.account}</span>
        </span>
      </div>

      <dl style={dlStyle}>
        <InfoRow label="추천인 코드">{orDash(MEMBER.referralCode)}</InfoRow>
        <InfoRow label="계정">{MEMBER.account}</InfoRow>
        <InfoRow label="비밀번호">
          <span style={passwordRowStyle}>
            <span aria-hidden="true">••••••••</span>
            <Button variant="secondary" size="sm" onClick={onChangePassword}>
              비밀번호 변경
            </Button>
          </span>
        </InfoRow>
        <InfoRow label="이름">{orDash(MEMBER.name)}</InfoRow>
        <InfoRow label="연락처">{orDash(MEMBER.phone)}</InfoRow>
        <InfoRow label="국가">{orDash(MEMBER.country)}</InfoRow>
        <InfoRow label="주소">{orDash(MEMBER.address)}</InfoRow>
        <InfoRow label="상세주소">{orDash(MEMBER.addressDetail)}</InfoRow>
        <InfoRow label="생년월일">{orDash(MEMBER.birthday)}</InfoRow>
        <InfoRow label="소셜 로그인">{orDash(MEMBER.socialLogin)}</InfoRow>
        <InfoRow label="추천인">{orDash(MEMBER.referrer)}</InfoRow>
      </dl>
    </DetailCard>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 카드 2 — 동의 정보 (읽기 전용: 비활성 체크박스 + 동의 일시 문구)
 * ──────────────────────────────────────────────────────────────────────────── */

const consentGroupsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const consentGroupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const consentLegendStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const consentItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

function ConsentCard() {
  return (
    <DetailCard title="동의 정보">
      <div style={consentGroupsStyle}>
        {CONSENTS.map((group) => (
          <div key={group.id} style={consentGroupStyle}>
            <span style={consentLegendStyle}>{group.label}</span>
            {group.items.map((item) => (
              <div key={item.id} style={consentItemStyle}>
                {/* 읽기 전용 — 관리자가 회원의 동의를 대신 바꿀 수 없다(disabled) */}
                <Checkbox
                  id={`consent-${group.id}-${item.id}`}
                  label={item.label}
                  checked={item.agreed}
                  disabled
                />
                {/* 색/체크 모양만으로 의미를 전달하지 않는다 — 문구로 이중 전달(WCAG 1.4.1) */}
                <span style={mutedTextStyle}>
                  {item.agreed && item.agreedAt !== null
                    ? `회원 동의함: ${item.agreedAt}`
                    : '미동의'}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </DetailCard>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 카드 3 — 활동 정보 (전부 읽기 전용)
 * ──────────────────────────────────────────────────────────────────────────── */

function ActivityCard() {
  return (
    <DetailCard title="활동 정보">
      <dl style={dlStyle}>
        <InfoRow label="가입일">2년 전 (2024-03-02 10:12)</InfoRow>
        <InfoRow label="로그인">1일 전 · 총 128회</InfoRow>
        <InfoRow label="최종 로그인 IP">203.0.113.42</InfoRow>
        <InfoRow label="작성">게시물 12건 · 댓글 48건 · 구매평 7건 · 문의 3건</InfoRow>
      </dl>
    </DetailCard>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 카드 4 — 적립금 (보유 잔액 + 지급/차감 폼 + 증감 내역 표 + 페이지네이션)
 * ──────────────────────────────────────────────────────────────────────────── */

const balanceStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  color: cssVar('color.text.default'),
  margin: 0,
  fontVariantNumeric: 'tabular-nums',
};

const pointFormStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `${size(2.5)} ${size(3)} minmax(0, 1fr) auto`,
  gap: cssVar('space.3'),
  alignItems: 'end',
};

const amountCellStyle = (amount: number): CSSProperties => ({
  ...typography('typography.label.md'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  fontVariantNumeric: 'tabular-nums',
  color: amount < 0 ? cssVar('color.feedback.danger.text') : cssVar('color.feedback.success.text'),
});

const POINT_COLUMNS = [
  { id: 'date', header: '일자', nowrap: true },
  { id: 'reason', header: '사유' },
  { id: 'order', header: '관련주문' },
  { id: 'amount', header: '증감', align: 'end' },
  { id: 'delete', header: '삭제' },
] as const;

function pointRows(entries: readonly PointEntry[]): {
  id: string;
  cells: ReactNode[];
}[] {
  return entries.map((entry) => ({
    id: entry.id,
    cells: [
      entry.date,
      entry.reason,
      entry.orderNo ?? '—',
      <span key="amount" style={amountCellStyle(entry.amount)}>
        {formatSigned(entry.amount)}
      </span>,
      <Button
        key="delete"
        variant="ghost"
        size="sm"
        aria-label={`${entry.date} ${entry.reason} 내역 삭제`}
      >
        <Icon name="trash" />
      </Button>,
    ] as ReactNode[],
  }));
}

function PointsCard() {
  const [kind, setKind] = useState<'grant' | 'deduct'>('grant');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [page, setPage] = useState(1);
  const kindFieldId = useId();

  const totalPages = Math.max(1, Math.ceil(POINT_HISTORY.length / PAGE_SIZE));

  return (
    <DetailCard title="적립금">
      <p style={balanceStyle}>{`${formatNumber(POINT_BALANCE)} 포인트 (KRW)`}</p>

      {/* 지급/차감 폼 — 실화면과 동일한 구성(구분·금액·사유·확인). 저장 로직은 조립 밖의 책임 */}
      <form style={pointFormStyle} onSubmit={(event) => event.preventDefault()}>
        <FormField htmlFor={kindFieldId} label="구분">
          <SelectField
            id={kindFieldId}
            value={kind}
            onChange={(event) => setKind(event.target.value === 'deduct' ? 'deduct' : 'grant')}
          >
            <option value="grant">지급</option>
            <option value="deduct">차감</option>
          </SelectField>
        </FormField>

        <TextField
          id="point-amount"
          label="금액"
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0"
        />

        <TextField
          id="point-reason"
          label="사유"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="예: 이벤트 참여 보상"
        />

        <Button variant="primary" type="submit">
          확인
        </Button>
      </form>

      <div style={{ overflowX: 'auto' }}>
        <Table
          caption="적립금 증감 내역 — 최근 3개월"
          columns={POINT_COLUMNS}
          rows={pointRows(POINT_HISTORY)}
        />
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={POINT_HISTORY.length}
        pageSize={PAGE_SIZE}
        label="적립금 증감 내역 페이지"
        onChange={setPage}
      />

      <p style={mutedTextStyle}>최근 3개월간 적립 내역만 출력돼요.</p>
    </DetailCard>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 카드 5 — 보유 쿠폰 (읽기 전용 목록 + 페이지네이션)
 * ──────────────────────────────────────────────────────────────────────────── */

const couponListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const couponItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  padding: cssVar('space.3'),
  border: `${cssVar('border-width.thin')} solid ${cssVar('color.border.default')}`,
  borderRadius: cssVar('radius.md'),
};

const couponNameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

function CouponsCard() {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(COUPONS.length / PAGE_SIZE));

  return (
    <DetailCard title="보유 쿠폰">
      <ul style={couponListStyle}>
        {COUPONS.map((coupon) => (
          <li key={coupon.id} style={couponItemStyle}>
            <span style={couponNameStyle}>
              <span>{coupon.name}</span>
              <span style={mutedTextStyle}>{`${coupon.expiresAt} 까지`}</span>
            </span>
            <StatusBadge tone="info" label={coupon.benefit} />
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={COUPONS.length}
        pageSize={PAGE_SIZE}
        label="보유 쿠폰 페이지"
        onChange={setPage}
      />
    </DetailCard>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 카드 6 — 관리자 메모 (유일한 실제 쓰기 영역: 회원에게 보이지 않는 운영 주석)
 * ──────────────────────────────────────────────────────────────────────────── */

const memoFooterStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
};

function MemoCard() {
  const [memo, setMemo] = useState(INITIAL_MEMO);

  return (
    <DetailCard title="관리자 메모">
      <TextareaField
        label="관리자 메모"
        value={memo}
        onChange={setMemo}
        maxLength={MEMO_MAX_LENGTH}
        rows={5}
        hint="회원 본인에게는 보이지 않는 운영 메모예요."
        placeholder="회원 응대 시 참고할 내용을 입력하세요."
      />
      <div style={memoFooterStyle}>
        <Button variant="primary">저장</Button>
      </div>
    </DetailCard>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * 페이지 조립 — Header(제목 + ⋯ 액션 Menu) · 목록 복귀 링크 · 2단 카드 그리드
 * ──────────────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  alignSelf: 'flex-start',
  color: cssVar('color.text.muted'),
  textDecoration: 'none',
  ...typography('typography.label.md'),
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${size(16)}, 1fr))`,
  gap: cssVar('space.4'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/** 실화면 LoadingSkeleton 미러 — 2단 각 열에 Card 한 장 + 스켈레톤 5줄, 영역 aria-busy */
function LoadingSkeleton() {
  return (
    <div style={gridStyle} aria-busy="true">
      {[0, 1].map((column) => (
        <div key={`col-${String(column)}`} style={columnStyle}>
          <Card>
            <div style={skeletonBodyStyle}>
              {[0, 1, 2, 3, 4].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
              ))}
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}

/**
 * 사용자 상세 화면 조립 — 제어 상태(메모·적립금 폼·페이지)는 각 카드 컴포넌트의 useState 가 소유한다
 * (rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트 안에서 다룬다).
 */
function MemberDetailScreen({ loading = false }: { loading?: boolean }) {
  const [changingPassword, setChangingPassword] = useState(false);

  return (
    <div style={pageStyle}>
      <Header
        title="회원 상세"
        eyebrow="사용자 관리"
        meta={
          <Menu
            label={`${MEMBER.nickname} 회원 액션`}
            items={[
              { id: 'delete', label: '회원 삭제', danger: true },
              { id: 'notify', label: '알림 발송' },
            ]}
          />
        }
      />

      {/* 목록 복귀 — 실화면 topRow 의 '리스트로 돌아가기' */}
      <a href="#member-list" style={backLinkStyle}>
        <Icon name="arrow-left" />
        리스트로 돌아가기
      </a>

      {loading ? (
        <LoadingSkeleton />
      ) : (
        <div style={gridStyle}>
          {/* 좌측 — 회원이 제출한 정보 (전부 읽기 전용) */}
          <div style={columnStyle}>
            <MemberInfoCard onChangePassword={() => setChangingPassword(true)} />
            <ConsentCard />
          </div>

          {/* 우측 — 운영 기록 (활동 · 적립금 · 쿠폰 · 관리자 메모) */}
          <div style={columnStyle}>
            <ActivityCard />
            <PointsCard />
            <CouponsCard />
            <MemoCard />
          </div>
        </div>
      )}

      {/* 비밀번호 변경은 실화면에서 모달로 뜬다 — 조립 데모에서는 안내 배지로 열림 상태만 표시 */}
      {changingPassword ? (
        <p style={mutedTextStyle}>비밀번호 변경 모달이 열려요. (조립 데모 — 실화면은 모달)</p>
      ) : null}
    </div>
  );
}

/** 정상 — 6개 카드가 모두 채워진 사용자 상세 (실화면 data 로드 완료 상태) */
export const Default: Story = {
  render: () => <MemberDetailScreen />,
};

/** 로딩 — data 미도착 시 실화면이 그리는 2단 스켈레톤 (STATE-01: data === undefined) */
export const Loading: Story = {
  render: () => <MemberDetailScreen loading />,
};
