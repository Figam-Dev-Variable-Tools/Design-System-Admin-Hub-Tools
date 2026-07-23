// 설정 폼 껍데기 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// ┌ shared/crud 의 DocumentFormShell 과 무엇이 다른가 ─────────────────────────┐
// │ 골격(안내문 → 카드 → 스켈레톤/필드 → 푸터 저장, 미저장 이탈 가드)은 **같다** —  │
// │ 그 화면(회사 정보·적립금 정책)의 관례를 그대로 따른다. 새 패턴이 아니다.        │
// │                                                                          │
// │ 시스템 설정에만 있는 것 3종을 그 위에 얹는다:                                 │
// │  ① 권한 게이팅   — 수정 권한이 없으면 저장 컨트롤을 **렌더하지 않는다** (EXC-03) │
// │  ② 저장 확인     — 사이트를 내리고 인증을 끊는 값이라 클릭 한 번으로 바뀌지 않는다 │
// │  ③ 409 충돌      — 동시 편집을 덮어쓰지 않는다 (EXC-04)                       │
// │                                                                          │
// │ ①②③ 은 DocumentFormShell 의 props 표면 밖이고 그 파일은 shared/**(F2 소유)라   │
// │ 이번 배치에서 고칠 수 없다. 그래서 이 섹션 안에 얹었다 — 셋 다 설정 화면 4개가   │
// │ 공유하므로 화면마다 복사하지 않는다. **F2 가 DocumentFormShell 을 개편할 때      │
// │ 이 셋을 흡수하는 것이 옳다**(보고서에 기재).                                  │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [STATE-01] 네 상태 중 하나만 그린다: 조회 실패 → 배너만 / 첫 로딩 → 스켈레톤만 / 그 외 → 폼.
// [도메인을 모른다] 무슨 설정인지 알지 못한다 — 제목·안내문·필드(children)와 상태 플래그만 받는다.
import type { CSSProperties, FormEvent, ReactNode } from 'react';

import { cssVar, Skeleton } from '@tds/ui';

import { Alert, Button, Card, CardTitle, useUnsavedChangesDialog } from '../../../shared/ui';
import { AuditNote } from './AuditNote';
import type { AuditInfo } from './store';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const descriptionStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
};

const footerHintStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

interface SettingsFormShellProps {
  readonly cardTitle: string;
  readonly description: string;
  /** 첫 조회 로딩 — 스켈레톤만 그린다(empty 문구가 번쩍이지 않는다) */
  readonly loading: boolean;
  /** 조회 실패 — 폼 대신 인라인 danger 배너 + 재시도 (STATE-02: 토스트로 알리지 않는다) */
  readonly loadFailed: boolean;
  readonly onRetry: () => void;
  /** 저장 실패 — 카드 안 danger 배너 */
  readonly serverError: string | null;
  readonly saving: boolean;
  readonly dirty: boolean;
  /** 수정 권한 — false 면 저장 버튼을 렌더하지 않고 읽기 전용 안내를 대신 보인다 (EXC-03) */
  readonly canUpdate: boolean;
  /** 읽기 전용일 때의 안내 문구 */
  readonly readOnlyNotice: string;
  readonly unsavedMessage: string;
  /** 마지막 변경자·시각. 아직 모르면 null */
  readonly audit: AuditInfo | null;
  /** 위험 설정 경고 슬롯 — 카드 상단(필드 위)에 온다. 없으면 null */
  readonly warning: ReactNode;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly children: ReactNode;
}

export function SettingsFormShell({
  cardTitle,
  description,
  loading,
  loadFailed,
  onRetry,
  serverError,
  saving,
  dirty,
  canUpdate,
  readOnlyNotice,
  unsavedMessage,
  audit,
  warning,
  onSubmit,
  children,
}: SettingsFormShellProps) {
  // 저장하지 않은 채 이탈하면 discard 확인이 뜬다 — 저장 중에는 가드하지 않는다(곧 not-dirty 가 된다).
  const unsavedDialog = useUnsavedChangesDialog(dirty && !saving, { message: unsavedMessage });

  // [STATE-01] 조회 실패 — 이때는 폼을 그리지 않는다. 할 일은 재시도뿐이다.
  if (loadFailed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>설정을 불러오지 못했어요.</span>
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
          {!canUpdate && <Alert tone="info">{readOnlyNotice}</Alert>}
          {warning}

          {loading ? (
            <div style={skeletonBodyStyle} aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={`row-${String(row)}`} />
              ))}
            </div>
          ) : (
            <div style={bodyStyle}>{children}</div>
          )}

          <div style={actionsStyle}>
            {audit !== null && !loading && <AuditNote audit={audit} />}

            {/* 수정 권한이 없으면 저장 컨트롤 자체가 없다 — 눌러 보고 403 을 받는 자리를 만들지 않는다 */}
            {canUpdate && (
              <>
                <p style={footerHintStyle}>
                  {saving
                    ? '저장하는 중이에요…'
                    : dirty
                      ? '저장하지 않은 변경 사항이 있어요.'
                      : '변경 사항이 없어요.'}
                </p>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!dirty || saving || loading}
                >
                  {saving ? '저장 중…' : '저장'}
                </Button>
              </>
            )}
          </div>
        </Card>
      </form>

      {unsavedDialog}
    </div>
  );
}
