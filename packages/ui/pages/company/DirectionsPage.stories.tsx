/**
 * Design System/Templates/Company/Directions — 오시는 길 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/company/directions` → 메뉴 en = "Company"(기업 관리), 화면 en =
 * "Directions" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Company 그룹의
 * `['/company/directions', '오시는 길', 'Directions']`).
 *
 * 대응 실화면: apps/admin/src/pages/company/directions/DirectionsPage.tsx (라우트 /company/directions).
 * 오시는 길도 회사당 1건인 **단일 문서 폼**이라 목록·검색·선택이 없다. 주소 → 상세주소 → 교통편
 * 순서는 '어디인가 → 정확히 어디인가 → 어떻게 가는가' 의 읽는 순서 그대로다.
 *
 * [무엇이 바뀌었나 — 좌표와 지도가 사라졌다]
 * 예전에는 위도·경도 두 칸과 지도 미리보기가 있었다. 좌표는 **주소에서 파생되는 값**이라 함께
 * 저장하면 둘이 어긋나는 순간이 오고, 지도는 카카오 앱 키가 없는 동안 '키를 등록하라' 는 배너만
 * 띄웠다. 운영자 판단으로 둘 다 걷었고 이 화면은 주소·상세주소·교통편 셋만 남았다.
 * 잃은 것은 핀 미세조정(대표점 ≠ 실제 출입구)이며, 그 안내는 교통편에 문장으로 적는다.
 *
 * [주소는 검색으로 고른다]
 * 주소 칸은 **읽기 전용**이고, 누르면 카카오(다음) 우편번호 서비스를 담은 모달이 열린다. 이 서비스는
 * 앱 키를 요구하지 않아 설정 없이 바로 동작한다. Storybook 은 그 스크립트를 로드하지 않으므로 모달
 * 안에는 '여기에 검색이 심어진다' 고 **명시된** 자리를 둔다 — 검색창을 그린 척하지 않는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   DocumentFormShell → Card + 토큰만 쓴 <h2> + 저장 툴바(Button) + Alert(danger)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   폼 껍데기(DocumentFormShell) → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   주소(읽기 전용) + 주소 검색  → FormField + input[readOnly] + Button(secondary)
 *   주소 검색 모달               → Modal(제목 '주소 검색' + 닫기 푸터) + 위젯이 앉을 자리
 *   상세주소                     → FormField + input(controlStyle)
 *   교통편(최대 1000자 · 5행)    → FormField + textarea(controlStyle 확장)
 *   저장 실패 배너               → Alert(danger)
 *   조회 실패 + 다시 시도         → Alert(danger) + Button(secondary)
 *   첫 조회 스켈레톤             → Skeleton ×4
 *   저장 툴바                    → 토큰만 쓴 <p>(변경 여부) + Button(primary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import { Alert, Button, Card, FormField, Modal, Skeleton, cssVar, typography } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Company/Directions',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수(실화면 directions/types 미러) ─────────────────────────────────────────────────────── */

const ADDRESS_MAX_LENGTH = 200;
const ADDRESS_DETAIL_MAX_LENGTH = 100;
const TRANSIT_MAX_LENGTH = 1000;

/* ── 데모 데이터(실화면 data-source 의 DIRECTIONS_SEED 미러) ─────────────────────────────────── */

interface DirectionsValues {
  /** 검색으로 고른 주소 한 줄 — 층·호수는 여기 없다 */
  readonly address: string;
  readonly addressDetail: string;
  readonly transit: string;
}

const EMPTY_DIRECTIONS: DirectionsValues = {
  address: '',
  addressDetail: '',
  transit: '',
};

const SEED_DIRECTIONS: DirectionsValues = {
  address: '서울특별시 예시구 가상대로 123',
  addressDetail: '예시타워 8층',
  transit:
    '지하철: 2호선 예시역 3번 출구에서 도보 5분\n버스: 간선 000, 지선 0000 예시타워 정류장 하차\n주차: 건물 지하 1~3층(방문 2시간 무료)',
};

/** 검증 오류 데모 — 실화면 directionsSchema(zod) 가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly address?: string;
  readonly addressDetail?: string;
  readonly transit?: string;
}

const DEMO_ERRORS: FieldErrors = {
  address: '주소를 입력하세요.',
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

/** 주소 입력 + 검색 버튼 — 실화면 addressRowStyle 미러 */
const addressRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'stretch',
  gap: cssVar('space.2'),
  minWidth: 0,
};

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

/**
 * 읽기 전용 주소 칸 — 누르면 모달이 열리므로 커서가 포인터다.
 *
 * 입력이 남는 폭을 가져가고(`flex: 1 1 auto` · `minWidth: 0`) 버튼은 레이블 폭 아래로 눌리지 않는다
 * — DS Button 이 `white-space: nowrap` 이기 때문이다(그 선언이 없던 동안 '주소 검색' 이 접혔다).
 */
const addressInputStyle = (invalid: boolean): CSSProperties => ({
  ...controlStyle(invalid),
  flex: '1 1 auto',
  minWidth: 0,
  cursor: 'pointer',
});

/** 교통편 textarea — 실화면 textareaStyle 미러(controlStyle + 최소 높이 + 세로 리사이즈) */
const textareaStyle = (invalid: boolean): CSSProperties => ({
  ...controlStyle(invalid),
  minHeight: `calc(${cssVar('space.6')} * 3)`,
  resize: 'vertical',
});

/** 주소 검색 위젯(iframe)이 앉는 자리 — 실화면 hostStyle 미러 */
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

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const statusStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  alignItems: 'flex-start',
  minWidth: 0,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
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

