<div align="center">

# Design-System-Admin-Hub-Tools

[KR](README.md) · [EN](README.en.md) · [JP](README.ja.md) · **CN**

全域覆盖韩式 **B2C** / **B2C + Company** 服务管理后台的 Admin 平台<br />
从 Contract · Token 单一源头出发，**React · Storybook · Figma 四方 100% 同步**

</div>

---

## 背景

韩国的 B2C 服务，即便公司不同，后台的画面清单也几乎一致。会员与权限、商品与分类、优惠券·积分、评价、换货·退货、预约·申请、客服工单、营销投放、公告·FAQ·条款。而一旦挂上公司介绍站点（**B2C + Company**），企业信息·发展历程·认证证书·ESG·合作伙伴·作品集·成功案例，以及客户·合同·报价·项目这类销售画面便会原样跟来。

问题在于：这些画面每个项目都要从零重做一遍。同样的列表表格、同样的筛选栏、同样的删除确认弹窗——每次都略有出入。这样堆出来的后台，画面越多，彼此越不相像。

本仓库正是把这种重复**一次性**做对并固化下来的产物。它在同一套设计系统之上实现韩式 B2C / B2C + Company 真正需要的管理画面**全域**，并且不靠人工检查、而是靠**流水线与门禁**来强制这份一致性。

### 覆盖什么

| 领域 | 管理画面 |
| --- | --- |
| **仪表盘** | 指标摘要 · 待办 · 趋势图表 |
| **会员 · 运营** | 会员 / 会员详情 · 管理员 · 权限(角色) · 客户设置 · 登录历史 |
| **商品** (B2C) | 商品 · 分类 · 优惠券 · 评价 · 换货/退货 · 配送政策 · 积分政策 |
| **预约 · 申请** (B2C) | 预约 · 申请单 · 咨询预约 · 日程日历 |
| **客服中心** (B2C) | 工单 · 咨询类型 · 回复模板 · FAQ 策展 · 资料库 |
| **营销** (B2C) | 活动 · 促销 · 电子报 · SMS · 邮件 · 投放模板 |
| **内容** (通用) | 公告 · FAQ · 弹窗 · 横幅 · 服务条款 · 隐私政策 (含版本历史) |
| **企业** (Company) | 公司信息 · CEO 致辞 · 交通指引 · 合作伙伴 · 客户单位 · 发展历程 · 认证证书 · ESG |
| **作品集** (Company) | 作品集 · 分类 · 成功案例 |
| **销售** (Company) | 客户 · 合同 · 报价 · 咨询 · 项目 · 洽谈历史 |

列表/详情/新建/编辑成套配齐，填充画面的组件全部出自 `@tds/ui` 这一个来源 —— atoms 12 · molecules 20 · organisms 5，契约 **37 种**。

---

## 快速开始

> 要求：**Node ≥ 20** · **pnpm 9.15**

```bash
pnpm install
pnpm codegen              # 契约/Token → 生成类型 · argTypes · figma.json · CSS
pnpm gate:precheck        # 契约 + 所有权 + 命名 + 四方一致 (提交评审前必做)
pnpm dev:admin            # Admin 应用
pnpm sb                   # Storybook (:6006)
```

---

## 门禁检查

### 检查存在，不等于检查在起作用

这是本仓库付出最贵代价学到的原则。**门禁只接受后者作为证据。**

实际发现的 **空洞通过(vacuous pass)** 4 例 —— 全都亮着绿灯，全都什么也没保证。

| 什么 | 怎么撒的谎 | 处理 |
| --- | --- | --- |
| `pnpm test` | `--passWithNoTests` → **测试 0 件也亮绿灯** | 移除 (A77 阻断) |
| Storybook play function **62 件** | `expect` **0 个** · spy **0 个** → **不可能失败的检查** | 注入断言 (A30) |
| `bundle-size` CI job | 没有 dist 也亮绿灯 | **移除** job ([ADR-0009](docs/adr/0009-ci-and-code-quality-gates.md)) |
| `tools/vrt` | 基准图 0 张 → 「0 次比较中 0 次失败 → **PASS**」 | `NOT_VERIFIED` (exit 2) |

**在空集上为真的命题什么也证明不了。** 无法测量不等于通过 —— 前提不存在时，工具给出的不是绿灯，而是 `NOT_VERIFIED`。

### 命令

```bash
pnpm validate:registry    # A02  50 个智能体 · 11 个门禁 · SKILL 一致性
pnpm boundary:check       # A02  所有权边界 (与 CODEOWNERS 同一规则)
pnpm contract-test        # A74  四方一致
pnpm coverage:check       # A77  契约 states · blockedWhen · FS 异常轴 (并非行覆盖率 %)
pnpm quality:check        # A83  整洁代码 6 轴 (blocker 1 件 → 阻断 PR)
pnpm naming:check         # A76  命名规则
pnpm lint && pnpm format:check
pnpm test                 # 只有带断言的测试才算测试
pnpm verify:all           # 以上全部 + codegen 可复现性 + tsc --noEmit
pnpm verify:full          # verify:all + E2E
```

---

## 仓库结构

