// MemberDetailPage — 회원 상세 (라우트: /users/members/:id) · A40 소유
//
// [핵심 규칙 — 지우지 말 것]
// 1. 회원 정보는 **전부 읽기 전용**이다. 입력 필드/드롭다운으로 만들지 않는다.
//    관리자가 바꿀 수 있는 유일한 값은 **비밀번호**뿐이다 (계정 복구 목적).
//    ※ '관리자 메모'와 '적립금 지급/차감'은 회원의 정보가 아니라 운영 기록이라 예외다.
// 2. **운영진 그룹 섹션을 만들지 않는다.** 운영진은 별도 뷰(/users/admins)의 관심사다.
// 3. 우측 상단 ⋯ 메뉴에는 **'회원 삭제' / '알림 발송' 두 개만** 둔다.
//
// [실패는 조용히 삼키지 않는다]
// 알림 발송·회원 삭제·비밀번호 변경·적립금 조정·내역 삭제·메모 저장은 실패할 수 있다.
// 성공은 성공 톤, 실패는 **위험 톤 배너 + 복구 경로(다시 시도)** 또는 다이얼로그/폼 안의 안내로 떨어진다.
//
// [상세 재사용 — /users/admins/:id]
// 관리자(운영진) 상세는 이 화면을 **그대로 재사용**한다. 화면을 복제하지 않는다.
// 컨텍스트에 따라 달라지는 것은 딱 두 가지뿐이라 props 로 주입받는다:
//   ① 목록 복귀 경로(listPath)  ② 상세 조회 함수(fetchDetail)
// 둘 다 기본값이 회원(members)이라 /users/members/:id 는 예전과 완전히 동일하게 동작한다.
// 운영자 라우트는 App.tsx 에서 admins/data-source 의 fetchAdminDetail 을 주입한다.
//
// [데이터] 화면은 data-source.ts 하고만 대화한다.
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import './members.css';
import { isAbort } from '../../shared/async';
import { Card as TdsCard } from '@tds/ui';

import { Alert, Button, ConfirmDialog, useToast } from '../../shared/ui';
import { ActionMenu } from './components/ActionMenu';
import { ActivityCard } from './components/ActivityCard';
import { ConsentCard } from './components/ConsentCard';
import { CouponsCard } from './components/CouponsCard';
import { MemberInfoCard } from './components/MemberInfoCard';
import { MemoCard } from './components/MemoCard';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { PointsCard } from './components/PointsCard';
import { fetchMemberDetail } from './data-source';
import { ArrowLeftIcon } from './icons';
import { useDeleteMember, useMemberDetailQuery, useSendNotification } from './queries';
import type { FetchDetail } from './queries';

/** 기본 목록 경로 — 회원 상세의 '리스트로 돌아가기' */
const LIST_PATH = '/users/members';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const topRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
};

const errorActionsStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--tds-space-2)',
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  textDecoration: 'none',
};

const gridStyle: CSSProperties = {
  display: 'grid',
  // 2단 — 좁은 화면에서는 auto-fit 이 한 단으로 접는다
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 16), 1fr))',
  gap: 'var(--tds-space-4)',
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

/** 스켈레톤 줄들의 세로 간격 — 카드 표면은 @tds/ui Card 가 그린다 (사본을 쓰지 않는다) */
const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
  minWidth: 0,
};

function LoadingSkeleton() {
  return (
    <div style={gridStyle} aria-busy="true">
      {[0, 1].map((column) => (
        <div key={`col-${String(column)}`} style={columnStyle}>
          <TdsCard>
            <div style={skeletonBodyStyle}>
              {[0, 1, 2, 3, 4].map((row) => (
                <span key={`row-${String(row)}`} className="tds-ui-skeleton" aria-hidden="true" />
              ))}
            </div>
          </TdsCard>
        </div>
      ))}
    </div>
  );
}

interface MemberDetailPageProps {
  /** 목록 복귀 경로 — 기본은 회원 목록. /users/admins/:id 는 운영자 목록을 주입한다 */
  readonly listPath?: string;
  /** 상세 조회 함수 — 기본은 회원 상세. /users/admins/:id 는 fetchAdminDetail 을 주입한다 */
  readonly fetchDetail?: FetchDetail;
}

