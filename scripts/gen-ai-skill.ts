/* 生成 skills/fate-bazi-reader/SKILL.md（与网页「复制给 AI」同源）。用法：npm run gen:ai-skill */
import { writeFileSync } from 'node:fs';
import { buildSkillMd } from '../src/lib/aiSkill';

writeFileSync(new URL('../skills/fate-bazi-reader/SKILL.md', import.meta.url), buildSkillMd());
console.log('已生成 skills/fate-bazi-reader/SKILL.md');
