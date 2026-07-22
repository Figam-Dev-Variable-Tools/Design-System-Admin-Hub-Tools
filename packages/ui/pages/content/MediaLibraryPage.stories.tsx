/**
 * Design System/Templates/Content/Media Library — 미디어 라이브러리 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/media` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en =
 * "Media Library" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의
 * `['/content/media', '미디어 라이브러리', 'Media Library']`).
 *
 * 대응 실화면: apps/admin/src/pages/content/media/MediaLibraryPage.tsx (라우트 /content/media) ·
 * 등록 모달(components/MediaAssetFormModal.tsx) · 규칙(types.ts) · 삭제 가드(shared/domain/media-library).
 *
 * [이 화면의 핵심은 삭제 차단이다 — 그리고 '모르면 더 막는다'] 자산마다 **사용처**를 붙여 보여
 * 주고, 쓰이는 중이면 삭제 버튼을 잠근다. 사용처를 확인할 수 없을 때도 잠근다 — '모른다' 를
 * '안 쓰인다' 로 뭉개면 배선이 빠진 날 라이브러리가 통째로 비워질 수 있다(fail-closed).
 * 잠긴 버튼은 **사유를 접근 이름에 싣는다**: 이유를 말하지 않는 disabled 는 고장으로 읽힌다.
 *
 * [표가 아니라 목록인 이유] 행마다 삭제 가능 여부와 그 사유가 다르다. 공용 표 껍데기에는 행 단위
 * 잠금 사유를 실을 손잡이가 없어(진행 중 id 하나뿐) 카드 목록을 쓴다.
 *
 * [중복은 막지 않고 알린다] 같은 이름·크기의 파일은 경고만 한다 — 같은 이름의 다른 개정본을
 * 올리는 일은 정당하고, 그것까지 거절하면 운영자가 파일명을 무의미하게 비튼다.
 *
 * [실제 업로드는 없다 — 그리고 그 사실을 감추지 않는다] 지금 저장되는 것은 메타데이터(이름·용량·
 * 대체텍스트)뿐이다. 가짜 업로드 성공을 지어내지 않고 등록 모달이 그 사실을 Alert 로 말한다.
 *
 * [대체텍스트는 선택이 아니다] 스크린리더 사용자에게 alt 없는 이미지는 존재하지 않는 것과 같다.
 * 나중에 채우겠다는 약속은 지켜지지 않으므로 **올리는 순간**에 받는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   FilterRail/FilterPanel(폴더) → Panel(notice) + 토큰 <nav>(aria-pressed + 건수 배지)
 *   파일 이름·대체텍스트 검색     → SearchField
 *   태그 필터                   → SelectField
 *   파일 등록                   → Button(primary) + Icon(upload)
 *   자산 목록                   → Card + 토큰 <ul>/<li>
 *   썸네일(이미지 아닌 파일 포함) → ImageThumb
 *   폴더 · 형식/용량 · 태그 배지  → StatusBadge
 *   사용처 배지(펼침 토글)        → 토큰 <button>(aria-expanded/controls) + StatusBadge
 *   사용처 목록                  → 토큰 <ul>/<a>
 *   수정 / 삭제                 → 토큰 <button> + Icon(pencil · trash) — 막히면 사유를 접근 이름에
 *   삭제 확인                   → ConfirmDialog(intent=delete)
 *   등록 모달                   → Modal + Alert(info·warning) + FormField + SelectField
 *   빈 결과                     → Empty
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Empty as EmptyState,
  FormField,
  Icon,
  ImageThumb,
  Modal,
  Panel,
  SearchField,
  SelectField,
  StatusBadge,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Content/Media Library',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 types.ts · shared/domain/media-library 미러) ────────────────────────── */

interface MediaFolder {
  readonly id: string;
  readonly label: string;
}

const UNFILED_FOLDER_ID = 'unfiled';

/** 정리 단위 — 1뎁스다. 폴더 안의 폴더는 만들지 않는다(메뉴·카테고리와 같은 판단) */
const MEDIA_FOLDERS: readonly MediaFolder[] = [
  { id: 'brand', label: '브랜드' },
  { id: 'projects', label: '프로젝트 사진' },
  { id: 'documents', label: '문서·도면' },
  { id: UNFILED_FOLDER_ID, label: '미분류' },
];