export default function MemberDetailPage({
  listPath = LIST_PATH,
  fetchDetail = fetchMemberDetail,
}: MemberDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const memberId = id ?? '';
  const navigate = useNavigate();
  const toast = useToast();

  // fetchDetail 은 라우트마다 고정된 함수다 — 캐시 키는 id + 컨텍스트(listPath)다.
  // isFetching(= 재조회 중에도 true)을 로딩으로 쓴다 — useAsyncData 도 재조회 중 loading 이 true 였다
  const {
    data,
    isFetching: loading,
    error,
    refetch,
  } = useMemberDetailQuery(memberId, listPath, fetchDetail);

  const [changingPassword, setChangingPassword] = useState(false);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const notify = useSendNotification();
  const deleteOne = useDeleteMember();
  const notifying = notify.isPending;
  const deleting = deleteOne.isPending;

  /** ⋯ '알림 발송' — 확인 절차 없이 즉시 요청한다. 진행 중에는 메뉴 항목이 잠긴다 */
  const onNotify: () => void = () => {
    if (notifying) return;

    notify.mutate(memberId, {
      onSuccess: () => {
        toast.success('회원에게 알림을 발송했습니다.');
      },
      onError: () => {
        toast.error('알림을 발송하지 못했습니다. 잠시 후 다시 시도해 주세요.', { retry: onNotify });
      },
    });
  };

  /** 다이얼로그를 닫으면 진행 중이던 삭제 요청도 취소한다 */
  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    // 취소된 뮤테이션의 isPending 을 되돌린다 (react-query 는 abort 를 모른다 — signal 은 우리 것이다)
    deleteOne.reset();
    setDeleteError(null);
    setConfirmingDelete(false);
  };

  const onConfirmDelete = () => {
    const controller = new AbortController();
    deleteControllerRef.current = controller;

    setDeleteError(null);

    deleteOne.mutate(
      { memberId, signal: controller.signal },
      {
        onSuccess: () => {
          // 삭제된 회원의 상세에 머물 수 없다 — 목록으로 돌려보낸다(히스토리 대체).
          // 결과는 토스트가 나른다 — 페이지가 바뀌어도 살아남는 유일한 통지 수단이다.
          toast.success(
            data === undefined ? '회원을 삭제했습니다.' : `${data.nickname} 회원을 삭제했습니다.`,
          );
          navigate(listPath, { replace: true });
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          // 실패하면 다이얼로그를 닫지 않는다 — 안내를 띄우고 버튼을 되살린다(재클릭 = 재시도)
          setDeleteError('회원을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  return (
    <div style={pageStyle}>
      <div style={topRowStyle}>
        <Link to={listPath} style={backLinkStyle} className="tds-ui-link tds-ui-focusable">
          <ArrowLeftIcon />
          리스트로 돌아가기
        </Link>

        {data !== undefined && (
          <ActionMenu
            label={`${data.nickname} 회원 액션`}
            actions={[
              {
                id: 'delete',
                label: '회원 삭제',
                danger: true,
                onSelect: () => {
                  setDeleteError(null);
                  setConfirmingDelete(true);
                },
              },
              {
                id: 'notify',
                // 발송 중에는 라벨로 진행을 알리고 재클릭을 막는다
                label: notifying ? '발송 중…' : '알림 발송',
                disabled: notifying,
                onSelect: onNotify,
              },
            ]}
          />
        )}
      </div>

      {error !== null ? (
        <Alert tone="danger">
          <div style={topRowStyle}>
            <span>
              {error.message === '회원을 찾을 수 없습니다'
                ? '회원을 찾을 수 없습니다.'
                : '회원 정보를 불러오지 못했습니다.'}
            </span>
            <span style={errorActionsStyle}>
              <Button
                variant="secondary"
                onClick={() => {
                  void refetch();
                }}
              >
                다시 시도
              </Button>
              <Button variant="secondary" onClick={() => navigate(listPath)}>
                목록으로
              </Button>
            </span>
          </div>
        </Alert>
      ) : loading || data === undefined ? (
        <LoadingSkeleton />
      ) : (
        <div style={gridStyle}>
          {/* 좌측 — 회원이 제출한 정보 (전부 읽기 전용) */}
          <div style={columnStyle}>
            <MemberInfoCard detail={data} onChangePassword={() => setChangingPassword(true)} />
            <ConsentCard consents={data.consents} />
          </div>

          {/* 우측 — 운영 기록 (활동 · 적립금 · 쿠폰 · 관리자 메모) */}
          <div style={columnStyle}>
            <ActivityCard detail={data} />
            <PointsCard
              memberId={data.id}
              initialPoints={data.points}
              initialHistory={data.pointHistory}
            />
            <CouponsCard coupons={data.coupons} />
            <MemoCard memberId={data.id} initialMemo={data.memo} />
          </div>
        </div>
      )}

      {changingPassword && data !== undefined && (
        <PasswordChangeModal
          memberId={data.id}
          onClose={() => setChangingPassword(false)}
          onSaved={() => {
            setChangingPassword(false);
            toast.success('비밀번호를 변경했습니다.');
          }}
        />
      )}

      {confirmingDelete && data !== undefined && (
        <ConfirmDialog
          intent="delete"
          title="회원 삭제"
          message={`${data.nickname}(${data.account}) 회원을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="회원 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
