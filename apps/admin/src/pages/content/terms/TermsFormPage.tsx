// TermsFormPage — 약관 버전 등록/수정 (라우트: /content/terms/new?type= · /content/terms/:id/edit)
//
// [별도 폼 페이지 — 오너 피드백 ⑦/⑥] 목록의 인라인 폼을 없애고 별도 라우트로 옮겼다.
//   등록은 ?type= 로 약관 종류를 받고, 수정은 :id 로 기존 버전을 불러온다. 폼 본문은 기존 VersionForm 재사용.
import type { CSSProperties } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { cssVar, Skeleton } from '@tds/ui';

import { ForbiddenScreen } from '../../../shared/errors/ErrorScreens';
import { useRouteCanSubmitForm } from '../../../shared/permissions/RequirePermission';
import { Alert, Button, Card, Icon } from '../../../shared/ui';
import { VersionForm } from './components/VersionForm';
import { useTermsVersionQuery } from './queries';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
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

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const LIST_PATH = '/content/terms';

export default function TermsFormPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = id !== undefined;
  const navigate = useNavigate();

  const detailQuery = useTermsVersionQuery(id ?? '');
  const loadingDetail = isEdit && detailQuery.data === undefined && detailQuery.error === null;
  /* [EXC-03] 이 폼 라우트는 FormPageShell 을 쓰지 않아 껍데기의 403 을 받지 못했다 —
     RequirePermission 은 read 만 보므로 `/content/terms/new` 가 조회 권한만으로 열리고 제출까지
     됐다. 같은 판정을 VersionForm 이 제출 경로에서 한 번 더 읽는다(팝업·인라인 폼과 같은 이유). */
  const canSubmit = useRouteCanSubmitForm(isEdit);

  const back = () => navigate(LIST_PATH);

  /* 쓸 수 없는 폼은 열지 않는다 — 조회 실패 분기보다 앞선다 (FormPageShell 과 같은 순서) */
  if (!canSubmit) return <ForbiddenScreen />;

  if (isEdit && detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>약관 버전을 불러오지 못했어요. </span>
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
          <span>약관 종류가 필요해요. 목록에서 종류를 고르고 다시 등록하세요. </span>
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
        <Icon name="chevron-left" />
        목록으로
      </button>

      {loadingDetail ? (
        <Card>
          <div style={skeletonBodyStyle} aria-busy="true">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={`row-${String(row)}`} />
            ))}
          </div>
        </Card>
      ) : (
        <VersionForm typeId={typeId} editing={editing} onSaved={back} onCancel={back} />
      )}
    </div>
  );
}
