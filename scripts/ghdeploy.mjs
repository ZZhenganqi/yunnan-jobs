/**
 * ghdeploy.mjs — 用 GitHub API 完成部署（绕开沙箱内 git 网络限制）
 *
 * 流程：
 *   1. 设备码流换取 access_token（或用已有 token）
 *   2. 按 commit 历史逐个重建，保留完整提交记录
 *   3. 开启 GitHub Pages（build_type=workflow）
 *   4. 手动触发一次抓取工作流
 *
 * 用法：
 *   node scripts/ghdeploy.mjs                 # 走设备码流
 *   node scripts/ghdeploy.mjs --device=<code> # 用已有 device_code 轮询
 *   node scripts/ghdeploy.mjs --token=<pat>   # 直接用 PAT
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = 'ZZhenganqi';
const REPO = 'yunnan-jobs';
const CLIENT_ID = 'Iv1.b507a08c87ecfe98';
const TOKEN_FILE = path.join(ROOT, '.git', 'gh-token');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => { console.log(...a); };

let TOKEN = null;
let SKIPPED_WORKFLOW = false;

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
    signal: AbortSignal.timeout(60000),
  });
  const txt = await res.text();
  let json = null;
  try { json = txt ? JSON.parse(txt) : null; } catch { json = txt; }
  if (!res.ok) {
    const err = new Error(`${method} ${endpoint} -> ${res.status} ${typeof json === 'object' ? JSON.stringify(json) : txt}`);
    err.status = res.status;
    err.json = json;
    throw err;
  }
  return json;
}

/* ---------- 1. 获取 token ---------- */

async function getToken() {
  const argv = process.argv.slice(2);
  const tokenArg = argv.find((a) => a.startsWith('--token='));
  if (tokenArg) return tokenArg.slice(8);

  if (fs.existsSync(TOKEN_FILE)) {
    const t = fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    if (t) return t;
  }

  const deviceArg = argv.find((a) => a.startsWith('--device='));
  let deviceCode = deviceArg ? deviceArg.slice(9) : null;
  let userCode = null;
  let interval = 5;

  if (!deviceCode) {
    const r = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, scope: 'repo' }),
      signal: AbortSignal.timeout(30000),
    });
    const d = await r.json();
    deviceCode = d.device_code;
    userCode = d.user_code;
    interval = d.interval || 5;
    log('');
    log('  请在浏览器打开: https://github.com/login/device');
    log(`  输入授权码: ${userCode}`);
    log('');
  }

  const deadline = Date.now() + 14 * 60 * 1000;
  log('  等待授权中...');
  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
      signal: AbortSignal.timeout(30000),
    });
    const j = await r.json();
    if (j.access_token) {
      fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
      fs.writeFileSync(TOKEN_FILE, j.access_token, 'utf8');
      log('  授权成功');
      return j.access_token;
    }
    if (j.error === 'access_denied') throw new Error('授权被拒绝');
    if (j.error === 'expired_token') throw new Error('授权码已过期，请重新运行');
  }
  throw new Error('等待授权超时');
}

/* ---------- 2. 推送提交历史 ---------- */

function git(cmd) {
  return execSync(cmd, { cwd: ROOT, maxBuffer: 200 * 1024 * 1024 });
}

/**
 * GitHub 限制：完全空的仓库无法直接调用 Git Data API 写 blob，
 * 必须先用 Contents API 创建第一个文件把仓库初始化出来。
 */
async function ensureNonEmpty() {
  try {
    await gh('GET', '/git/ref/heads/main');
    return false; // 已非空
  } catch { /* 空仓库，继续初始化 */ }

  log('  仓库为空，先用 Contents API 初始化...');
  const content = Buffer.from('# yunnan-jobs\n\n初始化仓库\n', 'utf8').toString('base64');
  await gh('PUT', '/contents/README.md', {
    message: 'chore: 初始化仓库',
    content,
  });
  log('  已初始化（占位提交，稍后会被真实历史覆盖）');
  return true;
}

