// 목록형 화면의 등록/수정 폼 껍데기 (A41 소유 — apps/admin/src/pages/company/**)
//
// 연혁·인증서·ESG 의 폼 페이지가 같은 골격을 쓴다: 뒤로가기 · 제목(등록/수정) · 안내 · 카드(필드) ·
// 저장/취소 · 미저장 이탈 가드 · 상세 조회 실패 배너. 콘텐츠 폼(FaqFormPage)과 같은 배치를 따른다.
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
  Button,
  Card,
  CardTitle,
  ChevronLeftIcon,
  useUnsavedChangesDialog,
} from '../../../shared/ui';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const titleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  fontFamily: 'var(--tds-typography-title-lg-font-family)',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
  fontWeight: 'var(--tds-typography-title-lg-font-weight)',
  lineHeight: 'var(--tds-typography-title-lg-line-height)',
};

const descriptionStyle: CSSProperties = {
  marginTop: 'var(--tds-space-1)',
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  cursor: 'pointer',
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
};

interface FormPageShellProps {
  readonly entityLabel: string;
  readonly cardTitle: string;
  readonly description: string;
  readonly listPath: string;
  readonly isEdit: boolean;
  readonly loadingDetail: boolean;
  readonly loadFailed: boolean;
  readonly serverError: string | null;
  readonly saving: boolean;
  readonly isDirty: boolean;
  readonly unsavedMessage: string;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly children: ReactNode;
}

export function FormPageShell({
  entityLabel,
  cardTitle,
  description,
  listPath,
  isEdit,
  loadingDetail,
  loadFailed,
  serverError,
  saving,
  isDirty,
  unsavedMessage,
  onSubmit,
  children,
}: FormPageShellProps) {
  const navigate = useNavigate();
  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: unsavedMessage });

  if (loadFailed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>{entityLabel}을(를) 불러오지 못했습니다. </span>
          <Button variant="secondary" onClick={() => navigate(listPath)}>
            목록으로
          </Button>
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
        onClick={() => navigate(listPath)}
      >
        <ChevronLeftIcon />
        목록으로
      </button>

      <div>
        <h1 style={titleStyle}>{isEdit ? `${entityLabel} 수정` : `${entityLabel} 등록`}</h1>
        <p style={descriptionStyle}>{description}</p>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <Card>
          <CardTitle>{cardTitle}</CardTitle>

          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          {loadingDetail ? (
            <div style={skeletonBodyStyle} aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <span key={`row-${String(row)}`} className="tds-ui-skeleton" aria-hidden="true" />
              ))}
            </div>
          ) : (
            <div style={bodyStyle}>{children}</div>
          )}

          <div style={actionsStyle}>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => navigate(listPath)}
            >
              취소
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={saving || loadingDetail}>
              {saving ? '저장 중…' : isEdit ? '저장' : '등록'}
            </Button>
          </div>
        </Card>
      </form>

      {unsavedDialog}
    </div>
  );
}
