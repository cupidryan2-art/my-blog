# AGENTS.md — Qlog 博客项目工作规范

## 项目概述
这是一个基于 Jekyll + Chirpy 主题的个人博客，部署在 GitHub Pages 和 Vercel。
URL: https://cupidryan2-art.github.io/my-blog

## 技术栈
- **框架**: Jekyll (Ruby)
- **主题**: jekyll-theme-chirpy
- **模板语言**: Liquid
- **样式**: Sass（Chirpy 内置）+ 页面内联 `<style>`
- **部署**: GitHub Pages (baseurl: /my-blog) + Vercel (baseurl: "")
- **评论**: Twikoo

## 关键文件结构
```
_config.yml          # 主配置（勿随意修改）
_config_vercel.yml   # Vercel 部署覆盖（只改 url/baseurl）
_layouts/            # 布局模板
_includes/           # 组件（social-links.html, font-sizer.html 等）
_data/               # 数据文件（footprint.yml, links.yml 等）
_tabs/               # 导航页（about.md, footprint.md 等）
assets/              # 静态资源（img, css, js）
```

## 硬性禁止（Hard Rules）
1. **不得修改 `_config.yml` 的 `theme`、`url`、`baseurl` 字段**
2. **不得修改 `_config_vercel.yml`**（只有 url/baseurl 覆盖，不能加其他内容）
3. **不得安装新的 Ruby gem**，除非明确告知用户并等待确认
4. **不得修改 `_layouts/default.html`**，如需注入内容使用页面级 `<style>`/`<script>`
5. **不得使用需要 npm build 的前端框架**（React/Vue/Vite）——这是纯 Jekyll 项目
6. **CSS/JS 变量**：读取主题变量用 `var(--text-1)`、`var(--border)`、`var(--ff-serif)` 等，不得硬编码颜色（深色模式会失效）

## 开发注意事项
- Jekyll Liquid 模板中，JSON 数据用 `{{ site.data.xxx | jsonify | escape }}` 写入 HTML data 属性，再由外部 JS 读取解析，禁止嵌入 JS 字符串
- 图片路径必须使用 `| relative_url` filter（两种部署的 baseurl 不同）
- SVG 内嵌用 `{% include filename.svg %}`，SVG 文件放在 `_includes/`
- 所有页面内 CSS 放在 `<style>` 标签内，不得创建独立 CSS 文件（除非放 assets/css/）
- 深色模式：显式 `html[data-mode="dark"]`；自动模式可能无 data-mode，需结合 prefers-color-scheme。

## 每次任务完成前必须确认
- [ ] 在本地 `bundle exec jekyll serve` 能正常编译（无 Liquid 报错）
- [ ] 深色模式下样式正常（检查 `html[data-mode="dark"]` 覆盖规则）
- [ ] 交互功能在浏览器控制台无 JS 报错
- [ ] 移动端布局未破坏（页面宽度在 375px 下可用）
- [ ] 如修改了 `_data/` 数据文件，确认 YAML 格式合法（用 2 空格缩进）

## 文件边界
| 目录/文件 | 说明 |
|---|---|
| `_includes/world-map.svg` | SVG 地图，只包含 `<g id="countries">` 和 `<g id="markers">`，不含 `<script>` |
| `_data/footprint.yml` | 足迹数据源，JS 从 Jekyll 读取后渲染 |
| `_layouts/footprint.html` | 足迹入口；逻辑在 assets/js/qlog-footprint.js，几何算法在 qlog-map-geometry.js |
| `_includes/social-links.html` | 侧边栏社交图标，不要在此文件加业务逻辑 |

## 生产链与数据
- `_posts` / `_tabs` → `_layouts` / `_includes` → Chirpy 内容重写 → `default → compress`；`_site` 是生成物。
- 生产 HTML 压缩会吞掉内联脚本的 `//` 后续代码；交互放原生外部 JS，不关闭压缩。
- Chirpy 会重写 HTML 中的图片，甚至脚本字符串；详情使用 DOM 文本节点，路径只加一次 baseurl。
- YAML 是地点内容来源；SVG 保留投影坐标，两者 ID/名称/日期/类型必须匹配。不得静默丢弃非法数据。
- CSS 在 `_sass` 或 `assets/css`；使用语义变量定义局部纸色/朱砂色，组件不能散落硬编码颜色。
- 保留已发表文章内容、日期、导航、permalink；不得擅自发布未跟踪草稿。

## 验证与交付
- Ruby 3.3+、锁定 Bundler 2.5.22；`bundle check`，不自动安装新 gem。
- 新文件先明确 `git add <路径>`，再 `bash scripts/verify.sh`：仅复制 tracked/staged 文件到临时目录，避免发布本地草稿。
- `VERIFY_DIR=/绝对临时路径 bash scripts/verify.sh` 可指定产物位置；测试 Vercel 域名通过 `VERIFY_VERCEL_URL=https://域名` 输入。
- Vercel 正式构建：`QLOG_SITE_URL=https://正式域名 ruby scripts/build-vercel.rb`；也接受平台的 VERCEL_PROJECT_PRODUCTION_URL，不猜域名。
- 生产预览：`JEKYLL_ENV=production bundle exec jekyll serve --host 127.0.0.1 --disable-disk-cache`。不要把开发 serve 通过当成生产通过。
- 先复现后修复，小步提交；压缩脚本、分页、地图边界与数据一致性必须有真正抓回归的检查。
- 交互改动须验生产产物及浏览器；375/768/1280px，浅/深/自动模式、键盘、控制台和移动菜单。
- 提交/交付写明执行命令、真实结果、未验证项；第三方 Twikoo 网络失败与本站异常分开报告。
- 不发布 AGENTS、任务文档、scripts、tests、.claude、依赖目录或验证产物。审计任务不改文件；发布仅按当前用户授权。

## SVG 地图专项规则（从失败中总结）
- `preserveAspectRatio` 必须保持 `xMidYMid meet`，**禁止改成 `none`**
- 缩放必须设置边界：`MIN_W=100`，`MAX_W=960`
- 圆点半径：长居 `r="6"`，到访 `r="5"`，**不随缩放改变**
- Tooltip 定位必须用 `createSVGPoint() + getScreenCTM()`，不得用 `getBoundingClientRect()`
