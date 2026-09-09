import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { get, stripTags } from './http.mjs';
import { SOURCES, OFFICIAL_LINKS } from '../config/sources.mjs';
import { profile, MAJOR_HIT, DEGREE_HIT, POLITICS_HIT, FRESH_HIT, NEGATIVE, PROCESS_HIT, CATEGORY_RULES, TITLE_BLACKLIST, GENERIC_STRONG } from '../config/profile.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'jobs.json');

const absUrl = (href, base) => {
  try { return new URL(href, base).href; } catch { return href; }
};
const normTitle = (t) => t.replace(/[\s（）()【】\[\]""'':：,，。.、|]/g, '').toLowerCase();

function parseDate(s) {
  if (!s) return '';
  const m = String(s).match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
  if (!m) return '';
  return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
}

/* ---------- 解析器 ---------- */

function parseYnHrss(text, src) {
  const out = [];
  const liRe = /<li>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(text))) {
    const b = m[1];
    const t = b.match(/title="([^"]*)"/);
    const h = b.match(/href="([^"]+)"/);
    const d = b.match(/<span>\s*([^<]{6,20})\s*<\/span>/);
    if (!t || !h) continue;
    const title = stripTags(t[1]);
    if (title.length < 6) continue;
    out.push({ title, url: absUrl(h[1], src.base), date: parseDate(d && d[1]) });
  }
  return out;
}

function parseYnRsks(text, src) {
  const out = [];
  const liRe = /<li>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRe.exec(text))) {
    const b = m[1];
    const a = b.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!a) continue;
    const title = stripTags(a[2]);
    if (title.length < 6) continue;
    const d = b.match(/<em>\s*\(?([^)<]{6,20})\)?\s*<\/em>/);
    out.push({ title, url: absUrl(a[1], src.base), date: parseDate(d && d[1]) });
  }
  return out;
}

function parseGeneric(text, src) {
  const out = [];
  const kws = src.keywords || ['招聘', '招考'];
  const black = TITLE_BLACKLIST.concat(src.exclude || []);
  const aRe = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]{0,200}?)<\/a>/gi;
  let m;
  while ((m = aRe.exec(text))) {
    const href = m[1];
    let title = stripTags(m[2]);
    if (title.length < 6 || title.length > 120) continue;
    if (/^(首页|更多|上一页|下一页|导航|登录|注册)$/.test(title)) continue;
    if (black.some(b => title.includes(b))) continue;
    if (!kws.some(k => title.includes(k))) continue;
    if (/^javascript:|^#|^mailto:/i.test(href)) continue;
    const tail = text.slice(m.index, m.index + 400);
    const d = tail.match(/(20\d{2}[-/年.]\d{1,2}[-/月.]\d{1,2})/);
    const date = parseDate(d && d[1]);
    // 无日期的链接多为栏目名/导航入口，必须命中强招聘词才认为是真实公告
    if (!date && !GENERIC_STRONG.test(title)) continue;
    out.push({ title, url: absUrl(href, src.base), date });
  }
  return out;
}

const PARSERS = { ynHrss: parseYnHrss, ynRsks: parseYnRsks, generic: parseGeneric };

/* ---------- 身份适配打分 ---------- */

// 标题命中不到时，回退到来源栏目的类别（来源栏目本身就是权威分类）
function classify(title, fallback) {
  for (const [cat, kws] of CATEGORY_RULES) {
    if (kws.some(k => title.includes(k))) return cat;
  }
  return fallback || '其他';
}

// 强招聘信号：足以抵消“考务流程”判定
const RECRUIT_STRONG = /公开招聘|公开招考|招聘公告|招聘启事|招聘简章|人才引进|校园招聘|招聘工作人员|引进|遴选|选调生|招聘信息|招聘计划/;

