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

## 二、已接入的官方数据源（20 个，全部实测可抓）

### 省级核心（7 个）

| 来源 | 内容 | 解析器 |
|---|---|---|
| 云南省人社厅 · 招考招聘 | 全省事业单位/公招公告 | ynHrss |
| 云南省人社厅 · 通知公告 | 补充公告 | ynHrss |
| 云南省人社厅 · 招聘公示 | 拟聘用公示 | ynHrss |
| 云南人事考试网 · 重要通知 | 考试院权威通知 | ynRsks |
| 云南人事考试网 · 公务员考试 | **省考**、选调生 | ynRsks |
| 云南人事考试网 · 事业单位考试 | 事业单位统考 | ynRsks |
| 云南人事考试网 · 工作动态 | 动态补充 | ynRsks |

### 专业对口：农业 / 林草 / 水利（3 个）

| 来源 | 内容 |
|---|---|
| **云南省农业农村厅** | 农业系统招聘（农业工程与信息技术重点对口） |
| 云南省林业和草原局 | 林草系统招聘 |
| 云南省水利厅 | 水利系统招聘 |

### 州市人社局（3 个）

昆明、曲靖、楚雄 —— 其余州市人社局域名未能解析（`rsj.xxx.gov.cn` 规律不通用），已改为市政府主站直达链接。

### 高校 / 科研院所（5 个）

| 来源 | 说明 |
|---|---|
| **云南农业大学人事处**（`rsc.ynau.edu.cn`） | 母校岗位，主站 412 但人事处可抓 |
| 云南大学 | 主站首页 |
| 云南师范大学人事处 | `rsc.ynnu.edu.cn` |
| 西南林业大学人事处 | `rsc.swfu.edu.cn` |
| 中科院昆明植物研究所 | 科研院所岗 |

### 国考 / 国企（2 个）

国家公务员局（`gwy.cpta.com.cn`）、云南省国资委。

另有 **23 个官方直达链接**固定展示在页面底部，覆盖中国公共招聘网、国务院国资委央企招聘、云南省农科院、9 个州市政府主站等渠道。

### 已知的抓取限制（重要）

实测发现部分站点存在防护，无法自动抓取，已在页面以「官方直达」形式保留入口：

- **云南省农科院**：部署云锁 WAF，返回 JS 跳转壳 → 人工查看
- **云南农业大学主站**：返回 HTTP 412（WAF 指纹拦截，四种请求头均无法绕过）→ 已改用人事处 `rsc.ynau.edu.cn` **成功抓取**
- **中国公共招聘网**：连接超时
- **云南农大就业网**：`jy.ynau.edu.cn` 域名不存在
- **云南人才网**：首页抓到的全是外省导航站（海南/贵州/海峡人才网），已移出自动源
- 多数州市人社局域名无法解析，改用市政府主站直达

### 噪音过滤机制

通用解析器（`generic`）容易抓进无关内容（实测曾抓入"拖欠农民工工资名单""《求是》重要文章"），因此设置两道防线：

1. **标题黑名单** `TITLE_BLACKLIST`：命"失信/惩戒/拖欠/违法/培训班/人才网/导航"等词直接丢弃
2. **强招聘词校验** `GENERIC_STRONG`：无发布日期的链接，标题必须命中"公开招聘/公开遴选/选调/招录/人才引进"等强词才入库（过滤栏目名和导航入口）

两者均在 `config/profile.mjs` 中可改；单个数据源还可在 `config/sources.mjs` 里配置 `exclude` 追加排除词。

如需增加数据源，编辑 `config/sources.mjs` 即可，支持三种解析器：
- `ynHrss` — 人社厅 `NewsLsit.aspx` 列表
- `ynRsks` — 人事考试网 `News*.html` / `Special*.html`
- `generic` — 通用兜底（适配任意站点，建议同时配上合适的 `keywords`）

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

1. 在 GitHub 新建空仓库（不要勾选 README / .gitignore）
3. **双击 `双击推送.bat`**，脚本会自动完成 git push。推送成功后会自动打开
   仓库的 Pages 设置页和 Actions 页

   （想手动执行也可以：）

```bash
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git branch -M main
git push -u origin main
```

4. 仓库 **Settings → Pages → Source 选 GitHub Actions**
5. 进 Actions 页面点 *Run workflow* 手动跑第一次，跑完就有公网网址
6. 之后工作流会在**北京时间每天 08:00 和 20:00** 自动抓取并更新

最终网址：`https://<用户名>.github.io/<仓库名>/`，手机电脑都能开。

> 首次推送若弹出 GitHub 登录窗口，用浏览器授权即可（Git 会自动保存凭据，之后不再问）。
> 若提示输入密码，需要改用 Personal Access Token：GitHub → Settings → Developer settings
> → Personal access tokens → Tokens (classic) → 勾选 `repo` 权限生成，粘贴当密码用。

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
