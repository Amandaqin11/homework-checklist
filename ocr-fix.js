const FOOTER_PATTERNS = [
  /良好的开端[\s\S]*$/u,
  /[，,]?孩子们[，,][\s\S]*$/u,
  /[，,]?们，我们四年级一起加油[\s\S]*$/u,
  /[，,]?我们四年级一起加油[\s\S]*$/u,
  /!\(VS\)\/[\s\S]*$/u,
  /[/／\\]名名名[\s\S]*$/u,
  /名名名[\s\S]*$/u,
];

const OCR_REPLACEMENTS = [
  [/自作业/g, "作业"],
  [/每人必交[，,]?自/g, "每人必交："],
  [/可控兰笔/g, "可擦蓝笔"],
  [/可擦兰笔/g, "可擦蓝笔"],
  [/可探兰笔/g, "可擦蓝笔"],
  [/([可])控([蓝兰])笔/g, "$1擦$2笔"],
  [/([可])探([蓝兰])笔/g, "$1擦$2笔"],
  [/兰笔/g, "蓝笔"],
  [/升等等/g, "升等级"],
  [/升等及/g, "升等级"],
  [/口算加油卷/g, "口算加油卷"],
  [/练习册p(\d+)/gi, "练习册P$1"],
  [/练习册P(\d+)/g, "练习册P$1"],
  [/名名名/g, ""],
  [/[\u0000-\u001f]/g, ""],
  [/[|｜]{2,}/g, ""],
  [/\s{2,}/g, " "],
];

export function fixRecognizedText(text) {
  let fixed = text;

  for (const pattern of FOOTER_PATTERNS) {
    fixed = fixed.replace(pattern, "");
  }

  for (const [pattern, replacement] of OCR_REPLACEMENTS) {
    fixed = fixed.replace(pattern, replacement);
  }

  return fixed
    .replace(/[，,]{2,}/g, "，")
    .replace(/[。．]{2,}/g, "。")
    .trim();
}

export function fixTaskText(text) {
  let fixed = fixRecognizedText(text);
  for (const pattern of FOOTER_PATTERNS) {
    fixed = fixed.replace(pattern, "");
  }
  return fixed.trim();
}
