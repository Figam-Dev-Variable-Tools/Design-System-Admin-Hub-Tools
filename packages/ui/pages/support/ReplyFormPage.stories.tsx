/**
 * Design System/Templates/Support/Reply Form — 문의 답변 템플릿 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/support/replies/new · /:id/edit` → 메뉴 en = "Support"(고객센터).
 * 목록은 같은 카테고리의 Support/Replies 스토리에 있다(packages/ui/pages/_data/pages.ts 의 Support 그룹).
 *
 * 대응 실화면: apps/admin/src/pages/support/replies/ReplyFormPage.tsx (라우트 /support/replies/new ·
 * /:id/edit). 실화면은 승격된 CRUD 프레임워크(useCrudForm + FormPageShell) 위에 필드 셋(제목·유형 태그·
 * 본문)만 주입한다. 본문은 치환 변수({{고객명}}·{{문의번호}}·{{담당자}})를 지원한다 — 티켓 상세가 삽입 시
 * 실제 값으로 채운다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다(레이어 경계). 실화면 껍데기(FormPageShell)와 앱 조각을 DS 표면으로 갈음한다:
 *   뒤로가기(FormPageShell)        → Button(ghost) + Icon(chevron-left)
 *   페이지 제목                    → 토큰만 쓴 <h1>(title.lg)
 *   카드 표면 · 카드 제목(CardTitle) → Card + 토큰만 쓴 <h2>(DS Card 는 표면만 소유 — 신규 컴포넌트 아님)
 *   제목 필드                      → TextField (필수·오류·maxLength)
 *   유형 태그                      → FormField + SelectField (전체 유형 + '(미사용)' 표기)
 *   본문                           → TextareaField (카운터·오류)
 *   치환 변수 안내                 → 토큰만 쓴 <p> + <code>
 *   상세 조회 스켈레톤(loadingDetail) → Skeleton ×4
 *   저장/취소                      → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Button,
  Card,
  FormField,
  Icon,
  SelectField,
  Skeleton,
  TextField,
  TextareaField,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Support/Reply Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 데모 데이터(실화면 support/_shared/domain·store 미러) ──────────────────────────────── */

const TITLE_MAX = 60;
const BODY_MAX = 1000;
const ALL_TAG = '';
const ALL_LABEL = '전체';

/** 유형 태그 옵션 — 실화면 listCategoryUsage 미러. 'legacy' 는 미사용(active=false)이라 '(미사용)' 표기 */
interface DemoCategory {
  readonly id: string;
  readonly label: string;
  readonly active: boolean;
}

const CATEGORIES: readonly DemoCategory[] = [
  { id: 'refund', label: '결제·환불', active: true },
  { id: 'delivery', label: '배송', active: true },
  { id: 'product', label: '상품 문의', active: true },
  { id: 'account', label: '계정', active: true },
  { id: 'legacy', label: '구 이벤트 문의', active: false },
];

interface SeedValues {
  readonly title: string;
  readonly categoryId: string;
  readonly body: string;
}

const EMPTY_SEED: SeedValues = { title: '', categoryId: ALL_TAG, body: '' };

const EDIT_SEED: SeedValues = {
  title: '배송 지연 사과 안내',
  categoryId: 'delivery',
  body: '{{고객명}}님, 문의({{문의번호}}) 주셔서 감사합니다. 배송 지연으로 불편을 드려 죄송합니다. 확인 후 빠르게 조치하겠습니다. 담당자 {{담당자}} 드림.',
};

/** 검증 오류 데모 — 실화면 zod 스키마(replyTemplateSchema)가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly title?: string;
  readonly body?: string;
}

const DEMO_ERRORS: FieldErrors = {
  title: '제목을 입력하세요.',
  body: '본문을 입력하세요.',
};

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.6'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backLinkStyle: CSSProperties = { alignSelf: 'flex-start' };

const pageTitleStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
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

const varHintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const codeStyle: CSSProperties = {
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderRadius: cssVar('radius.sm'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.default'),
  fontFamily: cssVar('primitive.typography.font-family.mono'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰만으로 조립하고 aria 로 잇는다) ── */

function FormCard({ title, children }: { title: string; children: ReactNode }) {
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

/* ── 제어형 화면(rules-of-hooks: Capitalized 컴포넌트에서 useState) ──────────────────────────── */

interface ReplyFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — FormPageShell loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function ReplyFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: ReplyFormScreenProps) {
  const [title, setTitle] = useState(seed.title);
  const [categoryId, setCategoryId] = useState(seed.categoryId);
  const [body, setBody] = useState(seed.body);
  const categoryFieldId = useId();

  return (
    <div style={pageStyle}>
      <span style={backLinkStyle}>
        <Button variant="ghost" iconLeft={<Icon name="chevron-left" />}>
          목록으로
        </Button>
      </span>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '답변 템플릿 수정' : '답변 템플릿 등록'}</h1>
        <p style={descriptionStyle}>
          자주 쓰는 답변을 템플릿으로 저장해 두면 티켓 답변 작성 시 골라 삽입할 수 있어요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <FormCard title="템플릿 내용">
          {loadingDetail ? (
            <div style={skeletonBodyStyle} aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
              ))}
            </div>
          ) : (
            <>
              <TextField
                id="template-title"
                label="제목"
                required
                value={title}
                maxLength={TITLE_MAX}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 배송 지연 사과 안내"
                error={errors.title ?? ''}
              />

              <FormField
                htmlFor={categoryFieldId}
                label="유형 태그"
                hint="특정 유형 티켓에만 노출돼요. '전체'는 모든 유형에 노출돼요."
              >
                <SelectField
                  id={categoryFieldId}
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  <option value={ALL_TAG}>{ALL_LABEL}</option>
                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.active ? category.label : `${category.label} (미사용)`}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              <TextareaField
                label="본문"
                required
                value={body}
                onChange={setBody}
                maxLength={BODY_MAX}
                placeholder="고객에게 보낼 답변 문구를 입력하세요."
                rows={6}
                error={errors.body ?? ''}
              />

              <p style={varHintStyle}>
                치환 변수: <code style={codeStyle}>{'{{고객명}}'}</code> ·{' '}
                <code style={codeStyle}>{'{{문의번호}}'}</code> ·{' '}
                <code style={codeStyle}>{'{{담당자}}'}</code> — 티켓에 삽입할 때 실제 값으로
                바뀌어요.
              </p>
            </>
          )}

          <div style={actionsStyle}>
            <Button type="button" variant="secondary">
              취소
            </Button>
            <Button type="submit" variant="primary" size="md">
              {isEdit ? '저장' : '등록'}
            </Button>
          </div>
        </FormCard>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 신규 답변 템플릿 입력 */
export const Default: Story = {
  render: () => <ReplyFormScreen />,
};

/** 수정: 기존 값이 채워진 폼(치환 변수를 담은 본문 포함) */
export const Edit: Story = {
  render: () => <ReplyFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(FormPageShell loadingDetail 미러) */
export const Loading: Story = {
  render: () => <ReplyFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 항목(제목·본문)을 비우고 제출했을 때 각 필드 인라인 오류 노출 */
export const ValidationError: Story = {
  render: () => <ReplyFormScreen errors={DEMO_ERRORS} />,
};
