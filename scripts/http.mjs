// 轻量 HTTP 工具：零第三方依赖，自带重试 / 超时 / 编码识别（GBK/UTF-8）
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// 默认放宽超时：CI（GitHub Actions 在海外）访问国内政府站点明显更慢
export async function get(url, { timeout = 45000, retries = 4, headers = {} } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: ctl.signal,
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          ...headers,
        },
      });
      clearTimeout(timer);
      const buf = Buffer.from(await res.arrayBuffer());
      const head = buf.subarray(0, 4000).toString('latin1');
      const m = head.match(/charset=["']?([\w-]+)/i);
      let enc = m ? m[1].toLowerCase() : 'utf-8';
      if (enc === 'gb2312' || enc === 'gb2312-80') enc = 'gbk';
      let text = '';
      try { text = new TextDecoder(enc).decode(buf); } catch { text = buf.toString('utf8'); }
      return { ok: res.status < 400, status: res.status, url: res.url, text, enc, len: buf.length };
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      const code = e && e.cause ? e.cause.code : (e && e.name);
      if (code === 'ENOTFOUND' || code === 'UND_ERR_INVALID_URL') break;
      await new Promise(r => setTimeout(r, 700 * (i + 1)));
    }
  }
  const code = lastErr && lastErr.cause ? lastErr.cause.code : (lastErr && lastErr.name);
  return { ok: false, status: 0, err: String(code || lastErr), url };
}

export const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
