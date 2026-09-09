# 云南公考编招 · 实时招聘平台

面向「云南农业大学 / 农业工程与信息技术 / 硕士研究生 / 中共党员」身份定制的公职类招聘聚合平台。
**零第三方依赖、零服务器成本**，全部数据来自官方一手渠道。

---

## 一、30 秒快速开始

```bash
node scripts/fetch.mjs      # 1. 抓取（约 40 秒）
node scripts/serve.mjs      # 2. 启动本地预览 → http://localhost:8787
```

也可以直接双击 `index.html`——抓取时会同时生成 `data/jobs.js`，本地文件方式也能读到数据。

> 需要 Node.js 18+（推荐 20 LTS）。检查：`node -v`

---

## 二、已接入的官方数据源（10 个，全部实测可抓）

| 来源 | 内容 | 解析器 |
|---|---|---|
| 云南省人社厅 · 招考招聘 | 全省事业单位/公招公告 | ynHrss |
| 云南省人社厅 · 通知公告 | 补充公告 | ynHrss |
| 云南省人社厅 · 招聘公示 | 拟聘用公示 | ynHrss |
| 云南人事考试网 · 重要通知 | 考试院权威通知 | ynRsks |
| 云南人事考试网 · 公务员考试 | **省考**、选调生 | ynRsks |
| 云南人事考试网 · 事业单位考试 | 事业单位统考 | ynRsks |
| 云南人事考试网 · 工作动态 | 动态补充 | ynRsks |
| 国家公务员局（gwy.cpta.com.cn） | **国考** | generic |
| 昆明市人力资源和社会保障局 | 昆明本地岗位 | generic |
| 中科院昆明植物研究所 | 科研院所岗 | generic |

另有 10 个**官方直达链接**固定展示在页面底部，覆盖中国公共招聘网、国资委央企招聘、云南省农科院（有反爬，建议人工查看）等渠道。

### 已知的抓取限制（重要）

实测发现部分站点存在防护，无法自动抓取，已在页面以「官方直达」形式保留入口：

- **云南省农科院**：部署了云锁 WAF，返回 JS 跳转壳，需人工查看
- **中国公共招聘网**：服务器端连接超时
- **云南农大就业网**：`jy.ynau.edu.cn` 域名不存在

如需增加数据源，编辑 `config/sources.mjs` 即可，支持三种解析器：
- `ynHrss` — 人社厅 `NewsLsit.aspx` 列表
- `ynRsks` — 人事考试网 `News*.html` / `Special*.html`
- `generic` — 通用兜底，按关键词抽取链接（适配任意站点）

---

## 三、身份画像与适配度

编辑 `config/profile.mjs` 修改画像与打分规则：

```js
export const profile = {
  school: '云南农业大学',
  major: '农业工程与信息技术',
  degree: '硕士',
  politics: '中共党员',
  regions: ['云南', '昆明', ...],
};
```

**适配度打分（满分 100）**，分两步：

1. **标题层**：地域 +30 / 在招信号 +18 / 专业匹配 每个 +12（最多 3 个）/ 硕士可报 +15 / 党员 +8 / 应届 +8 / 类别加权
2. **正文层**（默认自动开启）：抓取公告原文，识别「硕士及以上」「专业要求」「党员」「应届」「报名截止日期」，据此二次打分

**降权项**：公示拟聘用 -20、考务流程信息 -45、明确不符（博士/医师等）-25
**时间衰减**：30 天内 +15，90 天内 +8，半年内 0，半年以上 -12，一年以上 -30

页面提供「隐藏考务流程」「只看在招」「近 30/90 天」等筛选，默认已隐藏考务流程信息。

---

## 四、定时自动更新

### 方案 A：GitHub Actions（推荐，免费且自动托管）

1. 把整个目录推到 GitHub 仓库
2. 仓库 **Settings → Pages → Source 选 GitHub Actions**
3. 工作流 `.github/workflows/update.yml` 会在**北京时间每天 08:00 和 20:00** 自动抓取并提交
4. 也可在 Actions 页面点 *Run workflow* 手动立即执行

完成后会得到一个公网可访问的网址，手机电脑都能开。

### 方案 B：本机 Windows 计划任务

```powershell
# 每天 8:00 和 20:00 自动抓取（修改路径后执行）
$trigger1 = New-ScheduledTaskTrigger -Daily -At 08:00
$trigger2 = New-ScheduledTaskTrigger -Daily -At 20:00
$action = New-ScheduledTaskAction -Execute "node" -Argument "D:\WB\yunnan-jobs\scripts\fetch.mjs" -WorkingDirectory "D:\WB\yunnan-jobs"
Register-ScheduledTask -TaskName "云南公考编招抓取" -Trigger $trigger1,$trigger2 -Action $action
```

---

## 五、命令速查

```bash
node scripts/fetch.mjs             # 抓取 + 正文增强（默认）
node scripts/fetch.mjs --no-detail # 只抓列表，速度快但不识别正文要求
node scripts/serve.mjs             # 本地预览 http://localhost:8787
```

`PORT=3000 node scripts/serve.mjs` 可换端口。

---

## 六、目录结构

```
yunnan-jobs/
├── index.html              前端页面（单文件，电脑/手机自适应）
├── data/
│   ├── jobs.json           抓取结果（供 fetch 读取）
│   └── jobs.js             同一份数据的 JS 版（供 file:// 直接打开）
├── scripts/
│   ├── fetch.mjs           抓取 + 解析 + 打分主程序
│   ├── serve.mjs           本地预览服务器
│   └── http.mjs            HTTP 工具（重试/超时/GBK 解码）
├── config/
│   ├── sources.mjs         数据源与官方直达链接
│   └── profile.mjs         身份画像与打分规则
├── .github/workflows/
│   └── update.yml          定时抓取 + Pages 部署
└── start.bat               Windows 一键：抓取并启动
```

---

## 七、说明

本平台只做**信息聚合与官方链接跳转**，不存储、不转载公告正文，所有岗位以官方公告原文为准。
收藏标记保存在浏览器 localStorage，不会上传。
