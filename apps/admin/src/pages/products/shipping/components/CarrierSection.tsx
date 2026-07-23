// 택배사 목록 — 배송 정책 화면 안의 CRUD 섹션
//
// [왜 별도 화면이 아닌가] 행이 서넛인 참조 테이블이라 자기 메뉴 잎을 가질 무게가 아니다. 배송비를
// 정하러 온 운영자와 택배사를 등록하러 온 운영자는 같은 사람이고, 같은 목적('배송을 어떻게
// 내보낼 것인가')으로 이 화면에 온다 — 메뉴를 하나 더 만들면 그 하나가 둘로 쪼개진다.
//
// [왜 자유 입력을 없앴나] 예전 정책 문서의 택배사는 텍스트 한 줄이었다. 그래서 '대한통운' 과
// 'CJ대한통운' 이 공존할 수 있었고, 추적 URL 을 만들 키가 없었다(FS-043 미결 9번). 목록에서만
// 고르게 하면 이름은 한 벌이 되고, 각 택배사가 자기 추적 주소를 들 수 있다.
//
// [삭제 차단] 그 택배사로 나간 배송 건이 1건이라도 있으면 지울 수 없다 — 지우면 그 배송 건은
// 어느 택배로 나갔는지 영영 말할 수 없게 된다. 사유는 aria-label·title 에 함께 싣는다(포트폴리오
// 카테고리·FAQ 카테고리와 같은 관용구). 건수를 못 세는 상태(미배선)에서도 막는다 — fail-closed.
import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { cssVar, Table } from '@tds/ui';

import { isAbort } from '../../../../shared/async';
import { formatNumber } from '../../../../shared/format';
import { useCrudDelete, useCrudListQuery } from '../../../../shared/crud';
import {
  Alert,
  alertActionRowStyle,
  Button,
  buttonStyle,
  Card,
  CardTitle,
  ConfirmDialog,
  hintStyle,
  Icon,
  StatusBadge,
  thStyle,
  useToast,
  visuallyHiddenStyle,
} from '../../../../shared/ui';
import { carrierDeleteBlock, carrierUsageCount } from '../../../../shared/domain/shipment';
import type { Carrier } from '../../../../shared/domain/shipment';
import { CARRIER_RESOURCE, carrierAdapter } from '../data-source';
import { carrierUsageLabel } from '../types';
import { CarrierFormModal } from './CarrierFormModal';

const COLUMNS = [
  { id: 'name', header: '택배사', nowrap: true },
  { id: 'code', header: '코드', nowrap: true },
  { id: 'tracking', header: '추적 URL' },
  { id: 'usage', header: '사용 현황', nowrap: true },
  { id: 'active', header: '사용 여부', nowrap: true },
] as const;

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** 코드·URL 은 기호가 많아 폭이 흔들린다 — 숫자 폭을 고정해 열이 춤추지 않게 한다 */
const codeStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/** 템플릿은 길다 — 한 줄로 자르고 전체는 수정 모달이 보여 준다 */
const templateStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** 액션 셀 — CrudTable 의 같은 셀과 치수를 맞춘다(표마다 액션 열 폭이 다르면 눈에 띈다) */
const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('component.table.cell-padding-y'),
  paddingBottom: cssVar('component.table.cell-padding-y'),
  paddingLeft: cssVar('component.table.cell-padding-x'),
  paddingRight: cssVar('component.table.cell-padding-x'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('component.table.divider'),
  verticalAlign: 'middle',
  width: `calc(${cssVar('space.6')} * 3)`,
  textAlign: 'right',
};

const actionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.1'),
};

const dangerGhostStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  color: cssVar('color.feedback.danger.text'),
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

type ModalState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; carrier: Carrier };

interface CarrierSectionProps {
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canRemove: boolean;
}

