/**
 * 移植 backend/core/najia_analysis.py。
 * 只标记典籍里的对应关系，不判吉凶、不选唯一用神。
 */
import { LINE_LABEL, xunkongForDay, type NajiaChart, type NajiaLine } from './engine';

export const QUESTION_CATEGORIES = [
  { id: 'parent_elder_document', label: '父母、长辈、师长、房屋或文书', relative: '父母', basis: '《用神章》将父母长辈、师长、宅舍及文书等列入父母爻。' },
  { id: 'sibling', label: '兄弟姐妹或同辈', relative: '兄弟', basis: '《用神章》以兄弟爻对应兄弟、姐妹及同辈亲属。' },
  { id: 'wealth_spouse', label: '配偶、财物或求财', relative: '妻财', basis: '《用神章》以妻财爻对应妻妾及货财等。' },
  { id: 'descendant_student', label: '子女、晚辈或门生', relative: '子孙', basis: '《用神章》以子孙爻对应子孙辈、门生等。' },
  { id: 'official_career', label: '功名、官府或妻占夫', relative: '官鬼', basis: '《用神章》将功名、官府及妻占夫列入官鬼爻。' },
  { id: 'medicine', label: '医药', relative: '子孙', basis: '《用神章》将医药列入子孙爻；此条只映射典籍类别，不分析病情。' },
] as const;

export type QuestionCategoryId = (typeof QUESTION_CATEGORIES)[number]['id'];

const LIU_HE: ReadonlyArray<readonly [string, string]> = [
  ['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未'],
];
const LIU_CHONG: ReadonlyArray<readonly [string, string]> = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
];
const GENERATES: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const BRANCH_ELEMENTS: Record<string, string> = {
  子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火',
  申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土',
};

export function earthlyBranchRelation(left: string, right: string): '六合' | '六冲' | null {
  const hit = (table: ReadonlyArray<readonly [string, string]>) =>
    table.some(([a, b]) => (a === left && b === right) || (a === right && b === left));
  if (hit(LIU_HE)) return '六合';
  if (hit(LIU_CHONG)) return '六冲';
  return null;
}

export function fiveElementRelation(source: string, target: string): string {
  if (source === target) return '比和';
  if (GENERATES[source] === target) return 'source_generates_target';
  if (GENERATES[target] === source) return 'target_generates_source';
  if (CONTROLS[source] === target) return 'source_controls_target';
  if (CONTROLS[target] === source) return 'target_controls_source';
  throw new Error('无法确定五行关系');
}

/** 月日对爻。动变另用 movingElementText，避免把本爻误写成月日。 */
export function timeElementText(value: string): string {
  const labels: Record<string, string> = {
    比和: '比和',
    source_generates_target: '月日五行生爻五行',
    target_generates_source: '爻五行生月日五行',
    source_controls_target: '月日五行克爻五行',
    target_controls_source: '爻五行克月日五行',
  };
  return labels[value] ?? value;
}

export function movingElementText(value: string): string {
  return directedText('本爻', '变爻', value);
}

function directedText(sourceName: string, targetName: string, value: string): string {
  const labels: Record<string, string> = {
    比和: '比和',
    source_generates_target: `${sourceName}生${targetName}`,
    target_generates_source: `${targetName}生${sourceName}`,
    source_controls_target: `${sourceName}克${targetName}`,
    target_controls_source: `${targetName}克${sourceName}`,
  };
  return labels[value] ?? value;
}

export interface UseCandidate {
  id: string;
  kind: string;
  position: number;
  relative: string;
  stem: string;
  branch: string;
  element: string;
  flying?: string;
}

export interface TimeLine {
  position: number;
  branch: string;
  element: string;
  monthElement: string;
  dayElement: string;
  monthRelation: '六合' | '六冲' | null;
  dayRelation: '六合' | '六冲' | null;
  monthBreak: boolean;
  dayClash: boolean;
  xunkong: boolean;
}

export interface PairMatch {
  positions: [number, number];
  branches: [string, string];
  relation: '六合' | '六冲';
}

export interface MovingChange {
  position: number;
  from: string;
  to: string;
  element: string;
  branch: '六合' | '六冲' | null;
}

export interface NajiaAnalysis {
  categoryLabel: string | null;
  basis: string;
  candidates: UseCandidate[];
  selection: UseCandidate | null;
  time: TimeLine[];
  basePairs: PairMatch[];
  changedPairs: PairMatch[];
  baseKind: '六合卦' | '六冲卦' | null;
  changedKind: '六合卦' | '六冲卦' | null;
  moving: MovingChange[];
}

