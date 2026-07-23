/**
 * Design System/Templates/Company/Profile — 회사 정보 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/company/profile` → 메뉴 en = "Company"(기업 관리), 화면 en = "Profile"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Company 그룹의 `['/company/profile', '회사 정보', 'Profile']`).
 *
 * 대응 실화면: apps/admin/src/pages/company/profile/CompanyProfilePage.tsx (라우트 /company/profile).
 * 회사 정보는 **목록이 없는 단일 문서 폼**이다 — 회사당 1건이라 문서 하나를 불러와 고치고 저장한다.
 * 그래서 표·검색·선택·페이지네이션이 없다. 실화면은 단일 문서형 4종(회사 정보·CEO 인사말·오시는 길
 * ·비전/미션)이 공유하는 DocumentFormShell 위에 필드만 얹는다: 안내문 → 카드(제목 + 필드 스택) →
 * 저장 툴바(변경 여부 문구 + 저장 버튼). 저장하지 않은 채 이탈하면 가드가 막고, 저장은 토스트로 알린다.
 *
 * [주소는 검색으로 고른다 — 오시는 길과 같은 규칙]
 * 주소 칸은 **읽기 전용**이고, 누르면 카카오(다음) 우편번호 서비스를 담은 모달이 열린다. 검색이 주는
 * 주소에는 층·호수가 없으므로 **상세주소**가 별도 칸으로 따라온다. Storybook 은 그 SDK 를 로드하지
 * 않으므로 모달 안에는 '여기에 검색이 심어진다' 고 **명시된** 자리를 둔다 — 회색 상자에 검색창을
 * 그린 척하지 않는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   DocumentFormShell → Card + 토큰만 쓴 <h2> + 저장 툴바(Button) + Alert(danger)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   폼 껍데기(DocumentFormShell) → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   회사명 · 사업자등록번호 · 대표자명 · 연락처 → FormField + input(controlStyle)
 *   주소(읽기 전용) + 주소 검색  → FormField + input[readOnly] + Button(secondary)
 *   주소 검색 모달               → Modal(제목 '주소 검색' + 닫기 푸터) + 위젯이 앉을 자리
 *   상세주소                     → FormField + input(controlStyle)
 *   로고 이미지                 → ImageUploadField
 *   저장 실패 배너              → Alert(danger)
 *   조회 실패 + 다시 시도        → Alert(danger) + Button(secondary)
 *   첫 조회 스켈레톤            → Skeleton ×4
 *   저장 툴바                   → 토큰만 쓴 <p>(변경 여부) + Button(primary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 * 로고 미리보기는 인라인 SVG data: URI 로만 채운다(외부 자산 의존 0).
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FormField,
  Modal,
  formRowStyle,
  ImageUploadField,
  Skeleton,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Company/Profile',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수(실화면 profile/types 미러) ───────────────────────────────────────────────────────── */

const COMPANY_NAME_MAX_LENGTH = 100;
const ADDRESS_MAX_LENGTH = 200;
const ADDRESS_DETAIL_MAX_LENGTH = 100;
const NAME_MAX_LENGTH = 50;
const CONTACT_MAX_LENGTH = 40;

/* ── 데모 데이터(실화면 data-source 의 PROFILE_SEED 미러) ────────────────────────────────────── */