function scoreJob(title, src) {
  let score = 0;
  const reasons = [];
  const flags = [];
  const hits = (arr) => arr.filter(k => title.includes(k));

  // 1. 地域：云南本地是核心诉求
  const inYn = profile.regions.some(r => title.includes(r));
  if (inYn) { score += 30; reasons.push('云南本地岗位'); }
  else if (src.region === '云南' || src.region === '昆明') { score += 22; reasons.push('云南官方发布'); }
  else { score += 6; }

  // 2. 在招信号
  if (/招聘|招考|招录|公开招考|引进|遴选/.test(title)) { score += 18; flags.push('在招'); reasons.push('在招/报名信号'); }

  // 3. 专业匹配（最高权重）
  const mj = hits(MAJOR_HIT);
  if (mj.length) {
    score += Math.min(mj.length, 3) * 12;
    reasons.push('专业相关：' + mj.slice(0, 3).join('/'));
    flags.push('专业匹配');
  }

  // 4. 学历 / 政治面貌 / 应届
  if (hits(DEGREE_HIT).length) { score += 15; reasons.push('硕士/研究生可报'); flags.push('硕士可报'); }
  if (hits(POLITICS_HIT).length) { score += 8; reasons.push('中共党员相关'); }
  if (hits(FRESH_HIT).length) { score += 8; reasons.push('应届/校招'); flags.push('应届'); }

  // 5. 岗位类别
  const cat = classify(title, src.cat);
  const catBonus = { 选调生: 8, 省考: 6, 事业单位: 6, 科研院所: 6, 国考: 4, 高校: 2, 国企: 2, 医疗: -12 };
  score += catBonus[cat] || 0;
  if (catBonus[cat] > 0) reasons.push('类别匹配：' + cat);

  // 6. 考务流程信息（非招聘机会）
  const proc = hits(PROCESS_HIT);
  if (proc.length) {
    if (RECRUIT_STRONG.test(title)) {
      score -= 12; flags.push('考务安排'); reasons.push('含考试安排：' + proc[0]);
    } else {
      score -= 45; flags.push('考务流程'); reasons.push('考务/成绩信息，非招聘机会');
    }
  }

  // 7. 公示类（已招完）
  if (/拟聘用|公示|拟取得/.test(title)) { score -= 20; flags.push('公示'); reasons.push('公示类（非在招）'); }

  // 8. 明确不符
  const neg = hits(NEGATIVE);
  if (neg.length) { score -= 25; reasons.push('可能不符：' + neg.slice(0, 2).join('/')); }

  return { score: Math.max(0, Math.min(100, score)), reasons, cat, flags };
}

// 时间衰减：招聘信息强时效，过期信息必须沉底
function timeBoost(date) {
  if (!date) return { boost: -5, reason: '无发布日期' };
  const days = (Date.now() - new Date(date).getTime()) / 86400000;
  if (days < 0) return { boost: 15, reason: '新发布' };
  if (days <= 30) return { boost: 15, reason: '30天内发布' };
  if (days <= 90) return { boost: 8, reason: '90天内发布' };
  if (days <= 180) return { boost: 0, reason: '' };
  if (days <= 365) return { boost: -12, reason: '半年以上' };
  return { boost: -30, reason: '一年以上（可能已过期）' };
}

/* ---------- 详情增强（可选） ---------- */

async function enrichDetails(jobs, limit = 60, conc = 5) {
  const cands = jobs
    .filter(j => j.score >= 30 && !(j.flags || []).includes('考务流程'))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  console.log(`\n详情增强：抓取 ${cands.length} 条公告正文（并发 ${conc}）…`);

  let done = 0, hit = 0;
  const queue = [...cands];
  cands.forEach(j => { j._detailAdd = 0; });
  await Promise.all(Array.from({ length: conc }, async () => {
    while (queue.length) {
      const j = queue.shift();
      const r = await get(j.url, { retries: 2, timeout: 25000 });
      done++;
      if (process.stdout.isTTY) process.stdout.write(`\r  进度 ${done}/${cands.length}   `);
      if (!r.ok) continue;

      const body = r.text
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ');
      const txt = stripTags(body);
      if (txt.length < 100) continue;

      let add = 0;
      // 学历：强信号（明确要求硕士）vs 弱信号（仅提及，可能是岗位表里的其他层次）
      if (/硕士研究生|硕士及以上|硕士学位|研究生学历|硕士学历|硕士及以上学位/.test(txt)) {
        add += 12; push(j, '硕士可报', '正文：硕士/研究生可报');
      } else if (/硕士|研究生/.test(txt)) {
        add += 4; push(j, '硕士可报', '正文提及研究生学历');
      }
      const mj = MAJOR_HIT.filter(k => txt.includes(k));
      if (mj.length) {
        add += Math.min(mj.length, 2) * 6;
        push(j, '专业匹配', '正文专业匹配：' + mj.slice(0, 3).join('/'));
      }
      if (/中共党员|党员优先|政治面貌.{0,8}党员/.test(txt)) {
        add += 5; push(j, null, '正文：党员相关');
      }
      if (/应届毕业生|应届生|毕业年度/.test(txt)) {
        add += 5; push(j, '应届', '正文：应届可报');
      }
      // 正文补全发布日期（列表页缺日期时）
      if (!j.date) {
        const dm = txt.match(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})/);
        if (dm) j.date = `${dm[1]}-${String(dm[2]).padStart(2, '0')}-${String(dm[3]).padStart(2, '0')}`;
      }
      const bm = txt.match(/(?:报名|截止|截至|报名截止)[^\n。]{0,26}?((20\d{2})年(\d{1,2})月(\d{1,2})日)/);
      if (bm) {
        j.deadline = `${bm[2]}-${String(bm[3]).padStart(2, '0')}-${String(bm[4]).padStart(2, '0')}`;
        j.reasons.push('报名截止 ' + j.deadline);
      }
      if (/博士/.test(txt) && !/硕士|研究生/.test(txt)) {
        add -= 10; j.reasons.push('正文：仅提及博士');
      }
      if (add !== 0) { hit++; j._detailAdd += add; }
    }
  }));

  // 统一重算：详情阶段可能补全了日期，时间衰减必须按最新日期计算，避免重复计分
  for (const j of cands) {
    if (j._detailAdd) {
      j.score = Math.max(0, Math.min(100, j.baseScore + j._detailAdd + timeBoost(j.date).boost));
    }
    delete j._detailAdd;
  }
  console.log(`\n详情增强完成：处理 ${done} 条，有效命中 ${hit} 条`);
}

