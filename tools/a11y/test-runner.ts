/**
 * Storybook test-runner 설정 골격 (A72 Accessibility Audit AI 소유).
 *
 * 위치가 .storybook 이 아니라 tools/a11y 인 이유:
 *   test-runner 설정의 소유권을 A72(tools/a11y/**)에 두기 위해서다 (P1 단일 소유권).
 *   Storybook 쪽에는 한 줄짜리 re-export 파일만 둔다 — 연결 방법은 README.md 참조.
 *
 * 동작:
 *   - preVisit  : 각 스토리 페이지에 axe-core 주입
 *   - postVisit : #storybook-root 대상 axe 검사 → 위반을 TDS_A11Y_OUT(JSONL)에 append.
 *                 critical/serious 위반이 있으면 해당 스토리 테스트를 실패시킨다.
 *
 * 수집된 JSONL은 src/index.ts 가 reports/a11y/<date>.json 으로 집계한다.
 */
import fs from 'node:fs';
import type { TestRunnerConfig } from '@storybook/test-runner';
import { injectAxe, getViolations } from 'axe-playwright';

/** src/index.ts 가 주입하는 수집 파일 경로 (미설정 시 파일 기록 없이 실패 판정만 수행) */
const OUT_FILE = process.env['TDS_A11Y_OUT'];

const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },

  async postVisit(page, context) {
    const violations = await getViolations(page, '#storybook-root');
    const severe = violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');

    if (OUT_FILE && violations.length > 0) {
      const record = {
        storyId: context.id,
        title: context.title,
        name: context.name,
        checkedAt: new Date().toISOString(),
        violations: violations.map((v) => ({
          id: v.id,
          impact: v.impact ?? 'unknown',
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.map((n) => ({ target: n.target, html: n.html.slice(0, 200) })),
        })),
      };
      fs.appendFileSync(OUT_FILE, JSON.stringify(record) + '\n', 'utf8');
    }

    // 차단 조건 (agents.json A72): axe critical/serious 위반 1건 이상
    if (severe.length > 0) {
      const summary = severe.map((v) => `${v.id}(${v.impact})`).join(', ');
      throw new Error(
        `[a11y] ${context.id}: critical/serious 위반 ${severe.length}건 — ${summary}`,
      );
    }
  },
};

export default config;
