/**
 * 浏览器侧移植，算法与原易经起卦工作台（Python 版）对齐：
 * backend/core/casting.py、hexagram.py、reading_rules.py、najia.py，
 * 以及 services/calendar.py 里 lunar 的日柱 Exact2 / 月建节气调用。
 * 夏令时歧义仍走手动干支，不在这里静默换算。
 */
import rawHexagrams from '../../data/yijing/hexagrams.json';
import rawGuides from '../../data/yijing/learning_guides.json';
import { Solar } from 'lunar-javascript';

export interface Trigram {
  name: string;
  symbol: string;
  binary_code: string;
  image: string;
}

export interface Hexagram {
  wenwang_order: number;
  name: string;
  title: string;
  binary_code: string;
  upper_trigram: Trigram;
  lower_trigram: Trigram;
  judgment: string;
  line_texts: string[];
  text_source: string;
  source_url: string;
  source_revision_id: number;
  special_line?: { name: string; text: string; source_url: string };
}

export interface LearningGuide {
  hexagram_id: number;
  one_liner: string;
  overview: string;
  line_guides: Record<string, string>;
  editorial_version: string;
  references: { title: string; url: string }[];
  review_status: string;
}

export const HEXAGRAMS = rawHexagrams as Hexagram[];
export const GUIDES = new Map((rawGuides as LearningGuide[]).map((g) => [g.hexagram_id, g]));

const byCode = new Map(HEXAGRAMS.map((h) => [h.binary_code, h]));
const byId = new Map(HEXAGRAMS.map((h) => [h.wenwang_order, h]));

export function hexagramById(id: number): Hexagram {
  const found = byId.get(id);
  if (!found) throw new Error(`没有第 ${id} 卦`);
  return found;
}

const VALID = new Set([6, 7, 8, 9]);

export function lineIsYang(value: number): boolean {
  if (!VALID.has(value)) throw new Error(`无效爻值：${value}；只允许 6、7、8、9`);
  return value === 7 || value === 9;
}

export function validateLines(values: number[]): [number, number, number, number, number, number] {
  if (values.length !== 6) throw new Error('必须恰好提供六爻，顺序为自下而上');
  if (values.some((value) => !Number.isInteger(value) || !VALID.has(value))) {
    throw new Error('每一爻只能是整数 6、7、8 或 9');
  }
  return values as [number, number, number, number, number, number];
}

/** 初爻是最低位。编码从左到右是上爻 → 初爻。 */
export function binaryCode(values: number[]): string {
  const lines = validateLines(values);
  return [...lines].reverse().map((value) => (lineIsYang(value) ? '1' : '0')).join('');
}

export interface HexagramCalculation {
  lines: number[];
  changedLines: number[];
  movingPositions: number[];
  baseCode: string;
  changedCode: string;
  base: Hexagram;
  changed: Hexagram;
}

export function calculateHexagram(values: number[]): HexagramCalculation {
  const lines = validateLines(values);
  const baseCode = binaryCode(lines);
  const changedLines = lines.map((value) => (value === 6 || value === 9 ? 15 - value : value));
  const changedCode = binaryCode(changedLines);
  const base = byCode.get(baseCode);
  const changed = byCode.get(changedCode);
  if (byCode.size !== 64 || !base || !changed) throw new Error('六十四卦编码映射不完整');
  return {
    lines: [...lines],
    changedLines,
    movingPositions: lines.flatMap((value, i) => (value === 6 || value === 9 ? [i + 1] : [])),
    baseCode,
    changedCode,
    base,
    changed,
  };
}

export interface CastLine {
  value: number;
  coins: [number, number, number];
}

function coin(): 2 | 3 {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0]! & 1) === 0 ? 2 : 3;
}

/** 2 阴、3 阳，自然概率 1:3:3:1。自下而上六爻。 */
export function castSixLines(): CastLine[] {
  return Array.from({ length: 6 }, () => {
    const coins: [number, number, number] = [coin(), coin(), coin()];
    return { value: coins[0] + coins[1] + coins[2], coins };
  });
}

export const LINE_LABEL = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
export const VALUE_NAME: Record<number, string> = { 6: '老阴', 7: '少阳', 8: '少阴', 9: '老阳' };