function push(j, flag, reason) {
  if (flag && !j.flags.includes(flag)) j.flags.push(flag);
  if (!j.reasons.includes(reason)) j.reasons.push(reason);
}

/* ---------- 主流程 ---------- */

async function run() {
  const started = new Date();
  const jobs = [];
  const seen = new Set();
  const sourceStatus = [];

  for (const src of SOURCES) {
    process.stdout.write(`  · ${src.name} ... `);
    const r = await get(src.url);
    if (!r.ok) {
      console.log(`失败 (${r.err})`);
      sourceStatus.push({ id: src.id, name: src.name, ok: false, count: 0, error: r.err, url: src.url });
      continue;
    }
    const parser = PARSERS[src.parser] || parseGeneric;
    let items = [];
    try { items = parser(r.text, src); } catch (e) { console.log('解析异常', e.message); }
    let added = 0;
    for (const it of items.slice(0, 60)) {
      const key = normTitle(it.title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const { score, reasons, cat, flags } = scoreJob(it.title, src);
      // 时间衰减：招聘信息强时效，过期信息必须沉底
      const tb = timeBoost(it.date);
      if (tb.boost !== 0) reasons.push(tb.reason);
      if (tb.boost <= -30) flags.push('已过期');
      const finalScore = Math.max(0, Math.min(100, score + tb.boost));
      jobs.push({
        id: Buffer.from(it.url).toString('base64url').slice(0, 16),
        title: it.title,
        url: it.url,
        date: it.date || '',
        sourceId: src.id,
        sourceName: src.name,
        org: src.org,
        region: src.region,
        category: cat,
        score: finalScore,
        baseScore: score,
        reasons,
        flags,
      });
      added++;
    }
    console.log(`${items.length} 条 → 新增 ${added}`);
    sourceStatus.push({ id: src.id, name: src.name, ok: true, count: added, url: src.url });
  }

  // 详情增强（默认开启，--no-detail 可关闭）：
  // 标题信息量有限，必须抓正文才能判断“要不要硕士 / 要不要这个专业 / 何时截止”
  if (!process.argv.includes('--no-detail')) await enrichDetails(jobs);

  jobs.sort((a, b) => (b.score - a.score) || (b.date.localeCompare(a.date)));

  const payload = {
    meta: {
      updatedAt: started.toISOString(),
      updatedAtLocal: started.toLocaleString('zh-CN', { hour12: false }),
      total: jobs.length,
      profile: { school: profile.school, major: profile.major, degree: profile.degree, politics: profile.politics },
      sources: sourceStatus,
    },
    jobs,
    officialLinks: OFFICIAL_LINKS,
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2), 'utf8');
  // 同步输出 js 版本：让 index.html 双击（file://）也能直接读取，无需起服务器
  fs.writeFileSync(path.join(ROOT, 'data', 'jobs.js'),
    'window.__JOBS__=' + JSON.stringify(payload) + ';\n', 'utf8');

  const okCnt = sourceStatus.filter(s => s.ok).length;
  console.log(`\n完成：${jobs.length} 条岗位 | 源 ${okCnt}/${SOURCES.length} 成功 | 输出 ${path.relative(ROOT, OUT)}`);
  const top = jobs.slice(0, 8);
  console.log('适配度 Top8:');
  top.forEach(j => console.log(`  [${String(j.score).padStart(3)}] ${j.date || '无日期'} ${j.title.slice(0, 46)}`));
}

run().catch(e => { console.error('致命错误:', e); process.exit(1); });
