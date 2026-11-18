/**
 * Agent Skill 版说明（skills/fate-bazi-reader/SKILL.md）。
 * 规则与输出结构直接复用 aiExport 中的同一份常量，保证网页「复制给 AI」与 Skill 口径一致。
 * 只被脚本使用，不进入网页包。生成：npm run gen:ai-skill；npm run test:ai 会检查是否同步。
 */
import { AI_COMPAT_SCHEMA, AI_RULES, AI_SCHEMA, AI_SECTIONS } from './aiExport';

const FIELDS: [string, string][] = [
  ['subject', '性别（乾造 / 坤造）、生肖；非隐私模式另含录入时间、农历、地点、星座'],
  ['dayMaster / monthCommand', '日主天干五行阴阳；月令地支及所在节令'],
  ['pillars.year|month|day|hour', '干支、十神、藏干（layer：本气 / 中气 / 余气，各带十神）、纳音、dayMasterStage（星运：日主在该支）、selfStage（自坐：该干在本支）、isVoid（空亡）'],
  ['fiveElements', '明字计数、藏干加权值与占比、method（加权口径）'],
  ['relations', '天干、地支的合冲刑害——只表示存在，不代表已合化 / 成局'],
  ['shensha / parameters', '神煞及所在柱；胎元、命宫、身宫、胎息'],
  ['appReference', '应用内简法评估（旺衰分项、格局、喜用倾向），可反驳'],
  ['luck', '顺逆、起运、虚岁口径、各步大运；currentLiuNian；timeline = 今年 ±5 年流年（luckStarts 标交运年）'],
  ['receipt', '口径回执：换年换月、子时、真太阳时、节气区间、夏令时、sensitivity（时辰分界 / 交节临界提醒）'],
];

export function buildSkillMd(): string {
  const L: string[] = [];
  L.push('---');
  L.push('name: fate-bazi-reader');
  L.push(
    `description: 解读由「fate · 命理 ATELIER」导出的八字命盘（网页「复制给 AI」的文本，或 ${AI_SCHEMA} / ${AI_COMPAT_SCHEMA} JSON）。用户粘贴或上传这类命盘，要求解读八字、大运流年、合盘或某个具体问题时使用。本 Skill 不排盘。`
  );
  L.push('---');
  L.push('');
  L.push('# 八字命盘解读（fate 导出）');
  L.push('');
  L.push('> 此文件由 `npm run gen:ai-skill` 从 `src/lib/aiExport.ts` 生成，规则与网页「复制给 AI」完全同源，请勿手改。');
  L.push('');
  L.push('## 何时使用');
  L.push('');
  L.push('- 用户贴来以「# 八字命盘解读」或「# 八字合盘解读」开头的文本，或 `schema` 为上述值的 JSON。');
  L.push('- 用户只给出生时间、没有命盘：请他先在 fate 里排盘后导出——**不要自己排盘**，四柱、大运、真太阳时与节气交界都容易算错。');
  L.push('');
  L.push('## 规则');
  L.push('');
  AI_RULES.forEach((x, i) => L.push(`${i + 1}. ${x}`));
  L.push('');
  L.push('合盘另加一条：不下「合适 / 不合适」「能不能结婚」之类的结论，只说明互动模式与相处建议；写明「甲方」「乙方」及对应柱位。');
  L.push('');
  L.push('## 输出结构（单人完整解读）');
  L.push('');
  AI_SECTIONS.forEach((x, i) => L.push(`${i + 1}. ${x}`));
  L.push('');
  L.push('## 问题导向与追问');
  L.push('');
  L.push('- 用户带着具体问题（事业 / 感情 / 某一年）时：先给结论，只展开相关部分，依据照写，不必输出全部小节。');
  L.push('- 追问一律以同一张命盘为准；用户补充真实经历后，逐条标「命中 / 部分命中 / 未命中 / 未知」，并说明哪些判断要修正。');
  L.push('- 隐私模式（`privacy` 不为 `none`）下不要追问具体生日、时刻或地点。');
  L.push('');
  L.push('## JSON 字段速查');
  L.push('');
  L.push('| 字段 | 含义 |');
  L.push('| --- | --- |');
  FIELDS.forEach(([k, v]) => L.push(`| \`${k}\` | ${v} |`));
  L.push('');
  L.push('年龄一律为虚岁（出生当年记 1 岁）。合盘 JSON 为 `{ a, b, appCompat }`，a / b 结构同单人。');
  L.push('');
  L.push('## 致谢');
  L.push('');
  L.push('规则写法参考了 bazi-skill、跃渊 YueYuan、bazi-ziwei-skills、liki、OpenFate、MingLi-Bench 等开源项目的思路（MIT 等许可），文字为本项目自写，未复制代码。');
  L.push('');
  return L.join('\n');
}