export interface ReadingPassage {
  kind: string;
  hexagramOrder: number;
  hexagramTitle: string;
  label: string;
  text: string;
  linePosition: number | null;
  primary: boolean;
  sourceUrl: string;
}

export interface TraditionalReading {
  rulesetName: string;
  sourceTitle: string;
  sourceUrl: string;
  movingCount: number;
  passages: ReadingPassage[];
  rationale: string;
  plain: string;
  limit: string;
}

const RULESET_NAME = '启蒙占法（据《易学启蒙通释·考变占第四》）';
const RULESET_SOURCE_TITLE = '《易学启蒙通释》（四库全书本）卷下·考变占第四';
const RULESET_SOURCE_URL = 'https://zh.wikisource.org/w/index.php?title=易學啟蒙通釋_%28四庫全書本%29/卷下&oldid=529701';

function passage(
  entry: Hexagram,
  kind: string,
  label: string,
  text: string,
  linePosition: number | null = null,
  primary = true,
): ReadingPassage {
  return {
    kind,
    hexagramOrder: entry.wenwang_order,
    hexagramTitle: entry.title,
    label,
    text,
    linePosition,
    primary,
    sourceUrl: entry.source_url,
  };
}

export function chooseTraditionalReading(calc: HexagramCalculation): TraditionalReading {
  const positions = calc.movingPositions;
  const movingCount = positions.length;
  const base = calc.base;
  const changed = calc.changed;
  const passages: ReadingPassage[] = [];
  let rationale: string;
  if (movingCount === 0) {
    passages.push(passage(base, 'judgment', '本卦卦辞', base.judgment));
    rationale = '六爻皆不变，取本卦卦辞；本体系另以本卦内卦为贞、外卦为悔。';
  } else if (movingCount === 1) {
    const position = positions[0]!;
    passages.push(passage(base, 'line', `本卦第${position}爻`, base.line_texts[position - 1]!, position));
    rationale = '一爻变，取本卦该动爻爻辞。';
  } else if (movingCount === 2) {
    const [lower, upper] = [...positions].sort((a, b) => a - b);
    passages.push(passage(base, 'line', `本卦第${lower}爻`, base.line_texts[lower! - 1]!, lower!, false));
    passages.push(passage(base, 'line', `本卦第${upper}爻`, base.line_texts[upper! - 1]!, upper!, true));
    rationale = '二爻变，两条动爻都取本卦爻辞，以上位动爻为主。此细则在通释中注明为据例推定。';
  } else if (movingCount === 3) {
    const basePrimary = positions.includes(1);
    const primaryEntry = basePrimary ? base : changed;
    const secondaryEntry = basePrimary ? changed : base;
    passages.push(passage(primaryEntry, 'judgment', '主参考卦辞', primaryEntry.judgment, null, true));
    passages.push(passage(secondaryEntry, 'judgment', '参照卦辞', secondaryEntry.judgment, null, false));
    rationale = `三爻变，参考本卦与之卦卦辞；本例属于${basePrimary ? '前十' : '后十'}组合，按本体系以${basePrimary ? '本卦为主' : '之卦为主'}。`;
  } else if (movingCount === 4) {
    const unchanged = [1, 2, 3, 4, 5, 6].filter((position) => !positions.includes(position));
    const [lower, upper] = unchanged;
    passages.push(passage(changed, 'line', `之卦第${lower}爻（不变爻）`, changed.line_texts[lower! - 1]!, lower!, true));
    passages.push(passage(changed, 'line', `之卦第${upper}爻（不变爻）`, changed.line_texts[upper! - 1]!, upper!, false));
    rationale = '四爻变，取之卦两条不变爻爻辞，以下位不变爻为主；该主次细则在通释中注明为据例推定。';
  } else if (movingCount === 5) {
    const position = [1, 2, 3, 4, 5, 6].find((item) => !positions.includes(item))!;
    passages.push(passage(changed, 'line', `之卦第${position}爻（不变爻）`, changed.line_texts[position - 1]!, position));
    rationale = '五爻变，取之卦唯一不变爻的爻辞。';
  } else if (base.wenwang_order === 1 || base.wenwang_order === 2) {
    const expected = base.wenwang_order === 1 ? '用九' : '用六';
    if (base.special_line?.name !== expected) throw new Error(`六爻皆变时目录缺少${expected}原文`);
    passages.push(passage(base, 'special_line', expected, base.special_line.text));
    rationale = `六爻皆变且本卦为${expected === '用九' ? '乾' : '坤'}，取该卦独立收录的${expected}。`;
  } else {
    passages.push(passage(changed, 'judgment', '之卦卦辞', changed.judgment));
    rationale = '六爻皆变且本卦非乾、坤，取之卦卦辞。';
  }
  return {
    rulesetName: RULESET_NAME,
    sourceTitle: RULESET_SOURCE_TITLE,
    sourceUrl: RULESET_SOURCE_URL,
    movingCount,
    passages,
    rationale,
    plain: `本卦有${movingCount}条动爻。${rationale}`,
    limit: '本结果解释的是取辞依据，不构成对原文义理或现实结果的定论。二爻、四爻变的主次在通释中说明为据例推定；其他传统可采用不同占法。',
  };
}

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const EARTHLY_BRANCHES = BRANCHES;
export const SEXAGENARY = Array.from({ length: 60 }, (_, index) => STEMS[index % 10]! + BRANCHES[index % 12]!);

