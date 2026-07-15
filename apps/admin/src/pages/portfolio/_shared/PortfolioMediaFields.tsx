// 포트폴리오 미디어·노출 필드 묶음 (A41 소유 — apps/admin/src/pages/portfolio/**)
//
// 포트폴리오·성공 사례 폼이 똑같은 하단부(대표 이미지 · 본문 다중 이미지 · 노출 토글)를 쓴다.
// 두 폼이 복사하는 대신 여기 한 벌만 두고 값/콜백만 주입한다. 검증 문구는 각 폼의 zod 스키마가 정본이다.
import type { CSSProperties } from 'react';

import {
  fieldLabelStyle,
  fieldStyle,
  ImageGalleryField,
  ImageUploadField,
  ToggleSwitch,
} from '../../../shared/ui';

const COVER_HINT = '목록에는 노출되지 않습니다 — 상세/미리보기의 대표 이미지입니다.';

interface PortfolioMediaFieldsProps {
  readonly disabled: boolean;
  readonly coverValue: string;
  readonly onCoverChange: (value: string) => void;
  readonly coverError?: string | undefined;
  readonly galleryValues: readonly string[];
  readonly onGalleryChange: (values: readonly string[]) => void;
  readonly galleryError?: string | undefined;
  readonly galleryHint: string;
  readonly maxImages: number;
  readonly published: boolean;
  readonly onPublishedChange: (next: boolean) => void;
  /** 노출 토글 접근성 이름 — '포트폴리오 노출 여부' 등 */
  readonly publishedLabel: string;
}

const toggleFieldStyle: CSSProperties = fieldStyle;

export function PortfolioMediaFields({
  disabled,
  coverValue,
  onCoverChange,
  coverError,
  galleryValues,
  onGalleryChange,
  galleryError,
  galleryHint,
  maxImages,
  published,
  onPublishedChange,
  publishedLabel,
}: PortfolioMediaFieldsProps) {
  return (
    <>
      <ImageUploadField
        label="대표 이미지"
        required
        value={coverValue}
        onChange={onCoverChange}
        disabled={disabled}
        error={coverError}
        hint={COVER_HINT}
      />

      <ImageGalleryField
        label="본문 이미지"
        values={galleryValues}
        onChange={onGalleryChange}
        disabled={disabled}
        error={galleryError}
        hint={galleryHint}
        maxFiles={maxImages}
      />

      <div style={toggleFieldStyle}>
        <span style={fieldLabelStyle}>노출 여부</span>
        <ToggleSwitch
          checked={published}
          onChange={onPublishedChange}
          disabled={disabled}
          label={publishedLabel}
          onLabel="게시"
          offLabel="숨김"
        />
      </div>
    </>
  );
}
