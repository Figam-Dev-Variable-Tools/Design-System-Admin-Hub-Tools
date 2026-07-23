/**
 * Pages/Products/Product Registration — SCR-003 상품 등록 폼 (조립 전용, 담당: 스토리북 페이지 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명(`Pages/Products` = 상품 관리)이다 — 메뉴 개요는 같은 카테고리의
 * Overview 스토리 (pages/menus/ProductsOverview.stories.tsx) 에 있다.
 *
 * 대응 화면정의서: docs/plan/ui/SCR-003-product-registration.md
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 컴포넌트를 만들지 않는다.
 * SCR-003 §4 의 논리 모듈 ↔ 실제 DS 컴포넌트 매핑:
 *   상품명 → TextField · 상품 설명 → TextareaField · 판매가/재고 → TextField(type="number", NumberField 부재)
 *   카테고리 → FormField + SelectField · 대표 이미지 → ImageUploadField · 추가 이미지 → ImageGalleryField
 *   노출 여부 → ToggleSwitch · 안내 배너 → Alert · [임시저장]/[등록] → Button
 * (FormSection·NumberField·EmptyState·Badge 는 대응 DS 컴포넌트가 없어 아래처럼 대체한다 —
 *  섹션 구획은 토큰만 쓴 로컬 레이아웃 래퍼, 숫자 입력은 TextField type="number", '대표'는 별도 필드로 분리.)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(cssVar/typography)만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import {
  Alert,
  Button,
  FormField,
  ImageGalleryField,
  ImageUploadField,
  SelectField,
  TextField,
  TextareaField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';
import type { AlertTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Products/Product Registration',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/** 토큰 배수 치수 — px 리터럴 대신 space 토큰의 calc 배수만 쓴다 */
const size = (multiple: number): string => `calc(${cssVar('space.6')} * ${multiple})`;

/** §3.3 정상: 활성 카테고리를 이름 가나다순으로 정렬한 단일 선택 옵션 */
const CATEGORIES = ['가구', '데스크테리어', '사무기기', '수납', '조명'] as const;

/** 인라인 데모 이미지 — 외부 URL 금지, data: URI 만 사용 (hex/px 문자열 없이 명명 색상·viewBox 숫자만) */
const swatch = (label: string, fill: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120">` +
      `<rect width="160" height="120" fill="${fill}"/>` +
      `<text x="80" y="66" font-family="sans-serif" font-size="13" fill="dimgray" text-anchor="middle">${label}</text>` +
      `</svg>`,
  )}`;

/** 폼 값 형태 — 도메인 값만 담는다(검증·API 는 화면 조립 밖의 책임) */
interface FormValues {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  cover: string;
  gallery: readonly string[];
  visible: boolean;
}

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY_VALUES: FormValues = {
  name: '',
  description: '',
  price: '',
  stock: '',
  category: '',
  cover: '',
  gallery: [],
  visible: true,
};

const FILLED_VALUES: FormValues = {
  name: '무소음 인체공학 오피스 체어',
  description:
    '메쉬 등받이와 4D 팔걸이를 갖춘 사무용 의자예요. 장시간 착석에도 목·허리 부담이 적어요.',
  price: '189000',
  stock: '120',
  category: '가구',
  cover: swatch('대표 이미지', 'gainsboro'),
  gallery: [swatch('상세 1', 'whitesmoke'), swatch('상세 2', 'lightsteelblue')],
  visible: true,
};

/** 로컬 레이아웃 래퍼 — DS 컴포넌트가 아니라 토큰만 쓴 섹션 구획이다(FormSection 부재 대체) */
function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <section
      style={{
        border: `thin solid ${cssVar('color.border.default')}`,
        borderRadius: cssVar('radius.lg'),
        padding: cssVar('space.5'),
        background: cssVar('color.surface.default'),
        display: 'grid',
        gap: cssVar('space.4'),
      }}
    >
      <h2
        style={{
          ...typography('typography.label.md'),
          color: cssVar('color.text.muted'),
          margin: 0,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

const twoColStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(${size(6)}, 1fr))`,
  gap: cssVar('space.4'),
};

const toggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.4'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
};

