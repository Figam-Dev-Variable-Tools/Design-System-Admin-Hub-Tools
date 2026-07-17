// TermsFormPage — 약관 버전 등록/수정 (라우트: /content/terms/new?type= · /content/terms/:id/edit)
//
// [별도 폼 페이지 — 오너 피드백 ⑦/⑥] 목록의 인라인 폼을 없애고 별도 라우트로 옮겼다.
//   등록은 ?type= 로 약관 종류를 받고, 수정은 :id 로 기존 버전을 불러온다. 폼 본문은 기존 VersionForm 재사용.
import type { CSSProperties } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Alert, Button, Card, ChevronLeftIcon } from '../../../shared/ui';
import { VersionForm } from './components/VersionForm';
import { useTermsVersionQuery } from './queries';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
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

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
};

const LIST_PATH = '/content/terms';

export default function TermsFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = id !== undefined;
  const navigate = useNavigate();

  const detailQuery = useTermsVersionQuery(id ?? '');
  const loadingDetail = isEdit && detailQuery.data === undefined && detailQuery.error === null;

  const back = () => navigate(LIST_PATH);

  if (isEdit && detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>약관 버전을 불러오지 못했습니다. </span>
          <Button variant="secondary" onClick={back}>
            목록으로
          </Button>
        </Alert>
      </div>
    );
  }

  const editing = isEdit ? (detailQuery.data ?? null) : null;
  const typeId = isEdit ? (detailQuery.data?.typeId ?? '') : (searchParams.get('type') ?? '');

  if (!isEdit && typeId === '') {
    return (
      <div style={pageStyle}>
        <Alert tone="warning">
          <span>약관 종류가 필요합니다. 목록에서 종류를 고르고 다시 등록하세요. </span>
          <Button variant="secondary" onClick={back}>
            목록으로
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button type="button" className="tds-ui-focusable" style={backLinkStyle} onClick={back}>
        <ChevronLeftIcon />
        목록으로
      </button>

      {loadingDetail ? (
        <Card>
          <div style={skeletonBodyStyle} aria-busy="true">
            {[0, 1, 2, 3].map((row) => (
              <span key={`row-${String(row)}`} className="tds-ui-skeleton" aria-hidden="true" />
            ))}
          </div>
        </Card>
      ) : (
        <VersionForm typeId={typeId} editing={editing} onSaved={back} onCancel={back} />
      )}
    </div>
  );
}