function pairs(lines: NajiaLine[]): PairMatch[] {
  const found: PairMatch[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    for (let j = i + 1; j < lines.length; j += 1) {
      const relation = earthlyBranchRelation(lines[i]!.branch, lines[j]!.branch);
      if (!relation) continue;
      found.push({
        positions: [lines[i]!.position, lines[j]!.position],
        branches: [lines[i]!.branch, lines[j]!.branch],
        relation,
      });
    }
  }
  return found;
}

function signature(lines: NajiaLine[]): '六合卦' | '六冲卦' | null {
  const ordered = [...lines].sort((a, b) => a.position - b.position);
  const relations = [0, 1, 2].map((index) => earthlyBranchRelation(ordered[index]!.branch, ordered[index + 3]!.branch));
  if (relations.every((item) => item === '六合')) return '六合卦';
  if (relations.every((item) => item === '六冲')) return '六冲卦';
  return null;
}

export function analyzeNajia(chart: NajiaChart, categoryId: string, manualId: string): NajiaAnalysis {
  const category = QUESTION_CATEGORIES.find((item) => item.id === categoryId) ?? null;
  const all: UseCandidate[] = [];
  for (const line of chart.base.lines) {
    all.push({
      id: `line:${line.position}`,
      kind: '本卦爻',
      position: line.position,
      relative: line.relative,
      stem: line.stem,
      branch: line.branch,
      element: line.element,
    });
    if (line.hidden) {
      all.push({
        id: `hidden:${line.position}`,
        kind: '伏神候选',
        position: line.position,
        relative: line.hidden.relative,
        stem: line.hidden.stem,
        branch: line.hidden.branch,
        element: line.hidden.element,
        flying: `${line.relative} ${line.branch} · ${directedText('飞神', '伏神', fiveElementRelation(line.element, line.hidden.element))}`,
      });
    }
  }
  const candidates = all.filter((item) => !category || item.relative === category.relative);
  const selection = all.find((item) => item.id === manualId) ?? null;
  if (manualId && !selection) throw new Error('手动指定的候选不属于本卦或当前可见伏神');

  const expectedKong = xunkongForDay(chart.dayGanzhi);
  if (expectedKong[0] !== chart.xunkong[0] || expectedKong[1] !== chart.xunkong[1]) {
    throw new Error('旬空必须与该日干支相符');
  }
  const dayBranch = chart.dayGanzhi[1]!;
  const time = chart.base.lines.map((line) => {
    const monthRelation = earthlyBranchRelation(chart.monthBranch, line.branch);
    const dayRelation = earthlyBranchRelation(dayBranch, line.branch);
    return {
      position: line.position,
      branch: line.branch,
      element: line.element,
      monthElement: fiveElementRelation(BRANCH_ELEMENTS[chart.monthBranch]!, line.element),
      dayElement: fiveElementRelation(BRANCH_ELEMENTS[dayBranch]!, line.element),
      monthRelation,
      dayRelation,
      monthBreak: monthRelation === '六冲',
      dayClash: dayRelation === '六冲',
      xunkong: chart.xunkong.includes(line.branch),
    };
  });

  const moving = chart.base.lines.filter((line) => line.moving).map((line) => {
    const changed = chart.changed.lines.find((item) => item.position === line.position)!;
    return {
      position: line.position,
      from: `${line.relative} ${line.branch}${line.element}`,
      to: `${changed.relative} ${changed.branch}${changed.element}`,
      element: fiveElementRelation(line.element, changed.element),
      branch: earthlyBranchRelation(line.branch, changed.branch),
    };
  });

  return {
    categoryLabel: category?.label ?? null,
    basis: category
      ? `${category.basis}候选爻可能不止一条，不自动裁定唯一用神。`
      : '请选择占问类别或手动指定爻位；不会自动确定唯一用神。',
    candidates,
    selection,
    time,
    basePairs: pairs(chart.base.lines),
    changedPairs: pairs(chart.changed.lines),
    baseKind: signature(chart.base.lines),
    changedKind: signature(chart.changed.lines),
    moving,
  };
}

export function lineName(position: number): string {
  return LINE_LABEL[position - 1] ?? `${position}爻`;
}