export function CarrierSection({ canCreate, canUpdate, canRemove }: CarrierSectionProps) {
  const toast = useToast();
  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [pendingDelete, setPendingDelete] = useState<Carrier | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const { data, isFetching, error, refetch } = useCrudListQuery(CARRIER_RESOURCE, carrierAdapter);
  // [STATE-01] 스켈레톤은 최초 로드에만 — 재조회 중에는 이전 행을 유지한다.
  const firstLoading = isFetching && data === undefined;
  const carriers = data ?? [];

  const remove = useCrudDelete(CARRIER_RESOURCE, carrierAdapter);
  const deleting = remove.isPending;

  const closeDelete = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    remove.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const confirmDelete = () => {
    if (pendingDelete === null) return;
    const target = pendingDelete;
    const controller = new AbortController();
    controllerRef.current = controller;
    setDeleteError(null);

    remove.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success(`'${target.name}' 택배사를 삭제했어요.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const rows = carriers.map((carrier) => {
    /* 건수는 배송 원장이 답한다(shared/domain/shipment 의 조회기) — 이 화면은 배송 화면을 모른다.
       배선 전에는 null 이고, 그때 삭제는 열리지 않는다(carrierDeleteBlock 이 사유를 준다). */
    const usage = carrierUsageCount(carrier.id);
    const blockReason = carrierDeleteBlock(carrier, usage);
    const blocked = blockReason !== null;

    return {
      id: carrier.id,
      cells: [
        carrier.name,
        <span key="code" style={codeStyle}>
          {carrier.code}
        </span>,
        carrier.trackingUrlTemplate === '' ? (
          <span key="tracking" style={hintStyle}>
            추적 링크 없음
          </span>
        ) : (
          <span key="tracking" style={templateStyle} title={carrier.trackingUrlTemplate}>
            {carrier.trackingUrlTemplate}
          </span>
        ),
        carrierUsageLabel(usage),
        <StatusBadge
          key="active"
          tone={carrier.active ? 'success' : 'neutral'}
          label={carrier.active ? '사용' : '미사용'}
        />,
      ],
      trailing: [
        <td key="actions" style={actionCellStyle}>
          <span style={actionsStyle}>
            {canUpdate && (
              <button
                type="button"
                className="tds-ui-btn-ghost tds-ui-focusable"
                style={buttonStyle('ghost')}
                aria-label={`${carrier.name} 수정`}
                onClick={() => setModal({ kind: 'edit', carrier })}
              >
                <Icon name="pencil" />
              </button>
            )}
            {canRemove && (
              <button
                type="button"
                className="tds-ui-btn-ghost tds-ui-focusable"
                style={blocked ? buttonStyle('ghost', true) : dangerGhostStyle}
                // 왜 못 누르는지를 버튼 이름과 툴팁에 함께 싣는다(카테고리 삭제 차단 관용구)
                aria-label={blocked ? `${carrier.name} — ${blockReason}` : `${carrier.name} 삭제`}
                title={blocked ? blockReason : undefined}
                disabled={blocked || deleting}
                onClick={() => {
                  setDeleteError(null);
                  setPendingDelete(carrier);
                }}
              >
                <Icon name="trash" />
              </button>
            )}
          </span>
        </td>,
      ],
    };
  });

  const showActions = canUpdate || canRemove;

  return (
    <Card>
      <CardTitle>택배사</CardTitle>

      <div style={sectionStyle}>
        <div style={toolbarStyle}>
          <p style={hintStyle} aria-busy={isFetching && !firstLoading}>
            {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(carriers.length)}곳`}
            {isFetching && !firstLoading && ' · 새로고침 중…'}
          </p>
          {canCreate && (
            <Button variant="secondary" size="md" onClick={() => setModal({ kind: 'create' })}>
              <Icon name="plus-circle" />
              택배사 추가
            </Button>
          )}
        </div>

        {error !== null ? (
          <Alert tone="danger">
            <div style={alertActionRowStyle}>
              <span>택배사 목록을 불러오지 못했어요.</span>
              <Button
                variant="secondary"
                onClick={() => {
                  void refetch();
                }}
              >
                다시 시도
              </Button>
            </div>
          </Alert>
        ) : (
          <div style={tableScrollStyle}>
            <Table
              caption="택배사 목록 — 송장을 등록할 때 이 목록에서 택배사를 골라요. 배송 건이 있는 택배사는 삭제할 수 없어요."
              columns={COLUMNS}
              rows={rows}
              trailingHead={
                showActions
                  ? [
                      <th key="actions" scope="col" style={thStyle}>
                        <span style={visuallyHiddenStyle}>행 액션</span>
                      </th>,
                    ]
                  : []
              }
              loading={firstLoading}
              empty={<span>등록된 택배사가 없어요. 택배사를 추가해야 송장을 붙일 수 있어요.</span>}
            />
          </div>
        )}

        <p style={hintStyle}>
          송장은 이 목록에 있는 택배사로만 등록돼요 — 자유 입력이면 같은 택배사가 여러 이름으로
          쌓이고 추적 링크를 만들 수 없어요. 계약이 끝난 택배사는 삭제하지 말고 사용 여부를 끄세요.
        </p>
      </div>

      {modal.kind !== 'closed' && (
        <CarrierFormModal
          editing={modal.kind === 'edit' ? modal.carrier : null}
          onClose={() => setModal({ kind: 'closed' })}
          onSaved={(name, isEdit) => {
            setModal({ kind: 'closed' });
            toast.success(
              isEdit ? `'${name}' 택배사를 저장했어요.` : `'${name}' 택배사를 추가했어요.`,
            );
          }}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="택배사 삭제"
          message={`'${pendingDelete.name}' 택배사를 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="택배사 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={closeDelete}
        />
      )}
    </Card>
  );
}
