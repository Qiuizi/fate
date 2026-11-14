import { BaziResult, ganTenGod } from './bazi';
import { Element } from './elements';
import { computeShenSha } from './shensha';

export interface Para {
  text: string;
  quote?: boolean;
}
export interface ClassicSection {
  title: string;
  source: string;
  key?: string;
  paragraphs: Para[];
}

/* ---------------- 基础资料 ---------------- */
const DAY_MASTER: Record<string, { text: string; plain: string }> = {
  甲: { text: '甲木参天，脱胎要火。春不容金，秋不容土。火炽乘龙，水宕骑虎。地润天和，植立千古。', plain: '甲为阳木、栋梁之材，需庚金修整、丁火煅炼方成器；春不宜金克，秋不宜土重，得水润土培则根深。' },
  乙: { text: '乙木虽柔，刲羊解牛。怀丁抱丙，跨凤乘猴。虚湿之地，骑马亦忧。藤萝系甲，可春可秋。', plain: '乙为阴木、藤萝花草，柔中能屈；得丙丁火暖、依傍甲木可四时生长，湿寒则需向阳。' },
  丙: { text: '丙火猛烈，欺霜侮雪。能煅庚金，逢辛反怯。土众成慈，水猖显节。虎马犬乡，甲来焚灭。', plain: '丙为阳火、太阳之火，光照万物；能炼庚金，遇辛金反被合而减力；土多则晦，水多反显其节。' },
  丁: { text: '丁火柔中，内性昭融。抱乙而孝，合壬而忠。旺而不烈，衰而不穷。如有嫡母，可秋可冬。', plain: '丁为阴火、灯烛之火，外柔内明；合壬则忠、抱乙则孝；旺而不烈、衰而不熄，得印母可持久。' },
  戊: { text: '戊土固重，既中且正。静翕动辟，万物司命。水润物生，土燥物病。若在艮坤，怕冲宜静。', plain: '戊为阳土、城墙高山，厚重中正；水润则生万物，土燥则病；怕冲宜静。' },
  己: { text: '己土卑湿，中正蓄藏。不愁木盛，不畏水狂。火少火晦，金多金光。若要物旺，宜助宜帮。', plain: '己为阴土、田园之土，卑湿蓄藏；不惧木盛水狂，喜火暖金泄，宜帮扶而成物。' },
  庚: { text: '庚金带煞，刚健为最。得水而清，得火而锐。土润则生，土干则脆。能赢甲兄，输于乙妹。', plain: '庚为阳金、刀剑之金，刚健带煞；得水而清、得火而锐；能克甲木，却畏乙木合而失刚。' },
  辛: { text: '辛金软弱，温润而清。畏土之叠，乐水之盈。能扶社稷，能救生灵。热则喜母，寒则喜丁。', plain: '辛为阴金、珠玉之金，温润清秀；忌土重埋金，喜水淘洗；热喜己土之母，寒喜丁火之暖。' },
  壬: { text: '壬水通河，能泄金气。刚中之德，周流不滞。通根透癸，冲天奔地。化则有情，从则相济。', plain: '壬为阳水、江河之水，周流不滞；能泄金气，通根透癸则奔涌；化则有情、从则相济。' },
  癸: { text: '癸水至弱，达于天津。得龙而运，功化斯神。不愁火土，不论庚辛。合戊见火，化象斯真。', plain: '癸为阴水、雨露之水，至弱而灵；得辰（龙）而运化，不愁火土；合戊见火可化。' },
};

