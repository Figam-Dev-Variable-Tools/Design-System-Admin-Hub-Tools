/**
 * Design System/Templates/Support/Download Form — 자료 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Support"(고객센터)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Support 그룹, 화면 en = "Downloads" 의 등록/수정 화면.
 *
 * 대응 실화면: apps/admin/src/pages/support/downloads/DownloadFormPage.tsx
 * (라우트 /support/downloads/new · /:id/edit). 실화면은 공용 CRUD 프레임워크(useCrudForm) 위에 입력
 * 카드(제목·카테고리·버전·노출·파일 업로드) + 우측 미리보기 카드 2단으로 구성한다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 껍데기·앱 조각을 DS 표면으로 갈음한다:
 *   뒤로가기(FormPageShell)      → Button(ghost) + Icon(chevron-left)
 *   페이지 제목                  → 토큰만 쓴 <h1>(title.xl)
 *   카드 표면 · 카드 제목         → Card + 토큰만 쓴 <h2>(title.md)
 *   제목/버전 필드               → FormField + TextField
 *   카테고리 필드                → FormField + SelectField
 *   노출 여부                    → ToggleSwitch
 *   파일 업로드(FileUploadField)  → FileDropzone(빈) · FileChip(선택됨)
 *   미리보기(DownloadPreview)     → StatusBadge ×N + Icon(download) (자료 카드 목업)
 *   조회 실패(loadFailure)        → Alert(danger) + Button(secondary)
 *   저장/취소                     → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FileChip,
  FileDropzone,
  FormField,
  formRowStyle,
  Icon,
  SelectField,
  Skeleton,
  StatusBadge,
  TextField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Support/Download Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 데모 데이터(실화면 downloads/types 미러) ─────────────────────────────────────────── */

const TITLE_MAX = 100;
const VERSION_MAX = 20;
const MAX_FILE_SIZE_MB = 20;

type FileKind = 'document' | 'image' | 'archive' | 'etc';

const DOWNLOAD_CATEGORY_OPTIONS: readonly { readonly id: string; readonly label: string }[] = [
  { id: '카탈로그', label: '카탈로그' },
  { id: '제품 매뉴얼', label: '제품 매뉴얼' },
  { id: '양식/서식', label: '양식/서식' },
  { id: '브로슈어', label: '브로슈어' },
  { id: '기타', label: '기타' },
];

const FILE_KIND_LABEL: Record<FileKind, string> = {
  document: '문서',
  image: '이미지',
  archive: '압축',
  etc: '기타',
};

const DOCUMENT_EXT = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'hwp',
  'hwpx',
  'txt',
  'csv',
];
const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
const ARCHIVE_EXT = ['zip', 'rar', '7z', 'tar', 'gz'];

/** 파일명 확장자 → 종류 — 실화면 fileKindOf 미러 */
const fileKindOf = (fileName: string): FileKind => {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0 || dot === fileName.length - 1) return 'etc';
  const ext = fileName.slice(dot + 1).toLowerCase();
  if (DOCUMENT_EXT.includes(ext)) return 'document';
  if (IMAGE_EXT.includes(ext)) return 'image';
  if (ARCHIVE_EXT.includes(ext)) return 'archive';
  return 'etc';
};

const fileKindLabel = (kind: FileKind): string => FILE_KIND_LABEL[kind];

