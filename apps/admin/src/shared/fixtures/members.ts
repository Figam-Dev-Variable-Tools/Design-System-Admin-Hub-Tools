// 회원 더미 데이터 (A40 소유 — apps/admin/src/shared/fixtures/**)
//
// [이 파일의 역할] 백엔드가 없는 동안 화면을 그리기 위한 **표시용 픽스처**다.
// 비즈니스 로직·저장소가 아니다. 백엔드가 붙으면 각 페이지의 data-source.ts 가 이 파일 대신
// 실제 HTTP 응답을 돌려주게 되고, 이 파일은 삭제된다.
//
// [왜 페이지 밖에 있나] 회원 목록(pages/members)과 등급 분포 미리보기(pages/customer-settings)가
// **같은 회원 표본**을 봐야 한다. 각자 픽스처를 가지면 '전체 497명'과 분포 합계가 어긋난다.
// 그렇다고 고객 설정이 회원 화면을 가로질러 import 하게 둘 수는 없다 — 그래서 여기 있다.
//
// 값은 인덱스로부터 결정적으로 만든다 — 새로고침해도 목록이 흔들리지 않는다.
import type {
  ConsentGroup,
  Coupon,
  Member,
  MemberDetail,
  MemberGroup,
  MemberTier,
  PointEntry,
} from '../domain/member';

/**
 * 회원 그룹 — 관리자가 만드는 임의의 묶음.
 * '그룹 없음'은 가입 직후 기본값이라 목록에서 지울 수 없는 항목으로 취급한다.
 */
export const GROUPS: readonly MemberGroup[] = [
  { id: 'none', label: '그룹 없음' },
  { id: 'free-shipping', label: '무료 배송 결제 그룹' },
];

/** 대부분은 그룹 없음 — 소수만 무료 배송 그룹에 들어 있다 */
function groupIdFor(index: number): string {
  return index % 100 === 0 ? 'free-shipping' : 'none';
}

function groupLabelOf(id: string): string {
  return GROUPS.find((group) => group.id === id)?.label ?? '그룹 없음';
}

const NICKNAMES = [
  '명재우',
  '박기렬',
  '허민',
  '이병우',
  '나예은',
  '이재윤',
  '구현민',
  '안대훈',
  '황동욱',
  '배은한',
  '김서연',
  '정하늘',
  '오준호',
  '최유진',
  '한지민',
  '윤도현',
  '서민채',
  '강태윤',
  '문소리',
  '임재현',
];

const DOMAINS = ['naver.com', 'gmail.com', 'kakao.com', 'daum.net', 'hanmail.net'];

const SOCIAL_LOGINS = ['없음', '카카오', '네이버', '구글', '애플'];

const COUNTRIES = ['대한민국'];

const ADDRESSES = [
  '서울특별시 강남구 테헤란로 123',
  '경기도 성남시 분당구 판교역로 235',
  '부산광역시 해운대구 센텀중앙로 79',
  '대전광역시 유성구 대학로 291',
];

const POINT_REASONS = [
  '회원가입 축하 적립',
  '구매 확정 적립',
  '리뷰 작성 적립',
  '이벤트 참여 적립',
];

/** 등급 분포 — 대부분 일반, 소수 VIP/VVIP */
function tierFor(index: number): MemberTier {
  if (index % 17 === 0) return 'vvip';
  if (index % 5 === 0) return 'vip';
  return 'normal';
}

function pad(value: number, size: number): string {
  return String(value).padStart(size, '0');
}

/** 'M-00042' → 41 (0-based). 형식이 다르면 -1 */
export function indexFromId(id: string): number {
  const match = /^M-(\d{5})$/.exec(id);
  if (match === null) return -1;
  const raw = match[1];
  if (raw === undefined) return -1;
  return Number(raw) - 1;
}

function buildMembers(count: number): readonly Member[] {
  return Array.from({ length: count }, (_, i) => {
    const nickname = NICKNAMES[i % NICKNAMES.length] ?? `회원${String(i)}`;
    const domain = DOMAINS[i % DOMAINS.length] ?? 'naver.com';
    const day = 14 - (i % 30);
    const month = day > 0 ? 7 : 6;
    const safeDay = day > 0 ? day : 30 + day;
    const joinedAt = `2026-${pad(month, 2)}-${pad(safeDay, 2)}`;
    const groupId = groupIdFor(i);

    return {
      id: `M-${pad(i + 1, 5)}`,
      nickname,
      account: `${nickname.toLowerCase().replace(/[^a-z0-9]/g, '')}${String(1000 + i)}@${domain}`,
      tier: tierFor(i),
      groupId,
      group: groupLabelOf(groupId),
      joinedAt,
      // 상대 시각('4시간전')을 계산하려면 시/분이 필요하다 — 인덱스로 결정적으로 흩뿌린다
      joinedAtIso: `${joinedAt}T${pad((i * 3) % 24, 2)}:${pad((i * 7) % 60, 2)}:00`,
      points: 10000,
      activity: {
        posts: i % 7 === 0 ? 1 : 0,
        comments: 0,
        reviews: 0,
        inquiries: i % 7 === 0 ? 1 : 0,
      },
      totalPurchase: i % 11 === 0 ? 150000 : 0,
      memo: '',
    };
  });
}