const SHENSHA_LORE: Record<string, string> = {
  天乙贵人: '天乙者，乃天上之神，至尊至贵，所至之处，一切凶煞隐然而避。',
  太极贵人: '太极贵人主聪明好学、喜神秘探究，有钻研之才。',
  文昌贵人: '文昌入命，主聪明过人、逢凶化吉，利科甲文书。',
  禄神: '禄者，爵禄也；主衣食丰足，得福禄之助。',
  羊刃: '羊刃者，刚烈之神；主性刚果断，宜制伏，忌冲动。',
  将星: '将星如将帅，主权威统御，临之则掌权柄。',
  华盖: '华盖主孤高、聪慧艺术，喜玄学，宜僧道艺业。',
  驿马: '驿马主奔波迁移，动中求财，喜出行、变换。',
  桃花: '桃花（咸池）主情缘魅力，人缘佳，忌溺于情。',
  劫煞: '劫煞主意外破耗、争夺，宜谨慎防损。',
  亡神: '亡神主内敛多谋，忌失物暗损，宜静守。',
  孤辰: '孤辰主孤独，亲缘较淡，宜修心自处。',
  寡宿: '寡宿主孤寡，宜晚婚或修身，重独立。',
  红鸾: '红鸾主婚恋喜庆，主良缘、喜事。',
  天喜: '天喜主喜事临门，主吉庆婚喜。',
  金舆: '金舆主富贵安享，主车马、安逸。',
  国印贵人: '国印主权柄印信，利公职、掌权。',
  红艳煞: '红艳主艳丽多情，主异性缘、风流。',
  流霞: '流霞主血光、奔波，宜慎防伤损。',
  月德贵人: '月德主逢凶化吉，福泽深厚。',
  魁罡: '魁罡主性烈果断、聪明掌权，忌刑冲。',
  阴差阳错: '阴差阳错主婚情波折，亲情易有隔阂。',
  十恶大败: '十恶大败主破耗，宜勤俭守成。',
  天罗: '天罗主束缚阻滞，宜静待时机。',
  地网: '地网主牵绊，宜守正待时。',
};
const SHI_SHEN_LORE: Record<string, string> = {
  比肩: '同我之谓，主自立竞争，宜食伤财官调剂',
  劫财: '夺我之财，主刚强好胜，宜官杀制之',
  食神: '我生之秀，主福寿才艺，宜财以泄',
  伤官: '盗我之气，主聪明才华，宜佩印制之',
  偏财: '我克之偏，主慷慨机遇之财，宜身旺任财',
  正财: '我克之正，主勤俭正当之财，宜身旺',
  七杀: '克我之偏，主威严魄力，宜食制印化',
  正官: '克我之正，主贵气规矩，宜财印相生',
  偏印: '生我之偏，主偏才玄思，宜财制',
  正印: '生我之正，主学问庇护，忌财破印',
};
const SEASONS: Record<string, { name: string; text: string }> = {
  春: { name: '春', text: '春月木旺而余寒未尽，宜火暖局、水润培根，忌金水过旺。' },
  夏: { name: '夏', text: '夏月火炎燥热，宜水调候清凉，忌木火再助其炎。' },
  秋: { name: '秋', text: '秋月金旺气肃而燥，宜火炼金、水润土，忌土金过厚。' },
  冬: { name: '冬', text: '冬月水寒，宜火解冻调候，忌金水增寒。' },
};
function seasonOf(b: string) {
  if ('寅卯辰'.includes(b)) return SEASONS['春'];
  if ('巳午未'.includes(b)) return SEASONS['夏'];
  if ('申酉戌'.includes(b)) return SEASONS['秋'];
  return SEASONS['冬'];
}
const ZHI_MAIN: Record<string, string> = {
  子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙', 午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬',
};
const TIAOHOU: Record<string, Record<string, string>> = {
  甲: { 寅: '丙癸', 卯: '庚丙丁', 辰: '庚丁壬', 巳: '癸丁庚', 午: '癸丁庚', 未: '癸丁庚', 申: '庚丁壬', 酉: '庚丁丙', 戌: '庚甲丁壬', 亥: '庚丁丙戊', 子: '丁庚丙', 丑: '丁庚丙' },
  乙: { 寅: '丙癸', 卯: '丙癸', 辰: '癸丙戊', 巳: '癸', 午: '癸丙', 未: '癸丙', 申: '丙癸己', 酉: '癸丙丁', 戌: '癸辛', 亥: '丙戊', 子: '丙', 丑: '丙' },
  丙: { 寅: '壬庚', 卯: '壬己', 辰: '壬甲', 巳: '壬癸庚', 午: '壬庚', 未: '壬庚', 申: '壬戊', 酉: '壬癸', 戌: '甲壬', 亥: '甲戊庚壬', 子: '壬戊己', 丑: '壬甲' },
  丁: { 寅: '甲庚', 卯: '庚甲', 辰: '甲庚', 巳: '甲庚', 午: '壬庚癸', 未: '甲壬庚', 申: '甲庚丙戊', 酉: '甲庚丙戊', 戌: '甲庚戊', 亥: '甲庚', 子: '甲庚', 丑: '甲庚' },
  戊: { 寅: '丙甲癸', 卯: '丙甲癸', 辰: '甲丙癸', 巳: '甲丙癸', 午: '壬甲丙', 未: '癸丙甲', 申: '丙癸甲', 酉: '丙癸', 戌: '甲丙癸', 亥: '甲丙', 子: '丙甲', 丑: '丙甲' },
  己: { 寅: '丙庚甲', 卯: '甲癸丙', 辰: '丙癸甲', 巳: '癸丙', 午: '癸丙', 未: '癸丙', 申: '丙癸', 酉: '丙癸', 戌: '甲丙癸', 亥: '丙甲戊', 子: '丙甲戊', 丑: '丙甲戊' },
  庚: { 寅: '戊甲壬丙丁', 卯: '丁甲庚丙', 辰: '甲丁壬癸', 巳: '壬戊丙丁', 午: '壬癸', 未: '丁甲', 申: '丁甲', 酉: '丁甲丙', 戌: '甲壬', 亥: '丁丙', 子: '丁甲丙', 丑: '丙丁甲' },
  辛: { 寅: '己壬庚', 卯: '壬甲', 辰: '壬甲', 巳: '壬甲癸', 午: '壬己癸', 未: '壬庚甲', 申: '壬甲戊', 酉: '壬甲', 戌: '壬甲', 亥: '壬丙', 子: '丙戊壬甲', 丑: '丙壬戊己' },
  壬: { 寅: '庚丙戊', 卯: '戊辛庚', 辰: '甲庚', 巳: '壬辛庚癸', 午: '癸庚辛', 未: '辛甲', 申: '戊丁', 酉: '甲庚', 戌: '甲丙', 亥: '戊丙庚', 子: '戊丙', 丑: '丙丁甲' },
  癸: { 寅: '辛丙', 卯: '庚辛', 辰: '丙辛甲', 巳: '辛', 午: '庚辛壬癸', 未: '庚辛壬癸', 申: '丁', 酉: '辛丙', 戌: '辛甲壬癸', 亥: '庚辛戊丁', 子: '丙辛', 丑: '丙丁' },
};

