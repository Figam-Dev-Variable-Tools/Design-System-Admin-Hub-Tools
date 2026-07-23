// 목록형 화면의 등록/수정 폼 껍데기 (앱 공용 선언적 CRUD 프레임워크)
//
// 연혁·인증서·ESG 의 폼 페이지가 같은 골격을 쓴다: 뒤로가기 · 제목(등록/수정) · 안내 · 카드(필드) ·
// 저장/취소 · 미저장 이탈 가드 · 상세 조회 실패 배너. 콘텐츠 폼(FaqFormPage)과 같은 배치를 따른다.
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { cssVar, Skeleton } from '@tds/ui';

import { ForbiddenScreen } from '../errors/ErrorScreens';
import { objectParticle } from '../format';
import { useRouteCanSubmitForm } from '../permissions/RequirePermission';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  Icon,
  pageTitleStyle,
  useUnsavedChangesDialog,
} from '../ui';
import { FormConflictDialog, FormServerError } from './FormFeedback';
import type { ConflictState, LoadFailure } from './useCrudForm';

/* 제목 블록과 폼 사이의 section gap — space.6(24px). 제목/설명과 입력 영역이
   서로 다른 덩어리로 읽히도록 띄운다 (TOKEN-08). */
const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.6'),
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

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
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

interface FormPageShellProps {
  readonly entityLabel: string;
  readonly cardTitle: string;
  readonly description: string;
  readonly listPath: string;
  readonly isEdit: boolean;
  readonly loadingDetail: boolean;
  /** 상세 조회 실패의 갈래 — 404 와 5xx 는 복구 수단이 다르다 (EXC-12) */
  readonly loadFailure: LoadFailure | null;
  readonly onRetryLoad?: () => void;
  readonly serverError: string | null;
  readonly errorReference?: string | null;
  /** 409/412 충돌 — 입력을 보존한 채 다이얼로그를 띄운다 (EXC-04) */
  readonly conflict?: ConflictState | null;
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
  loadFailure,
  onRetryLoad,
  serverError,
  errorReference = null,
  conflict = null,
  saving,
  isDirty,
  unsavedMessage,
  onSubmit,
  children,
}: FormPageShellProps) {
  const navigate = useNavigate();
  /* [EXC-03] 등록/수정 권한을 **껍데기가** 판정한다 — 화면이 아니라.
     이 폼이 등록인지 수정인지는 이미 껍데기가 알고 있다(isEdit — 제목과 저장 버튼 라벨이 그것으로
     갈린다). 그러니 '어느 권한을 물어야 하는가' 도 여기서 답할 수 있다.

     [왜 화면마다 적지 않는가] 폼은 25개고 계속 늘어난다. 화면마다 canCreate/canUpdate 를 적게 하면
     **다음에 추가되는 폼**이 그것을 빠뜨린다 — 목록의 등록 CTA 가 정확히 그렇게 12개 화면에서
     빠져 있었다. 껍데기가 소유하면 새 폼은 껍데기를 쓰는 것만으로 게이팅된 채 태어난다. */
  const canSubmit = useRouteCanSubmitForm(isEdit);
  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: unsavedMessage });

  /* 쓸 수 없는 폼은 열지 않는다 — 입력을 다 채운 뒤 저장에서 막히는 것보다 먼저 말하는 편이 낫다.
     조회 실패 분기보다 앞선다: 권한이 없으면 상세를 불러왔는지 여부조차 알릴 일이 아니다. */
  if (!canSubmit) return <ForbiddenScreen />;

  if (loadFailure !== null) {
    /**
     * [EXC-12] 404 는 재시도를 권하지 않는다 — 재시도해도 영원히 없다. 이미 지워진 항목의
     * 링크를 열었을 때 '다시 시도' 를 누르며 시간을 쓰게 만들지 않는다.
     */
    const notFound = loadFailure === 'not-found';

    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {notFound
                ? `${entityLabel}${objectParticle(entityLabel)} 찾을 수 없어요. 이미 삭제되었을 수 있어요.`
                : `${entityLabel}${objectParticle(entityLabel)} 불러오지 못했어요.`}
            </span>
            {!notFound && onRetryLoad !== undefined && (
              <Button variant="secondary" onClick={onRetryLoad}>
                다시 시도
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(listPath)}>
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
        onClick={() => navigate(listPath)}
      >
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div>
        {/* TOKEN-05 — 페이지 제목은 공유 pageTitleStyle(title.xl) 하나에서 온다 */}
        <h1 style={pageTitleStyle}>{isEdit ? `${entityLabel} 수정` : `${entityLabel} 등록`}</h1>
        <p style={descriptionStyle}>{description}</p>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <Card>
          <CardTitle>{cardTitle}</CardTitle>

          <FormServerError serverError={serverError} errorReference={errorReference} />

          {loadingDetail ? (
            <div style={skeletonBodyStyle} aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
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

      <FormConflictDialog conflict={conflict} />

      {unsavedDialog}
    </div>
  );
}
