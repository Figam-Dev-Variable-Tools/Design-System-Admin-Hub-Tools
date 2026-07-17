// 단일 문서 편집 폼 껍데기 (앱 공용 선언적 CRUD 프레임워크)
//
// [왜 여기 있는가] 기업 관리의 단일 문서형 4종(회사 정보·CEO 인사말·비전·미션·오시는 길)이
// 똑같은 골격을 쓴다: 문서 1건을 불러와 폼을 채우고, 저장하면 토스트로 알리고, 저장하지 않은 채
// 이탈하면 가드가 막는다. 네 화면이 이 로딩/에러/저장/가드 배선을 각자 복사하는 대신 여기 한 벌만 둔다.
// (모두 pages/company 아래라 페이지 간 결합이 아니다 — 콘텐츠 폼이 공유하는 shared/ui 프리미티브는
//  그대로 재사용하고, 이 껍데기는 그 위에 '단일 문서' 규약만 얹는다.)
//
// [도메인을 모른다] 무슨 문서인지 알지 못한다 — 카드 제목·안내문·필드(children)와 상태 플래그만 받는다.
import type { CSSProperties, FormEvent, ReactNode } from 'react';

import { Alert, Button, Card, CardTitle, useUnsavedChangesDialog } from '../ui';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const descriptionStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-3)',
};

const footerHintStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

interface DocumentFormShellProps {
  readonly cardTitle: string;
  /** 카드 위 안내문 — 필수 표식·저장 효과 등을 알린다 */
  readonly description: string;
  /** 첫 조회 로딩 중 — 스켈레톤을 그린다 */
  readonly loading: boolean;
  /** 조회 실패 — 폼 대신 재시도 배너를 그린다 */
  readonly loadFailed: boolean;
  readonly onRetry: () => void;
  /** 저장 실패 — 카드 안 danger 배너로 표시 */
  readonly serverError: string | null;
  readonly saving: boolean;
  /** 저장하지 않은 변경이 있는가 — 저장 버튼 활성화 + 이탈 가드 */
  readonly dirty: boolean;
  readonly unsavedMessage: string;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly children: ReactNode;
}

export function DocumentFormShell({
  cardTitle,
  description,
  loading,
  loadFailed,
  onRetry,
  serverError,
  saving,
  dirty,
  unsavedMessage,
  onSubmit,
  children,
}: DocumentFormShellProps) {
  // 저장하지 않은 채 이탈하면 discard 확인 다이얼로그를 세운다(콘텐츠 폼과 같은 공통 가드).
  const unsavedDialog = useUnsavedChangesDialog(dirty && !saving, { message: unsavedMessage });

  if (loadFailed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>내용을 불러오지 못했습니다.</span>
            <Button variant="secondary" onClick={onRetry}>
              다시 시도
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <p style={descriptionStyle}>{description}</p>

      <form onSubmit={onSubmit} noValidate>
        <Card>
          <CardTitle>{cardTitle}</CardTitle>

          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          {loading ? (
            <div style={skeletonBodyStyle} aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <span key={`row-${String(row)}`} className="tds-ui-skeleton" aria-hidden="true" />
              ))}
            </div>
          ) : (
            <div style={bodyStyle}>{children}</div>
          )}

          <div style={actionsStyle}>
            <p style={footerHintStyle}>
              {saving
                ? '저장하는 중입니다…'
                : dirty
                  ? '저장하지 않은 변경 사항이 있습니다.'
                  : '변경 사항이 없습니다.'}
            </p>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!dirty || saving || loading}
            >
              {saving ? '저장 중…' : '저장'}
            </Button>
          </div>
        </Card>
      </form>

      {unsavedDialog}
    </div>
  );
}