export function tiaohouOf(gan: string, zhi: string): string {
  return TIAOHOU[gan]?.[zhi] || '';
}

const PATTERN_NAME: Record<string, string> = {
  比肩: '建禄格', 劫财: '月劫格', 食神: '食神格', 伤官: '伤官格', 偏财: '偏财格', 正财: '正财格', 七杀: '七杀格', 正官: '正官格', 偏印: '偏印格', 正印: '正印格',
};
const PATTERN_GUIDE: Record<string, string> = {
  正官:
    '正官为“善神”，宜顺用而护之：喜财星生官、印星护官，使官星有源而不受伤；忌伤官见官、官杀混杂、刑冲提纲。若身弱，则须印比扶身以任官。',
  七杀:
    '七杀为“凶神”，宜逆用而制化：喜食神制杀、或印星化杀，使杀为我用；忌财星党杀、身弱无制。制化得宜，则威权可成。',
  正财:
    '正财为“善神”，宜身旺任财、食伤生财：喜身强、食伤生财源，财旺有制；忌比劫分夺、身弱不胜财。',
  偏财:
    '偏财为“善神”，主机遇与流动之财：喜身旺、食伤生财与官星护财；忌比劫争夺、财轻身衰。',
  食神:
    '食神为“善神”，主福寿才艺：喜身旺、财星泄秀，食神生财；忌枭神（偏印）夺食、财多身弱。',
  伤官:
    '伤官为“凶神”，宜逆用：喜佩印制伤、或生财泄秀（伤官生财）；忌伤官见官、无制而逞。',
  偏印:
    '偏印（枭神）为“凶神”，宜逆用：喜财星制枭、或用其偏才；忌枭神夺食、身旺无制。',
  正印:
    '正印为“善神”，主学问庇荫：喜官杀生印、印绶护身；忌财星破印、印重身滞。',
  比肩:
    '建禄（月令比肩）以身旺论：喜财官有力、食伤生财以泄秀；忌比劫太旺、无财官可用。',
  劫财:
    '月劫（月令劫财）身多偏旺：喜官杀制劫、财星为用、食伤化劫；忌比劫再聚、财轻被夺。',
};

