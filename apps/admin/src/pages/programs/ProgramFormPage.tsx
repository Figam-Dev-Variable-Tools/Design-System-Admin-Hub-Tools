// ProgramFormPage — 프로그램(펀딩) 등록/수정 (라우트: /programs/new · /programs/:id/edit)
//
// [프레임워크 재사용 + 다중 구획 레이아웃] 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 그대로
// 쓰고, 화면은 구획 카드(기본정보·펀딩설정·스토리·상세설명·이미지·옵션·리워드) + 좌측 구획 목차 레일 +
// 우측 실시간 미리보기로 구성한다. 상품 등록 폼(ProductFormPage)과 같은 골격이다 —
// FormPageShell 은 단일 카드 폼 전용이라, 다중 구획 + 미리보기 2단은 여기서 직접 배치한다.
//
// [무엇을 입력하는가] 후원형 펀딩은 '목표 금액 · 기간 · 리워드' 세 가지가 계약의 전부다. 모금액과
// 후원자수는 **후원이 만드는 값**이라 이 폼에 없다 (ProgramInput 이 그렇게 좁혀져 있다).
//
// [세 쌍은 일부러 갈라져 있다]
//   이미지  — 썸네일(목록·카드에서 작게) ↔ 대표 이미지(상세 상단에 크게). 같은 그림을 두 자리에
//             쓰면 한쪽이 반드시 잘린다.
//   본문    — 스토리('왜 만들었나'를 파는 글) ↔ 상세 설명(사양·구성·유의사항처럼 사실을 확인하는 글).
//   옵션    — 정의는 프로그램(옵션 그룹)이 갖고, **적용은 리워드가 고른다**(리워드별 옵션 선택).
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { cssVar, isRichTextEmpty, sanitizeRichText } from '@tds/ui';

import './program-form.css';
import { formatNumber } from '../../shared/format';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  checkboxStyle,
  controlStyle,
  ddStyle,
  dlStyle,
  dtStyle,
  errorIdOf,
  errorTextStyle,
  fieldLabelStyle,
  FilterRail,
  FormField,
  formDateRowStyle,
  formRowStyle,
  FormSectionAnchor,
  FormSectionNav,
  hintStyle,
  Icon,
  ImageThumb,
  ImageUploadField,
  pageTitleStyle,
  RichTextField,
  scrollToSection,
  SelectField,
  StatusBadge,
  tableStyle,
  tdStyle,
  thStyle,
  useActiveSection,
  useUnsavedChangesDialog,
} from '../../shared/ui';
import type { FormSectionItem } from '../../shared/ui';
import {
  FormConflictDialog,
  FormServerError,
  submitButtonLabel,
  useCrudForm,
} from '../../shared/crud';
import { ForbiddenScreen } from '../../shared/errors/ErrorScreens';
// 후원 금액을 노출·입력할 수 있는가는 이 폼이 정하지 않는다 — 사이트 전역 결제 연동 상태의 결과다
// (상품 폼의 판매가와 같은 함수를 부른다: 두 화면이 다른 답을 말할 수 없게 하는 유일한 방법이다)
import { readPaymentSettings } from '../../shared/commerce/payment-settings';
import { PgLockNotice } from '../../shared/commerce/PgLockNotice';
import { resolvePriceDisplay } from '../../shared/commerce/price-display';
import { fetchProgramCategoryOptions, programAdapter } from './data-source';
import { programSchema } from './validation';
import type { ProgramFormValues } from './validation';
import {
  fundingSummary,
  fundingTone,
  PROGRAM_STATUS_OPTIONS,
  programOptionSummary,
  programStatusLabel,
  programStatusTone,
  rewardOptionSummary,
} from './types';
import {
  applyOptionGroupsToRewards,
  daysLeft,
  MAX_PROGRAM_OPTION_GROUPS,
  normalizeProgramOptionGroups,
  PROGRAM_DESCRIPTION_MAX,
  PROGRAM_SUMMARY_MAX,
  PROGRAM_TITLE_MAX,
} from './_shared/store';
import type { Program, ProgramInput } from './_shared/store';

const RESOURCE = 'programs';
const ENTITY_LABEL = '프로그램';
const LIST_PATH = '/programs';
const UNSAVED_MESSAGE =
  '프로그램에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

/**
 * 남은 일수의 기준일 — 목록 화면(ProgramListPage)과 같은 고정 기준일이다.
 *
 * daysLeft 는 `today` 를 인자로 받는다(store.ts 머리말): 화면이 `new Date()` 를 읽으면 미리보기의
 * '남은 일수'가 실행하는 날마다 달라져 스토리북 회귀 비교가 매일 깨진다.
 * 백엔드가 붙으면 이 상수는 서버가 내려주는 기준 시각으로 바뀐다.
 */
const TODAY = '2026-07-21';

/**
 * 스토리 카운터의 분모.
 *
 * programSchema 는 스토리 길이를 제한하지 않는다 — 창작자의 서술을 자를 이유가 없기 때문이다.
 * 그래서 이 값은 검증이 아니라 **작성 가이드**다(넘겨도 저장은 막히지 않는다). RichTextField 는
 * 카운터를 그리기 위해 분모를 요구하므로 화면이 정한다.
 */
const STORY_GUIDE_MAX = 5000;

/**
 * 폼 구획 — 좌측 레일의 한 줄이자 본문의 한 앵커.
 *
 * fields 는 그 구획이 책임지는 폼 필드다. 이 표가 있어야 레일이 '어느 구획에 오류가 있는지'를
 * 스스로 말할 수 있다 — 화면 어딘가에 흩어진 조건문으로 다시 적지 않는다.
 */
const SECTIONS = [
  {
    id: 'program-section-basic',
    label: '기본 정보',
    fields: ['title', 'creator', 'categoryId', 'summary'],
  },
  {
    id: 'program-section-funding',
    label: '펀딩 설정',
    fields: ['goalAmount', 'startDate', 'endDate', 'status'],
  },
  { id: 'program-section-story', label: '스토리', fields: ['story'] },
  { id: 'program-section-description', label: '상세 설명', fields: ['description'] },
  // 이미지는 두 자리(카드·상세 상단)를 함께 받으므로 구획 이름이 '대표 이미지' 가 아니라 '이미지' 다
  { id: 'program-section-images', label: '이미지', fields: ['thumbnailUrl', 'coverImageUrl'] },
  { id: 'program-section-options', label: '옵션', fields: ['optionGroups'] },
  { id: 'program-section-rewards', label: '리워드', fields: ['rewards'] },
] as const satisfies readonly {
  id: string;
  label: string;
  fields: readonly (keyof ProgramFormValues)[];
}[];

