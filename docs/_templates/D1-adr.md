---
# ── D1 · ADR (Architecture Decision Record) 템플릿 ──────────────────────
# 경로 규칙: docs/adr/NNNN-<kebab-title>.md
# NNNN은 0001부터 시작하는 4자리 연번. title은 결정 내용을 한 줄로 요약한다.
id: ADR-NNNN
title: "<결정을 한 줄로 요약>"
status: proposed          # proposed | accepted | superseded
date: YYYY-MM-DD
author: A01
supersededBy: null        # status가 superseded일 때만 후속 ADR id 기입 (예: ADR-0007)
relates: []               # 관련 ADR·설계 문서 경로 목록
---

<!--
[작성 지침]
- ADR은 A01(Architecture AI)만 작성·수정한다 (owns: docs/adr/**). 다른 에이전트는
  변경 요청로 제안만 할 수 있다.
- 한 파일 = 한 결정 단위. 부트스트랩처럼 결정이 여러 개면 "결정 N" 하위 섹션으로
  나누되, 각 결정마다 결정/근거/대안을 모두 채운다.
- status 전이: proposed → accepted → (후속 ADR로 대체될 때) superseded.
  superseded가 되면 supersededBy를 채우고 본문은 수정하지 않는다 (ADR은 불변 기록).
- A00(CEO AI)이 게이트 override를 행사한 경우 반드시 ADR로 기록하고
  기술부채 티켓을 함께 발행한다 (설계서 §13).
- 모호한 표현("적절히", "가능하면") 금지 — 결정은 단정문으로 쓴다.
-->

# ADR-NNNN. <제목>

## 배경 (Context)

<!-- 이 결정이 필요해진 상황·제약·문제를 사실 위주로 기술한다. -->

## 결정 (Decision)

<!-- 채택한 방안을 "~한다" 단정문으로 기술한다. 적용 범위(경로·에이전트·게이트)를 명시한다. -->

## 근거 (Rationale)

<!-- 왜 이 방안인가. 운영 원칙(P1 단일 소유권 / P2 계약 우선 / P3 게이트 통과)과
     메트릭·SLO(설계서 §12)에 연결해 설명한다. -->

## 대안 (Alternatives)

<!-- 검토했으나 기각한 대안과 기각 사유. 최소 1개 이상. -->

| 대안 | 기각 사유 |
|---|---|
| | |

## 결과 (Consequences)

<!-- 이 결정으로 생기는 긍정적·부정적 파급 효과, 후속 작업(티켓), 재검토 조건을 기술한다. -->
