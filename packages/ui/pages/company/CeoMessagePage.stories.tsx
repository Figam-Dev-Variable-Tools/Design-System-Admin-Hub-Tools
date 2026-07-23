/**
 * Design System/Templates/Company/CEO Message — CEO 인사말 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/company/ceo-message` → 메뉴 en = "Company"(기업 관리), 화면 en =
 * "CEO Message" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Company 그룹의
 * `['/company/ceo-message', 'CEO 인사말', 'CEO Message']`).
 *
 * 대응 실화면: apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx (라우트 /company/ceo-message).
 * 인사말도 회사당 1건인 **단일 문서 폼**이라 목록·검색·선택이 없다. 회사 정보와 같은 껍데기
 * (DocumentFormShell)를 쓰고 필드만 다르다: 제목 한 줄 + 긴 본문(textarea + 글자수) + 대표 사진.
 * 사진 칸은 본문 폭을 다 먹지 않도록 실화면이 별도 래퍼(maxWidth = space.6 × 10)로 좁혀 둔다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   DocumentFormShell → Card + 토큰만 쓴 <h2> + 저장 툴바(Button) + Alert(danger)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   폼 껍데기(DocumentFormShell) → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   제목(최대 120자)            → FormField + input(controlStyle)
 *   본문(최대 5000자 · 10행)     → TextareaField (라벨·글자수 카운터·오류를 스스로 소유)
 *   사진(선택)                  → ImageUploadField (폭 제한 래퍼 안)
 *   저장 실패 배너              → Alert(danger)
 *   조회 실패 + 다시 시도        → Alert(danger) + Button(secondary)
 *   첫 조회 스켈레톤            → Skeleton ×4
 *   저장 툴바                   → 토큰만 쓴 <p>(변경 여부) + Button(primary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 * 사진 미리보기는 인라인 SVG data: URI 로만 채운다(외부 자산 의존 0).
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FormField,
  ImageUploadField,
  Skeleton,
  TextareaField,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Company/CEO Message',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수(실화면 ceo-message/types 미러) ────────────────────────────────────────────────────── */

const TITLE_MAX_LENGTH = 120;
const BODY_MAX_LENGTH = 5000;

/* ── 데모 데이터(실화면 data-source 의 CEO_MESSAGE_SEED 미러) ────────────────────────────────── */

