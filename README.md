# Diaspora East Cinema

Diaspora East Cinema is a cinema archive featuring news, screenings and archive events.

Explore films and gatherings through event details, images and stories from the archive.

[Visit Diaspora East Cinema](https://takuchen0909.github.io/DE-Cinema/)

## Local preview

```sh
npm run dev
```

Open the `/DE-Cinema/` URL printed by Vite. `npm run check` checks TypeScript and `npm run build` generates the GitHub Pages files in `dist/`.

The home page uses a browser-compatible copy of `video.mov`, with the bird logo animating automatically once. The video and About image move at different speeds while scrolling. About us is the second section; News, ARCHIVE and Contact follow. The colored logo and fixed navigation appear after scrolling into About us.

The contact form opens an email enquiry addressed to `info@decinema.nl`. The visitor sends it from their email app. Instagram links to `https://www.instagram.com/diaspora_east_cinema/`.

Clicking the opening video or scrolling the mouse wheel downward scrolls to About us over 1.8 seconds. Text types in as it enters the viewport, with full text shown immediately for reduced-motion preferences. Desktop section titles/body/notes use 36/20/12px; mobile uses 28/16/12px. Navigation and event titles use the body text size. Archive cards have a complete frame around their image and title. Navigation starts with About us and turns pink on hover. Back links use the same pink hover and underline.

## Local administration

Run `npm run dev` and open the printed local website URL with `#admin` to manage the archive. The website and admin UI use the same local Vite address. Vite starts or reuses the local CMS at port 5180; it proxies authenticated editing, uploads, and draft preview requests to that service.

Local passwords, authorization and drafts are stored in `local-admin/.private/`, which is excluded from Git and the public build.

For the standalone editor, run `npm run admin` and open `http://127.0.0.1:5180/#admin`. This command first builds the current website for draft preview.

GitHub Pages includes the website and the admin UI at `#admin`. Online, the admin UI links to the local editor; content changes and publishing run locally.

Clicking the opening video or scrolling the mouse wheel downward scrolls to About us over 1.8 seconds. Text types in as it enters the viewport, with full text shown immediately for reduced-motion preferences. Desktop section titles/body/notes use 36/20/12px; mobile uses 28/16/12px. Navigation and event titles use the body text size. Archive cards have a complete frame around their image and title. Navigation starts with About us and turns pink on hover. Back links use the same pink hover and underline.


## 在这台电脑管理网站

双击 `打开 DE Cinema 后台.command`，保留打开的终端窗口。浏览器会打开 http://127.0.0.1:5174/DE-Cinema/#admin 。也可以在项目目录运行 `npm run dev`。

1. 首次进入时设置至少 10 位的后台密码；已设置则直接登录。
2. 编辑 News / ARCHIVE、文字和图片。`Save draft` 只保存本地草稿。
3. 点击 `Publish changes`，等待 `Website update complete`，再打开线上网站查看。
4. 本机通过 `.local-tools/gh` 使用 GitHub CLI 登录授权。该工具和凭证不会提交到仓库。在其他电脑可设置 `GH_PATH` 指向已登录的 GitHub CLI，或在后台连接 GitHub token（Contents: Read and write；Actions: Read-only）。

后台发布将内容直接提交到 GitHub；之后如要修改网站代码，先在工作区干净时执行 `git pull --ff-only`，再修改、提交和推送。后台草稿及密码请自行保留备份。


## 图片、视频和卡片简介

在本地 `#admin` 选择 NEWS 或 ARCHIVE 中的项目：

- `Hover summary` 是悬停短摘要，最多 140 字符；留空时从完整 Description 自动截取，卡片最多显示三行。详情页保留完整描述。
- `Cover image` 是列表封面，同时作为详情轮播的第一张图片。
- `Event photos & videos` 可以一次选择多份文件，添加最多 30 项附加媒体。图片每张最多 10 MB；MP4 / WebM 视频每个最多 25 MB，建议使用 H.264 编码的 MP4。
- 使用 `Move earlier` / `Move later` 调整顺序，`Use as cover` 设置封面，`Remove` 从当前草稿移除媒体。无封面时上传的第一张照片自动成为封面。
- 保存草稿后可本地预览；点击 `Publish changes` 后，图片和视频随内容一同发布到 GitHub Pages。详情轮播支持左右按钮、键盘方向键和图片左右滑动；视频由访客手动播放。

Social media 的信封按钮展开 `info@decinema.nl`，点击邮箱可以写信。

检查：`npm run check`、`npm run build`、`node --test tests/local-admin.test.mjs`。测试使用临时草稿和模拟 GitHub，不会改动线上内容。


## ABOUT US 图片管理

本地后台的 **ABOUT US** 面板可以更换图片（最大 10 MB），通过拖动、横向/纵向滑块调整位置，并用 100%–300% 缩放控制裁剪范围。裁剪是非破坏性的，原始文件保留；`Reset crop` 恢复居中、100%。Desktop / Mobile 提供两种取景预览，实际显示范围随屏幕尺寸变化。

`Save draft` 保存图片及取景设置，然后点击 `Preview saved draft on website` 查看页面。`Publish changes` 将图片和设置一起发布。ABOUT US 桌面端文字与图片按 3:2 分栏，三段正文使用相同字号与常规字重；手机端上下排列。
