/**
 * publish.mjs — 把本地 data/ 发布到 GitHub（本地抓取质量 20/20，远高于 CI 的 6/20）
 *
 * 用 Contents API 更新 data/jobs.json 与 data/jobs.js，
 * 提交后会触发 .github/workflows/update.yml 的 deploy job 自动发布 Pages。
 *
 * 用法：
 *   node scripts/publish.mjs                # 用已保存的 token
 *   node scripts/publish.mjs --token=<pat>  # 指定 token（会顺带保存）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = 'ZZhenganqi';
const REPO = 'yunnan-jobs';
const TOKEN_FILE = path.join(ROOT, '.git', 'gh-token');

const log = (...a) => console.log(...a);

const argv = process.argv.slice(2);
const tokenArg = argv.find((a) => a.startsWith('--token='));
let TOKEN = tokenArg ? tokenArg.slice(8) : null;

if (!TOKEN && fs.existsSync(TOKEN_FILE)) {
  TOKEN = fs.readFileSync(TOKEN_FILE, 'utf8').trim() || null;
}
if (!TOKEN) {
  log('没有可用 token。请先运行：');
  log('  node scripts/ghdeploy.mjs --token=<你的PAT>');
  process.exit(1);
}
if (tokenArg) {
  fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
  fs.writeFileSync(TOKEN_FILE, TOKEN, 'utf8');
}

async function gh(method, endpoint, body) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(120000),
  });
  const txt = await res.text();
  let json = null;
  try { json = txt ? JSON.parse(txt) : null; } catch { json = txt; }
  if (!res.ok) {
    const e = new Error(`${method} ${endpoint} -> ${res.status} ${typeof json === 'object' ? JSON.stringify(json) : txt}`);
    e.status = res.status;
    throw e;
  }
  return json;
}

async function upload(relPath, message) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) { log(`  跳过（不存在）: ${relPath}`); return false; }
  const content = fs.readFileSync(abs).toString('base64');
  let sha = null;
  try {
    const cur = await gh('GET', `/contents/${relPath}`);
    sha = cur && cur.sha ? cur.sha : null;
  } catch { /* 新文件 */ }

  const body = { message, content };
  if (sha) body.sha = sha;
  await gh('PUT', `/contents/${relPath}`, body);

  const kb = (fs.statSync(abs).size / 1024).toFixed(0);
  log(`  已更新 ${relPath} (${kb} KB)`);
  return true;
}

(async () => {
  try {
    const stamp = new Date().toLocaleString('zh-CN', { hour12: false });
    const msg = `chore(data): 更新招聘数据 ${stamp}`;
    log(`发布到 ${OWNER}/${REPO}`);
    await upload('data/jobs.json', msg);
    await upload('data/jobs.js', msg);
    log('');
    log('已提交，GitHub Pages 会在 1-2 分钟内自动更新：');
    log(`  https://${OWNER.toLowerCase()}.github.io/${REPO}/`);
    log(`  状态: https://github.com/${OWNER}/${REPO}/actions`);
  } catch (e) {
    log('发布失败: ' + e.message);
    process.exitCode = 1;
  }
})();