/** 제어형 상품 등록 폼 — useState 로 값 소유(hooks-of-rules 준수: Decorator 화살표가 아닌 Capitalized 컴포넌트) */
function ProductRegistrationForm({
  initialValues = EMPTY_VALUES,
  errors = {},
  banner = null,
  submitting = false,
}: {
  initialValues?: FormValues;
  errors?: FieldErrors;
  banner?: { tone: AlertTone; message: string } | null;
  submitting?: boolean;
}): JSX.Element {
  const [values, setValues] = useState<FormValues>(initialValues);

  const set = <K extends keyof FormValues>(key: K, val: FormValues[K]): void =>
    setValues((prev) => ({ ...prev, [key]: val }));

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      style={{
        display: 'grid',
        gap: cssVar('space.5'),
        padding: cssVar('space.6'),
        maxInlineSize: size(30),
        marginInline: 'auto',
        background: cssVar('color.surface.default'),
        color: cssVar('color.text.default'),
      }}
    >
      <h1 style={{ ...typography('typography.title.lg'), margin: 0 }}>상품 등록</h1>

      {/* 폼 상단 배너 — §3 등록-에러(c)/§3.2 복원·성공 안내가 서는 자리 */}
      {banner ? <Alert tone={banner.tone}>{banner.message}</Alert> : null}

      {/* 기본 정보 — §5.2 상품명(필수) · 상품 설명(선택, 최대 2,000자) */}
      <Section title="기본 정보">
        <TextField
          id="prod-name"
          label="상품명"
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          required
          disabled={submitting}
          placeholder="예: 무소음 인체공학 오피스 체어"
          error={errors.name ?? ''}
        />
        <TextareaField
          label="상품 설명"
          value={values.description}
          onChange={(v) => set('description', v)}
          maxLength={2000}
          rows={5}
          disabled={submitting}
          placeholder="상품의 특징·소재·사용 시 유의점을 입력해 주세요."
          hint="최대 2,000자까지 입력할 수 있어요."
          error={errors.description ?? ''}
        />
      </Section>

      {/* 가격 · 재고 — §5.2 판매가(필수) · 재고 수량(필수). NumberField 부재로 TextField type="number" 대체 */}
      <Section title="가격 · 재고">
        <div style={twoColStyle}>
          <TextField
            id="prod-price"
            label="판매가 (원)"
            type="number"
            value={values.price}
            onChange={(e) => set('price', e.target.value)}
            required
            disabled={submitting}
            inputMode="numeric"
            placeholder="100"
            error={errors.price ?? ''}
          />
          <TextField
            id="prod-stock"
            label="재고 수량"
            type="number"
            value={values.stock}
            onChange={(e) => set('stock', e.target.value)}
            required
            disabled={submitting}
            inputMode="numeric"
            placeholder="0"
            error={errors.stock ?? ''}
          />
        </div>
      </Section>

      {/* 카테고리 — §3.3 단일 선택. SelectField 는 라벨을 안 그리므로 FormField 로 라벨·오류를 감싼다 */}
      <Section title="카테고리">
        <FormField htmlFor="prod-category" label="카테고리" required error={errors.category ?? ''}>
          <SelectField
            id="prod-category"
            value={values.category}
            onChange={(e) => set('category', e.target.value)}
            isInvalid={Boolean(errors.category)}
            disabled={submitting}
          >
            <option value="">카테고리를 선택해 주세요.</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
        </FormField>
      </Section>

      {/* 상품 이미지 — §3.1/§5.2 1~5장. '대표'(§5.3 규칙 6)를 별도 필드로 분리하고 추가 이미지는 갤러리로 */}
      <Section title="상품 이미지">
        <ImageUploadField
          label="대표 이미지"
          value={values.cover}
          onChange={(url) => set('cover', url)}
          required
          disabled={submitting}
          hint="JPG·PNG·WebP, 1장당 5MB 이하. 첫 번째 이미지가 대표로 노출돼요."
          error={errors.cover ?? ''}
        />
        <ImageGalleryField
          label="추가 이미지"
          values={values.gallery}
          onChange={(urls) => set('gallery', urls)}
          maxFiles={4}
          disabled={submitting}
          hint="대표 이미지를 포함해 최대 5장까지 등록할 수 있어요."
          error={errors.gallery ?? ''}
        />
      </Section>

      {/* 노출 여부 — ToggleSwitch(라벨은 aria 전용)에 가시 라벨을 나란히 둔다 */}
      <Section title="노출 설정">
        <div style={toggleRowStyle}>
          <span
            style={{ ...typography('typography.label.md'), color: cssVar('color.text.default') }}
          >
            상품 목록에 노출
          </span>
          <ToggleSwitch
            label="상품 노출 여부"
            checked={values.visible}
            onChange={(next) => set('visible', next)}
            disabled={submitting}
            onLabel="노출"
            offLabel="숨김"
          />
        </div>
      </Section>

      {/* 이중 액션 — §5.3 규칙 1: [임시저장] secondary · [등록] primary. 규칙 4: 진행 중 양쪽 비활성 */}
      <div style={actionsStyle}>
        <Button variant="secondary" type="button" disabled={submitting}>
          임시저장
        </Button>
        <Button variant="primary" type="button" loading={submitting}>
          등록
        </Button>
      </div>
    </form>
  );
}

/** 빈 등록 폼 — §3 등록-정상 진입 직후 */
export const Default: Story = {
  render: () => <ProductRegistrationForm />,
};

/** 값이 채워진 상태 — 전 필드 입력 + 대표/추가 이미지 + 노출 ON */
export const Filled: Story = {
  render: () => <ProductRegistrationForm initialValues={FILLED_VALUES} />,
};

/** 필수 누락/형식 오류 — 관련 필드 인라인 에러 + 폼 상단 Alert(danger) (§3 등록-에러 a, §5.2) */
export const ValidationError: Story = {
  render: () => (
    <ProductRegistrationForm
      initialValues={{
        ...EMPTY_VALUES,
        name: '',
        price: '50',
        stock: '',
        category: '',
        cover: '',
        gallery: [],
      }}
      banner={{
        tone: 'danger',
        message: '입력값을 확인해 주세요. 필수 항목이 비어 있거나 형식에 맞지 않아요.',
      }}
      errors={{
        name: '상품명을 입력해 주세요.',
        price: '판매가는 100원 이상 100,000,000원 이하로 입력해 주세요.',
        stock: '재고 수량을 입력해 주세요.',
        category: '카테고리를 선택해 주세요.',
        cover: '상품 이미지를 1장 이상 등록해 주세요.',
      }}
    />
  ),
};

/** 저장 중 — [등록] loading + 폼 전 입력 요소 및 [임시저장] 비활성 (§3 등록-로딩, §5.3 규칙 4) */
export const Submitting: Story = {
  render: () => <ProductRegistrationForm initialValues={FILLED_VALUES} submitting />,
};
