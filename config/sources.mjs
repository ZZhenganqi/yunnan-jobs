// 数据源配置：全部为官方一手渠道，可自由增删。
// parser 说明：
//   ynHrss  —— 云南省人社厅 NewsLsit.aspx 列表（<li><a title=..><span>日期</span>）
//   ynRsks  —— 云南人事考试网 News*/Special* 列表（<li><a href=..>标题</a><em>(日期)</em>）
//   generic —— 通用兜底：抽取所有 <a>，按 keywords 过滤，就近取日期
//
// 所有源均经过实测可达性验证；不可抓的站点放在文件末尾 OFFICIAL_LINKS 以“官方直达”呈现。

export const SOURCES = [
  /* ===== 省级核心（最高价值） ===== */
  {
    id: 'yn_hrss_458', name: '云南省人社厅 · 招考招聘', parser: 'ynHrss',
    url: 'https://hrss.yn.gov.cn/NewsLsit.aspx?ClassID=458',
    base: 'https://hrss.yn.gov.cn/', org: '云南省人力资源和社会保障厅',
    cat: '事业单位', region: '云南', weight: 10,
  },
  {
    id: 'yn_hrss_558', name: '云南省人社厅 · 通知公告', parser: 'ynHrss',
    url: 'https://hrss.yn.gov.cn/NewsLsit.aspx?ClassID=558',
    base: 'https://hrss.yn.gov.cn/', org: '云南省人力资源和社会保障厅',
    cat: '事业单位', region: '云南', weight: 8,
  },
  {
    id: 'yn_hrss_602', name: '云南省人社厅 · 招聘公示', parser: 'ynHrss',
    url: 'https://hrss.yn.gov.cn/NewsLsit.aspx?ClassID=602',
    base: 'https://hrss.yn.gov.cn/', org: '云南省人力资源和社会保障厅',
    cat: '事业单位', region: '云南', weight: 6,
  },
  {
    id: 'yn_rsks_news3', name: '云南人事考试网 · 重要通知', parser: 'ynRsks',
    url: 'https://hrss.yn.gov.cn/ynrsksw/News3.html',
    base: 'https://hrss.yn.gov.cn/ynrsksw/', org: '云南省人事考试院',
    cat: '事业单位', region: '云南', weight: 9,
  },
  {
    id: 'yn_rsks_sp7', name: '云南人事考试网 · 公务员考试', parser: 'ynRsks',
    url: 'https://hrss.yn.gov.cn/ynrsksw/Special7.html',
    base: 'https://hrss.yn.gov.cn/ynrsksw/', org: '云南省人事考试院',
    cat: '省考', region: '云南', weight: 10,
  },
  {
    id: 'yn_rsks_sp8', name: '云南人事考试网 · 事业单位考试', parser: 'ynRsks',
    url: 'https://hrss.yn.gov.cn/ynrsksw/Special8.html',
    base: 'https://hrss.yn.gov.cn/ynrsksw/', org: '云南省人事考试院',
    cat: '事业单位', region: '云南', weight: 10,
  },
  {
    id: 'yn_rsks_news2', name: '云南人事考试网 · 工作动态', parser: 'ynRsks',
    url: 'https://hrss.yn.gov.cn/ynrsksw/News2.html',
    base: 'https://hrss.yn.gov.cn/ynrsksw/', org: '云南省人事考试院',
    cat: '事业单位', region: '云南', weight: 5,
  },

  /* ===== 专业对口：农业 / 林草 / 水利（农业工程与信息技术方向重点） ===== */
  {
    id: 'yn_nync', name: '云南省农业农村厅', parser: 'generic',
    url: 'https://nync.yn.gov.cn/', base: 'https://nync.yn.gov.cn/',
    org: '云南省农业农村厅', cat: '事业单位', region: '云南', weight: 9,
    keywords: ['招聘', '公开招考', '遴选', '选调', '人才', '考录', '招录', '岗位'],
  },
  {
    id: 'yn_lcj', name: '云南省林业和草原局', parser: 'generic',
    url: 'https://lcj.yn.gov.cn/', base: 'https://lcj.yn.gov.cn/',
    org: '云南省林业和草原局', cat: '事业单位', region: '云南', weight: 7,
    keywords: ['招聘', '公开招考', '遴选', '选调', '人才', '考录', '招录', '岗位'],
  },
  {
    id: 'yn_wcb', name: '云南省水利厅', parser: 'generic',
    url: 'https://wcb.yn.gov.cn/', base: 'https://wcb.yn.gov.cn/',
    org: '云南省水利厅', cat: '事业单位', region: '云南', weight: 7,
    keywords: ['招聘', '公开招考', '遴选', '选调', '人才', '考录', '招录', '岗位'],
  },

  /* ===== 州市人社局 ===== */
  {
    id: 'km_rsj', name: '昆明市人力资源和社会保障局', parser: 'generic',
    url: 'https://rsj.km.gov.cn/', base: 'https://rsj.km.gov.cn/',
    org: '昆明市人社局', cat: '事业单位', region: '昆明', weight: 8,
    keywords: ['招聘', '招考', '公告', '公务员', '事业', '公开', '遴选', '选调'],
  },
  {
    id: 'qj_rsj', name: '曲靖市人力资源和社会保障局', parser: 'generic',
    url: 'https://rsj.qj.gov.cn/', base: 'https://rsj.qj.gov.cn/',
    org: '曲靖市人社局', cat: '事业单位', region: '曲靖', weight: 7,
    keywords: ['招聘', '招考', '公告', '公务员', '事业', '公开', '遴选', '选调'],
  },
  {
    id: 'cx_rsj', name: '楚雄州人力资源和社会保障局', parser: 'generic',
    url: 'https://rsj.cxz.gov.cn/', base: 'https://rsj.cxz.gov.cn/',
    org: '楚雄州人社局', cat: '事业单位', region: '楚雄', weight: 7,
    keywords: ['招聘', '招考', '公告', '公务员', '事业', '公开', '遴选', '选调'],
  },

  /* ===== 高校 / 科研院所 ===== */
  {
    id: 'ynau_rsc', name: '云南农业大学人事处（母校）', parser: 'generic',
    url: 'https://rsc.ynau.edu.cn/', base: 'https://rsc.ynau.edu.cn/',
    org: '云南农业大学人事处', cat: '高校', region: '昆明', weight: 10,
    keywords: ['招聘', '引进', '人才', '岗位', '遴选', '公告', '选调', '聘用'],
  },
  {
    id: 'ynu', name: '云南大学', parser: 'generic',
    url: 'https://www.ynu.edu.cn/', base: 'https://www.ynu.edu.cn/',
    org: '云南大学', cat: '高校', region: '昆明', weight: 6,
    keywords: ['公开招聘', '人才招聘', '招聘启事', '招聘公告', '引进', '遴选', '招聘'],
  },
  {
    id: 'ynnu_rsc', name: '云南师范大学人事处', parser: 'generic',
    url: 'https://rsc.ynnu.edu.cn/', base: 'https://rsc.ynnu.edu.cn/',
    org: '云南师范大学人事处', cat: '高校', region: '昆明', weight: 6,
    keywords: ['招聘', '引进', '人才', '岗位', '遴选', '公告', '聘用'],
  },
  {
    id: 'swfu_rsc', name: '西南林业大学人事处', parser: 'generic',
    url: 'https://rsc.swfu.edu.cn/', base: 'https://rsc.swfu.edu.cn/',
    org: '西南林业大学人事处', cat: '高校', region: '昆明', weight: 7,
    keywords: ['招聘', '引进', '人才', '岗位', '遴选', '公告', '聘用'],
  },
  {
    id: 'kib_cas', name: '中科院昆明植物研究所', parser: 'generic',
    url: 'http://www.kib.cas.cn/', base: 'http://www.kib.cas.cn/',
    org: '中国科学院昆明植物研究所', cat: '科研院所', region: '昆明', weight: 7,
    keywords: ['招聘', '招聘启事', '人才', '岗位', '博士后', '招聘信息'],
  },

  /* ===== 国企 / 综合市场 ===== */
  {
    id: 'gwy_cpta', name: '国家公务员局 · 国考专题', parser: 'generic',
    url: 'http://gwy.cpta.com.cn/', base: 'http://gwy.cpta.com.cn/',
    org: '国家公务员局', cat: '国考', region: '全国', weight: 9,
    keywords: ['公告', '职位', '招考', '录用', '公务员', '报名', '考试'],
  },
  {
    id: 'yn_gzw', name: '云南省国资委', parser: 'generic',
    url: 'https://gzw.yn.gov.cn/', base: 'https://gzw.yn.gov.cn/',
    org: '云南省人民政府国有资产监督管理委员会', cat: '国企', region: '云南', weight: 7,
    keywords: ['招聘', '公开招考', '招录', '人才', '岗位', '遴选', '公告'],
  },
];