/** 인라인 SVG 로고 — 외부 자산 없이 data: URI 로만 이미지를 흉내낸다 */
const LOGO_DATA_URI = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80" viewBox="0 0 160 80"><rect width="160" height="80" fill="slategray"/><text x="80" y="46" font-family="sans-serif" font-size="16" fill="white" text-anchor="middle">LOGO</text></svg>',
)}`;

interface ProfileValues {
  readonly companyName: string;
  readonly businessNumber: string;
  /** 검색으로 고른 주소 한 줄 — 층·호수는 여기 없다 */
  readonly address: string;
  /** 건물명·층·호수 등 (선택) */
  readonly addressDetail: string;
  readonly ceoName: string;
  readonly contact: string;
  readonly logoUrl: string;
}

const EMPTY_PROFILE: ProfileValues = {
  companyName: '',
  businessNumber: '',
  address: '',
  addressDetail: '',
  ceoName: '',
  contact: '',
  logoUrl: '',
};

const SEED_PROFILE: ProfileValues = {
  companyName: '주식회사 예시플래닝',
  businessNumber: '123-45-67890',
  address: '서울특별시 예시구 가상대로 123',
  addressDetail: '예시타워 8층',
  ceoName: '홍길동',
  contact: '02-0000-0000',
  logoUrl: LOGO_DATA_URI,
};

/** 검증 오류 데모 — 실화면 companyProfileSchema(zod) 가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly companyName?: string;
  readonly businessNumber?: string;
  readonly address?: string;
  readonly addressDetail?: string;
  readonly ceoName?: string;
  readonly contact?: string;
  readonly logoUrl?: string;
}

const DEMO_ERRORS: FieldErrors = {
  companyName: '회사명을 입력하세요.',
  businessNumber: '사업자등록번호 형식이 올바르지 않아요. (예: 123-45-67890)',
  ceoName: '대표자명을 입력하세요.',
  contact: '연락처를 입력하세요.',
  address: '주소를 입력하세요.',
};

/** 오류 시연용 시드 — 형식이 어긋난 사업자등록번호가 남아 있는 상태 */
const INVALID_PROFILE: ProfileValues = {
  ...EMPTY_PROFILE,
  businessNumber: '1234567890',
};

/* ── 스타일(토큰·rem·calc 만) ──────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const pageTitleStyle: CSSProperties = {
  ...typography('typography.title.xl'),
  margin: 0,
};

const descriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

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

/** 사업자등록번호 · 대표자명이 나란히 서는 행 — 실화면 formRowStyle(auto-fit minmax) 미러 */
const controlStyle = (invalid: boolean): CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: invalid ? cssVar('color.feedback.danger.border') : cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
});

/** 주소 입력 + 검색 버튼 — 실화면 addressRowStyle 미러(입력이 줄고 버튼은 레이블 폭을 지킨다) */
const addressRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: cssVar('space.2'),
  minWidth: 0,
};

/** 읽기 전용 주소 칸 — 누르면 모달이 열리므로 커서가 포인터다 */
const addressInputStyle = (invalid: boolean): CSSProperties => ({
  ...controlStyle(invalid),
  flex: '1 1 auto',
  minWidth: 0,
  cursor: 'pointer',
});

/** 주소 검색 위젯(iframe)이 앉는 자리 — Storybook 은 SDK 를 로드하지 않아 자리임을 명시한다 */
const searchHostStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  height: `calc(${cssVar('space.6')} * 10)`,
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
};

const searchStatusStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  alignItems: 'flex-start',
  minWidth: 0,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
};

const footerHintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface CompanyProfileScreenProps {
  /** 첫 조회 로딩 — 카드 본문 스켈레톤(STATE-01) */
  readonly loading?: boolean;
  /** 조회 실패 — 폼 대신 재시도 배너 */
  readonly loadFailed?: boolean;
  /** 저장 중 — 폼 잠금 + 저장 버튼 '저장 중…' */
  readonly saving?: boolean;
  /** 저장하지 않은 변경 — 저장 버튼 활성 + 안내 문구 전환 */
  readonly initialDirty?: boolean;
  /** 저장 실패 배너 */
  readonly serverError?: string | null;
  readonly errors?: FieldErrors;
  readonly seed?: ProfileValues;
  /** 주소 검색 모달을 연 채로 보여준다 */
  readonly searchOpen?: boolean;
  /** 모달 안의 검색 위젯 상태 — 로딩·실패·정상을 각각 보여준다 */
  readonly searchState?: 'loading' | 'failed' | 'ready';
}

function CompanyProfileScreen({
  loading = false,
  loadFailed = false,
  saving = false,
  initialDirty = false,
  serverError = null,
  errors = {},
  seed = SEED_PROFILE,
  searchOpen = false,
  searchState = 'ready',
}: CompanyProfileScreenProps) {
  const [companyName, setCompanyName] = useState(seed.companyName);
  const [businessNumber, setBusinessNumber] = useState(seed.businessNumber);
  const [ceoName, setCeoName] = useState(seed.ceoName);
  const [contact, setContact] = useState(seed.contact);
  const [address, setAddress] = useState(seed.address);
  const [addressDetail, setAddressDetail] = useState(seed.addressDetail);
  const [logoUrl, setLogoUrl] = useState(seed.logoUrl);
  const [dirty, setDirty] = useState(initialDirty);
  const [modalOpen, setModalOpen] = useState(searchOpen);

  const disabled = saving || loading;
  const touch = (): void => setDirty(true);

  if (loadFailed) {
    return (
      <div style={pageStyle}>
        <h1 style={pageTitleStyle}>회사 정보</h1>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>내용을 불러오지 못했어요.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={pageTitleStyle}>회사 정보</h1>
      <p style={descriptionStyle}>
        별표(*)는 꼭 입력해야 하는 항목이에요. 저장하면 홈페이지의 회사 소개에 바로 반영돼요.
      </p>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <Card>
          <div style={cardBodyStyle}>
            <h2 style={cardTitleStyle}>회사 정보</h2>

            {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

            {loading ? (
              <div style={skeletonBodyStyle} aria-busy="true">
                {[0, 1, 2, 3].map((row) => (
                  <Skeleton key={`row-${String(row)}`} />
                ))}
              </div>
            ) : (
              <div style={cardBodyStyle}>
                <FormField
                  htmlFor="profile-name"
                  label="회사명"
                  required
                  {...(errors.companyName !== undefined && { error: errors.companyName })}
                >
                  <input
                    id="profile-name"
                    type="text"
                    style={controlStyle(errors.companyName !== undefined)}
                    maxLength={COMPANY_NAME_MAX_LENGTH}
                    placeholder="예: 주식회사 예시플래닝"
                    disabled={disabled}
                    aria-invalid={errors.companyName !== undefined}
                    value={companyName}
                    onChange={(event) => {
                      setCompanyName(event.target.value);
                      touch();
                    }}
                  />
                </FormField>

                <div style={formRowStyle}>
                  <FormField
                    htmlFor="profile-biznum"
                    label="사업자등록번호"
                    required
                    hint="예: 123-45-67890"
                    {...(errors.businessNumber !== undefined && { error: errors.businessNumber })}
                  >
                    <input
                      id="profile-biznum"
                      type="text"
                      style={controlStyle(errors.businessNumber !== undefined)}
                      placeholder="123-45-67890"
                      disabled={disabled}
                      aria-invalid={errors.businessNumber !== undefined}
                      value={businessNumber}
                      onChange={(event) => {
                        setBusinessNumber(event.target.value);
                        touch();
                      }}
                    />
                  </FormField>

                  <FormField
                    htmlFor="profile-ceo"
                    label="대표자명"
                    required
                    {...(errors.ceoName !== undefined && { error: errors.ceoName })}
                  >
                    <input
                      id="profile-ceo"
                      type="text"
                      style={controlStyle(errors.ceoName !== undefined)}
                      maxLength={NAME_MAX_LENGTH}
                      placeholder="예: 홍길동"
                      disabled={disabled}
                      aria-invalid={errors.ceoName !== undefined}
                      value={ceoName}
                      onChange={(event) => {
                        setCeoName(event.target.value);
                        touch();
                      }}
                    />
                  </FormField>
                </div>

                <FormField
                  htmlFor="profile-contact"
                  label="연락처"
                  required
                  {...(errors.contact !== undefined && { error: errors.contact })}
                >
                  <input
                    id="profile-contact"
                    type="text"
                    style={controlStyle(errors.contact !== undefined)}
                    maxLength={CONTACT_MAX_LENGTH}
                    placeholder="예: 02-0000-0000"
                    disabled={disabled}
                    aria-invalid={errors.contact !== undefined}
                    value={contact}
                    onChange={(event) => {
                      setContact(event.target.value);
                      touch();
                    }}
                  />
                </FormField>

                <FormField
                  htmlFor="profile-address"
                  label="주소"
                  required
                  hint="주소 칸이나 '주소 검색' 버튼을 누르면 검색창이 열려요. 층·호수는 아래 상세주소에 적어 주세요."
                  {...(errors.address !== undefined && { error: errors.address })}
                >
                  <div style={addressRowStyle}>
                    <input
                      id="profile-address"
                      type="text"
                      readOnly
                      style={addressInputStyle(errors.address !== undefined)}
                      maxLength={ADDRESS_MAX_LENGTH}
                      placeholder="주소 검색으로 선택하세요"
                      disabled={disabled}
                      aria-invalid={errors.address !== undefined}
                      value={address}
                      onClick={() => setModalOpen(true)}
                      onChange={(event) => setAddress(event.target.value)}
                    />
                    <Button
                      variant="secondary"
                      size="md"
                      disabled={disabled}
                      onClick={() => setModalOpen(true)}
                    >
                      주소 검색
                    </Button>
                  </div>
                </FormField>

                <FormField
                  htmlFor="profile-address-detail"
                  label="상세주소"
                  hint="건물명·층·호수 등 (선택)"
                  {...(errors.addressDetail !== undefined && { error: errors.addressDetail })}
                >
                  <input
                    id="profile-address-detail"
                    type="text"
                    style={controlStyle(errors.addressDetail !== undefined)}
                    maxLength={ADDRESS_DETAIL_MAX_LENGTH}
                    placeholder="예: 예시타워 8층"
                    disabled={disabled}
                    aria-invalid={errors.addressDetail !== undefined}
                    value={addressDetail}
                    onChange={(event) => {
                      setAddressDetail(event.target.value);
                      touch();
                    }}
                  />
                </FormField>

                <ImageUploadField
                  label="로고 이미지"
                  value={logoUrl}
                  disabled={disabled}
                  error={errors.logoUrl ?? ''}
                  hint="이미지를 끌어다 놓거나 클릭해 올려요. 비워 두면 로고가 나오지 않아요."
                  onChange={(value) => {
                    setLogoUrl(value);
                    touch();
                  }}
                />
              </div>
            )}

            <div style={actionsStyle}>
              <p style={footerHintStyle}>
                {saving
                  ? '저장하는 중이에요…'
                  : dirty
                    ? '저장하지 않은 변경 사항이 있어요.'
                    : '변경 사항이 없어요.'}
              </p>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!dirty || saving || loading}
                onClick={() => setDirty(false)}
              >
                {saving ? '저장 중…' : '저장'}
              </Button>
            </div>
          </div>
        </Card>
      </form>

      {modalOpen && (
        <Modal
          title="주소 검색"
          onClose={() => setModalOpen(false)}
          footer={
            <Button variant="secondary" size="md" onClick={() => setModalOpen(false)}>
              닫기
            </Button>
          }
        >
          {searchState === 'loading' && (
            <p style={footerHintStyle} aria-busy="true">
              주소 검색을 여는 중이에요…
            </p>
          )}
          {searchState === 'failed' && (
            <div style={searchStatusStyle}>
              <Alert tone="danger">
                주소 검색을 불러오지 못했어요. 인터넷 연결이 끊겼거나 브라우저 확장 프로그램이 막고
                있을 수 있으니, 확인한 뒤 다시 시도해 주세요.
              </Alert>
              <Button variant="secondary" size="md">
                다시 시도
              </Button>
            </div>
          )}
          {searchState === 'ready' && (
            <div style={searchHostStyle}>
              카카오(다음) 우편번호 검색이 이 자리에 심어져요 (Storybook 은 SDK 를 로드하지 않아요)
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/** 정상: 저장된 회사 정보가 채워진 기본 상태(변경 없음 → 저장 버튼 비활성) */
export const Default: Story = {
  render: () => <CompanyProfileScreen />,
};

/** 최초 로드: 카드 본문 스켈레톤 — 첫 조회에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <CompanyProfileScreen loading />,
};

/** 편집됨: 변경 있음 → 저장 버튼 활성 + '저장하지 않은 변경 사항이 있습니다' (이탈 가드 조건) */
export const Edited: Story = {
  render: () => <CompanyProfileScreen initialDirty />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 zod 스키마 문구가 각 필드 아래 인라인으로 붙는다 */
export const ValidationError: Story = {
  render: () => <CompanyProfileScreen seed={INVALID_PROFILE} errors={DEMO_ERRORS} initialDirty />,
};

/** 조회 실패: 폼 대신 danger 배너 + 다시 시도 (EXC — 없는 폼을 반쯤 그리지 않는다) */
export const LoadFailed: Story = {
  render: () => <CompanyProfileScreen loadFailed />,
};

/** 주소 검색 모달: 우편번호 검색이 심긴 상태 */
export const AddressSearchOpen: Story = {
  render: () => <CompanyProfileScreen searchOpen searchState="ready" />,
};

/** 주소 검색 모달(로딩): 검색 위젯을 심는 중 — 실패와 **다른 화면**이다(기다리면 되는 상태) */
export const AddressSearchLoading: Story = {
  render: () => <CompanyProfileScreen searchOpen searchState="loading" />,
};

/** 주소 검색 모달(실패): 검색 스크립트를 받지 못했다 — 다시 시도를 준다 */
export const AddressSearchFailed: Story = {
  render: () => <CompanyProfileScreen searchOpen searchState="failed" />,
};
