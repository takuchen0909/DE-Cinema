# Diaspora East Cinema

Diaspora East Cinema is a cinema archive featuring news, screenings and past events.

Explore films and gatherings through event details, images and stories from the archive.

[Visit Diaspora East Cinema](https://takuchen0909.github.io/DE-Cinema/)

## Local preview

```sh
npm run dev
```

Open the `/DE-Cinema/` URL printed by Vite. `npm run check` checks TypeScript and `npm run build` generates the GitHub Pages files in `dist/`.

The home page uses a browser-compatible copy of `video.mov`, with the bird logo animating automatically once. The video and About image move at different speeds while scrolling. About us is the second section; News, Past events and Contact follow. The colored logo and fixed navigation appear after scrolling into About us.

The contact form opens an email enquiry addressed to `Info@decinema.nl`. The visitor sends it from their email app. Instagram links to `https://www.instagram.com/diaspora_east_cinema/`.

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
2. 编辑 News / Past events、文字和图片。`Save draft` 只保存本地草稿。
3. 点击 `Publish changes`，等待 `Website update complete`，再打开线上网站查看。
4. 本机通过 `.local-tools/gh` 使用 GitHub CLI 登录授权。该工具和凭证不会提交到仓库。在其他电脑可设置 `GH_PATH` 指向已登录的 GitHub CLI，或在后台连接 GitHub token（Contents: Read and write；Actions: Read-only）。

后台发布将内容直接提交到 GitHub；之后如要修改网站代码，先在工作区干净时执行 `git pull --ff-only`，再修改、提交和推送。后台草稿及密码请自行保留备份。