interface DirectionsScreenProps {
  readonly loading?: boolean;
  readonly loadFailed?: boolean;
  readonly saving?: boolean;
  readonly initialDirty?: boolean;
  readonly serverError?: string | null;
  readonly errors?: FieldErrors;
  readonly seed?: DirectionsValues;
  /** 주소 검색 모달을 연 채로 보여준다 */
  readonly searchOpen?: boolean;
  /** 모달 안의 검색 위젯 상태 — 로딩·실패·정상을 각각 보여준다 */
  readonly searchState?: 'loading' | 'failed' | 'ready';
}

function DirectionsScreen({
  loading = false,
  loadFailed = false,
  saving = false,
  initialDirty = false,
  serverError = null,
  errors = {},
  seed = SEED_DIRECTIONS,
  searchOpen = false,
  searchState = 'ready',
}: DirectionsScreenProps) {
  const [address, setAddress] = useState(seed.address);
  const [addressDetail, setAddressDetail] = useState(seed.addressDetail);
  const [transit, setTransit] = useState(seed.transit);
  const [dirty, setDirty] = useState(initialDirty);
  const [modalOpen, setModalOpen] = useState(searchOpen);

  const disabled = saving || loading;
  const touch = (): void => setDirty(true);

  if (loadFailed) {
    return (
      <div style={pageStyle}>
        <h1 style={pageTitleStyle}>오시는 길</h1>
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
      <h1 style={pageTitleStyle}>오시는 길</h1>
      <p style={descriptionStyle}>
        별표(*)는 꼭 입력해야 하는 항목이에요. 주소는 &lsquo;주소 검색&rsquo;으로 찾아서 골라요.
      </p>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <Card>
          <div style={cardBodyStyle}>
            <h2 style={cardTitleStyle}>오시는 길</h2>

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
                  htmlFor="dir-address"
                  label="주소"
                  required
                  hint="주소 칸이나 '주소 검색' 버튼을 누르면 검색창이 열려요. 층·호수는 아래 상세주소에 적어 주세요."
                  {...(errors.address !== undefined && { error: errors.address })}
                >
                  <div style={addressRowStyle}>
                    <input
                      id="dir-address"
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
                  htmlFor="dir-address-detail"
                  label="상세주소"
                  hint="건물명·층·호수 등 (선택)"
                  {...(errors.addressDetail !== undefined && { error: errors.addressDetail })}
                >
                  <input
                    id="dir-address-detail"
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

                <FormField
                  htmlFor="dir-transit"
                  label="교통편"
                  hint="지하철·버스·주차 안내 등 (선택). 정문 위치처럼 주소만으로는 찾기 어려운 안내도 여기에 적어 주세요."
                  {...(errors.transit !== undefined && { error: errors.transit })}
                >
                  <textarea
                    id="dir-transit"
                    style={textareaStyle(errors.transit !== undefined)}
                    rows={5}
                    maxLength={TRANSIT_MAX_LENGTH}
                    placeholder="예: 지하철 2호선 예시역 3번 출구 도보 5분"
                    disabled={disabled}
                    aria-invalid={errors.transit !== undefined}
                    value={transit}
                    onChange={(event) => {
                      setTransit(event.target.value);
                      touch();
                    }}
                  />
                </FormField>

                <p style={hintStyle}>
                  주소 검색은 카카오(다음) 우편번호 서비스를 그대로 써요. 따로 설정할 것은 없어요.
                </p>
              </div>
            )}

            <div style={actionsStyle}>
              <p style={hintStyle}>
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
            <p style={hintStyle} aria-busy="true">
              주소 검색을 여는 중이에요…
            </p>
          )}
          {searchState === 'failed' && (
            <div style={statusStyle}>
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

/** 기본: 저장된 오시는 길이 채워진 상태(변경 없음 → 저장 버튼 비활성) */
export const Default: Story = {
  render: () => <DirectionsScreen />,
};

/** 주소 검색 모달: 우편번호 검색이 심긴 상태 */
export const AddressSearchOpen: Story = {
  render: () => <DirectionsScreen searchOpen searchState="ready" />,
};

/** 주소 검색 모달(로딩): 검색 위젯을 심는 중 — 실패와 **다른 화면**이다(기다리면 되는 상태) */
export const AddressSearchLoading: Story = {
  render: () => <DirectionsScreen searchOpen searchState="loading" />,
};

/** 주소 검색 모달(실패): 검색 스크립트를 받지 못했다 — 다시 시도를 준다 */
export const AddressSearchFailed: Story = {
  render: () => <DirectionsScreen searchOpen searchState="failed" />,
};

/** 최초 로드: 카드 본문 스켈레톤 — 첫 조회에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <DirectionsScreen loading />,
};

/** 편집됨: 변경 있음 → 저장 버튼 활성 + '저장하지 않은 변경 사항이 있습니다' (이탈 가드 조건) */
export const Edited: Story = {
  render: () => <DirectionsScreen initialDirty />,
};

/** 검증 오류: 주소가 비어 있다 — zod 문구가 인라인으로 붙는다 */
export const ValidationError: Story = {
  render: () => <DirectionsScreen seed={EMPTY_DIRECTIONS} errors={DEMO_ERRORS} initialDirty />,
};

/** 조회 실패: 폼 대신 danger 배너 + 다시 시도 (EXC — 없는 폼을 반쯤 그리지 않는다) */
export const LoadFailed: Story = {
  render: () => <DirectionsScreen loadFailed />,
};