const FOLDER_FILTER_ALL = 'all';

interface DemoAsset {
  readonly id: string;
  readonly fileName: string;
  readonly folderId: string;
  readonly tags: readonly string[];
  /** 대체텍스트 — 비워 둘 수 없다(머리말) */
  readonly alt: string;
  readonly sizeBytes: number;
  /** 소문자 확장자 — 점은 붙이지 않는다 */
  readonly extension: string;
  readonly uploadedAt: string;
  /** 올린 사람 — 운영 조직 역할명(실명 금지) */
  readonly uploader: string;
}

/**
 * 허용 확장자 — 이미지와 문서 두 갈래다. 실행 가능한 파일(exe·sh·html)을 받지 않는 이유는
 * 용량이 아니라 **안전**이다: 홈페이지가 그대로 서빙하는 자리라, 업로드된 html 한 장이 그
 * 도메인에서 스크립트를 실행한다.
 */
const ALLOWED_IMAGE_EXTENSIONS: readonly string[] = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

const isImageExtension = (extension: string): boolean =>
  ALLOWED_IMAGE_EXTENSIONS.includes(extension);

/** 사람이 읽는 용량 — 표기 규칙을 한 곳에만 둔다 */
function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${String(sizeBytes)}B`;
  const kb = sizeBytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)}KB`;
  return `${(kb / 1024).toFixed(1)}MB`;
}

/** 사용처 한 건 — 삭제를 막는 근거이자, 어디서 연결을 끊어야 하는지의 안내다 */
interface UsageRef {
  readonly id: string;
  readonly domainLabel: string;
  readonly label: string;
}

const MEDIA_DELETE_IN_USE =
  '이 파일을 쓰는 곳이 있어 삭제할 수 없습니다. 사용처에서 먼저 연결을 끊어 주세요.';
const MEDIA_DELETE_UNKNOWN =
  '사용처를 확인할 수 없어 삭제할 수 없습니다. 확인되기 전에는 지우지 않습니다.';

/**
 * 지울 수 없는 이유 — 지울 수 있으면 null. **모르면 더 막는다**(fail-closed · 머리말).
 */
function mediaDeleteBlock(usage: readonly UsageRef[] | null): string | null {
  if (usage === null) return MEDIA_DELETE_UNKNOWN;
  return usage.length === 0 ? null : MEDIA_DELETE_IN_USE;
}

/** 사용 중 배지의 색 의도 — 쓰이는 중이면 정보, 미사용이면 중립, 모르면 경고 */
function usageTone(count: number | null): StatusBadgeTone {
  if (count === null) return 'warning';
  return count === 0 ? 'neutral' : 'info';
}

function usageLabel(count: number | null): string {
  if (count === null) return '확인 불가';
  return count === 0 ? '미사용' : `${String(count)}곳 사용 중`;
}

/**
 * 같은 파일을 이미 갖고 있는가 — 없으면 null.
 * 이름 + 크기로 본다(업로드가 없어 내용 해시를 낼 수 없다). **막지 않고 알린다**.
 */
function findDuplicate(
  assets: readonly DemoAsset[],
  fileName: string,
  sizeBytes: number,
): DemoAsset | null {
  const needle = fileName.trim().toLowerCase();
  return (
    assets.find(
      (asset) => asset.fileName.toLowerCase() === needle && asset.sizeBytes === sizeBytes,
    ) ?? null
  );
}

const duplicateWarningMessage = (asset: DemoAsset): string =>
  `같은 이름·크기의 파일이 이미 있습니다(${asset.fileName} · ${formatBytes(asset.sizeBytes)}). 그대로 올리면 두 벌이 남습니다.`;

/* ── 데모 데이터(실화면 data-source.ts 의 SEED 미러 — 최근 업로드가 위) ────────────────────── */