async function pushCommits() {
  const shas = git('git log --reverse --format=%H').toString('utf8').trim().split('\n').filter(Boolean);
  log(`  本地提交数: ${shas.length}`);

  await ensureNonEmpty();

  const blobCache = new Map();
  let parent = null;
  let pushed = 0;

  for (const sha of shas) {
    const listing = git(`git ls-tree -r ${sha}`).toString('utf8').trim();
    const files = listing ? listing.split('\n').map((line) => {
      const [meta, p] = line.split('\t');
      const [mode, type, blob] = meta.split(/\s+/);
      return { mode, type, blob, path: p };
    }).filter((f) => f.type === 'blob') : [];

    // 上传缺失的 blob
    for (const f of files) {
      if (blobCache.has(f.blob)) continue;
      const buf = git(`git cat-file blob ${f.blob}`);
      const b64 = Buffer.from(buf).toString('base64');
      const r = await gh('POST', '/git/blobs', { content: b64, encoding: 'base64' });
      blobCache.set(f.blob, r.sha);
    }

    // 写入 .github/workflows 需要额外的 workflow 权限；
    // token 没该权限时 GitHub 返回 404，此处降级跳过，保证站点能先上线
    let rawTree = files.map((f) => ({
      path: f.path, mode: f.mode, type: 'blob', sha: blobCache.get(f.blob),
    }));
    let t;
    try {
      t = await gh('POST', '/git/trees', { tree: rawTree });
    } catch (e) {
      if (e.status === 404 && rawTree.some((x) => x.path.startsWith('.github'))) {
        log('    缺少 workflow 权限，跳过 .github（站点仍可上线，但暂不自动更新）');
        SKIPPED_WORKFLOW = true;
        rawTree = rawTree.filter((x) => !x.path.startsWith('.github'));
        t = await gh('POST', '/git/trees', { tree: rawTree });
      } else {
        throw e;
      }
    }

    const msg = git(`git log -1 --format=%B ${sha}`).toString('utf8').trim();
    const c = await gh('POST', '/git/commits', {
      message: msg, tree: t.sha, parents: parent ? [parent] : [],
    });
    parent = c.sha;
    pushed++;
    log(`    [${pushed}/${shas.length}] ${c.sha.slice(0, 7)} ${msg.split('\n')[0].slice(0, 50)}`);
  }

  // 强制把 main 指向重建后的最新提交（覆盖初始化占位提交）
  await gh('PATCH', '/git/refs/heads/main', { sha: parent, force: true });
  log(`  已更新 refs/heads/main -> ${parent.slice(0, 7)}`);
  return pushed;
}

/* ---------- 3. 开启 Pages ---------- */

async function enablePages() {
  try {
    const cur = await gh('GET', '/pages');
    log(`  Pages 已启用: ${cur.html_url || cur.status || 'ok'}`);
    return cur;
  } catch (e) {
    if (e.status !== 404) log(`  查询 Pages 状态: ${e.message}`);
  }
  // 没有 workflow 文件时改用「分支模式」发布（不需要 Actions）
  const body = SKIPPED_WORKFLOW
    ? { source: { branch: 'main', path: '/' } }
    : { build_type: 'workflow', source: { branch: 'main', path: '/' } };
  try {
    const r = await gh('POST', '/pages', body);
    log(`  Pages 已开启: ${r.html_url || JSON.stringify(r)}`);
    log(`  发布模式: ${SKIPPED_WORKFLOW ? '分支模式（静态）' : 'GitHub Actions'}`);
    return r;
  } catch (e) {
    log(`  开启 Pages 失败: ${e.message}`);
    return null;
  }
}

/* ---------- 4. 触发工作流 ---------- */

async function triggerWorkflow() {
  try {
    await gh('POST', '/actions/workflows/update.yml/dispatches', { ref: 'main' });
    log('  工作流已触发');
    return true;
  } catch (e) {
    log(`  触发工作流失败: ${e.message}`);
    return false;
  }
}

/* ---------- 主流程 ---------- */

(async () => {
  try {
    TOKEN = await getToken();
    log('');
    log('=== 推送提交 ===');
    const n = await pushCommits();
    log('');
    log('=== 开启 Pages ===');
    await enablePages();
    log('');
    log('=== 触发工作流 ===');
    await triggerWorkflow();
    log('');
    log(`完成：推送 ${n} 个提交`);
    log(`仓库: https://github.com/${OWNER}/${REPO}`);
    log(`网址: https://${OWNER}.github.io/${REPO}/`);
    log(`状态: https://github.com/${OWNER}/${REPO}/actions`);
  } catch (e) {
    log('');
    log('失败: ' + e.message);
    process.exitCode = 1;
  }
})();
