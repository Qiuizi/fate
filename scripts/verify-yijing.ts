import { analyzeNajia } from '../src/yijing/analysis';
import {
  HEXAGRAMS,
  buildNajiaChart,
  calculateHexagram,
  chooseTraditionalReading,
  xunkongForDay,
} from '../src/yijing/engine';

const quiet = calculateHexagram([7, 7, 7, 7, 7, 7]);
if (quiet.base.name !== '乾' || quiet.changed.name !== '乾' || quiet.movingPositions.length !== 0) {
  throw new Error('六静应为乾');
}
if (chooseTraditionalReading(quiet).passages[0]?.label !== '本卦卦辞') throw new Error('六静取辞不对');

const allMoving = calculateHexagram([9, 9, 9, 9, 9, 9]);
const reading = chooseTraditionalReading(allMoving);
if (reading.passages[0]?.label !== '用九' || allMoving.changed.name !== '坤') throw new Error('乾六动应用九、之坤');

const chart = buildNajiaChart(quiet, '甲子', '寅', true);
if (chart.palace !== '乾' || chart.palacePosition !== '本宫' || chart.world !== 6 || chart.response !== 3) {
  throw new Error(`乾宫世应不对 ${chart.palace} ${chart.palacePosition} ${chart.world}/${chart.response}`);
}
const kong = xunkongForDay('甲子').join('');
if (kong !== '戌亥') throw new Error(`甲子旬空应为戌亥，得到 ${kong}`);
if (HEXAGRAMS.length !== 64) throw new Error('卦数不是 64');

const codes = new Set(HEXAGRAMS.map((item) => item.binary_code));
if (codes.size !== 64) throw new Error('卦码不唯一');

const clash = buildNajiaChart(quiet, '甲子', '午', true);
const looked = analyzeNajia(clash, 'official_career', '');
if (looked.baseKind !== '六冲卦') throw new Error(`乾应为六冲卦，得到 ${looked.baseKind}`);
const first = looked.time.find((line) => line.position === 1);
if (!first?.monthBreak || first.branch !== '子') throw new Error('午月应冲初爻子，记月破');
if (looked.candidates.length === 0 || looked.candidates.some((item) => item.relative !== '官鬼')) {
  throw new Error('功名类别应只留官鬼');
}
if (looked.moving.length !== 0) throw new Error('静卦不应有动变');

console.log('yijing engine ok', quiet.base.title, chart.dayGanzhi, chart.xunkong.join(''), looked.baseKind);