// 抓不动但必须关注的官方渠道（有反爬 / WAF / 域名不通），在页面以“官方直达”呈现
export const OFFICIAL_LINKS = [
  { name: '中央机关及其直属机构考试录用公务员专题（国考唯一官方）', url: 'http://bm.scs.gov.cn/', cat: '国考' },
  { name: '国家公务员局', url: 'http://www.scs.gov.cn/', cat: '国考' },
  { name: '云南省人力资源和社会保障厅 · 招考招聘', url: 'https://hrss.yn.gov.cn/NewsLsit.aspx?ClassID=458', cat: '事业单位' },
  { name: '云南人事考试网（省考/事业单位唯一官方）', url: 'https://hrss.yn.gov.cn/ynrsksw/', cat: '省考' },
  { name: '云南省委组织部 · 选调生公告', url: 'https://hrss.yn.gov.cn/ynrsksw/Special7.html', cat: '选调生' },
  { name: '中国人事考试网（人社部人事考试中心）', url: 'http://www.cpta.com.cn/', cat: '通用' },
  { name: '中国公共招聘网（人社部官方）', url: 'http://job.mohrss.gov.cn/', cat: '通用' },
  { name: '国务院国资委 · 央企招聘', url: 'http://www.sasac.gov.cn/', cat: '国企' },
  { name: '云南省农业科学院（有云锁WAF，需人工查看）', url: 'https://www.yaas.org.cn/', cat: '科研院所' },
  { name: '云南农业大学（主站返回412，人事处可抓）', url: 'https://www.ynau.edu.cn/', cat: '高校' },
  { name: '云南农业大学人事处', url: 'https://rsc.ynau.edu.cn/', cat: '高校' },
  { name: '昆明理工大学', url: 'https://www.kust.edu.cn/', cat: '高校' },
  { name: '云南人才市场（云南人才网）', url: 'https://www.ynhr.com/', cat: '通用' },
  { name: '玉溪市人民政府', url: 'https://www.yuxi.gov.cn/', cat: '州市' },
  { name: '保山市人民政府', url: 'https://www.baoshan.gov.cn/', cat: '州市' },
  { name: '昭通市人民政府', url: 'https://www.zt.gov.cn/', cat: '州市' },
  { name: '丽江市人民政府', url: 'https://www.lijiang.gov.cn/', cat: '州市' },
  { name: '红河州人民政府', url: 'https://www.hh.gov.cn/', cat: '州市' },
  { name: '文山州人民政府', url: 'https://www.ynws.gov.cn/', cat: '州市' },
  { name: '德宏州人民政府', url: 'https://www.dh.gov.cn/', cat: '州市' },
  { name: '怒江州人民政府', url: 'https://www.nujiang.gov.cn/', cat: '州市' },
  { name: '迪庆州人民政府', url: 'https://www.diqing.gov.cn/', cat: '州市' },
];