const DEMO_ASSETS: readonly DemoAsset[] = [
  {
    id: 'md-005',
    fileName: 'press-kit.zip',
    folderId: 'brand',
    tags: ['보도자료', '브랜드'],
    alt: '보도자료용 이미지 묶음',
    sizeBytes: 5_240_000,
    extension: 'zip',
    uploadedAt: '2026-06-11T11:45',
    uploader: '마케팅팀',
  },
  {
    id: 'md-004',
    fileName: 'office-lobby.jpg',
    folderId: UNFILED_FOLDER_ID,
    tags: [],
    alt: '리모델링을 마친 사무실 로비 전경(재업로드)',
    // 같은 이름·크기 — 중복 감지 경로를 화면에서 실제로 밟게 하는 씨앗이다
    sizeBytes: 842_100,
    extension: 'jpg',
    uploadedAt: '2026-05-08T16:05',
    uploader: '마케팅팀',
  },
  {
    id: 'md-003',
    fileName: 'showroom-plan.pdf',
    folderId: 'documents',
    tags: ['도면'],
    alt: '쇼룸 평면 계획 도면 요약본',
    sizeBytes: 2_411_000,
    extension: 'pdf',
    uploadedAt: '2026-04-02T09:30',
    uploader: '설계팀',
  },
  {
    id: 'md-002',
    fileName: 'office-lobby.jpg',
    folderId: 'projects',
    tags: ['사무공간', '프로젝트'],
    alt: '리모델링을 마친 사무실 로비 전경',
    sizeBytes: 842_100,
    extension: 'jpg',
    uploadedAt: '2026-03-14T14:20',
    uploader: '콘텐츠 운영팀',
  },
  {
    id: 'md-001',
    fileName: 'logo-primary.svg',
    folderId: 'brand',
    tags: ['로고', '브랜드'],
    alt: '회사 기본 로고',
    sizeBytes: 18_432,
    extension: 'svg',
    uploadedAt: '2026-02-10T10:00',
    uploader: '콘텐츠 운영팀',
  },
];

/** 자산별 사용처 — 뉴스 첨부·페이지 본문이 역참조로 답한 결과를 한 번에 모아 둔 형태 */
const DEMO_USAGE: Readonly<Record<string, readonly UsageRef[]>> = {
  'md-001': [
    { id: 'pg-001', domainLabel: '페이지', label: '사업영역' },
    { id: 'nw-003', domainLabel: '뉴스', label: '본사 이전 안내' },
  ],
  'md-002': [],
  'md-003': [{ id: 'nw-002', domainLabel: '뉴스', label: '기업부설 연구소 인증 획득' }],
  'md-004': [],
  'md-005': [{ id: 'nw-001', domainLabel: '뉴스', label: '공간 데이터 분석 솔루션 정식 출시' }],
};

