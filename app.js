// =============================================================================
// dbs 工具箱 — 应用逻辑
// 纯原生 JS，数据来源 window.DBS_DATA（data.js）
// =============================================================================
(function () {
  'use strict';

  var D = window.DBS_DATA;

  // 视图 id 映射
  var VIEW = {
    menu: 'viewMenu',
    tool1: 'viewTool1',
    tool2: 'viewTool2',
    tool3: 'viewTool3',
    tool4: 'viewTool4'
  };

  var TITLE_MAP = {
    menu: 'dbs 工具箱',
    tool1: '标题公式匹配器',
    tool2: 'AI 写作检测器',
    tool3: '内容五维自检',
    tool4: '开头优化方案'
  };

  var state = { currentView: 'menu', currentTool: null };

  // -------------------------------------------------------------------------
  // 工具函数
  // -------------------------------------------------------------------------
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function getCtx(text, start, len) {
    var half = 24;
    var s = Math.max(0, start - half);
    var e = Math.min(text.length, start + len + half);
    var sn = text.slice(s, e).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    var prefix = s > 0 ? '…' : '';
    var suffix = e < text.length ? '…' : '';
    return prefix + sn + suffix;
  }

  // 复制文本（带降级）
  function copyText(str, btn) {
    var done = function () {
      if (btn) {
        var old = btn.textContent;
        btn.textContent = '已复制';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = old;
          btn.classList.remove('copied');
        }, 1200);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(str).then(done).catch(function () { fallbackCopy(str, done); });
    } else {
      fallbackCopy(str, done);
    }
  }
  function fallbackCopy(str, cb) {
    try {
      var ta = document.createElement('textarea');
      ta.value = str;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (cb) cb();
      return ok;
    } catch (e) { if (cb) cb(); return false; }
  }

  // -------------------------------------------------------------------------
  // 视图切换
  // -------------------------------------------------------------------------
  function showView(viewKey) {
    var vid = VIEW[viewKey];
    if (!vid) return;
    var views = document.querySelectorAll('.view');
    for (var i = 0; i < views.length; i++) {
      views[i].classList.remove('active');
    }
    $(vid).classList.add('active');

    var isTool = (viewKey === 'tool1' || viewKey === 'tool2' || viewKey === 'tool3' || viewKey === 'tool4');

    // 返回按钮显示/隐藏
    var backBtn = $('backBtn');
    if (isTool) {
      backBtn.classList.add('visible');
    } else {
      backBtn.classList.remove('visible');
    }

    // 滚回顶部
    window.scrollTo(0, 0);
  }

  function openTool(n) {
    state.currentTool = n;
    state.currentView = 'tool' + n;
    showView('tool' + n);
  }

  function backToMenu() {
    state.currentTool = null;
    state.currentView = 'menu';
    showView('menu');
  }

  // -------------------------------------------------------------------------
  // 首页：能力卡片
  // -------------------------------------------------------------------------
  function renderHome() {
    var grid = $('capGrid');
    grid.innerHTML = '';
    D.capabilities.forEach(function (cap) {
      var card = el('div', 'cap-card');
      card.setAttribute('data-cap', cap.id);
      card.innerHTML =
        '<span class="cap-icon">' + escapeHtml(cap.icon) + '</span>' +
        '<div class="cap-name">' + escapeHtml(cap.name) + '</div>' +
        '<div class="cap-desc">' + escapeHtml(cap.desc) + '</div>';
      card.addEventListener('click', function () {
        toggleCap(cap.id, card);
      });
      grid.appendChild(card);
    });
  }

  function toggleCap(capId, card) {
    var next = card.classList.contains('expanded') ? null : capId;
    // 先关闭其他
    var all = document.querySelectorAll('.cap-card');
    for (var i = 0; i < all.length; i++) all[i].classList.remove('expanded');
    // 移除已有展开块
    var existing = document.querySelector('.cap-skills');
    if (existing) existing.remove();

    if (!next) return;

    var cap = D.capabilities.filter(function (c) { return c.id === capId; })[0];
    card.classList.add('expanded');
    var block = el('div', 'cap-skills');
    block.style.gridColumn = '1 / -1';
    var html = '<div class="skill-label">包含 ' + cap.skills.length + ' 个 skill</div>';
    cap.skills.forEach(function (s) {
      html += '<span class="skill-chip">' + escapeHtml(s) + '</span>';
    });
    block.innerHTML = html;
    // 插到当前行的下一行（跨整行）
    card.parentNode.insertBefore(block, card.nextSibling);
  }

  // -------------------------------------------------------------------------
  // 工具列表
  // -------------------------------------------------------------------------
  function renderToolList() {
    var list = $('toolList');
    var tools = [
      { n: 1, name: '标题公式匹配器', desc: '75 个爆款公式，按话题+行业匹配' },
      { n: 2, name: 'AI 写作检测器', desc: '22 条 AI 写作特征扫描' },
      { n: 3, name: '内容五维自检', desc: '文字洁癖 / 封面标题 / 效率 / 落差 / AI 辅助' },
      { n: 4, name: '开头优化方案', desc: '诊断开头问题，输出优化方向' }
    ];
    list.innerHTML = '';
    tools.forEach(function (t) {
      var card = el('div', 'tool-card');
      card.innerHTML =
        '<div class="tool-num">' + t.n + '</div>' +
        '<div class="tool-info">' +
        '<div class="tool-name">' + escapeHtml(t.name) + '</div>' +
        '<div class="tool-desc">' + escapeHtml(t.desc) + '</div>' +
        '</div>' +
        '<div class="tool-arrow">&rsaquo;</div>';
      card.addEventListener('click', function () { openTool(t.n); });
      list.appendChild(card);
    });
  }

  // ===========================================================================
  // 工具 1：标题公式匹配器
  // ===========================================================================
  var CATEGORY_PRIORITY = [
    { cats: ['恐惧/损失'], keys: ['避坑', '错误', '危险', '后果', '阻碍', '危害', '警告', '千万别', '别做', '亏损', '烂脸', '失败', '越练越', '毁', '坑'] },
    { cats: ['数字锚定'], keys: ['方法', '教程', '步骤', '技巧', '窍门', '清单', '攻略', '指南', '招', '盘点'] },
    { cats: ['认知冲突'], keys: ['为什么', '其实', '真相', '反而', '颠覆', '反常识', '骗了', '谎言'] },
    { cats: ['结果承诺'], keys: ['赚钱', '收入', '变现', '月入', '瘦', '涨粉', '天内', '万', '赚到', '副业'] },
    { cats: ['身份代入'], keys: ['给', '宝妈', '新手', '上班族', '学生', '人群', '女生', '妈妈'] },
    { cats: ['社会证明'], keys: ['我如何', '经历', '教训', '案例', '从', '我是如何'] },
    { cats: ['争议/挑衅'], keys: ['到底', '是不是', '过时', '浪费时间', 'VS', '要不要'] },
    { cats: ['场景/条件'], keys: ['如果', '当', '时候', '之后'] },
    { cats: ['行动号召'], keys: ['停止', '别再', '戒掉', '应该', '马上'] },
    { cats: ['权威借力'], keys: ['名人', '大佬', '雷军', '张一鸣', '罗永浩', '任正非'] },
    { cats: ['互动/测试'], keys: ['测一测', '测试', '测'] },
    { cats: ['好奇缺口'], keys: ['秘密', '不会告诉你', '想不到', '隐藏'] }
  ];

  // --- 话题简化：去掉常见前缀，提取核心关键词 ---
  function simplifyTopic(topic) {
    var t = (topic || '').trim();
    t = t.replace(/^(分享我的|分享我|分享|记录我的|记录我|记录|我的|我的一周|一周的|如何|怎么|怎样|为什么|关于|聊聊|谈谈|说说我|说说|带你看|带你|今天来|今天聊聊)/, '');
    if (t.length > 8) t = t.slice(0, 6);
    return t || (topic || '').trim();
  }

  // --- 从行业示例中提取槽位值 ---
  function extractSlotValues(template, example) {
    var slotRegex = /\[([^\]]+)\]/g;
    var literalParts = [];
    var lastIdx = 0;
    var m;
    while ((m = slotRegex.exec(template)) !== null) {
      literalParts.push(template.slice(lastIdx, m.index));
      lastIdx = m.index + m[0].length;
    }
    literalParts.push(template.slice(lastIdx));

    var values = [];
    var pos = 0;
    var slotCount = literalParts.length - 1;
    for (var i = 0; i < slotCount; i++) {
      var prefix = literalParts[i];
      var suffix = literalParts[i + 1];

      // 找前缀锚点（精确 → 前2字模糊）
      var pIdx = -1;
      if (prefix && prefix.trim()) {
        pIdx = example.indexOf(prefix.trim(), pos);
        if (pIdx === -1 && prefix.trim().length > 2) {
          pIdx = example.indexOf(prefix.trim().slice(0, 2), pos);
        }
      }
      if (pIdx !== -1) {
        // 精确匹配：推进整个前缀长度；模糊匹配：也推进整个前缀长度
        pos = pIdx + prefix.trim().length;
      } else if (i === 0 && prefix && prefix.trim()) {
        // 前缀在开头，跳过
        var pTrim = prefix.trim();
        if (example.slice(0, pTrim.length) === pTrim) pos = pTrim.length;
      }

      // 找后缀锚点
      var sIdx = -1;
      if (suffix && suffix.trim()) {
        var sTrim = suffix.trim();
        sIdx = example.indexOf(sTrim, pos);
        if (sIdx === -1 && sTrim.length > 2) {
          sIdx = example.indexOf(sTrim.slice(0, 2), pos);
        }
      }
      if (sIdx === -1) sIdx = example.length;

      values.push(example.slice(pos, sIdx).replace(/^[，,、\s]+|[，,、\s]+$/g, ''));
      pos = sIdx;
    }
    return values;
  }

  // --- 核心函数：把用户话题代入模板，生成标题 ---
  function generateTitleFromTemplate(template, example, topic) {
    var topicShort = simplifyTopic(topic);

    // 提取所有槽位
    var slotRegex = /\[([^\]]+)\]/g;
    var slots = [];
    var m;
    while ((m = slotRegex.exec(template)) !== null) {
      slots.push({ full: m[0], name: m[1] });
    }
    if (slots.length === 0) return template;

    // 判断是否所有槽位相同（如 [行动] [行动] [行动]）
    var allSame = slots.every(function (s) { return s.name === slots[0].name; });

    // 结构性槽位默认值
    var STRUCTURAL_DEFAULTS = {
      '数字': '3', '专家': '行业专家', '一群人': '达人',
      '目标': '目标', '好结果': '反而赚到了'
    };
    function isStructural(name) {
      return Object.keys(STRUCTURAL_DEFAULTS).some(function (k) { return name.indexOf(k) !== -1; });
    }

    // 从行业示例提取槽位值
    var exValues = extractSlotValues(template, example);

    var result = template;

    if (allSame && slots.length > 1) {
      // 相同槽位重复：第一个用话题，其余从行业示例取
      var firstEnd2 = template.indexOf(slots[0].full) + slots[0].full.length;
      var secondStart2 = template.indexOf(slots[1].full, firstEnd2);
      var templateSep2 = template.slice(firstEnd2, secondStart2);

      // 如果模板分隔符只是空格，从示例取顿号/逗号
      if (templateSep2.trim() === '') {
        var sepMatch2 = example.match(/[，,、]/);
        templateSep2 = sepMatch2 ? sepMatch2[0] : ' ';
      }

      // 取前缀和后缀
      var lastSlotEnd2 = template.lastIndexOf(slots[slots.length - 1].full) + slots[slots.length - 1].full.length;
      var suffix2 = template.slice(lastSlotEnd2);
      var prefix2 = template.slice(0, template.indexOf(slots[0].full));

      // 直接从示例中拆分出各槽位的值
      var exTrimmed = example;
      if (prefix2 && prefix2.trim() && exTrimmed.startsWith(prefix2.trim())) {
        exTrimmed = exTrimmed.slice(prefix2.trim().length);
      }
      if (suffix2 && suffix2.trim() && exTrimmed.endsWith(suffix2.trim())) {
        exTrimmed = exTrimmed.slice(0, -suffix2.trim().length);
      }
      var exParts2 = exTrimmed.split(/[，,、]/).filter(function (p) { return p.trim().length > 0; }).map(function (p) { return p.trim(); });

      var values2 = [];
      for (var i2 = 0; i2 < slots.length; i2++) {
        if (i2 === 0) {
          values2.push(topicShort);
        } else if (exParts2[i2]) {
          values2.push(exParts2[i2]);
        } else {
          values2.push(topicShort);
        }
      }
      result = prefix2 + values2.join(templateSep2) + suffix2;
    } else {
      // 不同槽位：内容槽用话题，结构槽用默认值或示例值
      var firstContentDone = false;
      for (var i3 = 0; i3 < slots.length; i3++) {
        var rep;
        if (isStructural(slots[i3].name)) {
          rep = exValues[i3] || STRUCTURAL_DEFAULTS[Object.keys(STRUCTURAL_DEFAULTS).find(function (k) { return slots[i3].name.indexOf(k) !== -1; })] || '';
        } else if (!firstContentDone) {
          rep = topicShort;
          firstContentDone = true;
        } else {
          rep = exValues[i3] || '踩了坑';
        }
        result = result.replace(slots[i3].full, rep);
      }
    }

    // 清理多余空格：合并连续空格，去掉标点前空格，去掉中文间空格
    result = result.replace(/\s+/g, ' ')
      .replace(/\s+([，。？！、])/g, '$1')
      .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')
      .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')
      .trim();
    return result;
  }

  function matchTitleFormulas(topic, industry) {
    var t = (topic || '').trim();
    var ind = (industry || '').trim();

    // 1. 匹配类别
    var matchedCats = [];
    CATEGORY_PRIORITY.forEach(function (p) {
      var hit = p.keys.some(function (k) { return t.indexOf(k) !== -1; });
      if (hit) p.cats.forEach(function (c) { if (matchedCats.indexOf(c) === -1) matchedCats.push(c); });
    });
    if (matchedCats.length === 0) {
      matchedCats = ['认知冲突', '数字锚定', '结果承诺'];
    }
    // 至少覆盖 3 种
    var fallbackCats = ['身份代入', '社会证明', '场景/条件', '好奇缺口', '恐惧/损失', '争议/挑衅'];
    for (var fi = 0; fi < fallbackCats.length && matchedCats.length < 3; fi++) {
      if (matchedCats.indexOf(fallbackCats[fi]) === -1) matchedCats.push(fallbackCats[fi]);
    }

    // 2. 选取行业案例
    // 行业同义词映射：下拉框选中的行业 → 数据中可能存在的别名/变体
    // 覆盖 42 个标准行业 + 用户提供的所有变体名
    var INDUSTRY_ALIASES = {
      // 美容美妆类
      '美妆': ['美容', '彩妆', '护肤', '化妆', '美白', '素颜', '防晒', '面膜', '化妆品'],
      '美容': ['美妆', '彩妆', '护肤', '皮肤'],
      '彩妆': ['美妆', '美容', '化妆', '眼妆', '妆容'],
      '护肤': ['美妆', '美容', '美白', '素颜', '防晒', '面膜'],
      // 健康健身类
      '健康': ['健身', '运动', '养生', '身体', '亚健康'],
      '健身': ['减脂塑形', '运动', '健康', '减肥'],
      '减脂塑形': ['健身', '减肥', '运动', '体脂'],
      '减肥': ['健身', '减脂塑形', '运动', '健康'],
      // 医疗类
      '医疗': ['体检', '医生', '医院', '看病', '健康'],
      // 宠物类
      '宠物': ['萌宠', '猫咪', '狗狗', '铲屎官', '养猫', '养狗'],
      '萌宠': ['宠物', '猫咪', '狗狗', '铲屎官'],
      // 母婴类
      '母婴': ['宝妈', '育儿', '带娃', '宝宝', '辅食', '母婴辅食'],
      '母婴辅食': ['母婴', '宝妈', '宝宝', '辅食', '育儿'],
      '萌娃/亲子': ['亲子', '育儿', '宝妈', '带娃', '孩子', '亲子关系'],
      '亲子': ['萌娃/亲子', '育儿', '宝妈', '带娃', '孩子'],
      // 数码类
      '数码': ['数码3C', '手机', '电子产品', '数码产品'],
      '数码3C': ['数码', '手机', '电子产品', '数码产品'],
      // 户外类
      '户外露营': ['户外', '运动露营', '露营', '露营装备'],
      '户外': ['户外露营', '运动露营', '露营'],
      '运动露营': ['户外露营', '户外', '露营'],
      // 潮玩类
      '潮玩收藏': ['收藏潮玩', '潮玩', '盲盒', '手办', '收藏'],
      '收藏潮玩': ['潮玩收藏', '潮玩', '盲盒', '手办', '收藏'],
      // 金融类
      '金融理财': ['理财', '投资', '基金', '存钱', '股票', '财经'],
      '理财': ['金融理财', '投资', '基金', '存钱', '股票', '财经'],
      // 玄学类
      '玄学命理': ['玄学塔罗', '算命', '塔罗', '占卜', '运势', '星座'],
      '玄学塔罗': ['玄学命理', '算命', '塔罗', '占卜', '运势', '星座'],
      // 剧本杀类
      '剧本杀/桌游': ['剧本杀桌游', '剧本杀', '桌游', 'DM', '推理'],
      '剧本杀桌游': ['剧本杀/桌游', '剧本杀', '桌游', 'DM', '推理'],
      // 阅读类
      '阅读': ['书籍阅读', '读书', '书评', '读书博主'],
      '书籍阅读': ['阅读', '读书', '书评', '读书博主'],
      // 自媒体类
      '自媒体': ['涨粉', '小红书', '做号', '运营', '内容创作'],
      '小红书': ['自媒体', '涨粉', '运营'],
      '涨粉': ['自媒体', '小红书', '运营'],
      // 职场类
      '职场': ['面试', '入职', '职业', '工作', '跳槽', '简历'],
      // 教育类
      '教育': ['学习', '考试', '培训', '育儿', '成绩'],
      '学习': ['教育', '阅读', '考试', '培训'],
      // 法律类
      '法律': ['律师', '法律咨询', '合同', '维权', '官司', '普法', '法律知识', '法律风险'],
      '律师': ['法律', '合同', '维权', '官司', '普法'],
      // 其他
      '美食': ['做饭', '烹饪', '菜谱', '厨房', '探店'],
      '探店': ['美食', '店铺', '餐厅', '打卡'],
      '本地生活': ['探店', '美食', '城市探索', '同城'],
      '穿搭': ['时尚', '搭配', '服装', '穿衣', '造型'],
      '汽车': ['买车', '用车', '驾照', '车险'],
      '装修': ['家装', '设计', '建材', '施工'],
      '家电': ['电器', '智能家居', '家电选购'],
      '旅游': ['旅行', '攻略', '自由行', '民宿'],
      '摄影': ['拍照', '相机', '修图', '构图'],
      '园艺绿植': ['养花', '植物', '盆栽', '多肉'],
      '家居收纳': ['整理', '收纳', '断舍离', '家居'],
      '手工DIY': ['手工', 'DIY', '手作', '创意'],
      '二手闲置': ['闲鱼', '二手', '转让', '回收'],
      '知识付费': ['买课', '课程', '在线教育', '学习'],
      '音乐': ['乐器', '钢琴', '吉他', '唱歌'],
      '舞蹈': ['学舞蹈', '跳舞', '编舞', '形体'],
      '游戏电竞': ['游戏', '电竞', '手游', '主机'],
      '婚嫁': ['备婚', '婚礼', '婚纱', '结婚']
    };

    function pickExample(f) {
      if (ind) {
        // 精确匹配
        if (f.examples[ind]) return { text: f.examples[ind], exact: true, alias: false };
        // 模糊匹配：key 包含 industry 或 industry 包含 key
        var keys = Object.keys(f.examples);
        for (var i = 0; i < keys.length; i++) {
          if (keys[i].indexOf(ind) !== -1 || ind.indexOf(keys[i]) !== -1) {
            return { text: f.examples[keys[i]], exact: false, alias: false };
          }
        }
        // 同义词匹配：用行业别名扩展搜索范围
        var aliases = INDUSTRY_ALIASES[ind] || [];
        for (var a = 0; a < aliases.length; a++) {
          for (var j = 0; j < keys.length; j++) {
            if (keys[j] === aliases[a]) {
              return { text: f.examples[keys[j]], exact: false, alias: true };
            }
          }
        }
      }
      return { text: f.example, exact: false, alias: false };
    }

    // 3. 打分
    var scored = D.titleFormulas.map(function (f) {
      var score = 0;
      var catMatch = matchedCats.indexOf(f.category) !== -1;
      if (catMatch) score += 10;
      var ex = pickExample(f);
      if (ex.exact) score += 6;
      score += Math.random() * 0.9;
      return { f: f, score: score, catMatch: catMatch, ex: ex };
    });

    // 4. 选 7 个，保证类别多样性（至少 3 类）
    var selected = [];
    var usedCats = {};

    // 先从每个匹配类别各取最高分
    matchedCats.forEach(function (cat) {
      if (selected.length >= 7) return;
      var best = null;
      scored.forEach(function (s) {
        if (s.f.category === cat && !usedCats[s.f.id]) {
          if (!best || s.score > best.score) best = s;
        }
      });
      if (best) {
        selected.push(best);
        usedCats[best.f.id] = true;
      }
    });

    // 补齐到 7 个，从总排序里取
    scored.sort(function (a, b) { return b.score - a.score; });
    for (var i = 0; i < scored.length && selected.length < 7; i++) {
      if (!usedCats[scored[i].f.id]) {
        selected.push(scored[i]);
        usedCats[scored[i].f.id] = true;
      }
    }

    // 确保至少 3 类
    var cats = {};
    selected.forEach(function (s) { cats[s.f.category] = (cats[s.f.category] || 0) + 1; });
    if (Object.keys(cats).length < 3) {
      // 用其它类别的公式替换重复类的多余项
      var distinctNeeded = 3 - Object.keys(cats).length;
      for (var j = 0; j < D.titleFormulas.length && distinctNeeded > 0; j++) {
        var f = D.titleFormulas[j];
        if (!usedCats[f.id] && !cats[f.category]) {
          var ex = pickExample(f);
          selected.push({ f: f, score: 0, catMatch: false, ex: ex });
          usedCats[f.id] = true;
          cats[f.category] = 1;
          distinctNeeded--;
        }
      }
      selected = selected.slice(0, 7);
    }

    // 5. 构造结果
    return selected.map(function (s) {
      var reason;
      if (s.catMatch && s.ex.exact) {
        reason = '话题倾向「' + s.f.category + '」型，且匹配' + escapeHtml(ind) + '行业案例';
      } else if (s.catMatch && s.ex.alias) {
        reason = '话题倾向「' + s.f.category + '」型，已匹配' + escapeHtml(ind) + '相邻领域示例';
      } else if (s.catMatch) {
        reason = '话题倾向「' + s.f.category + '」型' + (ind ? '，用通用爆款代入' + escapeHtml(ind) + '即可' : '');
      } else if (s.ex.exact) {
        reason = '匹配' + escapeHtml(ind) + '行业案例';
      } else {
        reason = '通用爆款，把你的话题代入模板';
      }

      // 用用户话题 + 模板生成标题（不再直接返回行业示例）
      var generatedTitle = generateTitleFromTemplate(s.f.template, s.ex.text, t);

      return {
        id: s.f.id,
        category: s.f.category,
        template: s.f.template,
        titleText: generatedTitle,
        industryRef: s.ex.text,
        reason: reason
      };
    });
  }

  function runTool1() {
    var topic = $('t1_topic').value;
    var industry = $('t1_industry').value;
    var result = $('t1_result');
    if (!topic.trim()) {
      result.innerHTML = '<div class="empty-state">请输入话题</div>';
      return;
    }
    var matches = matchTitleFormulas(topic, industry);

    // 排序：类别匹配优先 → 按原 id
    var html = '<div class="result-summary">' +
      '话题「<strong>' + escapeHtml(topic) + '</strong>」' + (industry ? ' / 行业「<strong>' + escapeHtml(industry) + '</strong>」' : '') +
      '，共匹配 <strong>' + matches.length + '</strong> 个公式，覆盖 <strong>' +
      countCats(matches) + '</strong> 种类型。</div>';

    matches.forEach(function (m, i) {
      html +=
        '<div class="result-card rank-' + (i + 1) + '">' +
        '<div class="rc-head">' +
        '<div class="rc-title">' + escapeHtml(m.titleText) + '</div>' +
        '<button class="copy-btn" data-copy="' + escapeAttr(m.titleText) + '">复制</button>' +
        '</div>' +
        '<div class="rc-meta">公式 #' + m.id + ' · ' + escapeHtml(m.category) + '</div>' +
        '<div class="rc-desc">' + escapeHtml(m.reason) + '</div>' +
        (m.industryRef ? '<div class="rc-quote">行业参考：' + escapeHtml(m.industryRef) + '</div>' : '') +
        '<div class="rc-quote">原始模板：' + escapeHtml(m.template) + '</div>' +
        '</div>';
    });

    // Top 3
    html += '<div class="top3-banner">— TOP 3 推荐 —</div>';
    matches.slice(0, 3).forEach(function (m, i) {
      html +=
        '<div class="result-card rank-' + (i + 1) + '">' +
        '<div class="rc-head">' +
        '<div class="rc-title"><span class="rank-badge r' + (i + 1) + '">' + (i + 1) + '</span>' + escapeHtml(m.titleText) + '</div>' +
        '<button class="copy-btn" data-copy="' + escapeAttr(m.titleText) + '">复制</button>' +
        '</div>' +
        '<div class="rc-meta">公式 #' + m.id + ' · ' + escapeHtml(m.category) + '</div>' +
        (m.industryRef ? '<div class="rc-quote">行业参考：' + escapeHtml(m.industryRef) + '</div>' : '') +
        '</div>';
    });

    result.innerHTML = html;
  }

  function countCats(matches) {
    var c = {};
    matches.forEach(function (m) { c[m.category] = 1; });
    return Object.keys(c).length;
  }
  function escapeAttr(s) {
    // 转义 & < > " ' ，写入属性后浏览器会自动解码，读取时直接得到原值
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ===========================================================================
  // 工具 2：AI 写作检测器
  // ===========================================================================

  // 检测器注册表：返回命中数组 [{index, snippet, detail}]
  var DETECTORS = {
    // 1 堵住所有反驳
    1: function (t) {
      var pats = ['当然', '不可否认', '诚然', '有人可能说', '有人可能会说', '或许有人会说', '你可能会说', '有人会质疑', '也许有人会说', '你也许会说'];
      return collectKeywords(t, pats, 2, '预先堵住反驳：' );
    },
    // 2 知识全部输出
    2: function (t) {
      var pats = ['数据表明', '数据显示', '研究表明', '据统计', '根据研究', '研究表明', '科学证明'];
      var k1 = collectKeywords(t, pats, 1, '堆砌研究/数据佐证');
      // 数字密度
      var nums = countRegex(t, /[\d]+\s*(%|％|万|亿|倍|倍率|个百分点|kg|次|个)/g);
      var hits = k1.slice();
      if (nums >= 3) {
        var m = /[\d]+\s*(%|％|万|亿|倍)/.exec(t);
        if (m) hits.push({ index: m.index, snippet: getCtx(t, m.index, m[0].length), detail: '术语/数据密度过高（' + nums + ' 处量化），信息过载' });
      }
      return hits;
    },
    // 3 匀速排比
    3: function (t) {
      var hits = [];
      var sentences = t.split(/[。！？\n]/);
      for (var i = 0; i < sentences.length; i++) {
        var seg = sentences[i];
        if (!seg || seg.length < 8) continue;
        var clauses = seg.split(/[，,、；;]/).filter(function (c) { return c.trim().length >= 3; });
        if (clauses.length >= 4) {
          var lens = clauses.map(function (c) { return c.trim().length; });
          var med = lens.slice().sort(function (a, b) { return a - b; })[Math.floor(lens.length / 2)];
          var within = lens.filter(function (l) { return Math.abs(l - med) <= 3; }).length;
          if (within / lens.length >= 0.8) {
            var idx = t.indexOf(seg);
            if (idx !== -1) hits.push({ index: idx, snippet: getCtx(t, idx, seg.length), detail: '连续 ' + clauses.length + ' 个长度接近的排比短句，节奏机械' });
            break;
          }
        }
      }
      return hits;
    },
    // 4 同一个让步模板反复用
    4: function (t) {
      var re = /(虽然|固然|诚然)[^，。！？\n]{0,30}?(，)?(但是|可是|却|然而|但|不过)/g;
      return collectRegex(t, re, 3, '反复使用「虽然…但是…」让步结构');
    },
    // 5 给概念起名字的仪式
    5: function (t) {
      var pats = ['我把它叫做', '我把它叫作', '称之为', '我称之为', '命名为', '这就是所谓的', '我称为', '我把', '叫做'];
      return collectKeywords(t, pats, 2, '给概念起名字制造记忆点');
    },
    // 6 情绪曲线太光滑
    6: function (t) {
      if (t.length < 80) return [];
      var hasQ = /[？?]/.test(t);
      var hasEllipsis = /[…﹉\.\.\.——]/.test(t);
      var hasShort = false;
      var sents = t.split(/[。！？\n]/);
      for (var i = 0; i < sents.length; i++) {
        var s = sents[i].trim();
        if (s.length > 0 && s.length <= 4) { hasShort = true; break; }
      }
      if (!hasQ && !hasEllipsis && !hasShort) {
        return [{ index: 0, snippet: getCtx(t, 0, 60), detail: '通篇无卡顿、无疑问、无短句，情绪曲线过于光滑' }];
      }
      return [];
    },
    // 7 替读者说一句蠢话然后纠正
    7: function (t) {
      var pats = ['有人会说', '你可能会说', '也许你会问', '你也许觉得', '有人说', '你可能会想', '或许有人会问', '你也许会说', '你也许会问'];
      return collectKeywords(t, pats, 1, '替读者立一个靶子再反驳（prolepsis）');
    },
    // 8 不是X是Y 高密度
    8: function (t) {
      var hits = [];
      var re = /不是/g;
      var m;
      while ((m = re.exec(t)) !== null) {
        var start = m.index;
        var win = t.slice(start, start + 50);
        var br = win.search(/[。！？\n]/);
        var seg = br === -1 ? win : win.slice(0, br);
        var after = seg.slice(2);
        var isIdx = after.search(/(而是|，?是)/);
        if (isIdx !== -1 && after.slice(0, isIdx).length >= 1 && after.slice(0, isIdx).length <= 30) {
          hits.push({ index: start, snippet: getCtx(t, start, seg.length), detail: '「不是…是…」翻转结构' });
        }
        if (m.index === re.lastIndex) re.lastIndex++;
      }
      return hits.length >= 3 ? hits : [];
    },
    // 9 没有任何犹豫
    9: function (t) {
      if (t.length < 80) return [];
      var hedge = ['也许', '可能', '大概', '我不确定', '说实话我也', '说不准', '未必', '或许', '我其实也不太', '我也没完全'];
      var count = 0;
      hedge.forEach(function (h) { var c = 0; var idx = t.indexOf(h); while (idx !== -1) { c++; idx = t.indexOf(h, idx + 1); } count += c; });
      if (count === 0) {
        return [{ index: 0, snippet: getCtx(t, 0, 60), detail: '通篇确定无疑，没有任何一处作者自己也没想通的犹豫' }];
      }
      return [];
    },
    // 10 精确到不真实的情绪细节
    10: function (t) {
      var re = /(\d+\.\d+)\s*(秒|倍|分钟|小时)|精确到|毫秒|微秒/g;
      return collectRegex(t, re, 1, '用编造的精确小数增加画面感（如 1.7 秒）');
    },
    // 11 脆弱感服务于论点
    11: function (t) {
      var re = /(我曾经|我也曾|我那时候|我也经历过)[^。！？\n]{0,40}?(所以|因此|后来|这就是|这让我)/g;
      return collectRegex(t, re, 1, '个人脆弱经历精准服务于论点');
    },
    // 12 把结论包装成协议
    12: function (t) {
      var pats = ['总结一下', '总结起来', '最后给你', '给你三个', '给你一个清单', '划重点', '核心就三句话', '记住这三点', '最后说三点', '一句话总结', '总而言之', '综上所述', '总的来说'];
      var hits = [];
      var tailStart = Math.floor(t.length * 0.65);
      var tail = t.slice(tailStart);
      pats.forEach(function (p) {
        var idx = tail.indexOf(p);
        if (idx !== -1) hits.push({ index: tailStart + idx, snippet: getCtx(t, tailStart + idx, p.length), detail: '结尾把结论包装成可带走的「协议/清单」' });
      });
      return hits.length >= 1 ? hits : [];
    },
    // 13 每个段落都有收束金句（短视频文稿不判定）
    13: function (t) {
      var paras = t.split(/\n+/).filter(function (p) { return p.trim().length > 0; });
      if (paras.length < 3) return [];
      var goldCount = 0;
      var lastGoldIdx = -1;
      paras.forEach(function (p, i) {
        var lastSent = p.split(/[。！？]/).filter(function (s) { return s.trim(); }).pop();
        if (lastSent && lastSent.trim().length > 0 && lastSent.trim().length <= 24 && /[。！？]$/.test(p.trim())) {
          goldCount++;
          lastGoldIdx = i;
        }
      });
      if (goldCount >= 3) {
        var idx = t.indexOf(paras[lastGoldIdx]);
        return [{ index: idx, snippet: getCtx(t, idx, paras[lastGoldIdx].length), detail: '每段都收束成金句（' + goldCount + ' 段），段段金句稀释记忆点' }];
      }
      return [];
    },
    // 14 句子节奏过于均匀（推文不判定）
    14: function (t) {
      var sents = t.split(/[。！？\n]/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length >= 4; });
      if (sents.length < 5) return [];
      var lens = sents.map(function (s) { return s.length; });
      var med = lens.slice().sort(function (a, b) { return a - b; })[Math.floor(lens.length / 2)];
      var within = lens.filter(function (l) { return Math.abs(l - med) <= 6; }).length;
      if (within / lens.length >= 0.75) {
        return [{ index: 0, snippet: getCtx(t, 0, 50), detail: '句子长度方差小（' + within + '/' + lens.length + ' 句集中在 ' + med + ' 字左右），节奏过于均匀' }];
      }
      return [];
    },
    // 15 用身体感受替代论证
    15: function (t) {
      var pats = ['身体知道答案', '身体会告诉你', '你的身体', '心里知道', '直觉告诉你', '你的直觉', '骨子里', '身体不会骗你', '身体比大脑'];
      return collectKeywords(t, pats, 1, '逻辑走不通时用「身体知道答案」收束');
    },
    // 16 钩子三件套
    16: function (t) {
      var head = t.slice(0, 80);
      var pain = ['焦虑', '害怕', '担心', '问题', '烦恼', '痛苦', '痛点', '总是', '为什么', '别再', '还在', '是不是', '有没有', '一直', '每次'];
      var promise = ['教你', '帮你', '让你', '就能', '带你', '告诉你', '给你', '学会', '解决', '搞定'];
      var hasPain = pain.some(function (p) { return head.indexOf(p) !== -1; });
      var hasPromise = promise.some(function (p) { return head.indexOf(p) !== -1; });
      if (hasPain && hasPromise) {
        return [{ index: 0, snippet: getCtx(t, 0, 80), detail: '开头「钩子+痛点+承诺」三件套，前三句在卖焦虑' }];
      }
      return [];
    },
    // 17 连接词过度使用
    17: function (t) {
      var pats = ['然而', '事实上', '值得注意的是', '此外', '因此', '不仅如此', '总而言之', '综上所述', '换句话说', '与此同时', '另外', '另一方面', '首先', '其次', '最后', '第一', '第二', '第三', '与此同时'];
      var hits = [];
      pats.forEach(function (p) {
        var idx = t.indexOf(p);
        while (idx !== -1) {
          hits.push({ index: idx, snippet: getCtx(t, idx, p.length), detail: '连接词「' + p + '」' });
          idx = t.indexOf(p, idx + 1);
        }
      });
      hits.sort(function (a, b) { return a.index - b.index; });
      return hits.length >= 3 ? hits.slice(0, 8) : [];
    },
    // 18 同义词刻意替换
    18: function (t) {
      var pats = ['换句话说', '也就是说', '换言之', '换种说法'];
      return collectKeywords(t, pats, 2, '同义词刻意替换/换说法重复说明');
    },
    // 19 中文翻译腔
    19: function (t) {
      var re = /(进行了|进行一次|进行分析|进行研究|进行优化|进行讨论|进行评估|进行总结)|(作为[一]?[个]?[A-Za-z\u4e00-\u9fa5]{1,8})|(基于此|基于以上|基于上述)|(关于[这该本])|(在当今|在如今|在当前|在这个时代)|(随着[^\n。！？]{1,15}的(发展|进步|普及|到来|推进))/g;
      var hits = collectRegex(t, re, 1, '翻译腔表达');
      // 单独的 进行 计数
      var jc = countRegex(t, /进行(了|一)?/g);
      if (jc >= 3 && hits.length === 0) {
        var m = /进行(了|一)?/.exec(t);
        if (m) hits.push({ index: m.index, snippet: getCtx(t, m.index, m[0].length), detail: '「进行」类翻译腔高频（' + jc + ' 处）' });
      }
      return hits.slice(0, 6);
    },
    // 20 虚假的讲个故事
    20: function (t) {
      var pats = ['我有个朋友', '我有一个朋友', '我朋友', '我的一个朋友', '我身边有个朋友', '我以前有个朋友'];
      var hits = [];
      pats.forEach(function (p) {
        var idx = t.indexOf(p);
        if (idx !== -1) hits.push({ index: idx, snippet: getCtx(t, idx, p.length + 20), detail: '编造「我有个朋友」的故事，缺乏真实细节' });
      });
      return hits;
    },
    // 21 结尾你值得式祝福
    21: function (t) {
      var tail = t.slice(Math.max(0, t.length - 100));
      var pats = ['你值得', '你配', '加油', '你可以的', '你值得更好的', '愿你', '祝你', '共勉', '希望你也能', '你一定会'];
      var hits = [];
      pats.forEach(function (p) {
        var idx = tail.indexOf(p);
        if (idx !== -1) hits.push({ index: t.length - 100 + idx, snippet: getCtx(t, t.length - 100 + idx, p.length), detail: '结尾「' + p + '」式温暖祝福收束' });
      });
      return hits;
    },
    // 22 对深刻的过拟合
    22: function (t) {
      var pats = ['本质上', '归根结底', '说到底', '底层逻辑', '说穿了', '究其根本', '最终', '说到底'];
      return collectKeywords(t, pats, 2, '把实操问题升维到哲学层面');
    }
  };

  function collectKeywords(t, pats, minCount, detailPrefix) {
    var hits = [];
    pats.forEach(function (p) {
      var idx = t.indexOf(p);
      while (idx !== -1) {
        hits.push({ index: idx, snippet: getCtx(t, idx, p.length), detail: detailPrefix + '「' + p + '」' });
        idx = t.indexOf(p, idx + p.length);
      }
    });
    hits.sort(function (a, b) { return a.index - b.index; });
    return hits.length >= minCount ? hits : [];
  }

  function collectRegex(t, re, minCount, detail) {
    var hits = [];
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(t)) !== null) {
      hits.push({ index: m.index, snippet: getCtx(t, m.index, m[0].length), detail: detail });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return hits.length >= minCount ? hits : [];
  }

  function countRegex(t, re) {
    var c = 0; var m;
    re.lastIndex = 0;
    while ((m = re.exec(t)) !== null) { c++; if (m.index === re.lastIndex) re.lastIndex++; }
    return c;
  }

  // -------------------------------------------------------------------------
  // 优化版本生成：基于检测到的 AI 特征，规则替换生成去 AI 味的重写
  // -------------------------------------------------------------------------
  function generateOptimizedText(text, byFeature) {
    var opt = text;
    var changes = [];

    // 辅助：执行替换并记录
    function doReplace(pattern, replacement, reason) {
      var matched = false;
      opt = opt.replace(pattern, function (m) {
        matched = true;
        changes.push({ original: m, replacement: replacement, reason: reason });
        return replacement;
      });
    }

    // 1. "首先" → 删除（直接说事更利落）
    doReplace(/首先[，,]?/g, '', '"首先"是 AI 最爱的枚举过渡词，删掉后直接说事更利落');

    // 2. "其次" → "另外" 或删除
    doReplace(/其次[，,]?/g, '另外，', '"其次"太机械，换成"另外"更口语化');

    // 3. "总而言之" / "综上所述" / "总的来说" → 删除
    doReplace(/(总而言之|综上所述|总的来说)[，,]?/g, '', 'AI 总结模板词，删掉后直接说结论更有力');

    // 4. "在当今...时代" → 替换为更具体的开头
    doReplace(/在当今[^\n。！？，]{1,15}[，,]/g, '你有没有发现，', '"在当今…时代"是 AI 模板开头，换成具体提问更抓人');

    // 5. "在如今/在当前" → 删除
    doReplace(/(在如今|在当前)[，,]?/g, '', '空泛时间状语，删掉不损失信息');

    // 6. "随着...的发展/进步/普及" → 替换
    doReplace(/随着[^\n。！？，]{1,15}的(发展|进步|普及|到来|推进)[，,]?/g, '', '"随着…的发展"是 AI 套话开头，删掉直接进入正题');

    // 7. "深刻地" → 删除
    doReplace(/深刻地/g, '', '"深刻地"是空泛修饰词，删掉后动词更有力');

    // 8. "无疑" / "毫无疑问" → 删除
    doReplace(/(无疑|毫无疑问)[，,]?/g, '', '"无疑"是 AI 断言语气，删掉后更客观');

    // 9. "重要的里程碑" → 替换
    doReplace(/一个重要的里程碑/g, '一个转折点', '"重要的里程碑"是 AI 套话，"转折点"更简洁');

    // 10. "能够帮助我们" → "能帮你"
    doReplace(/能够帮助我们/g, '能帮你', '"能够帮助我们"翻译腔，"能帮你"更口语');

    // 11. "为用户提供" → "给你"
    doReplace(/为用户提供/g, '给你', '"为用户提供"翻译腔，"给你"更直接');

    // 12. "将继续影响我们的未来" → 替换
    doReplace(/将继续影响我们的未来/g, '才刚刚开始', 'AI 式空泛结尾，换成"才刚刚开始"留悬念');

    // 13. "正在...着我们的" → 简化（需保留捕获组，不能用 doReplace）
    (function () {
      var re = /正在([^\n。！？]{2,8})着我们的/g;
      var m2;
      while ((m2 = re.exec(opt)) !== null) {
        var rep = '正在' + m2[1] + '我们的';
        changes.push({ original: m2[0], replacement: rep, reason: '去掉"着"字更简洁' });
        opt = opt.replace(m2[0], rep);
        if (m2.index === re.lastIndex) re.lastIndex++;
      }
    })();

    // 14. "它将继续" → 删除
    doReplace(/它将继续/g, '会继续', '代词"它"加"将继续"翻译腔，简化为"会继续"');

    // 15. 连续句号间的空行清理
    opt = opt.replace(/\n{3,}/g, '\n\n');

    // 16. 句首多余空格清理
    opt = opt.replace(/[，,]\s+/g, '，');

    return { text: opt.trim(), changes: changes };
  }

  function runTool2() {
    var text = $('t2_text').value;
    var genre = $('t2_genre').value;
    var result = $('t2_result');
    if (!text.trim()) {
      result.innerHTML = '<div class="empty-state">请粘贴文案</div>';
      return;
    }

    var textLen = text.trim().length;
    var isShort = textLen < 80;

    var skipMap = {
      short_video: [13],
      tweet: [14]
    };
    var skip = skipMap[genre] || [];

    var allHits = [];
    D.aiFeatures.forEach(function (f) {
      if (skip.indexOf(f.id) !== -1) return;
      var detector = DETECTORS[f.id];
      if (!detector) return;
      var hits = detector(text) || [];
      hits.forEach(function (h) {
        allHits.push({
          index: h.index,
          snippet: h.snippet,
          detail: h.detail,
          feature: f
        });
      });
    });

    allHits.sort(function (a, b) { return a.index - b.index; });

    // 统计严重度
    var red = 0, warn = 0, tip = 0;
    var countedFeatures = {};
    allHits.forEach(function (h) {
      // 同一特征按命中次数计
    });
    // 按特征统计命中处数
    var byFeature = {};
    allHits.forEach(function (h) {
      var k = h.feature.id;
      byFeature[k] = byFeature[k] || { feature: h.feature, count: 0, hits: [] };
      byFeature[k].count++;
      byFeature[k].hits.push(h);
    });
    Object.keys(byFeature).forEach(function (k) {
      var sev = byFeature[k].feature.severity;
      if (severityCode(sev) === 'red') red += byFeature[k].count;
      else if (severityCode(sev) === 'warn') warn += byFeature[k].count;
      else tip += byFeature[k].count;
    });

    var featureCount = Object.keys(byFeature).length;

    var html = '';
    // 严重度统计
    html += '<div class="sev-stat">' +
      '<div class="stat-box red"><div class="stat-num">' + red + '</div><div class="stat-label">🔴 强信号</div></div>' +
      '<div class="stat-box warn"><div class="stat-num">' + warn + '</div><div class="stat-label">⚠️ 中信号</div></div>' +
      '<div class="stat-box tip"><div class="stat-num">' + tip + '</div><div class="stat-label">💡 弱信号</div></div>' +
      '</div>';

    var genreName = { short_video: '短视频文稿', article: '公众号长文', tweet: '推文', academic: '学术' }[genre];
    html += '<div class="result-summary">体裁：<strong>' + genreName + '</strong>，共命中 <strong>' + featureCount + '</strong> 条特征，<strong>' + allHits.length + '</strong> 处痕迹。' +
      (skip.length ? '（已按体裁跳过特征 ' + skip.join('、') + '）' : '') + '</div>';

    if (allHits.length === 0) {
      if (isShort) {
        html += '<div class="result-card sev-warn" style="border-left-color: var(--accent);">' +
          '<div class="rc-head"><div class="rc-title">文案过短，无法有效检测</div></div>' +
          '<div class="rc-desc">当前文案仅 <strong>' + textLen + '</strong> 字，部分检测特征需要至少 <strong>80 字</strong>才能生效。</div>' +
          '<div class="opt-tips-label">建议</div>' +
          '<div class="opt-tip-item">' +
          '<div class="opt-tip-text">请粘贴更完整的文案（建议 80 字以上），系统会检测 AI 套话、连接词、排比句式、情绪曲线等特征。</div>' +
          '</div>' +
          '</div>';
      } else {
        html += '<div class="empty-state">未检测到明显 AI 写作特征。<br>注意：本检测为规则启发式，仅供参考。</div>';
      }
    } else {
      allHits.forEach(function (h, i) {
        var sc = severityCode(h.feature.severity);
        html +=
          '<div class="result-card sev-' + sc + '">' +
          '<div class="rc-head">' +
          '<div class="rc-title">' + h.feature.severity + ' 特征' + h.feature.id + ' · ' + escapeHtml(h.feature.name) + '</div>' +
          '</div>' +
          '<div class="hit-snippet">' + escapeHtml(h.snippet) + '</div>' +
          '<div class="rc-desc">' + escapeHtml(h.detail) + '</div>' +
          '<div class="rc-foot"><span class="severity-tag ' + sc + '">' + sevLabel(sc) + '</span>' +
          '<span class="rc-meta">#' + (i + 1) + '</span></div>' +
          '</div>';
      });
      html += '<div class="action-suggestion"><div class="as-label">检测说明</div><div class="as-text">这是规则启发式检测，🔴 强信号建议优先处理，⚠️ 中信号结合上下文判断，💡 弱信号通常可忽略。最有效的方法是删掉一半，用你嘴上会说的词重写。</div></div>';
    }

    // ---- 优化版本 ----
    var optimization = generateOptimizedText(text, byFeature);
    if (optimization.changes.length > 0) {
      html += '<div class="top3-banner">— 优化版本 —</div>';
      html += '<div class="result-card rank-1" style="border-left-color: var(--accent);">' +
        '<div class="rc-head">' +
        '<div class="rc-title">去 AI 味重写</div>' +
        '<button class="copy-btn" data-copy="' + escapeAttr(optimization.text) + '">复制全文</button>' +
        '</div>' +
        '<div class="hit-snippet" style="background: var(--bg-soft); border-radius: 12px; padding: 14px; line-height: 1.8; font-size: 14px;">' + escapeHtml(optimization.text) + '</div>' +
        '</div>';

      html += '<div class="result-card"><div class="rc-title">优化说明（' + optimization.changes.length + ' 处修改）</div>';
      optimization.changes.forEach(function (c, i) {
        var repDisplay = c.replacement ? '<span style="color: var(--accent); font-weight: 600;">→ ' + escapeHtml(c.replacement) + '</span>' : '<span style="color: var(--bad); font-weight: 600;">→ 已删除</span>';
        html +=
          '<div class="diag-item">' +
          '<span class="diag-icon ' + (c.replacement ? 'ok' : 'bad') + '">' + (c.replacement ? '✎' : '✗') + '</span>' +
          '<span><span style="color: var(--text); font-weight: 500;">' + escapeHtml(c.original) + '</span> ' + repDisplay +
          '<br><span style="color: var(--text-3); font-size: 12px;">' + escapeHtml(c.reason) + '</span></span>' +
          '</div>';
      });
      html += '</div>';
    }

    result.innerHTML = html;
  }

  function severityCode(sev) {
    if (sev.indexOf('🔴') !== -1) return 'red';
    if (sev.indexOf('⚠️') !== -1) return 'warn';
    return 'tip';
  }
  function sevLabel(sc) {
    return sc === 'red' ? '🔴 强信号' : (sc === 'warn' ? '⚠️ 中信号' : '💡 弱信号');
  }

  // ===========================================================================
  // 工具 3：内容五维自检 — 学习型 + 检测型
  // ===========================================================================

  // ===========================================================================
  // 内容分析引擎 — 读取用户实际文本，返回每项检测的真实结果
  // 核心原则：不同内容 → 不同检测结果 → 不同建议
  // ===========================================================================
  function analyzeContent3(topic, content) {
    var text = (content || '').trim();
    var topicT = (topic || '').trim();
    var hasText = text.length > 0;
    var analysis = {}; // dimId -> { checks: [{ passed, evidence, suggestion }] }

    // ===== 维度1: 文字洁癖 =====
    analysis[1] = { checks: [] };

    if (hasText) {
      // --- Check 1: AI 味检测 ---
      var aiBuzz = ['赋能', '闭环', '底层逻辑', '抓手', '打法', '赛道', '心智', '认知升级', '信息茧房', '飞轮', '护城河', '破圈', '链路', '沉淀', '复用', '体系化', '方法论', '矩阵', '触达', '降本增效'];
      var aiConn = ['首先', '其次', '最后', '总而言之', '综上所述', '在当今', '时代', '众所周知', '不可否认', '值得注意的是'];
      var foundBuzz = aiBuzz.filter(function (w) { return text.indexOf(w) !== -1; });
      var foundConn = aiConn.filter(function (w) { return text.indexOf(w) !== -1; });
      var emojiRe = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
      var emojiCount = (text.match(emojiRe) || []).length;
      var clauses = text.split(/[，；。！？\n]/).filter(function (s) { return s.trim().length >= 4 && s.trim().length <= 15; });
      var hasParallel = clauses.length >= 4;

      var aiScore = foundBuzz.length * 2 + foundConn.length + (emojiCount > 3 ? emojiCount : 0) + (hasParallel ? 2 : 0);
      var ev1, sg1;
      if (foundBuzz.length > 0) {
        ev1 = '检测到 AI 套话：「' + foundBuzz.slice(0, 4).join('」「') + '」';
        sg1 = '把「' + foundBuzz[0] + '」换成你嘴上会说的词——比如「闭环」→「跑通」，「底层逻辑」→「关键在哪」';
      } else if (foundConn.length > 0) {
        ev1 = '检测到 AI 连接词：「' + foundConn.slice(0, 3).join('」「') + '」';
        sg1 = '删掉「' + foundConn[0] + '」这类过渡词，直接说结论';
      } else if (emojiCount > 3) {
        ev1 = 'Emoji 堆叠：' + emojiCount + ' 个';
        sg1 = '删掉多余 Emoji，每段最多留 1 个';
      } else if (hasParallel) {
        ev1 = '检测到 ' + clauses.length + ' 个长度接近的短句排比';
        sg1 = '把排比打散，中间加一句 3-4 字的短句断节奏';
      } else {
        ev1 = '未检测到明显 AI 味';
        sg1 = '内容较干净，继续保持';
      }
      analysis[1].checks.push({ passed: aiScore === 0, evidence: ev1, suggestion: sg1 });

      // --- Check 2: 干货陷阱（术语堆砌） ---
      var jargonRe = /[a-zA-Z]{3,}/g;
      var jargonCount = (text.match(jargonRe) || []).length;
      var numDense = (text.match(/\d+/g) || []).length;
      var jargonRatio = text.length > 0 ? (jargonCount + numDense) / (text.length / 100) : 0;
      analysis[1].checks.push({
        passed: jargonRatio < 3,
        evidence: jargonRatio >= 3 ? '每 100 字有 ' + Math.round(jargonRatio) + ' 个术语/数字，密度过高' : '术语密度正常（' + Math.round(jargonRatio) + '/100 字）',
        suggestion: jargonRatio >= 3 ? '删掉一半术语和数据，只留 1 个你真正用来想事情的核心词' : '保持现状'
      });

      // --- Check 3: 公共可验证（抽象表述检测） ---
      var abstractWords = ['本质', '核心', '关键', '根本', '底层', '深层', '内在', '终极', '真正'];
      var foundAbstract = abstractWords.filter(function (w) { return text.indexOf(w) !== -1; });
      var hasConcrete = text.indexOf('我') !== -1 || /昨天|上周|去年|前年/.test(text) || /\d+(元|块|斤|天|小时|分钟|%)?/.test(text);
      analysis[1].checks.push({
        passed: foundAbstract.length <= 1 && hasConcrete,
        evidence: foundAbstract.length > 1 ? '检测到抽象词：「' + foundAbstract.slice(0, 3).join('」「') + '」' :
          !hasConcrete ? '未检测到具体案例、数据或个人经历' : '有具体表述，可验证',
        suggestion: foundAbstract.length > 1 ? '把「' + foundAbstract[0] + '」替换成一个具体例子或数据' :
          !hasConcrete ? '加一个你自己的经历或具体数字，让读者能验证' : '继续保持'
      });
    } else {
      analysis[1].checks.push({ passed: null, evidence: '未输入内容文本', suggestion: '粘贴你的内容文本，系统会自动检测 AI 味' });
      analysis[1].checks.push({ passed: null, evidence: '未输入内容文本', suggestion: '粘贴内容后自动检测术语密度' });
      analysis[1].checks.push({ passed: null, evidence: '未输入内容文本', suggestion: '粘贴内容后检测抽象表述' });
    }

    // ===== 维度2: 封面/标题 =====
    analysis[2] = { checks: [] };
    var topicHasNum = /\d/.test(topicT);
    var topicPain = ['为什么', '别', '千万别', '错误', '危险', '警告', '后悔', '亏', '坑', '避坑', '别做', '毁', '烂'];
    var topicCuriosity = ['秘密', '不会告诉', '想不到', '隐藏', '其实', '真相', '反而'];
    var topicEmotion = topicPain.concat(topicCuriosity);
    var foundEmotion = topicEmotion.filter(function (w) { return topicT.indexOf(w) !== -1; });
    var topicLen = topicT.length;

    analysis[2].checks.push({
      passed: foundEmotion.length > 0 || topicHasNum,
      evidence: topicLen === 0 ? '未输入选题' :
        foundEmotion.length > 0 ? '标题有情绪触发词：「' + foundEmotion[0] + '」' :
        topicHasNum ? '标题含数字，有锚定效果' : '标题平铺直叙，缺少情绪触发',
      suggestion: topicLen > 0 && foundEmotion.length === 0 && !topicHasNum ?
        '你的选题「' + topicT.slice(0, 12) + '」可以改成：为什么' + topicT.slice(0, 8) + '其实是错的' :
        '标题已有吸引力'
    });

    analysis[2].checks.push({
      passed: topicLen > 0 && topicLen <= 20,
      evidence: topicLen === 0 ? '未输入选题' :
        topicLen > 20 ? '选题 ' + topicLen + ' 字，作为封面文字偏长' : '选题长度 ' + topicLen + ' 字，适合封面排版',
      suggestion: topicLen > 20 ? '封面文字控制在 15 字以内，把长标题拆成主标题+副标题' : '保持现状'
    });

    analysis[2].checks.push({
      passed: foundEmotion.length > 0,
      evidence: foundEmotion.length > 0 ? '检测到情绪词：「' + foundEmotion.slice(0, 2).join('」「') + '」' :
        topicLen === 0 ? '未输入选题' : '标题偏信息传递，缺少情绪冲击',
      suggestion: topicLen > 0 && foundEmotion.length === 0 ?
        '在标题中加入「为什么」「千万别」「真相」等情绪触发词' : '情绪冲击足够'
    });

    // ===== 维度3: 表达效率 =====
    analysis[3] = { checks: [] };
    if (hasText) {
      var sents = text.split(/[。！？\n]/).filter(function (s) { return s.trim().length > 0; });
      var firstSent = sents.length > 0 ? sents[0].trim() : '';
      var pointMarkers = ['其实', '本质上', '核心是', '关键是', '重点是', '说白了', '秘诀', '真相', '方法', '因为', '所以'];
      var hasPointEarly = pointMarkers.some(function (p) { return firstSent.indexOf(p) !== -1; });

      analysis[3].checks.push({
        passed: firstSent.length > 0 && (firstSent.length <= 40 || hasPointEarly),
        evidence: firstSent.length > 40 && !hasPointEarly ?
          '首句 ' + firstSent.length + ' 字，过长且无观点标记' :
          hasPointEarly ? '首句有观点信号' : '首句长度适中（' + firstSent.length + ' 字）',
        suggestion: firstSent.length > 40 && !hasPointEarly ?
          '把核心观点提到第一句，首句控制在 40 字以内' : '保持现状'
      });

      var fillerWords = ['众所周知', '不可否认', '在当今', '随着', '首先', '其次', '最后', '总而言之', '综上所述', '毫无疑问', '值得注意的是'];
      var foundFiller = fillerWords.filter(function (w) { return text.indexOf(w) !== -1; });
      analysis[3].checks.push({
        passed: foundFiller.length <= 1,
        evidence: foundFiller.length > 1 ? '检测到 ' + foundFiller.length + ' 处套话铺垫：「' + foundFiller.slice(0, 3).join('」「') + '」' : '无过度套话包装',
        suggestion: foundFiller.length > 1 ? '删掉「' + foundFiller[0] + '」等套话，直接进入正题' : '保持现状'
      });

      var ctaWords = ['关注', '点赞', '收藏', '评论', '私信', '下单', '购买', '链接', '主页', '咨询', '领取', '获取', '留言', '转发'];
      var hasCTA = ctaWords.some(function (w) { return text.indexOf(w) !== -1; });
      analysis[3].checks.push({
        passed: hasCTA,
        evidence: hasCTA ? '检测到行动号召词' : '未检测到明确的行动号召',
        suggestion: !hasCTA ? '在结尾加一句明确的行动号召（关注/点赞/收藏/私信等），让读者知道下一步做什么' : '保持现状'
      });
    } else {
      analysis[3].checks.push({ passed: null, evidence: '未输入内容文本', suggestion: '粘贴内容后检测核心观点前置' });
      analysis[3].checks.push({ passed: null, evidence: '未输入内容文本', suggestion: '粘贴内容后检测过度包装' });
      analysis[3].checks.push({ passed: null, evidence: '未输入内容文本', suggestion: '粘贴内容后检测变现目标' });
    }

    // ===== 维度4: 认知落差 =====
    analysis[4] = { checks: [] };
    if (hasText) {
      var vagueWords = ['等等', '之类的', '诸如此类', '一些', '很多', '不少', '各种'];
      var foundVague = vagueWords.filter(function (w) { return text.indexOf(w) !== -1; });
      var specificSignals = ['第一步', '第二步', '具体来说', '举个例子', '比如', '我自己的经验', '我试过'];
      var foundSpecific = specificSignals.filter(function (w) { return text.indexOf(w) !== -1; });
      analysis[4].checks.push({
        passed: foundVague.length <= 1 && foundSpecific.length > 0,
        evidence: foundVague.length > 1 ? '检测到模糊表述：「' + foundVague.slice(0, 2).join('」「') + '」' :
          foundSpecific.length > 0 ? '有具体表述信号' : '表述不够具体，缺少「举个例子」类信号',
        suggestion: foundVague.length > 1 ? '删掉「' + foundVague[0] + '」等模糊词，换成具体数字或步骤' :
          foundSpecific.length === 0 ? '加一个「比如」开头的具体例子' : '保持现状'
      });

      var counterWords = ['其实', '真相', '不是', '反而', '错了', '误区', '没想到', '想不到', '大多数人都', '你以为', '看起来'];
      var foundCounter = counterWords.filter(function (w) { return text.indexOf(w) !== -1; });
      analysis[4].checks.push({
        passed: foundCounter.length > 0,
        evidence: foundCounter.length > 0 ? '检测到反常识信号：「' + foundCounter[0] + '」' : '未检测到反常识/认知落差标记',
        suggestion: foundCounter.length === 0 ? '加一个「其实…」「真相是…」「大多数人都以为…但…」的反常识转折' : '保持现状'
      });

      var personalMarkers = ['我发现', '我的经验', '我试过', '我之前', '我去', '我做过', '我自己'];
      var foundPersonal = personalMarkers.filter(function (w) { return text.indexOf(w) !== -1; });
      analysis[4].checks.push({
        passed: foundPersonal.length > 0,
        evidence: foundPersonal.length > 0 ? '有个人经验标记：「' + foundPersonal[0] + '」' : '缺少个人经验或独特视角的标记',
        suggestion: foundPersonal.length === 0 ? '加入你的个人经历或独家数据，让内容只有你能说' : '保持现状'
      });
    } else {
      analysis[4].checks.push({ passed: null, evidence: '未输入内容文本', suggestion: '粘贴内容后检测表达清晰度' });
      analysis[4].checks.push({ passed: null, evidence: '未输入内容文本', suggestion: '粘贴内容后检测认知落差' });
      analysis[4].checks.push({ passed: null, evidence: '未输入内容文本', suggestion: '粘贴内容后检测独特性' });
    }

    // ===== 维度5: AI 辅助创作（依赖人工规划） =====
    analysis[5] = { checks: [] };
    for (var i = 0; i < 4; i++) {
      analysis[5].checks.push({ passed: null, evidence: '需人工确认', suggestion: '根据内容类型选择对应的 AI 工作流' });
    }

    return analysis;
  }

  function runTool3() {
    var topic = $('t3_topic').value.trim();
    var format = $('t3_format').value;
    var content = $('t3_text').value.trim();
    var result = $('t3_result');
    if (!topic) {
      result.innerHTML = '<div class="empty-state">请输入选题</div>';
      return;
    }

    var formatName = { image_text: '图文', short_video: '短视频', long_video: '长视频', live: '直播', article: '文章' }[format];
    var hasContent = content.length > 0;

    // 有内容文本时自动分析
    var analysis = hasContent ? analyzeContent3(topic, content) : null;

    var reports = [];
    var weakest = null;
    var weakestLevel = -1;

    D.contentDimensions.forEach(function (dim) {
      var total = dim.checks.length;
      var checked = 0;
      var checkResults = [];

      if (analysis && analysis[dim.id]) {
        var checks = analysis[dim.id].checks;
        for (var ci = 0; ci < checks.length; ci++) {
          var passState = checks[ci].passed;
          var isPass = (passState === true) || (passState === null);
          if (isPass) checked++;
          checkResults.push({
            passed: isPass,
            evidence: checks[ci].evidence,
            suggestion: checks[ci].suggestion
          });
        }
      } else {
        for (var k = 0; k < total; k++) {
          checkResults.push({ passed: null, evidence: null, suggestion: null });
        }
      }

      var ratio = total > 0 ? checked / total : 0;
      var status, cls, symbol;
      if (dim.id === 5) {
        if (ratio >= 0.5) { status = '✅ 已规划'; cls = 'ok'; symbol = 'ok'; }
        else { status = '⚠️ 需确定'; cls = 'warn'; symbol = 'warn'; }
      } else {
        if (ratio >= 2 / 3) { status = '✅'; cls = 'ok'; symbol = 'ok'; }
        else if (ratio >= 1 / 3) { status = '⚠️'; cls = 'warn'; symbol = 'warn'; }
        else { status = '❌'; cls = 'bad'; symbol = 'bad'; }
      }

      reports.push({ dim: dim, status: status, checked: checked, total: total, symbol: symbol, checkResults: checkResults, hasAnalysis: !!analysis });

      var level = symbol === 'ok' ? 0 : (symbol === 'warn' ? 1 : 2);
      if (dim.id !== 5 && level > weakestLevel) {
        weakestLevel = level;
        weakest = { dim: dim, symbol: symbol };
      }
    });

    // 总体报告
    var okCount = reports.filter(function (r) { return r.symbol === 'ok'; }).length;
    var warnCount = reports.filter(function (r) { return r.symbol === 'warn'; }).length;
    var badCount = reports.filter(function (r) { return r.symbol === 'bad'; }).length;

    var overall;
    if (badCount >= 2) overall = '存在严重短板，建议先补齐再创作';
    else if (badCount === 1) overall = '有一项关键缺失，需要优先解决';
    else if (warnCount >= 2) overall = '整体可用，但有几项需要优化';
    else if (okCount >= 4) overall = '选题已就绪，可以开始创作';
    else overall = '基本可用，继续打磨';

    var html = '<div class="result-summary">选题「<strong>' + escapeHtml(topic) + '</strong>」 / 形式：<strong>' + formatName + '</strong>' +
      (hasContent ? ' / 内容文本 ' + content.length + ' 字' : ' / 未粘贴内容（仅学习方法论）') + '<br>' +
      '五维结果：✅ ' + okCount + ' 项 · ⚠️ ' + warnCount + ' 项 · ❌ ' + badCount + ' 项<br>' +
      '<strong>总体诊断：' + escapeHtml(overall) + '</strong></div>';

    // 逐维报告 — 学习型设计：每个维度展示方法论 + 参考示例 + 检测结果
    reports.forEach(function (r) {
      var sevCls = r.symbol === 'ok' ? 'ok' : (r.symbol === 'warn' ? 'warn' : 'red');
      html +=
        '<div class="result-card sev-' + sevCls + '">' +
        '<div class="rc-head">' +
        '<div class="rc-title">' + r.status + ' 维度' + r.dim.id + ' · ' + escapeHtml(r.dim.name) + '</div>' +
        '<div class="rc-meta">' + (r.hasAnalysis ? r.checked + '/' + r.total + ' 达标' : '方法论') + '</div>' +
        '</div>';

      // 1. 方法论说明（每维都有，用户可以学习）
      html += '<div class="rc-desc" style="margin-bottom:10px;font-size:14px;color:var(--text)">' + escapeHtml(r.dim.explanation) + '</div>';

      // 2. 参考示例 — 差的 vs 好的
      html += '<div class="ref-example">';
      html += '<div class="ref-bad"><span class="ref-label">✗ 差的</span><span class="ref-text">' + escapeHtml(r.dim.badExample) + '</span></div>';
      html += '<div class="ref-good"><span class="ref-label">✓ 好的</span><span class="ref-text">' + escapeHtml(r.dim.goodExample) + '</span></div>';
      html += '</div>';

      // 3. 检测结果（如果粘贴了内容文本）
      if (r.hasAnalysis) {
        var failCount = r.checkResults.filter(function (cr) { return !cr.passed; }).length;
        if (failCount > 0) {
          html += '<div class="opt-tips-label" style="margin-top:10px">你的内容检测结果</div>';
          r.checkResults.forEach(function (cr, idx) {
            var checkText = r.dim.checks[idx] || '';
            if (!cr.passed) {
              html += '<div class="opt-tip-item">' +
                '<div class="opt-tip-check">✗ ' + escapeHtml(checkText) + '</div>';
              if (cr.evidence) {
                html += '<div class="opt-tip-evidence">' + escapeHtml(cr.evidence) + '</div>';
              }
              if (cr.suggestion) {
                html += '<div class="opt-tip-text">建议：' + escapeHtml(cr.suggestion) + '</div>';
              }
              html += '</div>';
            } else {
              html += '<div class="opt-tip-item" style="opacity:0.6">' +
                '<div class="opt-tip-check">✓ ' + escapeHtml(checkText) + '</div>';
              if (cr.evidence) {
                html += '<div class="opt-tip-evidence">' + escapeHtml(cr.evidence) + '</div>';
              }
              html += '</div>';
            }
          });
        } else if (r.symbol === 'ok') {
          html += '<div class="opt-tip-check" style="margin-top:8px;color:var(--ok)">✓ 本维度全部通过</div>';
        }
      } else {
        // 未粘贴内容时展示判定标准和方法论 tips
        html += '<div class="opt-tips-label" style="margin-top:10px">判定标准</div>';
        html += '<div class="rc-desc" style="color:var(--text-3)">' + escapeHtml(r.dim.judgment) + '</div>';
        html += '<div class="opt-tips-label" style="margin-top:8px">怎么做</div>';
        r.dim.tips.forEach(function (tip) {
          html += '<div class="opt-tip-text" style="margin-bottom:4px">· ' + escapeHtml(tip) + '</div>';
        });
      }

      html += '</div>';
    });

    // 第一步做什么
    var action;
    if (!weakest || weakest.symbol === 'ok') {
      action = '选题已就绪。先写一个最小可用版本（比如一条短视频的开头 30 秒），跑通再说。';
    } else {
      var actionMap = {
        1: '先清洗 AI 味：把空话套话和堆砌的术语删掉，用你嘴上会说的词重写一遍。',
        2: '先重做封面和标题：标题要做到「认知落差」，封面要在 0.5 秒内传达核心。',
        3: '先砍掉 50% 内容：把核心观点提到最前面，删掉所有不直接服务核心的铺垫。',
        4: '先找到同行的同类内容，明确你的差异化在哪——如果没有落差，先别做。'
      };
      action = actionMap[weakest.dim.id] || '先解决最弱的维度。';
    }
    html += '<div class="action-suggestion"><div class="as-label">第一步做什么</div><div class="as-text">' + escapeHtml(action) + '</div></div>';

    result.innerHTML = html;
  }

  // ===========================================================================
  // 工具 4：开头优化方案
  // ===========================================================================
  function runTool4() {
    var text = $('t4_text').value;
    var format = $('t4_format').value;
    var result = $('t4_result');
    if (!text.trim()) {
      result.innerHTML = '<div class="empty-state">请粘贴开头文本</div>';
      return;
    }

    var formatName = { short_video: '短视频', image_text: '图文', long_article: '长文' }[format];
    var head = text.slice(0, 80);
    var firstLine = text.split(/[。\n！？]/)[0] || text;

    // 检测项
    var diag = [];

    // 1 钩子三件套
    var pain = ['焦虑', '害怕', '担心', '烦恼', '痛苦', '痛点', '总是', '为什么', '别再', '还在', '是不是', '有没有', '一直', '每次', '为什么', '你是不是', '总是'];
    var promise = ['教你', '帮你', '让你', '就能', '带你', '告诉你', '给你', '学会', '解决', '搞定', '方法', '技巧', '招'];
    var hasPain = pain.some(function (p) { return head.indexOf(p) !== -1; });
    var hasPromise = promise.some(function (p) { return head.indexOf(p) !== -1; });
    var hasHook = hasPain && hasPromise;
    diag.push({ ok: hasHook, text: '钩子三件套（痛点+承诺）' + (hasHook ? '：已具备' : '：缺失，前三句没有同时戳痛点+给承诺') });

    // 2 废话铺垫
    var filler = ['大家好', '今天我想和大家聊', '今天来聊聊', '今天想和大家', '众所周知', '在开始之前', '最近', '最近很多人', '说起', '不知道大家有没有', '我们先来', '下面我来', '让我来'];
    var hasFiller = filler.some(function (p) { return firstLine.indexOf(p) !== -1; });
    diag.push({ ok: !hasFiller, text: '废话铺垫' + (hasFiller ? '：开头是寒暄/背景铺垫，没有直接进入' : '：开头直接，没有多余铺垫') });

    // 3 核心观点前置
    var pointMarkers = ['其实', '本质上', '核心是', '关键是', '重点是', '最', '只有', '其实就', '说白了', '秘诀', '真相', '方法', '因为'];
    var hasPointEarly = pointMarkers.some(function (p) { return head.indexOf(p) !== -1; });
    var firstLineLen = firstLine.trim().length;
    var tooLongNoPoint = firstLineLen > 50 && !hasPointEarly;
    diag.push({ ok: !tooLongNoPoint, text: '核心观点前置' + (tooLongNoPoint ? '：首句过长且无观点标记，观点被埋在后文' : (hasPointEarly ? '：首句附近有观点信号' : '：首句长度适中')) });

    // 4 悬念
    var susp = ['？', '?', '到底', '秘密', '为什么', '你知道吗', '其实', '真相', '没想到', '没想到', '竟然', '居然'];
    var hasSusp = susp.some(function (p) { return head.indexOf(p) !== -1; });
    diag.push({ ok: hasSusp, text: '悬念/钩子' + (hasSusp ? '：有疑问或反常识，能拉动往下看' : '：缺少疑问或反常识，观众没有往下看的理由') });

    // 诊断渲染
    var html = '<div class="result-summary">内容形式：<strong>' + formatName + '</strong>，开头 ' + text.length + ' 字。<br>问题诊断如下：</div>';

    html += '<div class="result-card"><div class="rc-title">问题诊断</div>';
    diag.forEach(function (d) {
      html +=
        '<div class="diag-item">' +
        '<span class="diag-icon ' + (d.ok ? 'ok' : 'bad') + '">' + (d.ok ? '✓' : '!') + '</span>' +
        '<span>' + escapeHtml(d.text) + '</span>' +
        '</div>';
    });
    html += '</div>';

    // 优化方案
    var solutions = [];
    if (!hasHook) {
      solutions.push('<strong>补齐钩子三件套</strong>：第一句戳一个具体痛点（不是「很多人有这个问题」，而是「你是不是每次 XX 都 XX」），第二句给承诺，第三句留悬念。');
    }
    if (hasFiller) {
      solutions.push('<strong>砍掉第一句铺垫</strong>：把「大家好/今天聊聊」这类寒暄直接删掉，从最有信息量的一句话开始。短视频尤其要砍，前 3 秒不能浪费在自我介绍上。');
    }
    if (tooLongNoPoint) {
      solutions.push('<strong>核心观点前置</strong>：把你的结论或最反常识的一句话提到第一句，后面再展开论证。先给答案再解释，比先铺垫再给结论完播率高得多。');
    }
    if (!hasSusp) {
      solutions.push('<strong>制造悬念</strong>：在第二或第三句加一个疑问句或一个反常识判断，比如「但这其实是错的」「真正的原因你可能想不到」。');
    }
    // 体裁专属
    if (format === 'short_video') {
      solutions.push('<strong>短视频专属</strong>：前 3 秒必须出现钩子，不要任何自我介绍/场景铺垫；理想结构是「痛点钩子 → 反常识结论 → 证明/干货」。');
    } else if (format === 'image_text') {
      solutions.push('<strong>图文专属</strong>：开头可以稍作铺垫但不超过 2 句，封面标题已经做了钩子的活，正文开头要快速给出增量信息。');
    } else {
      solutions.push('<strong>长文专属</strong>：可以用一个具体场景或故事切入，但要在 100 字内点题，否则读者会划走。');
    }
    if (solutions.length === 0) {
      solutions.push('开头结构已经比较完整，重点打磨具体的痛点和承诺词，让钩子更具体、更刺人。');
    }

    html += '<div class="top3-banner">— 优化方案 —</div>';
    html += '<div class="result-card"><ol class="solution-list">';
    solutions.forEach(function (s) {
      html += '<li>' + s + '</li>';
    });
    html += '</ol></div>';

    html += '<div class="action-suggestion"><div class="as-label">改写示例结构</div><div class="as-text">' +
      escapeHtml('痛点钩子（具体场景）→ 反常识结论 → 「为什么」留悬念 → 承诺给方法 → 进入正文。') + '</div></div>';

    result.innerHTML = html;
  }

  // ===========================================================================
  // 设置
  // ===========================================================================
  function loadSettings() {
    var cfg = readJSON('dbs_api_config', {});
    $('s_apikey').value = cfg.apikey || '';
    $('s_provider').value = cfg.provider || 'doubao';
    $('s_baseurl').value = cfg.baseurl || '';
    $('s_model').value = cfg.model || '';
    // 服务商变更时自动填充默认值
    applyProviderDefault(cfg.baseurl, cfg.model);
  }
  var PROVIDER_DEFAULTS = {
    doubao: { baseurl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-pro-32k' },
    deepseek: { baseurl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    custom: { baseurl: '', model: '' }
  };
  function applyProviderDefault(existingBase, existingModel) {
    var prov = $('s_provider').value;
    // 仅在用户未自定义时填充
    if (prov !== 'custom') {
      if (!existingBase) $('s_baseurl').value = PROVIDER_DEFAULTS[prov].baseurl;
      if (!existingModel) $('s_model').value = PROVIDER_DEFAULTS[prov].model;
    }
  }
  function saveSettings() {
    var cfg = {
      apikey: $('s_apikey').value.trim(),
      provider: $('s_provider').value,
      baseurl: $('s_baseurl').value.trim(),
      model: $('s_model').value.trim()
    };
    writeJSON('dbs_api_config', cfg);
    var s = $('saveStatus');
    s.textContent = '已保存到本地';
    setTimeout(function () { s.textContent = ''; }, 2000);
  }

  // -------------------------------------------------------------------------
  // localStorage 读写
  // -------------------------------------------------------------------------
  function readJSON(key, def) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : def;
    } catch (e) { return def; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  // 输入实时保存
  var INPUT_IDS = [
    't1_topic', 't1_industry',
    't2_text', 't2_genre',
    't3_topic', 't3_format', 't3_text',
    't4_text', 't4_format'
  ];
  function bindInputAutosave() {
    INPUT_IDS.forEach(function (id) {
      var node = $(id);
      if (!node) return;
      var saved = localStorage.getItem('dbs_input_' + id);
      if (saved !== null) {
        if (node.tagName === 'SELECT') {
          // 仅当选项存在时恢复
          var exists = false;
          for (var i = 0; i < node.options.length; i++) if (node.options[i].value === saved) { exists = true; break; }
          if (exists) node.value = saved;
        } else {
          node.value = saved;
        }
      }
      node.addEventListener('input', function () {
        localStorage.setItem('dbs_input_' + id, node.value);
      });
      node.addEventListener('change', function () {
        localStorage.setItem('dbs_input_' + id, node.value);
      });
    });
  }

  // -------------------------------------------------------------------------
  // 事件绑定
  // -------------------------------------------------------------------------
  function bindEvents() {
    // 返回菜单
    $('backBtn').addEventListener('click', backToMenu);

    // 工具运行
    $('t1_run').addEventListener('click', runTool1);
    $('t2_run').addEventListener('click', runTool2);
    $('t3_run').addEventListener('click', runTool3);
    $('t4_run').addEventListener('click', runTool4);

    // 复制按钮事件委托
    document.body.addEventListener('click', function (e) {
      var btn = e.target.closest('.copy-btn');
      if (btn) {
        var val = btn.getAttribute('data-copy') || '';
        copyText(val, btn);
      }
    });
  }

  // -------------------------------------------------------------------------
  // 首页 2x2 卡片网格初始化
  // -------------------------------------------------------------------------
  function initCardGrid() {
    var cards = document.querySelectorAll('.tool-card-grid');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var tool = card.getAttribute('data-tool');
        if (tool) openTool(parseInt(tool, 10));
      });
    });
  }

  // -------------------------------------------------------------------------
  // SpotlightCard 初始化
  // -------------------------------------------------------------------------
  function initSpotlightCards() {
    var cards = document.querySelectorAll('[data-spotlight]');
    cards.forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', x + 'px');
        card.style.setProperty('--mouse-y', y + 'px');
      });
    });
  }

  // -------------------------------------------------------------------------
  // Service Worker 注册
  // -------------------------------------------------------------------------
  function registerSW() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function (e) {
          console.warn('[SW] register failed:', e);
        });
      });
    }
  }

  // -------------------------------------------------------------------------
  // 初始化
  // -------------------------------------------------------------------------
  function init() {
    bindInputAutosave();
    bindEvents();
    initCardGrid();
    initSpotlightCards();
    registerSW();
    showView('menu');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
