#!/bin/zsh
cd -- "${0:A:h}"
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if ! command -v node >/dev/null; then
  echo '请先安装 Node.js 22 或更新版本。'
  read -k 1
  exit 1
fi
if curl --silent --fail --max-time 2 http://127.0.0.1:5174/api/session >/dev/null; then
  open 'http://127.0.0.1:5174/DE-Cinema/#admin'
  exit 0
fi
if [[ ! -d node_modules ]]; then
  corepack pnpm install --frozen-lockfile || exit 1
fi
(sleep 3; open 'http://127.0.0.1:5174/DE-Cinema/#admin') &
npm run dev -- --strictPort