const BRANCH_ELEMENTS: Record<string, string> = {
  子: '水', 亥: '水', 寅: '木', 卯: '木', 巳: '火', 午: '火',
  申: '金', 酉: '金', 辰: '土', 戌: '土', 丑: '土', 未: '土',
};
const GENERATES: Record<string, string> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CONTROLS: Record<string, string> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

interface TrigramNa {
  name: string;
  element: string;
  innerStem: string;
  outerStem: string;
  inner: string[];
  outer: string[];
}

const TRIGRAM_NAJIA: Record<string, TrigramNa> = {
  '111': { name: '乾', element: '金', innerStem: '甲', outerStem: '壬', inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  '010': { name: '坎', element: '水', innerStem: '戊', outerStem: '戊', inner: ['寅', '辰', '午'], outer: ['申', '戌', '子'] },
  '100': { name: '艮', element: '土', innerStem: '丙', outerStem: '丙', inner: ['辰', '午', '申'], outer: ['戌', '子', '寅'] },
  '001': { name: '震', element: '木', innerStem: '庚', outerStem: '庚', inner: ['子', '寅', '辰'], outer: ['午', '申', '戌'] },
  '110': { name: '巽', element: '木', innerStem: '辛', outerStem: '辛', inner: ['丑', '亥', '酉'], outer: ['未', '巳', '卯'] },
  '101': { name: '离', element: '火', innerStem: '己', outerStem: '己', inner: ['卯', '丑', '亥'], outer: ['酉', '未', '巳'] },
  '011': { name: '兑', element: '金', innerStem: '丁', outerStem: '丁', inner: ['巳', '卯', '丑'], outer: ['亥', '酉', '未'] },
  '000': { name: '坤', element: '土', innerStem: '乙', outerStem: '癸', inner: ['未', '巳', '卯'], outer: ['丑', '亥', '酉'] },
};

const PALACE_ORDER = ['乾', '坎', '艮', '震', '巽', '离', '坤', '兑'];
const PALACE_POSITION_NAMES = ['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂'];
const WORLD_POSITIONS = [6, 1, 2, 3, 4, 5, 4, 3];
const SIX_SPIRITS = ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'];
const SPIRIT_START: Record<string, number> = { 甲: 0, 乙: 0, 丙: 1, 丁: 1, 戊: 2, 己: 3, 庚: 4, 辛: 4, 壬: 5, 癸: 5 };

export const NAJIA_SOURCE = '《增删卜易》八宫、纳甲、六亲、世应、六神、伏神（维基文库修订，与仓库 najia.py 的 SOURCE_RECORDS 相同）';

function validateDay(day: string): [string, string] {
  if (!SEXAGENARY.includes(day)) throw new Error('日干支必须是六十甲子中的一项，例如甲子');
  return [day[0]!, day[1]!];
}

export function xunkongForDay(day: string): [string, string] {
  const [stem, branch] = validateDay(day);
  const first = (BRANCHES.indexOf(branch as (typeof BRANCHES)[number]) - STEMS.indexOf(stem as (typeof STEMS)[number]) + 12) % 12;
  return [BRANCHES[(first + 10) % 12]!, BRANCHES[(first + 11) % 12]!];
}

function flipCode(code: string, position: number): string {
  const index = 6 - position;
  const bit = code[index] === '1' ? '0' : '1';
  return code.slice(0, index) + bit + code.slice(index + 1);
}

interface PalaceAssignment {
  palace: string;
  palaceElement: string;
  positionName: string;
  world: number;
  response: number;
  pureCode: string;
}

function palaceMap(): Map<string, PalaceAssignment> {
  const members = new Map<string, PalaceAssignment>();
  for (const palaceName of PALACE_ORDER) {
    const trigramCode = Object.keys(TRIGRAM_NAJIA).find((code) => TRIGRAM_NAJIA[code]!.name === palaceName)!;
    const trigram = TRIGRAM_NAJIA[trigramCode]!;
    const pureCode = trigramCode + trigramCode;
    let current = pureCode;
    const sequence = [current];
    for (let position = 1; position <= 5; position += 1) {
      current = flipCode(current, position);
      sequence.push(current);
    }
    current = flipCode(current, 4);
    sequence.push(current);
    for (const position of [1, 2, 3]) current = flipCode(current, position);
    sequence.push(current);
    if (new Set(sequence).size !== 8) throw new Error(`${palaceName}宫八卦序列存在重复编码`);
    sequence.forEach((code, positionIndex) => {
      if (!byCode.has(code)) throw new Error(`八宫映射缺少卦码 ${code}`);
      const world = WORLD_POSITIONS[positionIndex]!;
      members.set(code, {
        palace: palaceName,
        palaceElement: trigram.element,
        positionName: PALACE_POSITION_NAMES[positionIndex]!,
        world,
        response: ((world - 1 + 3) % 6) + 1,
        pureCode,
      });
    });
  }
  if (members.size !== 64) throw new Error('八宫映射必须恰好覆盖 64 个不同卦象');
  return members;
}

const PALACES = palaceMap();

function relative(lineElement: string, palaceElement: string): string {
  if (lineElement === palaceElement) return '兄弟';
  if (GENERATES[lineElement] === palaceElement) return '父母';
  if (GENERATES[palaceElement] === lineElement) return '子孙';
  if (CONTROLS[lineElement] === palaceElement) return '官鬼';
  if (CONTROLS[palaceElement] === lineElement) return '妻财';
  throw new Error('无法确定六亲');
}

interface NaRow { stem: string; branch: string; element: string }

function trigramLines(upperCode: string, lowerCode: string): NaRow[] {
  const upper = TRIGRAM_NAJIA[upperCode];
  const lower = TRIGRAM_NAJIA[lowerCode];
  if (!upper || !lower) throw new Error('卦象包含未知三画卦');
  const rows: NaRow[] = [];
  for (const [trigram, inner] of [[lower, true], [upper, false]] as const) {
    const branches = inner ? trigram.inner : trigram.outer;
    const stem = inner ? trigram.innerStem : trigram.outerStem;
    for (const branch of branches) rows.push({ stem, branch, element: BRANCH_ELEMENTS[branch]! });
  }
  return rows;
}

export interface NajiaLine {
  position: number;
  yinYang: string;
  moving: boolean;
  stem: string;
  branch: string;
  element: string;
  relative: string;
  spirit: string;
  role: '世' | '应' | null;
  hidden: { relative: string; stem: string; branch: string; element: string } | null;
  xunkong: boolean;
  monthBuild: boolean;
}

export interface NajiaBoard {
  order: number;
  title: string;
  lines: NajiaLine[];
}

export interface NajiaChart {
  palace: string;
  palaceElement: string;
  palacePosition: string;
  world: number;
  response: number;
  dayGanzhi: string;
  xunkong: [string, string];
  monthBranch: string;
  base: NajiaBoard;
  changed: NajiaBoard;
  note: string;
  calendarNote: string;
}

export function buildNajiaChart(calc: HexagramCalculation, dayGanzhi: string, monthBranch: string, manual: boolean): NajiaChart {
  const [dayStem] = validateDay(dayGanzhi);
  if (!BRANCHES.includes(monthBranch as (typeof BRANCHES)[number])) throw new Error('月建只能是十二地支之一');
  const xunkong = xunkongForDay(dayGanzhi);
  const assignment = PALACES.get(calc.baseCode);
  if (!assignment) throw new Error('本卦未找到八宫归属');
  const baseNa = trigramLines(calc.base.upper_trigram.binary_code, calc.base.lower_trigram.binary_code);
  const present = new Set(baseNa.map((row) => relative(row.element, assignment.palaceElement)));
  const pure = byCode.get(assignment.pureCode)!;
  const pureNa = trigramLines(pure.upper_trigram.binary_code, pure.lower_trigram.binary_code);
  const pureRelatives = pureNa.map((row) => relative(row.element, assignment.palaceElement));
  const hidden = new Map<number, NajiaLine['hidden']>();
  for (const name of ['父母', '兄弟', '子孙', '妻财', '官鬼']) {
    if (present.has(name)) continue;
    const sourceIndex = pureRelatives.indexOf(name);
    if (sourceIndex < 0) throw new Error(`本宫首卦缺少${name}`);
    const row = pureNa[sourceIndex]!;
    hidden.set(sourceIndex + 1, { relative: name, stem: row.stem, branch: row.branch, element: row.element });
  }

  const makeBoard = (entry: Hexagram, lineValues: number[], withHidden: boolean, withRoles: boolean): NajiaBoard => {
    const na = trigramLines(entry.upper_trigram.binary_code, entry.lower_trigram.binary_code);
    return {
      order: entry.wenwang_order,
      title: entry.title,
      lines: lineValues.map((value, index) => {
        const position = index + 1;
        const row = na[index]!;
        const hid = withHidden ? hidden.get(position) ?? null : null;
        const role = withRoles && position === assignment.world ? '世' : withRoles && position === assignment.response ? '应' : null;
        return {
          position,
          yinYang: value === 7 || value === 9 ? '阳' : '阴',
          moving: calc.movingPositions.includes(position),
          stem: row.stem,
          branch: row.branch,
          element: row.element,
          relative: relative(row.element, assignment.palaceElement),
          spirit: SIX_SPIRITS[(SPIRIT_START[dayStem]! + index) % 6]!,
          role,
          hidden: hid,
          xunkong: xunkong.includes(row.branch),
          monthBuild: row.branch === monthBranch,
        };
      }),
    };
  };

  const calendarNote = manual
    ? '日干支与月建由手动录入，旬空据所填日干支计算。'
    : '日柱按所填钟点的民用日期，用 lunar-javascript 的 Exact2（00:00 换日，23:00–23:59 仍计当日）。月建把该钟点直接当作北京时间，用节气交接。夏令时歧义请改手动。';
  return {
    palace: assignment.palace,
    palaceElement: assignment.palaceElement,
    palacePosition: assignment.positionName,
    world: assignment.world,
    response: assignment.response,
    dayGanzhi,
    xunkong,
    monthBranch,
    base: makeBoard(calc.base, calc.lines, true, true),
    changed: makeBoard(calc.changed, calc.changedLines, false, false),
    note: '纳甲地支按内、外卦分别配置；六亲以本卦宫五行为基准；六神从日干起例。缺少的六亲取本宫首卦初爻至上爻的首个对应爻，伏于本卦同位。之卦仍用本卦宫五行，世应只标本卦。',
    calendarNote,
  };
}

/** 与仓库 calendar.py 在 Asia/Shanghai、无夏令时歧义时同一套 lunar 调用。 */
export function calendarFromClock(year: number, month: number, day: number, hour: number, minute: number): { dayGanzhi: string; monthBranch: string } {
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar() as {
    getDayInGanZhiExact2: () => string;
    getMonthZhiExact: () => string;
  };
  const dayGanzhi = lunar.getDayInGanZhiExact2();
  const monthBranch = lunar.getMonthZhiExact();
  if (dayGanzhi.length !== 2 || !BRANCHES.includes(monthBranch as (typeof BRANCHES)[number])) {
    throw new Error('历法计算未返回有效干支，请改用手动排盘');
  }
  return { dayGanzhi, monthBranch };
}