/** 사람이 읽는 용량 — 실화면 formatBytes 미러 */
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${String(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

interface SeedValues {
  readonly title: string;
  readonly categoryLabel: string;
  readonly version: string;
  readonly visible: boolean;
  readonly fileName: string;
  readonly fileSize: number;
}

const EMPTY_SEED: SeedValues = {
  title: '',
  categoryLabel: DOWNLOAD_CATEGORY_OPTIONS[0]?.id ?? '기타',
  version: '',
  visible: true,
  fileName: '',
  fileSize: 0,
};

const EDIT_SEED: SeedValues = {
  title: '2026 상반기 제품 카탈로그',
  categoryLabel: '카탈로그',
  version: 'v2.1',
  visible: true,
  fileName: 'catalog-2026H1.pdf',
  fileSize: 8_540_000,
};

/** 검증 오류 데모 — 실화면 zod 스키마가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly title?: string;
  readonly version?: string;
  readonly fileName?: string;
}

const DEMO_ERRORS: FieldErrors = {
  title: '제목을 입력하세요.',
  fileName: '배포할 파일을 첨부하세요.',
};

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
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

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
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

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const controlBaseStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
};

const controlStyle = (invalid: boolean): CSSProperties => ({
  ...controlBaseStyle,
  ...(invalid ? { borderColor: cssVar('color.feedback.danger.border') } : {}),
});

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const requiredMarkStyle: CSSProperties = { color: cssVar('color.feedback.danger.text') };

const fileHintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const fileErrorStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.feedback.danger.text'),
  margin: 0,
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

const previewCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const previewHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const previewTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
  overflowWrap: 'anywhere',
};

const previewFileStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
  overflowWrap: 'anywhere',
};

const previewMutedStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const alertActionRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
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

/* ── 미리보기 카드(실화면 DownloadPreview 미러) ──────────────────────────────────────────────── */

interface PreviewProps {
  readonly title: string;
  readonly categoryLabel: string;
  readonly version: string;
  readonly fileName: string;
  readonly fileSize: number;
  readonly visible: boolean;
}

function DownloadPreview({
  title,
  categoryLabel,
  version,
  fileName,
  fileSize,
  visible,
}: PreviewProps) {
  return (
    <div style={previewCardStyle}>
      <div style={previewHeadStyle}>
        <StatusBadge tone="info" label={categoryLabel === '' ? '카테고리 미지정' : categoryLabel} />
        {version.trim() !== '' && <StatusBadge tone="neutral" label={version} />}
        <StatusBadge tone={visible ? 'success' : 'neutral'} label={visible ? '노출' : '숨김'} />
      </div>
      <h3 style={previewTitleStyle}>{title.trim() === '' ? '제목을 입력하세요' : title}</h3>
      {fileName.trim() === '' ? (
        <span style={previewMutedStyle}>첨부 파일이 없어요.</span>
      ) : (
        <span style={previewFileStyle}>
          <Icon name="download" />
          {`${fileName} · ${fileKindLabel(fileKindOf(fileName))} · ${formatBytes(fileSize)}`}
        </span>
      )}
    </div>
  );
}

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface DownloadFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  /** 조회 실패 — 이미 삭제됨(not-found) 또는 서버 오류(error) */
  readonly loadFailure?: 'not-found' | 'error';
  readonly seed?: SeedValues;
}

function DownloadFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  loadFailure,
  seed = EMPTY_SEED,
}: DownloadFormScreenProps) {
  const [title, setTitle] = useState(seed.title);
  const [categoryLabel, setCategoryLabel] = useState(seed.categoryLabel);
  const [version, setVersion] = useState(seed.version);
  const [visible, setVisible] = useState(seed.visible);
  const [fileName, setFileName] = useState(seed.fileName);
  const [fileSize, setFileSize] = useState(seed.fileSize);

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== undefined) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '자료를 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '자료를 불러오지 못했어요.'}
            </span>
            {loadFailure === 'error' && <Button variant="secondary">다시 시도</Button>}
            <Button variant="secondary">목록으로</Button>
          </div>
        </Alert>
      </div>
    );
  }

  const hasFile = fileName.trim() !== '';
  const fileError = errors.fileName;
  const fileInvalid = fileError !== undefined && fileError !== '';

  return (
    <div style={pageStyle}>
      <a href="#downloads-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '자료 수정' : '자료 등록'}</h1>
        <p style={descriptionStyle}>별표(*) 항목은 필수예요. 배포할 파일을 첨부하세요.</p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate style={pageStyle}>
        <div style={layoutStyle}>
          <FormCard title="자료 정보">
            {loadingDetail ? (
              <div style={skeletonBodyStyle} aria-busy="true">
                {[0, 1, 2, 3].map((line) => (
                  <Skeleton key={`line-${String(line)}`} />
                ))}
              </div>
            ) : (
              <>
                <TextField
                  id="download-title"
                  label="제목"
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="예: 2026 상반기 제품 카탈로그"
                  maxLength={TITLE_MAX}
                  error={errors.title ?? ''}
                />

                <div style={formRowStyle}>
                  <FormField htmlFor="download-category" label="카테고리" required>
                    <SelectField
                      id="download-category"
                      value={categoryLabel}
                      onChange={(event) => setCategoryLabel(event.target.value)}
                    >
                      {DOWNLOAD_CATEGORY_OPTIONS.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>

                  <FormField
                    htmlFor="download-version"
                    label="버전"
                    hint="개정본이면 판을 적으세요(예: v2.1)"
                    {...(errors.version !== undefined && { error: errors.version })}
                  >
                    <input
                      id="download-version"
                      type="text"
                      style={controlStyle(errors.version !== undefined)}
                      value={version}
                      onChange={(event) => setVersion(event.target.value)}
                      placeholder="예: v1.0"
                      maxLength={VERSION_MAX}
                    />
                  </FormField>
                </div>

                <div style={fieldStyle}>
                  <span style={fieldLabelStyle}>노출 여부</span>
                  <ToggleSwitch
                    checked={visible}
                    onChange={setVisible}
                    label="고객센터 노출 여부"
                    onLabel="노출"
                    offLabel="숨김"
                  />
                </div>

                <div style={fieldStyle}>
                  <span style={fieldLabelStyle}>
                    첨부 파일
                    <span style={requiredMarkStyle} aria-hidden="true">
                      {' *'}
                    </span>
                  </span>
                  {hasFile ? (
                    <FileChip
                      name={fileName}
                      size={fileSize}
                      onRemove={() => {
                        setFileName('');
                        setFileSize(0);
                      }}
                    />
                  ) : (
                    <FileDropzone
                      label="첨부 파일"
                      title="파일을 올리거나 드래그하여 첨부"
                      meta={`문서 · 이미지 · 압축 · 최대 ${String(MAX_FILE_SIZE_MB)}MB`}
                      isInvalid={fileInvalid}
                      onSelect={(file) => {
                        setFileName(file.name);
                        setFileSize(file.size);
                      }}
                    />
                  )}
                  {fileInvalid ? (
                    <p role="alert" style={fileErrorStyle}>
                      {fileError}
                    </p>
                  ) : (
                    !hasFile && (
                      <p style={fileHintStyle}>
                        제품 카탈로그·매뉴얼·양식 등 배포용 파일을 올리세요.
                      </p>
                    )
                  )}
                </div>
              </>
            )}
          </FormCard>

          <FormCard title="미리보기">
            <DownloadPreview
              title={title}
              categoryLabel={categoryLabel}
              version={version}
              fileName={fileName}
              fileSize={fileSize}
              visible={visible}
            />
          </FormCard>
        </div>

        <div style={actionsStyle}>
          <Button type="button" variant="secondary" size="md">
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={loadingDetail}>
            {isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 신규 자료 입력 */
export const Default: Story = {
  render: () => <DownloadFormScreen />,
};

/** 수정: 기존 값이 채워진 폼(첨부 파일 칩 포함) */
export const Edit: Story = {
  render: () => <DownloadFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 입력 카드 본문 스켈레톤(useCrudForm loadingDetail 미러) */
export const Loading: Story = {
  render: () => <DownloadFormScreen isEdit loadingDetail seed={EDIT_SEED} />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 각 필드 인라인 오류 노출 */
export const ValidationError: Story = {
  render: () => <DownloadFormScreen errors={DEMO_ERRORS} />,
};

/** 조회 실패: 이미 삭제된 자료(not-found) — '다시 시도' 없이 '목록으로'만 (EXC-12) */
export const LoadError: Story = {
  render: () => <DownloadFormScreen isEdit loadFailure="not-found" />,
};
