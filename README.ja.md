<div align="center">

# Design-System-Admin-Hub-Tools

[KR](README.md) · [EN](README.en.md) · **JP** · [CN](README.zh.md)

韓国型 **B2C** / **B2C + Company** サービスの管理画面を全域でカバーするアドミンプラットフォーム<br />
Contract · Token の単一原点から **React · Storybook · Figma 四者 100% 同期**

</div>

---

## 背景

韓国の B2C サービスは、会社が違ってもアドミンの画面リストはほぼ同じだ。会員と権限、商品とカテゴリ、クーポン・ポイント、レビュー、交換・返品、予約・申込、カスタマーセンターのチケット、マーケティング配信、お知らせ・FAQ・利用規約。ここに会社紹介サイトが加わった瞬間（**B2C + Company**）、企業情報・沿革・認証書・ESG・パートナー・ポートフォリオ・成功事例、そして取引先・契約・見積・プロジェクトといった営業画面がそのまま付いてくる。

問題は、これらの画面がプロジェクトごとに最初から作り直されることだ。同じ一覧テーブルを、同じフィルターバーを、同じ削除確認ポップアップを — 毎回少しずつ違う形で。そうして作られたアドミンは、画面数が増えるほど互いに似なくなる。

このリポジトリは、その繰り返しを **一度** きちんと作り切って固定した成果物である。韓国型 B2C / B2C + Company が実際に必要とする管理画面の **全域** を単一のデザインシステム上で実装し、その一貫性を人のレビューではなく **パイプラインとゲートで** 強制する。

### 何をカバーするか

| ドメイン | 管理画面 |
| --- | --- |
| **ダッシュボード** | 指標サマリー · やること · 推移チャート |
| **会員 · 運用** | 会員 / 会員詳細 · 管理者 · 権限（ロール） · 顧客設定 · ログイン履歴 |
| **商品** (B2C) | 商品 · カテゴリ · クーポン · レビュー · 交換/返品 · 配送ポリシー · ポイントポリシー |
| **予約 · 申込** (B2C) | 予約 · 申込書 · 相談予約 · スケジュールカレンダー |
| **カスタマーセンター** (B2C) | チケット · 問い合わせ種別 · 返信テンプレート · FAQ キュレーション · 資料室 |
| **マーケティング** (B2C) | イベント · プロモーション · ニュースレター · SMS · メール · 配信テンプレート |
| **コンテンツ** (共通) | お知らせ · FAQ · ポップアップ · バナー · 利用規約 · プライバシーポリシー（バージョン履歴を含む） |
| **企業** (Company) | 会社情報 · CEO 挨拶 · アクセス · パートナー · 顧客企業 · 沿革 · 認証書 · ESG |
| **ポートフォリオ** (Company) | ポートフォリオ · カテゴリ · 成功事例 |
| **営業** (Company) | 取引先 · 契約 · 見積 · 問い合わせ · プロジェクト · 商談履歴 |

一覧/詳細/登録/編集が一式で揃っており、画面を構成するコンポーネントはすべて `@tds/ui` ひとつから出てくる — atoms 12 · molecules 20 · organisms 5、契約 **37 種**。

---

## クイックスタート

> 要件: **Node ≥ 20** · **pnpm 9.15**

```bash
pnpm install
pnpm codegen              # 契約/トークン → 型 · argTypes · figma.json · CSS を生成
pnpm gate:precheck        # 契約 + 所有権 + 命名 + 四者一致 (レビュー依頼前に必須)
pnpm dev:admin            # Admin アプリ
pnpm sb                   # Storybook (:6006)
```

---

## ゲート検査

### 検査が存在することと、検査が機能することは別だ

このリポで最も高い代償を払って学んだ原則である。**ゲートは後者だけを証拠として受け取る。**

実際に発見された **空虚な通過（vacuous pass）** 4 件 — すべて青信号を灯しており、すべて何も保証していなかった。