/** 인라인 SVG 미리보기 — 외부 자산 없이 data: URI 로만 썸네일을 흉내낸다 */
const PLACEHOLDER_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="slategray"/><circle cx="36" cy="36" r="12" fill="white"/><path d="M12 84 L40 52 L60 72 L76 58 L84 84 Z" fill="white"/></svg>',
)}`;

/* ── 목록 필터(실화면 filterMediaAssets · countByFolder · collectTags 미러) ─────────────────── */

function countByFolder(assets: readonly DemoAsset[]): Readonly<Record<string, number>> {
  const counts: Record<string, number> = { [FOLDER_FILTER_ALL]: assets.length };
  for (const folder of MEDIA_FOLDERS) {
    counts[folder.id] = assets.filter((asset) => asset.folderId === folder.id).length;
  }
  return counts;
}

/** 이 목록에 실제로 쓰이는 태그 — 손으로 관리하는 태그 사전을 두지 않는다(파생값) */
const collectTags = (assets: readonly DemoAsset[]): readonly string[] =>
  [...new Set(assets.flatMap((asset) => asset.tags))].sort((a, b) => a.localeCompare(b));

function filterAssets(
  assets: readonly DemoAsset[],
  folderId: string,
  tag: string,
  keyword: string,
): readonly DemoAsset[] {
  const needle = keyword.trim().toLowerCase();
  return assets.filter((asset) => {
    if (folderId !== FOLDER_FILTER_ALL && asset.folderId !== folderId) return false;
    if (tag !== '' && !asset.tags.includes(tag)) return false;
    if (needle === '') return true;
    return (
      asset.fileName.toLowerCase().includes(needle) || asset.alt.toLowerCase().includes(needle)
    );
  });
}

const folderLabelOf = (folderId: string): string =>
  MEDIA_FOLDERS.find((folder) => folder.id === folderId)?.label ?? '미분류';

const FOLDER_OPTIONS: readonly { readonly id: string; readonly label: string }[] = [
  { id: FOLDER_FILTER_ALL, label: '전체' },
  ...MEDIA_FOLDERS.map((folder) => ({ id: folder.id, label: folder.label })),
];

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

/** 좌: 고정 폭 폴더 필터 / 우: 남는 폭 전부 */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const mainStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const filterNavStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const filterHeadingStyle: CSSProperties = {
  margin: 0,
  marginLeft: cssVar('space.3'),
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
};

const filterListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const filterItemStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'none',
  borderWidth: 0,
  borderRadius: cssVar('radius.md'),
  background: active ? cssVar('color.surface.raised') : 'transparent',
  color: active ? cssVar('color.action.primary.default') : cssVar('color.text.default'),
  ...typography('typography.label.md'),
  textAlign: 'left',
  cursor: 'pointer',
});

const countBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  minWidth: cssVar('space.5'),
  height: cssVar('space.5'),
  paddingLeft: cssVar('space.1'),
  paddingRight: cssVar('space.1'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
  lineHeight: '1',
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};

const noticeStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const toolbarLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
};

const filterSlotStyle: CSSProperties = {
  display: 'inline-flex',
  minInlineSize: `calc(${cssVar('space.6')} * 5)`,
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  listStyleType: 'none',
  margin: 0,
  padding: 0,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const rowLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const metaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const fileNameStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  overflowWrap: 'anywhere',
};

const mutedStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  overflowWrap: 'anywhere',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

const ghostButtonStyle = (blocked: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'none',
  borderWidth: 0,
  borderRadius: cssVar('radius.md'),
  background: 'transparent',
  color: blocked ? cssVar('color.text.disabled') : cssVar('color.text.default'),
  cursor: blocked ? 'not-allowed' : 'pointer',
});

const dangerGhostStyle = (blocked: boolean): CSSProperties => ({
  ...ghostButtonStyle(blocked),
  color: blocked ? cssVar('color.text.disabled') : cssVar('color.feedback.danger.text'),
});

const usageListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  listStyleType: 'none',
  marginTop: cssVar('space.2'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  padding: 0,
};

const usageLinkStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.action.primary.default'),
  textDecoration: 'none',
};

const modalBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
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

/* ── 등록 모달(실화면 MediaAssetFormModal 미러) ────────────────────────────────────────────── */

interface UploadModalProps {
  readonly assets: readonly DemoAsset[];
  readonly initialFileName: string;
  readonly initialSize: string;
  readonly onClose: () => void;
}

function UploadModal({ assets, initialFileName, initialSize, onClose }: UploadModalProps) {
  const [fileName, setFileName] = useState(initialFileName);
  const [sizeBytes, setSizeBytes] = useState(initialSize);
  const [folderId, setFolderId] = useState<string>(UNFILED_FOLDER_ID);
  const [tags, setTags] = useState('');
  const [alt, setAlt] = useState('');

  const duplicate = findDuplicate(assets, fileName, Number(sizeBytes.replace(/\D/g, '')) || 0);

  return (
    <Modal
      title="파일 등록"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose}>
            취소
          </Button>
          <Button variant="primary" size="md" type="submit">
            등록
          </Button>
        </>
      }
    >
      <div style={modalBodyStyle}>
        {/* 가짜 업로드 성공을 지어내지 않는다 — 지금 저장되는 것이 무엇인지 그대로 말한다 */}
        <Alert tone="info">
          지금은 파일이 실제로 업로드되지 않습니다. 파일 정보(이름·용량·대체텍스트)만 등록되며,
          업로드 연결은 백엔드가 붙은 뒤 이어집니다.
        </Alert>

        {/* 막지 않는다 — 무엇이 겹치는지 알린다 */}
        {duplicate !== null && <Alert tone="warning">{duplicateWarningMessage(duplicate)}</Alert>}

        <FormField
          htmlFor="media-file-name"
          label="파일 이름"
          required
          hint="확장자를 포함해 적습니다. 예: office-lobby.jpg"
        >
          <input
            id="media-file-name"
            type="text"
            style={controlStyle(false)}
            placeholder="office-lobby.jpg"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
          />
        </FormField>

        <FormField
          htmlFor="media-size"
          label="용량(바이트)"
          required
          hint="백엔드가 붙으면 파일에서 자동으로 읽습니다."
        >
          <input
            id="media-size"
            type="number"
            min={1}
            style={controlStyle(false)}
            placeholder="842100"
            value={sizeBytes}
            onChange={(event) => setSizeBytes(event.target.value)}
          />
        </FormField>

        <FormField htmlFor="media-folder" label="폴더">
          <SelectField
            id="media-folder"
            value={folderId}
            onChange={(event) => setFolderId(event.target.value)}
          >
            {MEDIA_FOLDERS.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField htmlFor="media-tags" label="태그" hint="쉼표로 구분합니다. 예: 로고, 브랜드">
          <input
            id="media-tags"
            type="text"
            style={controlStyle(false)}
            placeholder="로고, 브랜드"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
          />
        </FormField>

        <FormField
          htmlFor="media-alt"
          label="대체텍스트"
          required
          hint="화면을 읽어 주는 사용자에게는 이 문장이 곧 이미지입니다."
          {...(alt.trim() === '' && {
            error:
              '대체텍스트를 입력하세요. 화면을 읽어 주는 사용자에게는 이 문장이 곧 이미지입니다.',
          })}
        >
          <input
            id="media-alt"
            type="text"
            style={controlStyle(alt.trim() === '')}
            placeholder="리모델링을 마친 사무실 로비 전경"
            value={alt}
            aria-invalid={alt.trim() === ''}
            onChange={(event) => setAlt(event.target.value)}
          />
        </FormField>
      </div>
    </Modal>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface MediaLibraryScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialFolderId?: string;
  readonly initialTag?: string;
  /** 사용처 조회기가 배선되지 않은 상태 — null 은 '안 쓰인다' 가 아니라 '모른다' 다 */
  readonly usageUnavailable?: boolean;
  readonly initialOpenUsageId?: string;
  readonly uploadOpen?: boolean;
}

function MediaLibraryScreen({
  loading = false,
  initialKeyword = '',
  initialFolderId = FOLDER_FILTER_ALL,
  initialTag = '',
  usageUnavailable = false,
  initialOpenUsageId,
  uploadOpen = false,
}: MediaLibraryScreenProps) {
  const [assets, setAssets] = useState<readonly DemoAsset[]>(DEMO_ASSETS);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [folderId, setFolderId] = useState(initialFolderId);
  const [tag, setTag] = useState(initialTag);
  const [openUsageId, setOpenUsageId] = useState<string | null>(initialOpenUsageId ?? null);
  const [pendingDelete, setPendingDelete] = useState<DemoAsset | null>(null);
  const [uploading, setUploading] = useState(uploadOpen);

  const counts = useMemo(() => countByFolder(assets), [assets]);
  const tags = useMemo(() => collectTags(assets), [assets]);
  const visible = useMemo(
    () => filterAssets(assets, folderId, tag, keyword),
    [assets, folderId, tag, keyword],
  );

  /**
   * 자산별 사용처 — 목록을 그릴 때 한 번에 모은다. 행마다 따로 물으면 한 화면 안의 두 행이
   * **서로 다른 시점의 답**을 갖게 되어 배지와 삭제 버튼이 어긋난다.
   */
  const usageById = useMemo(() => {
    const map = new Map<string, readonly UsageRef[] | null>();
    for (const asset of assets) {
      map.set(asset.id, usageUnavailable ? null : (DEMO_USAGE[asset.id] ?? []));
    }
    return map;
  }, [assets, usageUnavailable]);

  const removeAsset = (id: string): void => {
    setAssets((prev) => prev.filter((asset) => asset.id !== id));
  };

  const hasActiveFilters = folderId !== FOLDER_FILTER_ALL || tag !== '';

  const createButton = (
    <Button
      variant="primary"
      size="md"
      iconLeft={<Icon name="upload" />}
      onClick={() => setUploading(true)}
    >
      파일 등록
    </Button>
  );

  return (
    <div style={layoutStyle}>
      <Panel
        notice={
          <p style={noticeStyle}>
            쓰이는 중인 파일은 삭제할 수 없습니다. 사용처를 눌러 어디에 걸려 있는지 확인한 뒤 그
            화면에서 먼저 연결을 끊으세요.
          </p>
        }
      >
        <nav style={filterNavStyle} aria-label="폴더 필터">
          <h2 style={filterHeadingStyle}>폴더</h2>
          <ul style={filterListStyle}>
            {FOLDER_OPTIONS.map((option) => {
              const active = folderId === option.id;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    style={filterItemStyle(active)}
                    aria-pressed={active}
                    onClick={() => setFolderId(option.id)}
                  >
                    <span>{option.label}</span>
                    <span style={countBadgeStyle}>{fmt(counts[option.id] ?? 0)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </Panel>

      <div style={mainStyle}>
        <div style={toolbarStyle}>
          <div style={toolbarLeftStyle}>
            <span style={searchWrapStyle}>
              <SearchField
                value={keyword}
                onChange={setKeyword}
                label="파일 이름·대체텍스트 검색"
                placeholder="파일 이름 · 대체텍스트 검색"
              />
            </span>
            <span style={filterSlotStyle}>
              <SelectField
                value={tag}
                aria-label="태그 필터"
                onChange={(event) => setTag(event.target.value)}
              >
                <option value="">태그 전체</option>
                {tags.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </SelectField>
            </span>
          </div>
          {createButton}
        </div>

        <Card>
          <div style={cardBodyStyle}>
            <p style={noticeStyle} aria-busy={loading}>
              {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
            </p>

            {loading ? null : visible.length === 0 ? (
              <EmptyState
                label="파일"
                createVerb="등록"
                hasQuery={keyword.trim() !== ''}
                hasActiveFilters={hasActiveFilters}
                onClearSearch={() => setKeyword('')}
                onResetFilters={() => {
                  setFolderId(FOLDER_FILTER_ALL);
                  setTag('');
                }}
                action={createButton}
              />
            ) : (
              <ul style={listStyle}>
                {visible.map((asset) => {
                  const usage = usageById.get(asset.id) ?? null;
                  const deleteBlocked = mediaDeleteBlock(usage);
                  const count = usage === null ? null : usage.length;
                  const usageOpen = openUsageId === asset.id;
                  const usagePanelId = `media-usage-${asset.id}`;

                  return (
                    <li key={asset.id}>
                      <div style={rowStyle}>
                        <span style={rowLeftStyle}>
                          {/* 이미지가 아닌 파일에도 같은 자리를 준다 — 목록이 들쭉날쭉하지 않게 */}
                          <ImageThumb
                            src={isImageExtension(asset.extension) ? PLACEHOLDER_IMAGE : ''}
                            alt={asset.alt}
                          />
                          <span style={metaStyle}>
                            <span style={fileNameStyle}>{asset.fileName}</span>
                            <span style={mutedStyle}>{asset.alt}</span>
                            <span style={badgeRowStyle}>
                              <StatusBadge tone="neutral" label={folderLabelOf(asset.folderId)} />
                              <StatusBadge
                                tone="neutral"
                                label={`${asset.extension.toUpperCase()} · ${formatBytes(asset.sizeBytes)}`}
                              />
                              {asset.tags.map((value) => (
                                <StatusBadge key={value} tone="neutral" label={`#${value}`} />
                              ))}
                            </span>
                            <span style={mutedStyle}>
                              {`${asset.uploadedAt.replace('T', ' ')} · ${asset.uploader}`}
                            </span>
                          </span>
                        </span>

                        <span style={actionsStyle}>
                          {/* 사용처는 삭제를 막는 근거다 — 그 근거를 확인할 길이 같은 자리에 있어야 한다 */}
                          <button
                            type="button"
                            style={ghostButtonStyle(false)}
                            aria-expanded={usageOpen}
                            aria-controls={usagePanelId}
                            onClick={() => setOpenUsageId(usageOpen ? null : asset.id)}
                          >
                            <StatusBadge tone={usageTone(count)} label={usageLabel(count)} />
                          </button>

                          <button
                            type="button"
                            style={ghostButtonStyle(false)}
                            aria-label={`${asset.fileName} 정보 수정`}
                          >
                            <Icon name="pencil" />
                          </button>

                          {/* 못 누르는 이유를 그대로 접근 이름에 싣는다 */}
                          <button
                            type="button"
                            style={dangerGhostStyle(deleteBlocked !== null)}
                            aria-label={
                              deleteBlocked !== null
                                ? `${asset.fileName} — ${deleteBlocked}`
                                : `${asset.fileName} 삭제`
                            }
                            {...(deleteBlocked !== null && { title: deleteBlocked })}
                            disabled={deleteBlocked !== null}
                            onClick={() => setPendingDelete(asset)}
                          >
                            <Icon name="trash" />
                          </button>
                        </span>
                      </div>

                      {usageOpen && (
                        <div id={usagePanelId}>
                          {usage === null ? (
                            <p style={noticeStyle}>
                              사용처를 확인할 수 없습니다. 확인되기 전에는 삭제할 수 없습니다.
                            </p>
                          ) : usage.length === 0 ? (
                            <p style={noticeStyle}>아직 어디에도 쓰이지 않았습니다.</p>
                          ) : (
                            <ul style={usageListStyle}>
                              {usage.map((ref) => (
                                <li key={`${ref.domainLabel}-${ref.id}`}>
                                  <a href="#media-usage-target" style={usageLinkStyle}>
                                    {`${ref.domainLabel} · ${ref.label}`}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {uploading && (
        <UploadModal
          assets={assets}
          initialFileName="office-lobby.jpg"
          initialSize="842100"
          onClose={() => setUploading(false)}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="파일 삭제"
          message={`'${pendingDelete.fileName}' 파일을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="파일 삭제"
          onConfirm={() => {
            removeAsset(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/**
 * 정상: 쓰이는 파일과 안 쓰이는 파일이 섞여 있다 — 삭제 버튼의 잠금 여부가 행마다 다르고,
 * 잠긴 버튼은 왜 잠겼는지를 접근 이름에 싣는다.
 */
export const Default: Story = {
  render: () => <MediaLibraryScreen />,
};

/** 최초 로드: 목록 자리에 '불러오는 중' — 재조회 중에는 이전 목록을 유지한다(STATE-01) */
export const Loading: Story = {
  render: () => <MediaLibraryScreen loading />,
};

/** 사용처 펼침: 삭제를 막는 근거를 같은 자리에서 확인한다 — 어느 화면에서 연결을 끊어야 하는지까지 */
export const UsageExpanded: Story = {
  render: () => <MediaLibraryScreen initialOpenUsageId="md-001" />,
};

/**
 * 사용처 미배선: 전부 '확인 불가' 이고 삭제가 **전부 잠긴다**(fail-closed). '안 쓰인다' 로 뭉개면
 * 배선이 빠진 날 라이브러리가 통째로 비워질 수 있다.
 */
export const UsageUnavailable: Story = {
  render: () => <MediaLibraryScreen usageUnavailable initialOpenUsageId="md-002" />,
};

/**
 * 등록 모달: 실제 업로드가 없다는 사실을 Alert 로 먼저 말하고, 같은 이름·크기의 파일이 이미
 * 있으면 **막지 않고 경고**한다. 대체텍스트는 비워 둘 수 없다.
 */
export const UploadModalWithDuplicate: Story = {
  render: () => <MediaLibraryScreen uploadOpen />,
};

/** 빈 결과: 폴더 + 검색이 맞지 않음 — Empty(검색 지우기 · 필터 초기화 · 등록) */
export const Empty: Story = {
  render: () => <MediaLibraryScreen initialFolderId="documents" initialKeyword="로고" />,
};