/** 인라인 SVG 인물 자리표시 — 외부 자산 없이 data: URI 로만 이미지를 흉내낸다 */
const PHOTO_DATA_URI = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="200" viewBox="0 0 160 200"><rect width="160" height="200" fill="steelblue"/><circle cx="80" cy="76" r="34" fill="white" opacity="0.85"/><rect x="30" y="122" width="100" height="60" rx="30" fill="white" opacity="0.85"/></svg>',
)}`;

interface CeoMessageValues {
  readonly title: string;
  readonly body: string;
  readonly photoUrl: string;
}

const EMPTY_MESSAGE: CeoMessageValues = { title: '', body: '', photoUrl: '' };

const SEED_MESSAGE: CeoMessageValues = {
  title: '고객과 함께 성장하는 기업이 되겠습니다',
  body:
    '안녕하십니까. 주식회사 예시플래닝을 찾아주신 여러분께 진심으로 감사드립니다.\n\n' +
    '저희는 공간 기획을 기반으로 고객의 문제를 함께 풀어 가는 것을 사명으로 삼고 있어요. ' +
    '앞으로도 정직과 신뢰를 바탕으로 더 나은 가치를 만들어 가겠습니다.\n\n대표이사 홍길동 드림',
  photoUrl: PHOTO_DATA_URI,
};

/** 검증 오류 데모 — 실화면 ceoMessageSchema(zod) 가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly title?: string;
  readonly body?: string;
  readonly photoUrl?: string;
}

const DEMO_ERRORS: FieldErrors = {
  title: '제목을 입력하세요.',
  body: '본문을 입력하세요.',
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

/** 사진 칸은 본문 폭을 다 먹지 않는다 — 실화면 photoWrapStyle 미러 */
const photoWrapStyle: CSSProperties = {
  maxWidth: `calc(${cssVar('space.6')} * 10)`,
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

interface CeoMessageScreenProps {
  readonly loading?: boolean;
  readonly loadFailed?: boolean;
  readonly saving?: boolean;
  readonly initialDirty?: boolean;
  readonly serverError?: string | null;
  readonly errors?: FieldErrors;
  readonly seed?: CeoMessageValues;
}

function CeoMessageScreen({
  loading = false,
  loadFailed = false,
  saving = false,
  initialDirty = false,
  serverError = null,
  errors = {},
  seed = SEED_MESSAGE,
}: CeoMessageScreenProps) {
  const [title, setTitle] = useState(seed.title);
  const [body, setBody] = useState(seed.body);
  const [photoUrl, setPhotoUrl] = useState(seed.photoUrl);
  const [dirty, setDirty] = useState(initialDirty);

  const disabled = saving || loading;
  const touch = (): void => setDirty(true);

  if (loadFailed) {
    return (
      <div style={pageStyle}>
        <h1 style={pageTitleStyle}>CEO 인사말</h1>
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
      <h1 style={pageTitleStyle}>CEO 인사말</h1>
      <p style={descriptionStyle}>
        별표(*) 항목은 필수예요. 저장하면 사용자 화면의 인사말 페이지에 반영돼요.
      </p>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <Card>
          <div style={cardBodyStyle}>
            <h2 style={cardTitleStyle}>CEO 인사말</h2>

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
                  htmlFor="ceo-title"
                  label="제목"
                  required
                  {...(errors.title !== undefined && { error: errors.title })}
                >
                  <input
                    id="ceo-title"
                    type="text"
                    style={controlStyle(errors.title !== undefined)}
                    maxLength={TITLE_MAX_LENGTH}
                    placeholder="예: 고객과 함께 성장하는 기업이 되겠습니다"
                    disabled={disabled}
                    aria-invalid={errors.title !== undefined}
                    value={title}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      touch();
                    }}
                  />
                </FormField>

                <TextareaField
                  label="본문"
                  required
                  value={body}
                  maxLength={BODY_MAX_LENGTH}
                  disabled={disabled}
                  error={errors.body ?? ''}
                  placeholder="인사말 본문을 입력하세요."
                  rows={10}
                  onChange={(value) => {
                    setBody(value);
                    touch();
                  }}
                />

                <div style={photoWrapStyle}>
                  <ImageUploadField
                    label="사진"
                    value={photoUrl}
                    disabled={disabled}
                    error={errors.photoUrl ?? ''}
                    hint="대표/CEO 사진 URL (선택). 이미지를 끌어다 놓거나 클릭해 업로드해요."
                    onChange={(value) => {
                      setPhotoUrl(value);
                      touch();
                    }}
                  />
                </div>
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
    </div>
  );
}

/** 정상: 저장된 인사말이 채워진 기본 상태(변경 없음 → 저장 버튼 비활성) */
export const Default: Story = {
  render: () => <CeoMessageScreen />,
};

/** 최초 로드: 카드 본문 스켈레톤 — 첫 조회에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <CeoMessageScreen loading />,
};

/** 편집됨: 변경 있음 → 저장 버튼 활성 + '저장하지 않은 변경 사항이 있습니다' (이탈 가드 조건) */
export const Edited: Story = {
  render: () => <CeoMessageScreen initialDirty />,
};

/** 검증 오류: 제목·본문을 비우고 제출 — zod 문구가 인라인으로 붙고 본문 카운터는 0 을 가리킨다 */
export const ValidationError: Story = {
  render: () => <CeoMessageScreen seed={EMPTY_MESSAGE} errors={DEMO_ERRORS} initialDirty />,
};

/** 저장 중: 폼 잠금 + 저장 버튼 '저장 중…' (중복 제출 차단) */
export const Saving: Story = {
  render: () => <CeoMessageScreen saving initialDirty />,
};
