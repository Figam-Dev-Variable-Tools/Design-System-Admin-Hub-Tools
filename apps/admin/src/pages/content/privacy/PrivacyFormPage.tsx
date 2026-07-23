// PrivacyFormPage — 개인정보 처리방침 버전 등록/수정 (라우트: /content/privacy/new · /:id/edit)
//
// [별도 폼 페이지 — 오너 피드백 ⑦/⑥] 목록의 인라인 폼을 없애고 별도 라우트로 옮겼다.
//   단일 문서라 종류가 없다. 수정은 :id 로 기존 버전을 불러온다. 폼 본문은 기존 VersionForm 재사용.
import type { CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { cssVar, Skeleton } from '@tds/ui';

import { ForbiddenScreen } from '../../../shared/errors/ErrorScreens';
import { useRouteCanSubmitForm } from '../../../shared/permissions/RequirePermission';
import { Alert, Button, Card, Icon } from '../../../shared/ui';
import { VersionForm } from './components/VersionForm';
import { usePrivacyVersionQuery } from './queries';

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

const LIST_PATH = '/content/privacy';

export default function PrivacyFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();

  const detailQuery = usePrivacyVersionQuery(id ?? '');
  const loadingDetail = isEdit && detailQuery.data === undefined && detailQuery.error === null;
  /* [EXC-03] 이 폼 라우트는 FormPageShell 을 쓰지 않아 껍데기의 403 을 받지 못했다 —
     RequirePermission 은 read 만 보므로 `/content/privacy/new` 가 조회 권한만으로 열리고 제출까지
     됐다. 같은 판정을 VersionForm 이 제출 경로에서 한 번 더 읽는다. */
  const canSubmit = useRouteCanSubmitForm(isEdit);

  const back = () => navigate(LIST_PATH);

  /* 쓸 수 없는 폼은 열지 않는다 — 조회 실패 분기보다 앞선다 (FormPageShell 과 같은 순서) */
  if (!canSubmit) return <ForbiddenScreen />;

  if (isEdit && detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>처리방침 버전을 불러오지 못했어요. </span>
          <Button variant="secondary" onClick={back}>
            목록으로
          </Button>
        </Alert>
      </div>
    );
  }

  const editing = isEdit ? (detailQuery.data ?? null) : null;

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
        <VersionForm editing={editing} onSaved={back} onCancel={back} />
      )}
    </div>
  );
}