| 何が | どう嘘をついたか | 処理 |
| --- | --- | --- |
| `pnpm test` | `--passWithNoTests` → **テスト 0 件で青信号** | 除去（A77 が遮断） |
| Storybook play function **62 件** | `expect` **0 個** · スパイ **0 個** → **失敗し得ない検査** | 断言を注入（A30） |
| `bundle-size` CI job | dist なしで青信号 | job **除去**（[ADR-0009](docs/adr/0009-ci-and-code-quality-gates.md)） |
| `tools/vrt` | 基準画像 0 件 → 「比較 0 件中 失敗 0 件 → **PASS**」 | `NOT_VERIFIED`（exit 2） |

**空集合の上で真な命題は何も証明しない。** 測定不能は通過ではない — 前提がなければツールは青信号の代わりに `NOT_VERIFIED` を出す。

### コマンド

```bash
pnpm validate:registry    # A02  エージェント 50 · ゲート 11 · SKILL 整合性
pnpm boundary:check       # A02  所有権境界 (CODEOWNERS と同一ルール)
pnpm contract-test        # A74  四者一致
pnpm coverage:check       # A77  契約 states · blockedWhen · FS 例外軸 (行 % ではない)
pnpm quality:check        # A83  クリーンコード 6 軸 (blocker 1 件 → PR 遮断)
pnpm naming:check         # A76  命名規則
pnpm lint && pnpm format:check
pnpm test                 # 断言のあるテストだけをテストとして数える
pnpm verify:all           # 上記すべて + codegen 再現性 + tsc --noEmit
pnpm verify:full          # verify:all + E2E
```

---

## リポジトリ構造

```
├── orchestration/          A00  組織 SSOT — エージェント/ゲートレジストリ、ハンドオフスキーマ、タスク
├── contracts/              A18  コンポーネント契約 37 種(SSOT) + スキーマ · review/(A19)
├── tokens/                 A20  tokens.json (W3C DTCG, 3 階層) · review/(A21)
├── packages/ui/            A30~A33  @tds/ui — atoms/molecules/organisms/templates · foundations/ · generated/(修正禁止)
├── apps/admin/             A40~A41  React Admin アプリ (Mid / Senior 順次排他)
├── specs/                  A62~A64  機能仕様 FS-* (要素別ナンバリング + 例外 7 軸) · BE-* (例外 9 軸) · quality-bar.md
├── openapi/                A80  OpenAPI 3.1 スキーマ (ドキュメント — サーバーではない)
├── e2e/                    A85  Playwright シナリオ (テスト名が FS 要素番号を引用)
├── tools/
│   ├── codegen/                 契約/トークン → 4 箇所への生成パイプライン
│   ├── boundary/           A02  CODEOWNERS 生成 + 所有権/reads スコープ検査
│   ├── contract-test/      A74  四者一致検証
│   ├── test-coverage/      A77  契約 states · blockedWhen · FS 例外軸カバレッジ (行 % ではない)
│   ├── code-quality/       A83  クリーンコード 6 軸 (結合·漏洩·重複·複雑度·デッドコード·レイヤー)
│   ├── vrt/                A70  Visual Regression
│   ├── drift/              A71  Design Drift 監視
│   ├── a11y/               A72  アクセシビリティ監査
│   ├── perf/               A73  パフォーマンス予算監査
│   ├── reuse-guard/        A75  重複コンポーネント遮断
│   ├── naming-guard/       A76  命名規則の強制
│   └── figma-plugin/       A50  Contract/Token → Figma 自動生成
├── docs/
│   ├── adr/                A01  アーキテクチャ決定記録 (0001~0010)
│   ├── architecture/       A01  フロントエンド規約 (A40/A41/A30 必読) · 組織監査
│   ├── plan/ design/            A10~A17
│   ├── figma/              A51~A56  Figma スペックミラー + レビュー
│   ├── tds/                A60~A61  デザインシステム文書
│   ├── security/           A86  セキュリティレビュー (G6·G9 遮断)
│   └── _templates/              標準文書 + ゲートチェックリスト
├── reports/                Layer 3 検証成果物 (ゲート入力 — 機械生成、フォーマッター除外)
└── skills/                 50 エージェント SKILL.md (+ _templates/)
```

