const FOOTER_PATTERNS = [
  /良好的开端[\s\S]*$/u,
  /[，,]?孩子们[，,][\s\S]*$/u,
  /[，,]?们，我们四年级一起加油[\s\S]*$/u,
  /[，,]?我们四年级一起加油[\s\S]*$/u,
  /!\(VS\)\/[\s\S]*$/u,
  /[/／\\]名名名[\s\S]*$/u,
  /名名名[\s\S]*$/u,
  /[‼!！]*回执要求[‼!！]*[\s\S]*$/u,
  /回执要求[‼!！]*[\s\S]*$/u,
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
  [/至少(\d+)志/g, "至少$1遍"],
  [/(\d+)志[，,]/g, "$1遍，"],
  [/预习没完(?!成)/g, "预习没完成"],
  [/带好办法/g, "有什么好办法"],
  [/[:：]11\./g, "：1."],
  [/[:：]1(\d)\.(?=熟|预|准|完|背|写|订|抄|读|复|记|默)/g, "：$1."],
  [/准备默写1回执/g, "准备默写"],
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
  return fixed
    .replace(/^([\u4e00-\u9fa5]{2,4})作业[:：]\s*/u, "")
    .replace(/^(\d+[\.、．、]\s*)/, "")
    .trim();
}