```
├── orchestration/          A00  组织 SSOT — 智能体/门禁注册表、交接 Schema、任务
├── contracts/              A18  组件契约 37 种(SSOT) + Schema · review/(A19)
├── tokens/                 A20  tokens.json (W3C DTCG, 3 层) · review/(A21)
├── packages/ui/            A30~A33  @tds/ui — atoms/molecules/organisms/templates · foundations/ · generated/(禁止修改)
├── apps/admin/             A40~A41  React Admin 应用 (Mid / Senior 顺序互斥)
├── specs/                  A62~A64  功能规格 FS-* (按元素编号 + 异常 7 轴) · BE-* (异常 9 轴) · quality-bar.md
├── openapi/                A80  OpenAPI 3.1 Schema (文档 — 不是服务端)
├── e2e/                    A85  Playwright 场景 (测试名引用 FS 元素编号)
├── tools/
│   ├── codegen/                 契约/Token → 四处生成流水线
│   ├── boundary/           A02  生成 CODEOWNERS + 所有权/reads 作用域检查
│   ├── contract-test/      A74  四方一致验证
│   ├── test-coverage/      A77  契约 states · blockedWhen · FS 异常轴覆盖 (并非行覆盖率 %)
│   ├── code-quality/       A83  整洁代码 6 轴 (耦合·泄漏·重复·复杂度·死代码·分层)
│   ├── vrt/                A70  Visual Regression
│   ├── drift/              A71  Design Drift 监控
│   ├── a11y/               A72  无障碍审计
│   ├── perf/               A73  性能预算审计
│   ├── reuse-guard/        A75  阻断重复组件
│   ├── naming-guard/       A76  强制命名规则
│   └── figma-plugin/       A50  Contract/Token → Figma 自动生成
├── docs/
│   ├── adr/                A01  架构决策记录 (0001~0010)
│   ├── architecture/       A01  前端规约 (A40/A41/A30 必读) · 组织审计
│   ├── plan/ design/            A10~A17
│   ├── figma/              A51~A56  Figma 规格镜像 + 检查
│   ├── tds/                A60~A61  设计系统文档
│   ├── security/           A86  安全审查 (G6·G9 阻断)
│   └── _templates/              标准文档 + 门禁检查清单
├── reports/                Layer 3 验证产物 (门禁输入 — 机器生成，排除格式化)
└── skills/                 50 个智能体 SKILL.md (+ _templates/)
```

pnpm workspace：`packages/*` · `apps/*` · `tools/*` · `e2e`。

---

## 库清单

选型标准只有一条 —— **不自己造。** 已有标准答案的问题(表单状态、服务端缓存、Schema 验证、路由)一律用经过验证的库，本仓库只把叠在其上的**契约 · Token · 门禁**保持为自有部分。

### 运行时 —— `apps/admin`

| 库 | 版本 | 职责 | 选型理由 |
| --- | --- | --- | --- |
| `react` · `react-dom` | ^18.3 | UI 渲染 | 并发渲染 · 生态 |
| `react-router-dom` | ^6.28 | 路由 | 路由数组是 [App.tsx](apps/admin/src/App.tsx) 的单一源头 —— 侧边栏死链由代码检出 |
| `@tanstack/react-query` | ^5.101 | 服务端状态 (查询 · 缓存 · 失效) | 包裹 `data-source` 适配器背后的 fixture。后端接上后画面代码原样不动 |
| `zustand` | ^5.0 | 客户端全局状态 | 无样板代码的极小 store —— 服务端状态由 Query 接管，因此作用域很窄 |
| `react-hook-form` | ^7.81 | 表单状态 | 基于非受控，大型表单下重渲染最少 |
| `zod` | ^4.4 | Schema 验证 | RHF resolver + 运行时边界验证。类型从 Schema 推导 |

### 设计系统 —— `packages/ui`

| 库 | 版本 | 职责 |
| --- | --- | --- |
| `storybook` · `@storybook/react-vite` | ^8.6 | 组件文档 · 状态目录 (G5 的证据) |
| `@storybook/addon-interactions` · `@storybook/test` | ^8.6 | play function —— **有断言才算检查** |
| `@storybook/addon-a11y` | ^8.6 | 故事粒度的无障碍检查 |
| `@storybook/addon-essentials` | ^8.6 | controls · viewport · docs |

设计值不来自库，而来自 [tokens/tokens.json](tokens/tokens.json) —— **W3C DTCG** 格式，3 层(primitive → semantic → component)，light/dark 模式记录在 `$extensions['tds.modes']` 中。

### 构建 · 类型

| 工具 | 版本 | 职责 |
| --- | --- | --- |
| `vite` | ^5.4 | 开发服务器 · 打包 (与 Storybook builder 共用) |
| `typescript` | ^5.6 | `strict` · `pnpm -r exec tsc --noEmit` 已纳入 `verify:all` |
| `pnpm` | 9.15 | workspace · `workspace:*` 内部链接 |
| `node` | ≥ 20 | 由 `engines` 锁定 |
| `openapi-typescript` | ^7.13 | `openapi.yaml` → 类型。用于适配器边界的双向编译验证 (**不是服务端**) |

### 质量

| 工具 | 版本 | 职责 |
| --- | --- | --- |
| `vitest` · `jsdom` | ^2.1 · ^25 | 单元/组件测试 (**禁止** `--passWithNoTests`) |
| `@testing-library/react` · `user-event` · `jest-dom` | ^16 · ^14 · ^6 | 以用户视角而非实现细节来检查 |
| `@playwright/test` | 1.61.1 | E2E —— 测试名引用 `FS-NNN` 元素编号 |
| `eslint` (flat) · `typescript-eslint` | ^9.17 · ^8.18 | lint 基座 |
| `eslint-plugin-react` · `react-hooks` · `jsx-a11y` · `import-x` | — | 无障碍 · Hook 规则 · 阻断 deep import |
| `eslint-config-prettier` | ^10.1 | 消除格式规则冲突 |
| `prettier` | ^3.9 | 格式化 (`format:check` 即门禁) |
| `husky` | ^9.1 | 提交钩子 |

lint 之上还叠了本仓库特有的自定义规则 —— **禁止硬编码 hex/px**(`no-restricted-syntax`)、**禁止 `@tds/ui` deep import**(`no-restricted-imports`)。拦你的不是规矩，是构建。