pnpm workspace: `packages/*` · `apps/*` · `tools/*` · `e2e`。

---

## ライブラリ仕様

選定基準はひとつだ — **自作しない。** 標準がある問題（フォーム状態、サーバーキャッシュ、スキーマ検証、ルーティング）は実績あるライブラリを使い、このリポはその上に載る **契約 · トークン · ゲート** だけを固有に保つ。

### ランタイム — `apps/admin`

| ライブラリ | バージョン | 役割 | 選定理由 |
| --- | --- | --- | --- |
| `react` · `react-dom` | ^18.3 | UI レンダリング | 並行レンダー · エコシステム |
| `react-router-dom` | ^6.28 | ルーティング | ルート配列が [App.tsx](apps/admin/src/App.tsx) の単一原点 — サイドバーのデッドリンクをコードが検出 |
| `@tanstack/react-query` | ^5.101 | サーバー状態 (取得 · キャッシュ · 無効化) | `data-source` アダプターの背後の fixture を包む。バックエンドが繋がっても画面コードはそのまま |
| `zustand` | ^5.0 | クライアントグローバル状態 | ボイラープレートのない最小ストア — サーバー状態は Query が引き受けるので範囲が狭い |
| `react-hook-form` | ^7.81 | フォーム状態 | 非制御ベース、大型フォームで再レンダー最小 |
| `zod` | ^4.4 | スキーマ検証 | RHF resolver + ランタイム境界検証。型はスキーマから推論 |

### デザインシステム — `packages/ui`

| ライブラリ | バージョン | 役割 |
| --- | --- | --- |
| `storybook` · `@storybook/react-vite` | ^8.6 | コンポーネント文書 · 状態カタログ (G5 の証拠) |
| `@storybook/addon-interactions` · `@storybook/test` | ^8.6 | play function — **断言があってはじめて検査として数える** |
| `@storybook/addon-a11y` | ^8.6 | ストーリー単位のアクセシビリティ検査 |
| `@storybook/addon-essentials` | ^8.6 | controls · viewport · docs |

デザイン値はライブラリではなく [tokens/tokens.json](tokens/tokens.json) — **W3C DTCG** フォーマット、3 階層（primitive → semantic → component）、light/dark モードは `$extensions['tds.modes']` に記録する。

### ビルド · 型

| ツール | バージョン | 役割 |
| --- | --- | --- |
| `vite` | ^5.4 | 開発サーバー · バンドル (Storybook builder 共有) |
| `typescript` | ^5.6 | `strict` · `pnpm -r exec tsc --noEmit` が `verify:all` に含まれる |
| `pnpm` | 9.15 | workspace · `workspace:*` 内部リンク |
| `node` | ≥ 20 | `engines` で固定 |
| `openapi-typescript` | ^7.13 | `openapi.yaml` → 型。アダプター境界の双方向コンパイル検証用 (**サーバーではない**) |

### 品質

| ツール | バージョン | 役割 |
| --- | --- | --- |
| `vitest` · `jsdom` | ^2.1 · ^25 | ユニット/コンポーネントテスト (`--passWithNoTests` **禁止**) |
| `@testing-library/react` · `user-event` · `jest-dom` | ^16 · ^14 · ^6 | 実装ではなくユーザー視点で検査 |
| `@playwright/test` | 1.61.1 | E2E — テスト名が `FS-NNN` 要素番号を引用 |
| `eslint` (flat) · `typescript-eslint` | ^9.17 · ^8.18 | Lint 基盤 |
| `eslint-plugin-react` · `react-hooks` · `jsx-a11y` · `import-x` | — | アクセシビリティ · フックルール · deep import 遮断 |
| `eslint-config-prettier` | ^10.1 | フォーマット規則の衝突除去 |
| `prettier` | ^3.9 | フォーマット (`format:check` がゲート) |
| `husky` | ^9.1 | コミットフック |

Lint にはこのリポ固有のカスタムルールが載っている — **ハードコード hex/px 禁止**（`no-restricted-syntax`）、**`@tds/ui` deep import 禁止**（`no-restricted-imports`）。ルールではなくビルドが止める。
