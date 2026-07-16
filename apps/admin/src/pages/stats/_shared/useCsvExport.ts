// 통계 CSV 내보내기 — 진행률 · 취소 (A40 소유 — apps/admin/src/pages/stats/**)
//
// [ERP-12] 엑셀 다운로드는 한국 ERP 어드민의 기본기다. 규칙:
//   - **현재 필터 조건 전체**를 내보낸다 — 보이는 페이지만이 아니다. 그래서 rows 는 페이지를
//     자르기 **전** 배열을 받는다.
//   - 한국어 헤더 · 값은 화면에 보이는 그대로 (StatsColumn.csv 가 render 와 같은 원천을 쓴다).
//   - UTF-8 BOM — shared/download.ts 의 downloadCsv 가 붙인다. 없으면 엑셀이 한글을 깨뜨린다.
//   - 대량이면 진행률과 취소 경로가 있어야 한다 — 아래 청크 루프가 그것이다.
//
// [왜 청크로 나누나] 1,000행 × 10열을 한 번에 돌면 그동안 메인 스레드가 멈춰 진행률조차 못 그린다.
// 200행마다 이벤트 루프에 양보하면 진행률이 실제로 갱신되고 취소 버튼이 눌린다.
// shared/async 의 wait(0, signal) 이 양보와 중단을 한 번에 해 준다.
import { useCallback, useRef, useState } from 'react';

import { isAbort, wait } from '../../../shared/async';
import { downloadCsv, toCsvText } from '../../../shared/download';
import { useToast } from '../../../shared/ui';
import type { StatsColumn } from './types';

/** 한 번에 처리할 행 수 — 이 간격마다 이벤트 루프에 양보한다 */
const CHUNK_ROWS = 200;

export interface CsvExportState {
  readonly isExporting: boolean;
  /** 0~100. 진행률 표시에 쓴다 */
  readonly progress: number;
  readonly start: <T>(request: CsvExportRequest<T>) => void;
  readonly cancel: () => void;
}

interface CsvExportRequest<T> {
  /** 파일명 — downloadCsv 가 날짜를 붙인다 ('stats-visitors' → 'stats-visitors-2026-07-16.csv') */
  readonly baseName: string;
  readonly columns: readonly StatsColumn<T>[];
  /** 필터를 적용한 **전체** 행 (페이지 자르기 전) */
  readonly rows: readonly T[];
}

export function useCsvExport(): CsvExportState {
  const toast = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const start = useCallback(
    <T>(request: CsvExportRequest<T>) => {
      // 진행 중이면 두 번째 요청을 무시한다 — 같은 파일이 두 번 떨어지는 것을 막는다 (EXC-08)
      if (controllerRef.current !== null) return;

      const controller = new AbortController();
      controllerRef.current = controller;
      setIsExporting(true);
      setProgress(0);

      const run = async (): Promise<void> => {
        const cells: string[][] = [];
        for (let index = 0; index < request.rows.length; index += 1) {
          const row = request.rows[index];
          if (row === undefined) continue;
          cells.push(request.columns.map((column) => column.csv(row)));

          if ((index + 1) % CHUNK_ROWS === 0) {
            setProgress(Math.round(((index + 1) / request.rows.length) * 100));
            await wait(0, controller.signal);
          }
        }

        const header = request.columns.map((column) => column.header);
        downloadCsv(request.baseName, toCsvText(header, cells));
        setProgress(100);
        toast.success(`${String(cells.length)}건을 내보냈습니다.`);
      };

      void run()
        .catch((cause: unknown) => {
          // 취소는 실패가 아니다 — 사용자가 고른 것이다 (EXC-09)
          if (isAbort(cause)) return;
          toast.error('내보내기에 실패했어요. 잠시 후 다시 시도해 주세요.');
        })
        .finally(() => {
          controllerRef.current = null;
          setIsExporting(false);
        });
    },
    [toast],
  );

  return { isExporting, progress, start, cancel };
}