/** 목록 화면이 소비하는 회원 픽스처 */
export const MEMBERS: readonly Member[] = buildMembers(497);

function buildConsents(index: number, joinedAt: string): readonly ConsentGroup[] {
  const at = `${joinedAt} ${pad(9 + (index % 10), 2)}:${pad((index * 13) % 60, 2)}`;
  const marketingSms = index % 3 !== 0;
  const marketingEmail = index % 2 === 0;

  return [
    {
      id: 'third-party',
      label: '개인정보 제3자 제공 동의',
      items: [{ id: 'third-party-main', label: '제3자 제공 동의', agreed: true, agreedAt: at }],
    },
    {
      id: 'marketing',
      label: '마케팅 활용 및 광고 수신 동의',
      items: [
        {
          id: 'marketing-sms',
          label: '메시지 수신',
          agreed: marketingSms,
          agreedAt: marketingSms ? at : null,
        },
        {
          id: 'marketing-email',
          label: 'E-Mail 수신',
          agreed: marketingEmail,
          agreedAt: marketingEmail ? at : null,
        },
      ],
    },
    {
      id: 'age',
      label: '연령 확인',
      items: [{ id: 'age-14', label: '만 14세 이상', agreed: true, agreedAt: at }],
    },
  ];
}

function buildPointHistory(index: number, joinedAt: string): readonly PointEntry[] {
  const base: readonly PointEntry[] = [
    {
      id: `${pad(index + 1, 5)}-P1`,
      date: joinedAt,
      reason: POINT_REASONS[0] ?? '적립',
      orderNo: null,
      amount: 5000,
    },
    {
      id: `${pad(index + 1, 5)}-P2`,
      date: '2026-06-28',
      reason: POINT_REASONS[1] ?? '적립',
      orderNo: `2026062800${pad(index % 100, 2)}`,
      amount: 6000,
    },
    {
      id: `${pad(index + 1, 5)}-P3`,
      date: '2026-07-02',
      reason: POINT_REASONS[3] ?? '적립',
      orderNo: null,
      amount: -1000,
    },
  ];
  // 일부 회원은 내역이 1건뿐 — 표가 항상 꽉 차 보이지 않게 한다
  return index % 4 === 0 ? base.slice(0, 1) : base;
}

function buildCoupons(index: number): readonly Coupon[] {
  // 상당수 회원은 보유 쿠폰이 없다 → 빈 상태 문구를 실제로 확인할 수 있다
  if (index % 3 !== 0) return [];
  return [
    {
      id: `${pad(index + 1, 5)}-C1`,
      name: '신규 가입 감사 쿠폰',
      benefit: '10% 할인',
      expiresAt: '2026-08-31',
    },
  ];
}

/**
 * 목록 픽스처의 회원 1명에서 상세 픽스처를 파생한다.
 * 목록/상세가 같은 원본을 공유하므로 닉네임·등급·적립금이 어긋나지 않는다.
 */
export function buildMemberDetail(member: Member): MemberDetail {
  const index = indexFromId(member.id);
  const safeIndex = index < 0 ? 0 : index;

  return {
    id: member.id,
    nickname: member.nickname,

    referralCode: `RF${pad(safeIndex + 1, 5)}`,
    tier: member.tier,
    account: member.account,
    name: member.nickname,
    phone: `010-${pad((safeIndex * 37) % 10000, 4)}-${pad((safeIndex * 71) % 10000, 4)}`,
    country: COUNTRIES[0] ?? '대한민국',
    address: ADDRESSES[safeIndex % ADDRESSES.length] ?? '',
    addressDetail: `${String((safeIndex % 20) + 1)}층 ${String((safeIndex % 9) + 1)}호`,
    birthday: `19${String(80 + (safeIndex % 20))}-${pad((safeIndex % 12) + 1, 2)}-${pad((safeIndex % 27) + 1, 2)}`,
    socialLogin: SOCIAL_LOGINS[safeIndex % SOCIAL_LOGINS.length] ?? '없음',
    referrer: safeIndex % 6 === 0 ? (NICKNAMES[(safeIndex + 3) % NICKNAMES.length] ?? '') : '',

    consents: buildConsents(safeIndex, member.joinedAt),

    joinedAtIso: member.joinedAtIso,
    lastLoginAtIso: `2026-07-${pad(14 - (safeIndex % 5), 2)}T${pad((safeIndex * 5) % 24, 2)}:${pad((safeIndex * 11) % 60, 2)}:00`,
    loginCount: 3 + (safeIndex % 40),
    lastLoginIp: `211.${String(safeIndex % 256)}.${String((safeIndex * 3) % 256)}.${String((safeIndex * 7) % 256)}`,
    activity: member.activity,

    points: member.points,
    pointHistory: buildPointHistory(safeIndex, member.joinedAt),

    coupons: buildCoupons(safeIndex),

    memo: member.memo,
  };
}