/** 문서 순서대로 고정한 앵커 id — useActiveSection 이 렌더마다 관측자를 다시 붙이지 않게 모듈 상수다 */
const SECTION_IDS: readonly string[] = SECTIONS.map((section) => section.id);

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  cursor: 'pointer',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

/* ── 미리보기 (후원자에게 보일 요약) ──────────────────────────────────────── */

const previewCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  boxSizing: 'border-box',
  width: '100%',
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
};

const previewTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  lineHeight: cssVar('typography.label.md.line-height'),
  overflowWrap: 'anywhere',
};

const previewSummaryStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
  overflowWrap: 'anywhere',
};

const previewBadgeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
};

/* ── 리워드 편집기 ─────────────────────────────────────────────────────────── */

const rewardSectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const tableWrapStyle: CSSProperties = {
  width: '100%',
  overflowX: 'auto',
};

const rewardTextInputStyle: CSSProperties = {
  ...controlStyle(false),
  minWidth: `calc(${cssVar('space.6')} * 4)`,
};

const rewardNumberInputStyle: CSSProperties = {
  ...controlStyle(false),
  width: `calc(${cssVar('space.6')} * 3)`,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const iconButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.1'),
  paddingRight: cssVar('space.1'),
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.feedback.danger.text'),
  cursor: 'pointer',
};

const disabledIconButtonStyle: CSSProperties = {
  ...iconButtonStyle,
  color: cssVar('color.text.disabled'),
  cursor: 'not-allowed',
};

/** 리워드 한 줄 — 폼 값의 원소(zod 스키마가 정본이라 여기서 다시 정의하지 않는다) */
type RewardValue = ProgramFormValues['rewards'][number];

/** 옵션 그룹 한 줄 — 같은 이유로 스키마에서 되짚는다 */
type OptionGroupValue = ProgramFormValues['optionGroups'][number];

/** 숫자 칸은 숫자만 남긴다 — '1,000원' 을 붙여 넣어도 값이 깨지지 않게 한다 */
const toDigits = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
};

/* ── 옵션 편집기 ───────────────────────────────────────────────────────────── */

const optionSectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const optionRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 4) minmax(0, 1fr) auto`,
  alignItems: 'center',
  gap: cssVar('space.2'),
};

/** 리워드 표 안의 옵션 선택 묶음 — 체크박스가 칸을 넘치지 않게 세로로 쌓는다 */
const optionPickerStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  marginTop: 0,
  marginBottom: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
  minWidth: `calc(${cssVar('space.6')} * 4)`,
};

const optionPickerLabelStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
  cursor: 'pointer',
};

interface OptionEditorProps {
  readonly optionGroups: readonly OptionGroupValue[];
  readonly disabled: boolean;
  readonly error?: string | undefined;
  readonly onChange: (next: OptionGroupValue[]) => void;
}

/**
 * 옵션 그룹 편집기 — 상품 폼의 ProductOptionMatrix 에서 **매트릭스만 뺀 것**이다.
 *
 * [왜 SKU 매트릭스가 없나] 상품은 옵션 조합마다 재고·SKU 가 붙어 데카르트 곱을 표로 펼쳐야 한다.
 * 펀딩에는 그 축이 없다 — 후원자는 조합을 사는 것이 아니라 **리워드를 고르고**, 색상·사이즈는
 * 그 리워드를 받을 때 함께 정하는 값이다. 그래서 여기서는 '무엇을 고를 수 있는가'(그룹·값)만
 * 정의하고, '어느 리워드가 그것을 고르게 하는가'는 아래 리워드 표가 정한다.
 */
function OptionEditor({ optionGroups, disabled, error, onChange }: OptionEditorProps) {
  const addGroup = () => {
    if (optionGroups.length >= MAX_PROGRAM_OPTION_GROUPS) return;
    // randomUUID 라 같은 밀리초에 두 번 눌러도 id 가 겹치지 않는다 — 리워드가 이 id 로 그룹을 가리킨다
    onChange([...optionGroups, { id: `pog-${crypto.randomUUID()}`, name: '', values: [] }]);
  };

  const removeGroup = (id: string) => {
    onChange(optionGroups.filter((group) => group.id !== id));
  };

  const patchGroup = (id: string, patch: Partial<Omit<OptionGroupValue, 'id'>>) => {
    onChange(optionGroups.map((group) => (group.id === id ? { ...group, ...patch } : group)));
  };

  return (
    <div style={optionSectionStyle}>
      <span style={fieldLabelStyle}>옵션</span>
      <p style={hintStyle}>
        색상·사이즈처럼 후원자가 리워드를 받을 때 함께 고르는 값이에요. 옵션값은 쉼표(,)로
        구분하세요. 여기서는 선택지를 정의만 하고, 어느 리워드가 고르게 할지는 아래 리워드 표에서
        정해요. (최대 {MAX_PROGRAM_OPTION_GROUPS}개)
      </p>

      {optionGroups.length === 0 ? (
        <p style={hintStyle}>
          등록된 옵션이 없어요. 고를 것이 없는 프로그램(책 한 권 등)은 비워 두어도 돼요.
        </p>
      ) : (
        <div style={optionSectionStyle}>
          {optionGroups.map((group, index) => (
            <div key={group.id} style={optionRowStyle}>
              <input
                type="text"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(false)}
                value={group.name}
                placeholder={`옵션명 ${String(index + 1)} (예: 색상)`}
                disabled={disabled}
                aria-label={`옵션 ${String(index + 1)} 이름`}
                onChange={(event) => patchGroup(group.id, { name: event.target.value })}
              />
              <input
                type="text"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(false)}
                value={group.values.join(', ')}
                placeholder="옵션값 (예: 블랙, 화이트, 베이지)"
                disabled={disabled}
                aria-label={`옵션 ${String(index + 1)} 값`}
                onChange={(event) =>
                  patchGroup(group.id, {
                    values: event.target.value
                      .split(',')
                      .map((value) => value.trim())
                      .filter((value) => value !== ''),
                  })
                }
              />
              <button
                type="button"
                className="tds-ui-focusable"
                style={iconButtonStyle}
                disabled={disabled}
                aria-label={`옵션 ${String(index + 1)} 삭제`}
                onClick={() => removeGroup(group.id)}
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>
      )}

      {optionGroups.length < MAX_PROGRAM_OPTION_GROUPS && (
        <span>
          <Button variant="secondary" size="md" disabled={disabled} onClick={addGroup}>
            <Icon name="plus-circle" />
            옵션 추가
          </Button>
        </span>
      )}

      {error !== undefined && error !== '' && (
        <p role="alert" style={errorTextStyle}>
          {error}
        </p>
      )}
    </div>
  );
}

interface RewardEditorProps {
  readonly rewards: readonly RewardValue[];
  /** 리워드가 고를 수 있는 선택지 — 값이 채워진 그룹만 넘어온다 */
  readonly optionGroups: readonly OptionGroupValue[];
  readonly disabled: boolean;
  /**
   * 후원 금액 입력을 잠글 것인가 — resolvePriceDisplay 가 낸 답이다(이 편집기가 다시 판단하지 않는다).
   *
   * **잠겨도 값은 남는다**: 이미 정해 둔 금액은 그대로 저장되고, 결제 연동을 마치면 살아난다.
   * 금액 말고 다른 칸(리워드명·설명·수량·옵션)은 잠기지 않는다 — 결제가 없어도 '무엇을 주는가' 는
   * 계속 다듬는 값이고, 문의로 들어온 요청의 품목 명세가 된다(상품의 옵션과 같은 결).
   */
  readonly amountFieldsLocked: boolean;
  /** 왜 잠겼는지 — 목록·상세가 쓰는 것과 같은 문장 */
  readonly lockReason: string;
  readonly error?: string | undefined;
  readonly onChange: (next: RewardValue[]) => void;
}

/**
 * 리워드 목록 편집기.
 *
 * [왜 이 화면 안에 있나] 소비자가 이 폼 하나다 — 공유될 때 옮긴다(shared/ui README 규칙 1).
 * [왜 이미 후원된 리워드를 못 지우나] claimedCount 는 **후원자가 이미 고른 수**다. 그 줄을 지우면
 * 후원자가 무엇을 받기로 했는지 가리키는 곳이 사라진다 — 서버도 같은 이유로 막는다.
 */
function RewardEditor({
  rewards,
  optionGroups,
  disabled,
  amountFieldsLocked,
  lockReason,
  error,
  onChange,
}: RewardEditorProps) {
  const patch = (id: string, next: Partial<RewardValue>) => {
    onChange(rewards.map((reward) => (reward.id === id ? { ...reward, ...next } : reward)));
  };

  const addReward = () => {
    onChange([
      ...rewards,
      {
        // 화면에서 만든 임시 id — 저장 뒤에는 서버가 준 id 로 대체된다.
        // randomUUID 라 같은 밀리초에 두 번 눌러도 key 가 겹치지 않는다.
        id: `rw-${crypto.randomUUID()}`,
        title: '',
        amount: 0,
        description: '',
        limitCount: 0,
        claimedCount: 0,
        // 옵션은 기본으로 붙이지 않는다 — 고르게 할지는 리워드마다 다른 결정이다
        optionGroupIds: [],
      },
    ]);
  };

  const removeReward = (id: string) => {
    onChange(rewards.filter((reward) => reward.id !== id));
  };

  /** 이 리워드가 그 옵션을 고르게 할지 — 체크는 더하고, 해제는 뺀다 */
  const toggleOption = (reward: RewardValue, groupId: string, checked: boolean) => {
    patch(reward.id, {
      optionGroupIds: checked
        ? [...reward.optionGroupIds, groupId]
        : reward.optionGroupIds.filter((id) => id !== groupId),
    });
  };

  const hasOptions = optionGroups.length > 0;
  // 값은 남는다 — 연동을 마치면 입력해 둔 후원 금액이 그대로 살아난다
  const amountDisabled = disabled || amountFieldsLocked;

  return (
    <div style={rewardSectionStyle}>
      {/* 금액 칸만 잠긴 이유를 그 칸이 있는 표 바로 위에서 말한다. 문의 링크는 붙이지 않는다 —
          여기서 운영자가 할 일은 리워드 구성을 마저 채우는 것이고, 금액을 다시 열 수 있는 곳은
          결제 설정 하나뿐이다. */}
      {amountFieldsLocked && (
        <PgLockNotice reason={lockReason}>
          {
            ' 입력해 둔 후원 금액은 지워지지 않고 그대로 보존돼요. 리워드명·설명·수량·옵션은 계속 편집할 수 있어요.'
          }
        </PgLockNotice>
      )}

      <p style={hintStyle}>
        후원자가 고를 리워드를 등록하세요. 수량 한정은 0 이면 무제한이에요. 이미 후원된 리워드는
        삭제할 수 없어요 — 후원자가 받기로 한 대가가 사라지기 때문이에요.
      </p>

      {hasOptions ? (
        <p style={hintStyle}>
          옵션 칸에서 각 리워드가 후원자에게 고르게 할 항목을 선택하세요. 고를 것이 없는 리워드는
          비워 둬요.
        </p>
      ) : (
        <p style={hintStyle}>
          옵션 구획에 값이 채워진 옵션이 없어 옵션 칸을 그리지 않았어요. 옵션을 먼저 등록하면 리워드
          별로 고르게 할 수 있어요.
        </p>
      )}

      {rewards.length === 0 ? (
        <p style={hintStyle}>등록된 리워드가 없어요. 리워드가 없으면 후원자가 고를 것이 없어요.</p>
      ) : (
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <caption style={hintStyle}>리워드 목록 — 각 칸을 직접 편집해요.</caption>
            <thead>
              <tr>
                <th scope="col" style={thStyle}>
                  리워드명
                </th>
                <th scope="col" style={thStyle}>
                  후원 금액(원)
                </th>
                <th scope="col" style={thStyle}>
                  설명
                </th>
                <th scope="col" style={thStyle}>
                  수량 한정
                </th>
                {hasOptions && (
                  <th scope="col" style={thStyle}>
                    옵션
                  </th>
                )}
                <th scope="col" style={thStyle}>
                  후원 수
                </th>
                <th scope="col" style={thStyle}>
                  삭제
                </th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((reward, index) => {
                const rowName = reward.title.trim() === '' ? `리워드 ${index + 1}` : reward.title;
                const claimed = reward.claimedCount > 0;
                return (
                  <tr key={reward.id}>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        className="tds-ui-input tds-ui-focusable"
                        style={rewardTextInputStyle}
                        value={reward.title}
                        placeholder="예: 얼리버드 1대"
                        disabled={disabled}
                        aria-label={`${rowName} 리워드명`}
                        onChange={(event) => patch(reward.id, { title: event.target.value })}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="tds-ui-input tds-ui-focusable"
                        style={rewardNumberInputStyle}
                        value={String(reward.amount)}
                        disabled={amountDisabled}
                        aria-label={`${rowName} 후원 금액`}
                        onChange={(event) =>
                          patch(reward.id, { amount: toDigits(event.target.value) })
                        }
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        className="tds-ui-input tds-ui-focusable"
                        style={rewardTextInputStyle}
                        value={reward.description}
                        placeholder="예: 본품 + 파우치"
                        disabled={disabled}
                        aria-label={`${rowName} 설명`}
                        onChange={(event) => patch(reward.id, { description: event.target.value })}
                      />
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="tds-ui-input tds-ui-focusable"
                        style={rewardNumberInputStyle}
                        value={String(reward.limitCount)}
                        disabled={disabled}
                        aria-label={`${rowName} 수량 한정 (0 이면 무제한)`}
                        onChange={(event) =>
                          patch(reward.id, { limitCount: toDigits(event.target.value) })
                        }
                      />
                    </td>
                    {/* 옵션은 **리워드가 고른다** — 프로그램이 정의한 선택지 중 이 줄이 쓸 것만 켠다.
                        묶음 이름에 리워드명을 실어, 표를 훑는 스크린리더가 '어느 줄의 옵션인지'를
                        체크박스마다 되묻지 않게 한다(A11Y-12 · SegmentPicker 와 같은 판단). */}
                    {hasOptions && (
                      <td style={tdStyle}>
                        <ul
                          style={optionPickerStyle}
                          role="group"
                          aria-label={`${rowName} 옵션 선택`}
                        >
                          {optionGroups.map((group) => (
                            <li key={group.id}>
                              <label style={optionPickerLabelStyle}>
                                <input
                                  type="checkbox"
                                  style={checkboxStyle}
                                  checked={reward.optionGroupIds.includes(group.id)}
                                  disabled={disabled}
                                  onChange={(event) =>
                                    toggleOption(reward, group.id, event.target.checked)
                                  }
                                />
                                <span>
                                  {group.name.trim() === '' ? '이름 없는 옵션' : group.name.trim()}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </td>
                    )}
                    {/* 후원 수는 후원이 만드는 값이라 읽기 전용이다 — 폼이 손댈 축이 아니다 */}
                    <td style={tdStyle}>{`${formatNumber(reward.claimedCount)}명`}</td>
                    <td style={tdStyle}>
                      <button
                        type="button"
                        className="tds-ui-focusable"
                        style={claimed ? disabledIconButtonStyle : iconButtonStyle}
                        disabled={disabled || claimed}
                        aria-label={
                          claimed
                            ? `${rowName} — 이미 후원된 리워드라 삭제할 수 없어요`
                            : `${rowName} 삭제`
                        }
                        title={claimed ? '이미 후원된 리워드는 삭제할 수 없어요' : undefined}
                        onClick={() => removeReward(reward.id)}
                      >
                        <Icon name="trash" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <span>
        <Button variant="secondary" size="md" disabled={disabled} onClick={addReward}>
          <Icon name="plus-circle" />
          리워드 추가
        </Button>
      </span>

      {error !== undefined && error !== '' && (
        <p role="alert" style={errorTextStyle}>
          {error}
        </p>
      )}
    </div>
  );
}

/* ── 폼 값 ↔ 도메인 ───────────────────────────────────────────────────────── */

const EMPTY: ProgramFormValues = {
  title: '',
  categoryId: '',
  creator: '',
  summary: '',
  story: '',
  description: '',
  goalAmount: '',
  startDate: '',
  endDate: '',
  // 새 프로그램은 '작성 중' 에서 출발한다 — 열기 전에 스토리·리워드를 마저 채우는 것이 보통이다
  status: 'draft',
  coverImageUrl: '',
  thumbnailUrl: '',
  optionGroups: [],
  rewards: [],
};

function toInput(values: ProgramFormValues): ProgramInput {
  // 옵션은 **먼저 눕히고 그다음 리워드를 맞춘다** — 값이 빈 그룹이 버려지면 그 그룹을 가리키던
  // 리워드의 참조도 함께 떨어져야 한다. 순서가 뒤집히면 가리킬 곳 없는 id 가 저장된다.
  const optionGroups = normalizeProgramOptionGroups(values.optionGroups);
  const rewards = applyOptionGroupsToRewards(values.rewards, optionGroups);

  return {
    title: values.title.trim(),
    categoryId: values.categoryId,
    creator: values.creator.trim(),
    summary: values.summary.trim(),
    // **저장 지점 sanitize** — 필드가 이미 걸러 내보내지만 여기서 한 번 더 건다. 폼 값은 필드
    // 말고도 닿을 수 있는 자리(setValue·리셋·복원)라, 저장으로 나가는 마지막 길목에서 확인한다.
    // trim() 하지 않는다 — HTML 이라 앞뒤 공백은 마크업 사이의 것이고, 빈 본문('<p></p>')은
    // 문자열 비교가 아니라 isRichTextEmpty 가 판정한다.
    story: isRichTextEmpty(values.story) ? '' : sanitizeRichText(values.story),
    // 상세 설명도 같은 길목에서 같은 규칙으로 건다 — 리치 텍스트 두 필드가 서로 다른 안전 수준을
    // 갖지 않게 한다(둘 중 하나만 sanitize 하면 어느 쪽이 안전한지 아무도 기억하지 못한다).
    description: isRichTextEmpty(values.description) ? '' : sanitizeRichText(values.description),
    goalAmount: Number(values.goalAmount.trim() || '0'),
    startDate: values.startDate,
    endDate: values.endDate,
    status: values.status,
    coverImageUrl: values.coverImageUrl,
    thumbnailUrl: values.thumbnailUrl,
    optionGroups,
    // 제목 앞뒤 공백은 목록 정렬을 흔든다 — 저장 직전에 눕힌다
    rewards: rewards.map((reward) => ({
      ...reward,
      title: reward.title.trim(),
      description: reward.description.trim(),
    })),
  };
}

function toValues(program: Program): ProgramFormValues {
  return {
    title: program.title,
    categoryId: program.categoryId,
    creator: program.creator,
    summary: program.summary,
    story: program.story,
    description: program.description,
    goalAmount: String(program.goalAmount),
    startDate: program.startDate,
    endDate: program.endDate,
    status: program.status,
    coverImageUrl: program.coverImageUrl,
    thumbnailUrl: program.thumbnailUrl,
    // 읽기 전용 배열을 그대로 넘기면 폼이 소유권 없는 배열을 편집하게 된다 — 복사해서 넣는다
    // (values 는 그룹 안에 또 배열을 갖는다 — 한 겹만 복사하면 값 편집이 원본을 건드린다)
    optionGroups: program.optionGroups.map((group) => ({ ...group, values: [...group.values] })),
    rewards: program.rewards.map((reward) => ({
      ...reward,
      optionGroupIds: [...reward.optionGroupIds],
    })),
  };
}

/**
 * 입력 중인 문자열 → 숫자(미리보기 전용).
 *
 * 검증을 통과하기 **전** 값도 그려야 한다 — '10,000,000' 처럼 타이핑 중인 값에서 숫자만 건져낸다.
 * 저장 경로(toInput)는 이 관대함을 쓰지 않는다: 거기서는 스키마가 이미 형식을 통과시킨 뒤다.
 */
function previewNumber(raw: string): number {
  return Number((raw.trim() || '0').replace(/\D/g, '')) || 0;
}

export default function ProgramFormPage() {
  const navigate = useNavigate();
  const {
    form,
    isEdit,
    canSubmit,
    saving,
    loadingDetail,
    loadFailure,
    retryLoad,
    serverError,
    errorReference,
    conflict,
    submit,
    isDirty,
    loaded,
  } = useCrudForm<Program, ProgramInput, ProgramFormValues>({
    resource: RESOURCE,
    adapter: programAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: programSchema,
    empty: EMPTY,
    toInput,
    toValues,
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  // [EXC-03] 등록/수정 권한 판정은 이 화면의 것이 아니다 — useCrudForm 이 라우트에서 파생해
  // (등록이면 create, 수정이면 update) canSubmit 으로 내려 준다. 예전에는 이 파일이 직접
  // useRouteWritePermissions 를 불러 같은 식을 한 벌 더 적었고, 그래서 폼마다 옳게 적어야 하는
  // 규칙이 하나 더 늘어 있었다. 여기서는 그 판정을 **쓰기만** 한다.
  const disabled = saving || loadingDetail;

  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const categoriesQuery = useQuery({
    queryKey: [RESOURCE, 'category-options'],
    queryFn: ({ signal }) => fetchProgramCategoryOptions(signal),
  });
  const categories = categoriesQuery.data ?? [];

  /**
   * 카테고리는 2단계다 — 폼이 저장하는 값(`categoryId`)은 **최종 선택 하나**이고,
   * 중분류를 고르면 그 id, 고르지 않으면 대분류 id 가 들어간다. 두 셀렉트는 그 값에서 되짚어 그린다.
   */
  const categoryId = watch('categoryId');
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const categoryRootId =
    selectedCategory === undefined ? '' : (selectedCategory.parentId ?? selectedCategory.id);
  const categoryChildId =
    selectedCategory !== undefined && selectedCategory.parentId !== null ? selectedCategory.id : '';
  const categoryRootOptions = categories.filter((category) => category.parentId === null);
  const categoryChildOptions =
    categoryRootId === ''
      ? []
      : categories.filter((category) => category.parentId === categoryRootId);

  /** 대분류를 바꾸면 중분류 선택은 버린다 — 다른 갈래의 중분류가 남아 있으면 안 된다 */
  const setCategory = (next: string) =>
    setValue('categoryId', next, { shouldDirty: true, shouldValidate: true });

  const title = watch('title');
  const creator = watch('creator');
  const summary = watch('summary');
  const story = watch('story');
  const description = watch('description');
  const goalAmount = watch('goalAmount');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const status = watch('status');
  const coverImageUrl = watch('coverImageUrl');
  const thumbnailUrl = watch('thumbnailUrl');
  const optionGroups = watch('optionGroups');
  const rewards = watch('rewards');

  // 좌측 레일 — 지금 보고 있는 구획(스크롤 추적)과 오류가 남은 구획을 함께 말한다
  const activeSectionId = useActiveSection(SECTION_IDS);
  const sectionNavItems = useMemo<readonly FormSectionItem[]>(
    () =>
      SECTIONS.map((section) => {
        // 오류 표시는 errors 하나만 본다 — 구획마다 조건을 다시 적으면 표와 화면이 어긋난다
        const invalid = section.fields.some((field) => errors[field] !== undefined);
        return invalid
          ? { id: section.id, label: section.label, invalid: true }
          : { id: section.id, label: section.label };
      }),
    [errors],
  );

  const rewardsError = (errors.rewards as { message?: string } | undefined)?.message;
  const optionGroupsError = (errors.optionGroups as { message?: string } | undefined)?.message;

  /**
   * 리워드 표가 고르게 할 선택지 — **값이 채워진 그룹만** 넘긴다.
   *
   * 값이 없는 그룹은 저장 시 버려진다(normalizeProgramOptionGroups). 버려질 그룹을 리워드에서
   * 고르게 해 두면 저장 뒤 조용히 선택이 사라진다 — 고를 수 없게 하는 편이 정직하다.
   */
  const selectableOptionGroups = optionGroups.filter((group) => group.values.length > 0);

  /**
   * 후원 금액을 입력받을 수 있는가 — **상품 폼의 판매가와 같은 술어**다.
   *
   * 렌더할 때마다 규칙을 다시 부른다: 결제 설정이 바뀌면 다음 렌더가 곧바로 새 답을 쓴다
   * (checkoutCta 와 같은 어법). 잠금은 **입력만** 막고 저장된 금액은 그대로 둔다.
   */
  const priceDisplay = resolvePriceDisplay(readPaymentSettings());

  // 미리보기 파생값 — 아직 검증을 통과하지 않은 입력에서도 그린다
  const goalPreview = previewNumber(goalAmount);
  const leftDays = endDate === '' ? null : daysLeft(endDate, TODAY);
  const cheapestReward = rewards.reduce<number | null>(
    (lowest, reward) => (lowest === null || reward.amount < lowest ? reward.amount : lowest),
    null,
  );

  /* [EXC-03] 저장할 수 없는 폼은 열지 않는다. FormPageShell 을 쓰는 폼은 껍데기가 이 403 을
     그린다 — 이 화면은 다중 구획 + 미리보기라 껍데기를 쓸 수 없어, 껍데기가 내린 **같은 판정**을
     받아 같은 화면을 그린다(판정을 다시 계산하지 않는다). */
  if (!canSubmit) return <ForbiddenScreen />;

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '프로그램을 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '프로그램을 불러오지 못했어요.'}
            </span>
            {loadFailure === 'error' && (
              <Button variant="secondary" onClick={retryLoad}>
                다시 시도
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button
        type="button"
        className="tds-ui-focusable"
        style={backLinkStyle}
        onClick={() => navigate(LIST_PATH)}
      >
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '프로그램 수정' : '프로그램 등록'}</h1>
        <p style={descriptionStyle}>
          {/* 방향('왼쪽·오른쪽')을 적지 않는다 — 좁은 화면에서는 목차가 폼 위로 접혀 올라간다 */}
          별표(*) 항목은 필수예요. 목차로 구획을 오가고, 미리보기로 후원자에게 보일 요약을
          확인하세요.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

        {/* 좌: 구획 목차 레일 / 우: 폼 본문 + 미리보기. 좁은 화면에서는 1단으로 접힌다
            (program-form.css — 미디어 쿼리는 인라인 style 로 표현할 수 없다) */}
        <div className="tds-programform-layout">
          <div className="tds-programform-rail">
            {/* 껍데기(간격·안내문 구분선·시각 언어)는 목록 화면의 레일과 같은 것을 쓴다.
                내용물만 다르다 — 필터가 아니라 내비게이션이다 (FormSectionNav 머리말 참조). */}
            <FilterRail
              notice={
                <p style={hintStyle}>
                  구획을 누르면 해당 위치로 이동해요. 붉은 점이 붙은 구획에는 확인이 필요한 입력이
                  남아 있어요.
                </p>
              }
            >
              <FormSectionNav
                navLabel="프로그램 폼 구획 이동"
                heading="구획"
                items={sectionNavItems}
                activeId={activeSectionId}
                onJump={scrollToSection}
              />
            </FilterRail>
          </div>

          <div style={layoutStyle}>
            <div style={columnStyle}>
              {/* ── 기본 정보 ── */}
              <FormSectionAnchor id={SECTIONS[0].id} label={SECTIONS[0].label}>
                <Card>
                  <CardTitle>기본 정보</CardTitle>

                  <FormField
                    htmlFor="program-title"
                    label="프로그램명"
                    required
                    error={errors.title?.message}
                  >
                    <input
                      id="program-title"
                      type="text"
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(errors.title !== undefined)}
                      maxLength={PROGRAM_TITLE_MAX}
                      placeholder="예: 무선 스튜디오 모니터 헤드폰"
                      disabled={disabled}
                      aria-invalid={errors.title !== undefined}
                      aria-describedby={
                        errors.title !== undefined ? errorIdOf('program-title') : undefined
                      }
                      {...register('title')}
                    />
                  </FormField>

                  <div style={formRowStyle}>
                    <FormField
                      htmlFor="program-creator"
                      label="창작자"
                      required
                      error={errors.creator?.message}
                    >
                      <input
                        id="program-creator"
                        type="text"
                        className="tds-ui-input tds-ui-focusable"
                        style={controlStyle(errors.creator !== undefined)}
                        maxLength={40}
                        placeholder="예: 사운드랩"
                        disabled={disabled}
                        aria-invalid={errors.creator !== undefined}
                        aria-describedby={
                          errors.creator !== undefined ? errorIdOf('program-creator') : undefined
                        }
                        {...register('creator')}
                      />
                    </FormField>

                    <FormField
                      htmlFor="program-category"
                      label="카테고리 (대분류)"
                      required
                      error={errors.categoryId?.message}
                    >
                      <SelectField
                        id="program-category"
                        isInvalid={errors.categoryId !== undefined}
                        disabled={disabled}
                        aria-invalid={errors.categoryId !== undefined}
                        aria-describedby={
                          errors.categoryId !== undefined
                            ? errorIdOf('program-category')
                            : undefined
                        }
                        value={categoryRootId}
                        onChange={(event) => setCategory(event.target.value)}
                      >
                        <option value="">대분류 선택</option>
                        {categoryRootOptions.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </SelectField>
                    </FormField>

                    {/* 2Depth — 고르지 않으면 대분류에 등록된다. 하위가 없는 대분류면 잠근다 */}
                    <FormField
                      htmlFor="program-category-child"
                      label="카테고리 (중분류)"
                      hint={
                        categoryRootId === ''
                          ? '대분류를 먼저 선택하세요.'
                          : categoryChildOptions.length === 0
                            ? '이 대분류에는 중분류가 없어요.'
                            : '선택하지 않으면 대분류에 등록돼요.'
                      }
                    >
                      <SelectField
                        id="program-category-child"
                        disabled={disabled || categoryChildOptions.length === 0}
                        value={categoryChildId}
                        onChange={(event) =>
                          setCategory(
                            event.target.value === '' ? categoryRootId : event.target.value,
                          )
                        }
                      >
                        <option value="">
                          {categoryChildOptions.length === 0 ? '없음' : '선택 안 함'}
                        </option>
                        {categoryChildOptions.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </SelectField>
                    </FormField>
                  </div>

                  <FormField
                    htmlFor="program-summary"
                    label="한 줄 소개"
                    required
                    error={errors.summary?.message}
                    hint="목록과 카드에 제목 아래로 붙는 한 줄여요."
                  >
                    <input
                      id="program-summary"
                      type="text"
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(errors.summary !== undefined)}
                      maxLength={PROGRAM_SUMMARY_MAX}
                      placeholder="예: 스튜디오 모니터링을 그대로 옮긴 무선 헤드폰"
                      disabled={disabled}
                      aria-invalid={errors.summary !== undefined}
                      aria-describedby={
                        errors.summary !== undefined ? errorIdOf('program-summary') : undefined
                      }
                      {...register('summary')}
                    />
                  </FormField>
                </Card>
              </FormSectionAnchor>

              {/* ── 펀딩 설정 ── */}
              <FormSectionAnchor id={SECTIONS[1].id} label={SECTIONS[1].label}>
                <Card>
                  <CardTitle>펀딩 설정</CardTitle>

                  <FormField
                    htmlFor="program-goal"
                    label="목표 금액(원)"
                    required
                    error={errors.goalAmount?.message}
                    hint="기간이 끝나는 순간 이 금액을 넘겼는지로 성공·실패가 갈려요."
                  >
                    <input
                      id="program-goal"
                      type="text"
                      inputMode="numeric"
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(errors.goalAmount !== undefined)}
                      placeholder="예: 10000000"
                      disabled={disabled}
                      aria-invalid={errors.goalAmount !== undefined}
                      aria-describedby={
                        errors.goalAmount !== undefined ? errorIdOf('program-goal') : undefined
                      }
                      {...register('goalAmount')}
                    />
                  </FormField>

                  {/* 시작일~종료일은 **한 쌍이 곧 하나의 값**(모금 기간)이라 규칙의 유일한 예외로
                      가로에 남는다. 뒤따르는 '상태'는 날짜가 아니므로 이 격자 밖으로 나간다 —
                      같은 격자에 섞어 두면 예외가 다시 '2열 폼'으로 번진다. */}
                  <div style={formDateRowStyle}>
                    <FormField
                      htmlFor="program-start"
                      label="시작일"
                      required
                      error={errors.startDate?.message}
                    >
                      <input
                        id="program-start"
                        type="date"
                        className="tds-ui-input tds-ui-focusable"
                        style={controlStyle(errors.startDate !== undefined)}
                        disabled={disabled}
                        aria-invalid={errors.startDate !== undefined}
                        aria-describedby={
                          errors.startDate !== undefined ? errorIdOf('program-start') : undefined
                        }
                        {...register('startDate')}
                      />
                    </FormField>

                    <FormField
                      htmlFor="program-end"
                      label="종료일"
                      required
                      error={errors.endDate?.message}
                    >
                      <input
                        id="program-end"
                        type="date"
                        className="tds-ui-input tds-ui-focusable"
                        style={controlStyle(errors.endDate !== undefined)}
                        disabled={disabled}
                        aria-invalid={errors.endDate !== undefined}
                        aria-describedby={
                          errors.endDate !== undefined ? errorIdOf('program-end') : undefined
                        }
                        {...register('endDate')}
                      />
                    </FormField>
                  </div>

                  <FormField
                    htmlFor="program-status"
                    label="상태"
                    required
                    hint="성공·실패는 기간이 끝난 뒤 목표 달성 여부로 갈려요."
                  >
                    <SelectField id="program-status" disabled={disabled} {...register('status')}>
                      {PROGRAM_STATUS_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                </Card>
              </FormSectionAnchor>

              {/* ── 스토리 ── */}
              <FormSectionAnchor id={SECTIONS[2].id} label={SECTIONS[2].label}>
                <Card>
                  <CardTitle>스토리</CardTitle>
                  {/* 스토리는 서식이 필요한 본문이라 RichTextField(Tiptap) 다 — 나가는 값은 이미
                      sanitize 된 HTML 이고, 들어오는 값도 필드가 렌더 지점에서 다시 sanitize 한다. */}
                  <RichTextField
                    label="프로그램 스토리"
                    value={story}
                    onChange={(value) => setValue('story', value, { shouldDirty: true })}
                    maxLength={STORY_GUIDE_MAX}
                    disabled={disabled}
                    error={errors.story?.message}
                    hint="왜 만들었는지·무엇을 만들고 있는지를 적어 후원을 설득하는 글이에요. 사양·구성·배송 시기는 아래 상세 설명에 적어요. 글자 수를 셀 때 서식은 빼요."
                    placeholder="이 프로그램을 시작한 이유와 만들려는 것을 설명하세요."
                    rows={8}
                  />
                </Card>
              </FormSectionAnchor>

              {/* ── 상세 설명 ── */}
              <FormSectionAnchor id={SECTIONS[3].id} label={SECTIONS[3].label}>
                <Card>
                  <CardTitle>상세 설명</CardTitle>
                  {/* 스토리와 나란히 있지만 읽는 방식이 다르다 — 스토리는 후원을 결심하게 하는 글이고,
                      상세 설명은 결심한 뒤 '내가 받는 것이 정확히 무엇인지'를 확인하는 글이다.
                      한 필드에 섞으면 사양이 서술 속에 묻혀 문의(리워드 구성·배송 시기)로 되돌아온다. */}
                  <RichTextField
                    label="상세 설명"
                    value={description}
                    onChange={(value) => setValue('description', value, { shouldDirty: true })}
                    maxLength={PROGRAM_DESCRIPTION_MAX}
                    disabled={disabled}
                    error={errors.description?.message}
                    hint="크기·소재·구성품·배송 시기처럼 후원 전에 확인할 사실을 적어요. 글자 수를 셀 때 서식은 빼요."
                    placeholder="사양·구성품·배송 일정·유의사항을 정리해 적으세요."
                    rows={8}
                  />
                </Card>
              </FormSectionAnchor>

              {/* ── 이미지 (썸네일 · 대표) ── */}
              <FormSectionAnchor id={SECTIONS[4].id} label={SECTIONS[4].label}>
                <Card>
                  <CardTitle>이미지</CardTitle>
                  {/* 두 자리는 비율이 다르다 — 카드는 작은 정사각에 가깝고 상세 상단은 넓은 가로다.
                      같은 그림을 두 자리에 쓰면 한쪽이 반드시 잘린다. 그래서 따로 받는다. */}
                  <ImageUploadField
                    label="썸네일"
                    value={thumbnailUrl}
                    onChange={(value) => setValue('thumbnailUrl', value, { shouldDirty: true })}
                    disabled={disabled}
                    error={errors.thumbnailUrl?.message}
                    hint="목록·카드에서 작게 쓰이는 이미지예요. 오른쪽 미리보기가 이 이미지로 그려져요."
                  />
                  <ImageUploadField
                    label="대표 이미지"
                    value={coverImageUrl}
                    onChange={(value) => setValue('coverImageUrl', value, { shouldDirty: true })}
                    disabled={disabled}
                    error={errors.coverImageUrl?.message}
                    hint="상세 화면 맨 위에 크게 걸리는 이미지예요. 가로가 긴 이미지가 잘 맞아요."
                  />
                </Card>
              </FormSectionAnchor>

              {/* ── 옵션 ── */}
              <FormSectionAnchor id={SECTIONS[5].id} label={SECTIONS[5].label}>
                <Card>
                  <CardTitle>옵션</CardTitle>
                  <OptionEditor
                    optionGroups={optionGroups}
                    disabled={disabled}
                    error={optionGroupsError}
                    onChange={(next) =>
                      setValue('optionGroups', next, { shouldDirty: true, shouldValidate: true })
                    }
                  />
                </Card>
              </FormSectionAnchor>

              {/* ── 리워드 ── */}
              <FormSectionAnchor id={SECTIONS[6].id} label={SECTIONS[6].label}>
                <Card>
                  <CardTitle>리워드</CardTitle>
                  <RewardEditor
                    rewards={rewards}
                    optionGroups={selectableOptionGroups}
                    disabled={disabled}
                    amountFieldsLocked={priceDisplay.amountFieldsLocked}
                    lockReason={priceDisplay.reason}
                    error={rewardsError}
                    onChange={(next) =>
                      setValue('rewards', next, { shouldDirty: true, shouldValidate: true })
                    }
                  />
                </Card>
              </FormSectionAnchor>
            </div>

            {/* ── 우측 실시간 미리보기 ── */}
            <Card>
              <CardTitle>후원자 노출 미리보기</CardTitle>
              {/* 이 미리보기는 **카드**다 — 그래서 대표 이미지가 아니라 썸네일을 그린다.
                  상세 상단의 큰 그림(대표 이미지)을 여기에 끼워 넣으면, 실제 목록에서는 잘려
                  보일 그림을 잘리지 않은 채로 확인하게 되어 확인의 의미가 없어진다. */}
              <p style={hintStyle}>목록·카드에 노출되는 모습이에요 — 이미지는 썸네일이에요.</p>
              {/* 값이 비어 있어도 자리를 비우지 않는다 — '무엇이 아직 안 채워졌는지'가 곧 정보다 */}
              <div style={previewCardStyle}>
                <ImageThumb src={thumbnailUrl} alt={`${title.trim() || '프로그램'} 썸네일`} />
                <p style={previewTitleStyle}>{title.trim() === '' ? '프로그램명 미입력' : title}</p>
                <p style={previewSummaryStyle}>
                  {summary.trim() === '' ? '한 줄 소개 미입력' : summary}
                </p>
                <span style={previewBadgeRowStyle}>
                  <StatusBadge
                    tone={programStatusTone(status)}
                    label={programStatusLabel(status)}
                  />
                </span>
              </div>

              <dl style={dlStyle}>
                <dt style={dtStyle}>창작자</dt>
                <dd style={ddStyle}>{creator.trim() === '' ? '—' : creator}</dd>

                <dt style={dtStyle}>목표 금액</dt>
                <dd style={ddStyle}>{`${formatNumber(goalPreview)}원`}</dd>

                <dt style={dtStyle}>기간</dt>
                <dd style={ddStyle}>
                  {startDate === '' || endDate === '' ? '—' : `${startDate} ~ ${endDate}`}
                </dd>

                <dt style={dtStyle}>남은 일수</dt>
                <dd style={ddStyle}>
                  {leftDays === null
                    ? '—'
                    : leftDays === 0
                      ? '오늘 마감'
                      : `${formatNumber(leftDays)}일`}
                </dd>

                <dt style={dtStyle}>리워드</dt>
                <dd style={ddStyle}>
                  {rewards.length === 0
                    ? '없음'
                    : `${formatNumber(rewards.length)}종 · 최저 ${formatNumber(cheapestReward ?? 0)}원`}
                </dd>

                {/* 옵션은 리워드가 드는 값이라 두 줄로 읽힌다 — 무엇이 정의됐고, 어느 리워드가 쓰는가 */}
                <dt style={dtStyle}>옵션</dt>
                <dd style={ddStyle}>{programOptionSummary(selectableOptionGroups)}</dd>

                {rewards.length > 0 && (
                  <>
                    <dt style={dtStyle}>리워드별 옵션</dt>
                    <dd style={ddStyle}>
                      {rewards
                        .map(
                          (reward, index) =>
                            `${reward.title.trim() === '' ? `리워드 ${String(index + 1)}` : reward.title.trim()}: ${rewardOptionSummary(reward, selectableOptionGroups)}`,
                        )
                        .join(' / ')}
                    </dd>
                  </>
                )}
              </dl>

              {/* 모금 현황은 **저장된 사실**이다 — 폼에 없는 값이라 입력에 따라 움직이지 않는다.
                  등록 화면에는 아직 후원이 없으므로 이 줄 자체를 그리지 않는다. */}
              {loaded !== undefined && (
                <p style={hintStyle}>
                  저장된 모금 현황{' '}
                  <StatusBadge tone={fundingTone(loaded)} label={fundingSummary(loaded)} />
                </p>
              )}
            </Card>
          </div>
        </div>

        <div style={actionsStyle}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={disabled}>
            {submitButtonLabel(saving, isEdit)}
          </Button>
        </div>
      </form>

      <FormConflictDialog conflict={conflict} />

      {unsavedDialog}
    </div>
  );
}