function topHiddenTenGods(r: BaziResult) {
  const counts: Record<string, number> = {};
  r.pillars.forEach((p, i) => {
    if (i !== 2 && p.shiShen) counts[p.shiShen] = (counts[p.shiShen] || 0) + 1;
    p.hidden.forEach((h) => { if (h.shiShen) counts[h.shiShen] = (counts[h.shiShen] || 0) + 1; });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export function buildClassicSections(r: BaziResult): ClassicSection[] {
  const dmGan = r.dayMaster.gan;
  const dmEl = r.dayMaster.element;
  const mz = r.pillars[1].zhi;
  const season = seasonOf(mz);
  const main = ZHI_MAIN[mz];
  const tg = ganTenGod(dmGan, main);
  const pattern = PATTERN_NAME[tg] || '';
  const dayP = r.pillars[2];
  const dayMain = ZHI_MAIN[dayP.zhi];
  const dayTg = ganTenGod(dmGan, dayMain);
  const th = TIAOHOU[dmGan]?.[mz];
  const shensha = computeShenSha(r.pillars).list;
  const topTg = topHiddenTenGods(r);
  const dm = DAY_MASTER[dmGan];

  const sections: ClassicSection[] = [];

  // 一、命理总论
  sections.push({
    title: '命理总论',
    source: '滴天髓 · 通神论 / 子平真诠 · 论用神',
    paragraphs: [
      { text: '道有体用，不可以一端论也，要在扶之抑之得其宜；人有精神，不可以一偏求也，要在损之益之得其中。', quote: true },
      {
        text: `论命之要，先看日主${dmGan}（${r.dayMaster.yinYang}${dmEl}）之强弱，次察月令${mz}之宜忌，再参全局之流通与制化。日主有力则能任财官，日主无力则须印比扶身；二者权衡得当，方为“体用得宜”。`,
      },
      { text: '八字用神，专求月令，以日干配月令地支，而生克不同，格局分焉。', quote: true },
      {
        text: '取用以月令为核心，日干与月令生克定其格局；格局既立，再看“相神”（辅佐用神者）是否到位。有用神而无相神，则局不成；相神得力，则格局清而福厚。',
      },
      { text: '何知其人富，财气通门户；何知其人贵，官星有理会。何知其人吉，喜神为辅弼；何知其人凶，忌神辗转攻。', quote: true },
      {
        text: '看富看财是否流通得地、看贵看官星是否得用有辅；吉凶之机，在于喜用是否有助、忌神是否叠攻。此皆“气机”之论，须与全盘合参，不可执一。',
      },
    ],
  });

  // 二、日主与调候
  if (dm) {
    sections.push({
      title: `日主论 · ${dmGan}`,
      source: '滴天髓 · 论十天干 / 穷通宝鉴 · 调候',
      paragraphs: [
        { text: dm.text, quote: true },
        {
          text: `白话：${dm.plain}`,
        },
        {
          text: `本命生于${mz}月（${season.name}），${season.text}${
            th ? `按《穷通宝鉴》通行调候，${dmGan}日生${mz}月，调候取用大致以「${Array.from(th).join('、')}」为要（供参考，版本或有出入）。` : ''
          }调候者，非必为用神，然寒暖燥湿失衡之际，得调候之神，则命局生气流转、格局易成。`,
        },
      ],
    });
  }

  // 三、格局参论
  if (pattern) {
    sections.push({
      title: `格局参论 · ${pattern}`,
      source: '子平真诠 · 论用神（综合参论）',
      paragraphs: [
        {
          text: `本命月令${mz}，本气为${main}，于日主${dmGan}而言是为「${tg}」，故以「${pattern}」为论格之基（以月令本气取格，简法）。`,
        },
        { text: '有用神必有相神，无相神则不成局。', quote: true },
        {
          text: `${PATTERN_GUIDE[tg] || '当审用神之喜忌、相神之得失，顺用逆用各得其宜。'} 格局之成败，不在名目高下，而在用神是否得力、相神是否到位、忌神是否受制。若用神受伤、相神缺失，则纵有美格，亦难显其用。`,
        },
      ],
    });
  }

  // 四、日柱参论（大段）
  sections.push({
    title: `日柱参论 · ${dayP.ganZhi}`,
    source: '综合参论（纳音·藏干·十二长生，非古籍原文）',
    paragraphs: [
      {
        text: `日柱${dayP.ganZhi}，纳音「${dayP.naYin}」；日支${dayP.zhi}本气为${dayMain}，于日主为「${dayTg}」，日主自坐「${dayP.selfStage}」。日支为夫妻宫，亦主中晚年之根基与内里性情，故日支之十神、藏干与长生，最能见其人内质与家宅气象。`,
      },
      {
        text: `日坐${dayTg}者，${SHI_SHEN_LORE[dayTg] || ''}。日支藏干（${dayP.hidden
          .map((h) => `${h.gan}·${h.shiShen}`)
          .join('、')}）亦须并看：藏干多者，性情与际遇每较复杂，须辨其本气、中气之轻重。`,
      },
      {
        text: `自坐「${dayP.selfStage}」：${
          ['长生', '冠带', '临官', '帝旺'].includes(dayP.selfStage)
            ? '日元得地、元气较足，行事有底气，宜防过刚。'
            : ['衰', '病', '死', '墓', '绝'].includes(dayP.selfStage)
            ? '日元失地、元气偏弱，宜借印比扶身、调候养气，遇帮扶之运则起。'
            : '气机平顺，随运而迁，宜察岁运之扶抑。'
        }`,
      },
    ],
  });

  // 五、十神与神煞（大段）
  if (topTg.length) {
    sections.push({
      title: '十神与神煞参论',
      source: '三命通会 · 十神/神煞释义（综合参论）',
      paragraphs: [
        {
          text: `本命十神以「${topTg[0][0]}」最旺（含天干与藏干计 ${topTg[0][1]} 处），其次为${
            topTg[1] ? `「${topTg[1][0]}」（${topTg[1][1]}）` : '次者'
          }${topTg[2] ? `、「${topTg[2][0]}」（${topTg[2][1]}）` : ''}。${SHI_SHEN_LORE[topTg[0][0]] || ''}；十神之旺，主其性情与际遇之偏向，宜以用神喜忌权衡其吉凶，不可一见某神即断祸福。`,
        },
        {
          text: shensha.length
            ? `命带神煞：${shensha
                .map((s) => `${s.name}（${s.roles.join('·')}）`)
                .slice(0, 8)
                .join('；')}。神煞为“佐参”，吉神主助力、凶煞主警醒，须与格局用神合看；得用则吉神增辉、凶煞减力，失用则反之。`
            : '本命未见常见神煞，吉凶仍以格局、用神与岁运为主。',
        },
      ],
    });
  }

  return sections;
}

/* ============================ 命书长文（buildClassicBook） ============================ */
const GEN: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const CTRL: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const genBy = (e: Element): Element => (Object.keys(GEN) as Element[]).find((k) => GEN[k] === e) || e;
const ctrlBy = (e: Element): Element => (Object.keys(CTRL) as Element[]).find((k) => CTRL[k] === e) || e;
const ELS = ['木', '火', '土', '金', '水'] as const;

const TG_RUN: Record<string, string> = {
  比肩: '比肩之运，主自立、同侪与竞争，宜合作而防分财，身弱得之为助、身旺则争。',
  劫财: '劫财之运，主进取而多争，利于开拓、却易破耗，宜守财、慎合伙。',
  食神: '食神之运，主安逸、才艺、口福，利于生财与创作，忌枭神夺食。',
  伤官: '伤官之运，主聪明发挥、变动求新，宜佩印制、防口舌是非。',
  偏财: '偏财之运，主机遇与流动之财，善把握则得，忌贪多与比劫争夺。',
  正财: '正财之运，主勤实、正当之财，宜稳守经营、量入为出。',
  七杀: '七杀之运，主压力与魄力并存，制化得宜则掌权、失制则劳碌。',
  正官: '正官之运，主责任、名位与规范，利公职正途、忌伤官见官。',
  偏印: '偏印之运，主偏门、玄思与深造，宜防孤克与夺食。',
  正印: '正印之运，主学问、庇护与贵人，利文教修养、忌财破印。',
};
const SHENSHA_LONG: Record<string, string> = {
  天乙贵人: '天乙为至尊至贵之神，所至之处凶煞隐避；主一生多贵人扶助，逢难有解，宜亲近长者、广结善缘。',
  太极贵人: '太极贵人主聪明好学、喜探究玄理，长于钻研；宜研习学问技艺，忌浅尝辄止。',
  文昌贵人: '文昌主聪明过人、文思敏捷，逢凶化吉、利科甲文书；宜读书治学、从事文教。',
  禄神: '禄为爵禄衣食之神，主福禄有余、供给不缺；得用则丰足，被冲则劳而少成。',
  羊刃: '羊刃刚烈，主性刚气盛、行事果断；制伏得宜则掌权任事，失制则易冲动招损。',
  将星: '将星如将帅统兵，主威权统御之才；临之宜担纲负责，忌孤高寡合。',
  华盖: '华盖主孤高清逸、聪慧艺术，喜玄学宗教；宜僧道艺业、学术专精，忌过于孤僻。',
  驿马: '驿马主奔波迁移、动中求财；宜外出发展、常变常新，忌安土重迁而失机。',
  桃花: '桃花（咸池）主情缘魅力、人缘和悦；得用则魅而有度，失制则易溺于情。',
  劫煞: '劫煞主意外破耗、争夺之扰；宜谨慎防损、远离是非，凡事留余。',
  亡神: '亡神主内敛多谋、心思深沉；宜静守藏锋，忌失物暗损与意气用事。',
  孤辰: '孤辰主孤独，亲缘较淡、喜独处；宜修心自处、以学艺自娱。',
  寡宿: '寡宿主孤寡，宜晚婚或重独立，修身养性反能自在。',
  红鸾: '红鸾主婚恋喜庆、良缘喜事；逢之易有成婚、添丁、迁居之喜。',
  天喜: '天喜主喜事临门、吉庆和乐，常与红鸾相伴，主姻缘与欢庆。',
  金舆: '金舆主富贵安享、车马安逸；得用则生活优裕、出行便利。',
  国印贵人: '国印主权柄印信、公职掌权；宜从政、管理、执掌文书之事。',
  红艳煞: '红艳主艳丽多情、异性缘佳；宜自持分寸，忌因情生扰。',
  流霞: '流霞主流血、奔波之象；宜慎防伤损、注意出行与健康。',
  月德贵人: '月德主逢凶化吉、福泽深厚，心地慈和、多得人助。',
  魁罡: '魁罡性烈果断、聪明掌权，喜制服群伦；忌刑冲，逢之则刚极易折。',
  阴差阳错: '阴差阳错主婚情波折、亲情易生隔阂；宜多沟通体谅、慎重择偶。',
  十恶大败: '十恶大败主破耗耗散，宜勤俭守成、戒投机冒险。',
  天罗: '天罗主束缚阻滞，事多牵绊；宜静待时机、稳中求进。',
  地网: '地网主牵绊缠身，宜守正待时、以退为进。',
};

export function buildClassicBook(r: BaziResult): ClassicSection[] {
  const dmGan = r.dayMaster.gan;
  const dmEl = r.dayMaster.element;
  const mz = r.pillars[1].zhi;
  const season = seasonOf(mz);
  const main = ZHI_MAIN[mz];
  const tg = ganTenGod(dmGan, main);
  const pattern = PATTERN_NAME[tg] || '';
  const dayP = r.pillars[2];
  const dayMain = ZHI_MAIN[dayP.zhi];
  const dayTg = ganTenGod(dmGan, dayMain);
  const th = TIAOHOU[dmGan]?.[mz];
  const shensha = computeShenSha(r.pillars).list;
  const dm = DAY_MASTER[dmGan];

  const counts: Record<string, number> = {};
  r.pillars.forEach((p, i) => {
    if (i !== 2 && p.shiShen) counts[p.shiShen] = (counts[p.shiShen] || 0) + 1;
    p.hidden.forEach((h) => { if (h.shiShen) counts[h.shiShen] = (counts[h.shiShen] || 0) + 1; });
  });
  const sortedTg = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const gc = (names: string[]) => names.reduce((s, n) => s + (counts[n] || 0), 0);
  const yinGroup = gc(['正印', '偏印']);
  const biGroup = gc(['比肩', '劫财']);
  const caiGroup = gc(['正财', '偏财']);
  const guanGroup = gc(['正官', '七杀']);
  const shiGroup = gc(['食神', '伤官']);

  const support = r.weighted[dmEl] + r.weighted[genBy(dmEl)];
  const drain = r.weighted[CTRL[dmEl]] + r.weighted[ctrlBy(dmEl)] + r.weighted[GEN[dmEl]];
  const ratio = support / (support + drain || 1);
  const strength = ratio > 0.56 ? '偏旺' : ratio < 0.4 ? '偏弱' : '中和';
  const elLine = ELS.map((e) => `${e}${r.visibleCount[e]}`).join('、');
  const wLine = ELS.map((e) => `${e}${r.weighted[e].toFixed(1)}`).join('、');
  const missing = ELS.filter((e) => r.visibleCount[e] === 0);

  const S: ClassicSection[] = [];
  const push = (title: string, source: string, paragraphs: Para[]) => S.push({ title, source, paragraphs });

  // 一、总论
  push('命理总论', '滴天髓 · 通神论 / 子平真诠 · 论用神', [
    { text: '道有体用，不可以一端论也，要在扶之抑之得其宜；人有精神，不可以一偏求也，要在损之益之得其中。', quote: true },
    { text: `本命日主${dmGan}（${r.dayMaster.yinYang}${dmEl}），生于${mz}月（${season.name}），四柱为「${r.pillars.map((p) => p.ganZhi).join(' ')}」。论命之要，先看日主之强弱与月令之宜忌，次察五行流通与十神制化：日主有力则能任财官，无力则须印比扶身；用神得力、相神到位，则格局清而福厚；用神受伤、忌神叠攻，则纵有美格亦难显其用。` },
    { text: '八字用神，专求月令，以日干配月令地支，而生克不同，格局分焉。', quote: true },
    { text: `取用以月令为核心。本命月令${mz}，节令${season.name}，主气为${main}，于日主为「${tg}」，遂以「${pattern}」立格。格局既定，再看相神（辅佐用神者）是否到位——“有用神必有相神，无相神则不成局”。` },
    { text: '何知其人富，财气通门户；何知其人贵，官星有理会。何知其人吉，喜神为辅弼；何知其人凶，忌神辗转攻。', quote: true },
    { text: '看富看财是否流通得地、看贵看官星是否得用有辅；吉凶之机，在于喜用是否有助、忌神是否叠攻。此皆“气机”之论，须与全盘合参，不可执一。' },
  ]);

  // 二、五行与旺衰
  push('五行与旺衰参论', '综合参论（明字计数 / 含藏干加权）', [
    { text: `本命明字五行：${elLine}；含藏干加权约为：${wLine}。${
      missing.length ? `明字中偏缺「${missing.join('、')}」，为命局所当留意之处（缺者未必为害，须结合用神喜忌看）。` : '五行（明字）俱全，气机较为周流。'
    }` },
    { text: `以“生扶”论（日主同类＋生我之印）与“克泄耗”论（我克之财、克我之官杀、我生之食伤）相较，日主${dmGan}属「${strength}」之列（简评，比例约 ${(ratio * 100).toFixed(0)}%）。${
      strength === '偏旺' ? '宜财官食伤以泄耗，忌印比再助。' : strength === '偏弱' ? '宜印比扶身，忌财官食伤过重。' : '气机中和，取用须随岁运之扶抑。'
    }` },
    { text: `调候方面，生${mz}月${season.text}${th ? `《穷通宝鉴》通行调候，${dmGan}日生${mz}月大致以「${Array.from(th).join('、')}」为要（供参考，版本或有出入）。` : ''}调候之神非必为用神，然寒暖燥湿失衡时，得之则生气流转、格局易成。` },
  ]);

  // 三、日主性情
  if (dm) {
    push(`日主性情论 · ${dmGan}`, '滴天髓 · 论十天干', [
      { text: dm.text, quote: true },
      { text: `白话：${dm.plain}` },
      {
        text: `性情之论，先看日主五行与阴阳。${dmGan}属${r.dayMaster.yinYang}${dmEl}，${
          { 木: '主仁、主生发，性直而怀柔，重情义、尚理想', 火: '主礼、主文明，性急而热情，尚表达与光彩', 土: '主信、主承载，性厚而持重，重信守、耐劳', 金: '主义、主肃杀，性刚而果决，尚原则与秩序', 水: '主智、主流通，性灵而善变，尚机敏与谋略' }[dmEl]
        }。再参十神之偏：${sortedTg[0] ? `命局以「${sortedTg[0][0]}」为多，` : ''}${
          sortedTg[0] ? SHI_SHEN_LORE[sortedTg[0][0]] : ''
        }。整体言之，宜扬其长、补其偏，方为调心养性之道。`,
      },
    ]);
  }

  // 四、格局
  if (pattern) {
    push(`格局参论 · ${pattern}`, '子平真诠 · 论用神（综合参论）', [
      { text: `本命月令${mz}，本气为${main}，于日主${dmGan}而言是为「${tg}」，故以「${pattern}」为论格之基（以月令本气取格，简法；实际成格须兼看透干与会局）。` },
      { text: '有用神必有相神，无相神则不成局。', quote: true },
      {
        text: `${PATTERN_GUIDE[tg] || '当审用神之喜忌、相神之得失，顺用逆用各得其宜。'} 格局之成败，不在名目高下，而在用神是否得力、相神是否到位、忌神是否受制。${pattern.includes('正官') || pattern.includes('七杀') || pattern.includes('正财') || pattern.includes('偏财') || pattern.includes('正印') ? '此格多属“善神”顺用，重在护其本体、使之有源。' : '此格多属“凶神”逆用，重在制化得宜、化忌为用。'}`,
      },
      { text: `就本盘而言，印（${yinGroup}）、比劫（${biGroup}）、财（${caiGroup}）、官杀（${guanGroup}）、食伤（${shiGroup}）之力量（含天干与藏干计数）可作权衡：用神偏于何方，则以何方为喜，反之为忌；岁运引动时，吉凶随之而显。` },
    ]);
  }

  // 五、十神参论
  if (sortedTg.length) {
    const paras: Para[] = [
      { text: `本命十神分布（天干＋藏干计）：${sortedTg.map(([n, c]) => `${n}${c}`).join('、')}。十神为“人事之星”，其旺衰与组合，决定性情偏向与人际际遇。` },
    ];
    sortedTg.slice(0, 3).forEach(([n, c]) => {
      paras.push({ text: `「${n}」出现 ${c} 处：${SHI_SHEN_LORE[n] || ''}。${c >= 3 ? '此神偏旺，其性情与际遇的偏向较显著，宜以用神喜忌调之。' : '其力适中，宜与其他十神配合看。'}` });
    });
    push('十神参论', '三命通会 · 十神释义（综合参论）', paras);
  }

  // 六、六亲
  push('六亲参论', '综合参论（十神配六亲）', [
    { text: `六亲以十神为配：印（${yinGroup}）为父母、庇荫与学业；比劫（${biGroup}）为兄弟、同侪与助力；${r.input.gender === 'male' ? `财（${caiGroup}）为妻星` : `官杀（${guanGroup}）为夫星`}，亦主情缘；${r.input.gender === 'male' ? `官杀（${guanGroup}）为子女星` : `食伤（${shiGroup}）为子女星`}。` },
    { text: `就看本命：印${yinGroup}、比劫${biGroup}，${yinGroup >= biGroup ? '得长辈庇荫与自学之力较足，宜近文教、重修养' : '自立性较强、重同侪之助，宜广结善缘'}；${r.input.gender === 'male' ? '财星' : '官杀'}${r.input.gender === 'male' ? caiGroup : guanGroup}，${
      (r.input.gender === 'male' ? caiGroup : guanGroup) >= 2 ? '情缘/配偶之力较显，宜惜缘、重沟通' : '情缘之力偏弱或含蓄，宜主动经营'
    }。六亲之论贵在“星宫同参”——十神为星、四柱宫位为位，星宫俱美则亲缘厚，星宫受伤则亲缘薄。` },
  ]);

  // 七、事业财禄
  push('事业与财禄参论', '综合参论（财官食伤平衡）', [
    { text: `论事业财禄，重在财（${caiGroup}）、官（${guanGroup}）、食伤（${shiGroup}）之配合与日主能否胜任。${caiGroup > 0 ? '命中有财，' : '命中财星不显，'}${guanGroup > 0 ? '亦有官杀，' : '官杀不显，'}${shiGroup > 0 ? '且有食伤生发。' : '食伤不显。'}` },
    { text: `${strength === '偏弱' ? '日主偏弱，宜先“任财”为本：借印比扶身、量力而为，忌好大喜功；待身旺之运，方可开拓。' : strength === '偏旺' ? '日主偏旺，宜以财官食伤为用、以泄耗为美：可担重任、宜主动求财求名，忌刚愎自用。' : '日主中和，宜循序渐进、稳中求进，取用随运而调。'} 财宜流通（有食伤生、有官护），官宜有理会（得财生印护），二者相济，则事业与财禄可期。` },
  ]);

  // 八、婚姻感情
  push('婚姻与感情参论', '综合参论（夫妻宫 / 配偶星 / 神煞）', [
    { text: `婚姻以日支为“夫妻宫”，以${r.input.gender === 'male' ? '财星' : '官杀'}为配偶星。本命日支为${dayP.zhi}，本气${dayMain}于日主为「${dayTg}」——${SHI_SHEN_LORE[dayTg] || ''}。${['正财', '正官', '正印'].includes(dayTg) ? '配偶宫得正星，主配偶端正、家庭观念重，宜以诚相待。' : ['偏财', '七杀', '偏印'].includes(dayTg) ? '配偶宫偏星，主配偶有个性、缘分起伏，宜多包容磨合。' : '配偶宫为比劫食伤，主配偶独立或共同成长，宜平等相待。'}` },
    { text: `${shensha.some((s) => ['桃花', '红鸾', '天喜', '红艳煞'].includes(s.name)) ? `命带${shensha.filter((s) => ['桃花', '红鸾', '天喜', '红艳煞'].includes(s.name)).map((s) => s.name).join('、')}，情缘与魅力较显，${shensha.some((s) => s.name === '红艳煞') ? '宜自持分寸、防因情生扰。' : '善经营则良缘可期。'}` : '命中情缘之星不显，感情多宜主动经营、细水长流。'} 婚姻之要，在“配偶星得地、夫妻宫安静”：星旺宫静则和，星弱宫冲则须多沟通体谅。` },
  ]);

  // 九、健康
  push('健康与调养参论', '综合参论（五行偏枯，仅供参考）', [
    { text: `健康之论，看五行是否偏枯与日主强弱。本命明字五行：${elLine}；${missing.length ? `偏缺「${missing.join('、')}」，相关脏腑与机能宜多加留意。` : '五行较全，气机相对均衡。'}` },
    { text: `日主${strength}，${strength === '偏弱' ? '元气偏弱，宜规律作息、适度进补，忌过劳耗神。' : strength === '偏旺' ? '气机偏旺，宜疏泄有度、动静相宜，忌郁怒积火。' : '气机中和，宜保持规律、预防为主。'} 五行各有所主，惟命理非医学，身体不适请就医诊治，此处仅供起居调养之参考。` },
  ]);

  // 十、日柱
  push(`日柱参论 · ${dayP.ganZhi}`, '综合参论（纳音·藏干·十二长生）', [
    { text: `日柱${dayP.ganZhi}，纳音「${dayP.naYin}」；日支${dayP.zhi}本气为${dayMain}，于日主为「${dayTg}」，日主自坐「${dayP.selfStage}」。日支为夫妻宫，亦主中晚年之根基与内里性情。` },
    { text: `日支藏干（${dayP.hidden.map((h) => `${h.gan}·${h.shiShen}`).join('、')}）并看：藏干多者性情际遇较复杂，须辨本气、中气之轻重。自坐「${dayP.selfStage}」，${['长生', '冠带', '临官', '帝旺'].includes(dayP.selfStage) ? '日元得地、元气较足，行事有底气，宜防过刚。' : ['衰', '病', '死', '墓', '绝'].includes(dayP.selfStage) ? '日元失地、元气偏弱，宜借印比扶身、调候养气，遇帮扶之运则起。' : '气机平顺，随运而迁，宜察岁运之扶抑。'}` },
  ]);

  // 十一、神煞详解
  if (shensha.length) {
    push('神煞详解', '三命通会 · 神煞释义', [
      { text: `本命所带神煞如下（神煞为“佐参”，吉神主助力、凶煞主警醒，须与格局用神合看，得用则吉神增辉、凶煞减力，失用则反之）：` },
      ...shensha.slice(0, 8).map((s) => ({ text: `${s.name}（${s.roles.join('·')}）：${SHENSHA_LONG[s.name] || SHENSHA_LORE[s.name] || ''}` })),
    ]);
  }

  // 十二、大运
  if (r.luck.length) {
    const runs = r.luck.slice(0, 5);
    push('大运参论', '综合参论（大运十神）', [
      { text: `${r.yun.direction}，${r.yun.startText}起运（约 ${r.yun.startSolar}）。大运为“环境与阶段”之引动，十神轮转，各有其象：` },
      ...runs.map((l) => ({ text: `${l.ganZhi}运（${l.shiShen}，${l.startAge}–${l.endAge}岁，${l.startYear}–${l.endYear}）${l.current ? '【当前】' : ''}：${TG_RUN[l.shiShen] || ''}` })),
      { text: '大运之吉凶，终以是否扶助用神、削弱忌神为断：助用则顺、助忌则滞；同一步运，对不同格局喜忌不同，须以本盘用神为准绳。' },
    ]);
  }

  // 十三、总结
  push('总纲与寄语', '综合参论', [
    { text: `综观本命：日主${dmGan}${strength}，以「${pattern || '月令'}」立格，明字五行${elLine}${missing.length ? `，缺${missing.join('、')}` : ''}；命带${shensha.slice(0, 6).map((s) => s.name).join('、') || '少见神煞'}。宜${strength === '偏弱' ? '扶身固本、稳中求进' : strength === '偏旺' ? '泄秀任事、主动开拓' : '随运调候、循序而进'}，以用神喜忌为取舍，以格局成败为纲。` },
    { text: '命理者，观气机之顺逆、察性情之偏全，以自助自省而已；非宿命之判，亦非决断之凭。愿君取其参考，尽其在人。' },
  ]);

  const keyOf = (t: string) =>
    t.startsWith('命理总论') ? 'zong'
    : t.startsWith('五行') ? 'wuxing'
    : t.startsWith('日主性情') ? 'xingqing'
    : t.startsWith('格局') ? 'geju'
    : t.startsWith('十神') ? 'shishen'
    : t.startsWith('六亲') ? 'liuqin'
    : t.startsWith('事业') ? 'shiye'
    : t.startsWith('婚姻') ? 'hunyin'
    : t.startsWith('健康') ? 'jiankang'
    : t.startsWith('日柱参论') ? 'rizhu'
    : t.startsWith('神煞') ? 'shensha'
    : t.startsWith('大运参论') ? 'dayun'
    : 'zongjie';
  return S.map((s) => ({ ...s, key: keyOf(s.title) }));
}
