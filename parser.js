import { fixRecognizedText, fixTaskText } from "./ocr-fix.js";

const TEACHER_PATTERNS = [
  /([\u4e00-\u9fa5A-Za-z·]{2,8})(老师|师)[：:\s]/,
  /([\u4e00-\u9fa5A-Za-z·]{2,8})老师/,
];

const SUBJECT_HINTS = [
  "语文", "数学", "英语", "物理", "化学", "生物", "历史", "地理",
  "政治", "道德与法治", "科学", "音乐", "美术", "体育", "信息技术",
];

const NUMBERED_ITEM = /^[\s*•\-·]*(?:第)?(\d+|[①②③④⑤⑥⑦⑧⑨⑩])[\.、．\)\]），,、]?\s*(.+)$/;
const BULLET_ITEM = /^[\s*•\-·●○▪▫◦]\s*(.+)$/;

const CIRCLE_NUMBERS = {
  "①": 1, "②": 2, "③": 3, "④": 4, "⑤": 5,
  "⑥": 6, "⑦": 7, "⑧": 8, "⑨": 9, "⑩": 10,
};

const NOISE_LINES = [
  /^今日作业/,
  /^作业[:：]?$/,
  /^请同学们/,
  /^各位家长/,
  /^温馨提示/,
  /^截止时间/,
  /^打卡/,
  /^收到请回复/,
];

const FOOTER_LINES = [
  /^良好的开端/,
  /^孩子们[，,]/,
  /^我们.+一起加油/,
];

const ITEM_START = /^[\s*•\-·]*(?:(?:第)?(\d+|[①②③④⑤⑥⑦⑧⑨⑩])[\.、．\)\]），,、]\s*|每人必交[:：；]?)/;
const INLINE_ITEM_SPLIT = /(?<=[。！？；])\s*(?=\d+[\.、．，,、]?)/;

function normalizeText(text) {
  return fixRecognizedText(
    text
      .replace(/\r/g, "\n")
      .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, "")
      .replace(/[;；]\s*/g, "，")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function cleanLine(line) {
  return line
    .replace(/^[\…\.。,\，\s]+/, "")
    .replace(/\s+/g, "")
    .trim();
}

function isFooterLine(line) {
  return FOOTER_LINES.some((pattern) => pattern.test(line));
}

function isItemStart(line) {
  return ITEM_START.test(line);
}

function mergeBrokenLines(lines) {
  const result = [];
  let current = null;

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (!line || isNoiseLine(line) || isFooterLine(line)) {
      continue;
    }

    if (isItemStart(line)) {
      if (current) {
        result.push(current);
      }
      current = line;
      continue;
    }

    if (current) {
      current += line;
    } else {
      current = line;
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

function splitInlineNumberedBlocks(blocks) {
  const result = [];

  for (const block of blocks) {
    const parts = block
      .split(INLINE_ITEM_SPLIT)
      .map((part) => part.trim())
      .filter(Boolean);

    result.push(...(parts.length > 1 ? parts : [block]));
  }

  return result;
}

function splitLines(text) {
  return normalizeText(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isNoiseLine(line) {
  return NOISE_LINES.some((pattern) => pattern.test(line));
}

export function detectTeacher(text) {
  for (const pattern of TEACHER_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return match[1].replace(/[：:\s]/g, "");
    }
  }
  return "";
}

export function detectSubject(text, teacher) {
  for (const subject of SUBJECT_HINTS) {
    if (text.includes(subject)) {
      return subject;
    }
  }

  const teacherSubject = text.match(/([\u4e00-\u9fa5]{2,4})老师.*?([语文数学英语物理化学生物历史地理政治科学])/);
  if (teacherSubject) {
    return teacherSubject[2];
  }

  return teacher ? "" : "未分类";
}

function parseLineItem(line) {
  const numbered = line.match(NUMBERED_ITEM);
  if (numbered) {
    const rawIndex = numbered[1];
    const index = CIRCLE_NUMBERS[rawIndex] || Number.parseInt(rawIndex, 10);
    return {
      index: Number.isFinite(index) ? index : null,
      text: numbered[2].replace(/^[，,、\s]+/, "").trim(),
    };
  }

  const bullet = line.match(BULLET_ITEM);
  if (bullet) {
    return { index: null, text: bullet[1].trim() };
  }

  const inlineNumbered = line.match(/(?:^|\s)(\d+)[\.、．]\s*(.+)$/);
  if (inlineNumbered) {
    return {
      index: Number.parseInt(inlineNumbered[1], 10),
      text: inlineNumbered[2].trim(),
    };
  }

  return null;
}

export function parseTasks(text) {
  const lines = splitLines(text);
  const mergedLines = mergeBrokenLines(lines);
  const splitLines2 = splitInlineNumberedBlocks(mergedLines);
  const items = [];

  for (const line of splitLines2) {
    const parsed = parseLineItem(line);
    if (parsed && parsed.text.length >= 2) {
      items.push({
        id: crypto.randomUUID(),
        text: fixTaskText(parsed.text),
        done: false,
        order: parsed.index ?? items.length + 1,
      });
      continue;
    }

    if (line.length >= 4) {
      items.push({
        id: crypto.randomUUID(),
        text: fixTaskText(line),
        done: false,
        order: items.length + 1,
      });
    }
  }

  items.sort((a, b) => a.order - b.order);
  return items.map((item, index) => ({
    ...item,
    order: index + 1,
  }));
}

export function createGroup({ teacher = "", subject = "", items = [] } = {}) {
  return {
    id: crypto.randomUUID(),
    teacher,
    subject,
    items,
    createdAt: new Date().toISOString(),
  };
}

export function parseScreenshotText(text) {
  const normalized = normalizeText(text);
  const teacher = detectTeacher(normalized);
  const subject = detectSubject(normalized, teacher);
  const items = parseTasks(normalized);

  return {
    teacher,
    subject,
    items,
    rawText: normalized,
  };
}
