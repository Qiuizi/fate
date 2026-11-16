import { useEffect, useMemo, useState } from 'react';
import './styles.css';
import {
  QUESTION_CATEGORIES,
  analyzeNajia,
  movingElementText,
  timeElementText,
} from './analysis';
import {
  EARTHLY_BRANCHES,
  GUIDES,
  HEXAGRAMS,
  LINE_LABEL,
  SEXAGENARY,
  VALUE_NAME,
  buildNajiaChart,
  calculateHexagram,
  calendarFromClock,
  castSixLines,
  chooseTraditionalReading,
  type CastLine,
  type HexagramCalculation,
  type NajiaChart,
  type TraditionalReading,
} from './engine';

const HISTORY_KEY = 'yijing-local-readings';

interface SavedReading {
  question: string;
  lines: number[];
  coins: CastLine[] | null;
  clock: string;
  day: string;
  month: string;
  at: string;
}

type Tab = 'cast' | 'atlas';

interface Reading {
  question: string;
  coins: CastLine[] | null;
  calc: HexagramCalculation;
  reading: TraditionalReading;
  chart: NajiaChart;
  at: string;
}

function nowLocalValue(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function Glyph({ lines }: { lines: number[] }) {
  return (
    <div className="glyph" aria-hidden="true">
      {[...lines].reverse().map((value, index) => (
        <div className={`yao${value === 6 || value === 9 ? ' moving' : ''}`} key={index}>
          {value === 7 || value === 9 ? <i /> : (<><i /><i /></>)}
        </div>
      ))}
    </div>
  );
}

function Board({ chart, which }: { chart: NajiaChart; which: 'base' | 'changed' }) {
  const board = chart[which];
  return (
    <div>
      <h2 className="hex-name">{which === 'base' ? '本卦' : '之卦'} · {board.title}</h2>
      <table>
        <thead>
          <tr>
            <th>爻</th><th>六神</th><th>六亲</th><th>纳甲</th><th>世应</th><th>伏神</th>
          </tr>
        </thead>
        <tbody>
          {[...board.lines].reverse().map((line) => (
            <tr key={line.position} className={line.moving ? 'moving' : undefined}>
              <td>{LINE_LABEL[line.position - 1]}{line.moving ? ' 动' : ''}</td>
              <td>{line.spirit}</td>
              <td>{line.relative}</td>
              <td>{line.stem}{line.branch}{line.element}{line.xunkong ? ' 空' : ''}{line.monthBuild ? ' 月' : ''}</td>
              <td>{line.role ?? ''}</td>
              <td>{line.hidden ? `${line.hidden.relative} ${line.hidden.stem}${line.hidden.branch}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function YijingApp({ embedded = false }: { embedded?: boolean }) {
  const [tab, setTab] = useState<Tab>('cast');
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<'coins' | 'manual'>('coins');
  const [manual, setManual] = useState<number[]>([7, 7, 7, 7, 7, 7]);
  const [clock, setClock] = useState(nowLocalValue);
  const [handCalendar, setHandCalendar] = useState(false);
  const [dayGanzhi, setDayGanzhi] = useState('甲子');
  const [monthBranch, setMonthBranch] = useState('寅');
  const [error, setError] = useState('');
  const [result, setResult] = useState<Reading | null>(null);
  const [picked, setPicked] = useState(1);
  const [category, setCategory] = useState('');
  const [candidate, setCandidate] = useState('');
  const [history, setHistory] = useState<SavedReading[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) as SavedReading[] : [];
      if (Array.isArray(parsed)) setHistory(parsed.slice(0, 20));
    } catch {
      setHistory([]);
    }
  }, []);

  const analysis = useMemo(() => (result ? analyzeNajia(result.chart, category, candidate) : null), [result, category, candidate]);
  const guide = GUIDES.get(picked);
  const pickedHex = useMemo(() => HEXAGRAMS.find((item) => item.wenwang_order === picked) ?? HEXAGRAMS[0]!, [picked]);

  function resolveCalendar(): { dayGanzhi: string; monthBranch: string } {
    if (handCalendar) return { dayGanzhi, monthBranch };
    // 清空或填了不完整的起卦时间时，给出中文提示，而不是把 lunar 的英文异常抛给用户
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(clock.trim());
    if (!m) throw new Error('请先填写完整的起卦时间（年月日 时:分），或勾选「手动日柱、月建」。');
    const [year, month, day, hour, minute] = m.slice(1).map(Number) as [number, number, number, number, number];
    if (year < 1800 || year > 2100) throw new Error('起卦时间的年份需在 1800–2100 之间。');
    return calendarFromClock(year, month, day, hour, minute);
  }

  function cast() {
    try {
      const thrown = mode === 'coins' ? castSixLines() : null;
      const lines = thrown ? thrown.map((line) => line.value) : manual;
      const calc = calculateHexagram(lines);
      const calendar = resolveCalendar();
      const chart = buildNajiaChart(calc, calendar.dayGanzhi, calendar.monthBranch, handCalendar);
      const next: Reading = {
        question: question.trim(),
        coins: thrown,
        calc,
        reading: chooseTraditionalReading(calc),
        chart,
        at: clock,
      };
      const saved: SavedReading = {
        question: next.question,
        lines: calc.lines,
        coins: thrown,
        clock,
        day: chart.dayGanzhi,
        month: chart.monthBranch,
        at: new Date().toISOString(),
      };
      const nextHistory = [saved, ...history].slice(0, 20);
      setHistory(nextHistory);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
      setCandidate('');
      setResult(next);
      setError('');
      setPicked(calc.base.wenwang_order);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function openSaved(item: SavedReading) {
    try {
      const calc = calculateHexagram(item.lines);
      const chart = buildNajiaChart(calc, item.day, item.month, true);
      setQuestion(item.question);
      setManual(item.lines);
      setClock(item.clock);
      setHandCalendar(true);
      setDayGanzhi(item.day);
      setMonthBranch(item.month);
      setCandidate('');
      setResult({
        question: item.question,
        coins: item.coins,
        calc,
        reading: chooseTraditionalReading(calc),
        chart,
        at: item.clock,
      });
      setPicked(calc.base.wenwang_order);
      setError('');
      setTab('cast');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className={`shell${embedded ? ' embedded' : ''}`}>
      {!embedded && (
        <a className="back yj-back" href="../">← 返回</a>
      )}
      <section className="yj-hero">
        <span className="yj-eyebrow">I CHING · 周易</span>
        <h1 className="yj-hero-title">
          <span className="cn">易经</span>
          <span className="thin">六爻</span>
        </h1>
        <p className="yj-hero-sub">铜钱起卦 · 卦爻辞 · 启蒙取辞 · 六爻纳甲</p>
      </section>
      <div className="tabs">
        <button className={tab === 'cast' ? 'on' : undefined} onClick={() => setTab('cast')} type="button">起卦</button>
        <button className={tab === 'atlas' ? 'on' : undefined} onClick={() => setTab('atlas')} type="button">六十四卦</button>
      </div>

      {tab === 'cast' && (
        <>
          <section className="card">
            <div className="row">
              <label className="field grow">
                所占之事
                <textarea value={question} maxLength={500} onChange={(event) => setQuestion(event.target.value)} placeholder="可留空。只记录所问，不参与起卦。" />
              </label>
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <div className="seg">
                <button className={mode === 'coins' ? 'on' : undefined} type="button" onClick={() => setMode('coins')}>铜钱</button>
                <button className={mode === 'manual' ? 'on' : undefined} type="button" onClick={() => setMode('manual')}>手动</button>
              </div>
              <label className="field">
                起卦时间
                <input type="datetime-local" value={clock} onChange={(event) => setClock(event.target.value)} />
              </label>
              <button className="go cast-go btn-primary" type="button" onClick={cast}>{mode === 'coins' ? '摇卦' : '成卦'}<span className="arrow">→</span></button>
            </div>
            {mode === 'manual' && (
              <div className="manual">
                {LINE_LABEL.map((label, index) => (
                  <label key={label}>
                    {label}
                    <select
                      value={manual[index]}
                      onChange={(event) => {
                        const next = [...manual];
                        next[index] = Number(event.target.value);
                        setManual(next);
                      }}
                    >
                      {[6, 7, 8, 9].map((value) => <option key={value} value={value}>{value} {VALUE_NAME[value]}</option>)}
                    </select>
                  </label>
                ))}
              </div>
            )}
            <p className="note">
              <label>
                <input type="checkbox" checked={handCalendar} onChange={(event) => setHandCalendar(event.target.checked)} />
                {' '}手动日柱、月建
              </label>
              {handCalendar && (
                <>
                  {' '}
                  <select value={dayGanzhi} onChange={(event) => setDayGanzhi(event.target.value)}>
                    {SEXAGENARY.map((item) => <option key={item}>{item}</option>)}
                  </select>
                  {' '}
                  <select value={monthBranch} onChange={(event) => setMonthBranch(event.target.value)}>
                    {EARTHLY_BRANCHES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </>
              )}
            </p>
            {error && <p className="err">{error}</p>}
            <p className="note">
              <label className="field">
                占问类别（只用神对照，不自动取一爻）
                <select value={category} onChange={(event) => { setCategory(event.target.value); setCandidate(''); }}>
                  <option value="">不限六亲</option>
                  {QUESTION_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
            </p>
            <p className="note">铜钱：背面为 2、字面为 3，三枚相加。6、9 为动爻。取辞用《易学启蒙通释》考变占；纳甲与用神、冲合用《增删卜易》。卦爻辞是维基文库《周易》经文，CC BY-SA 4.0。本机记录只存在这台浏览器，不是桌面版的历史库。</p>
          </section>

          {history.length > 0 && (
            <section className="card">
              <h2 className="hex-name">本机记录</h2>
              <div className="lines">
                {history.map((item) => (
                  <article key={item.at}>
                    <button className="ghost" type="button" onClick={() => openSaved(item)}>
                      {item.question || '未写所占'} · {item.day}日 {item.month}月 · {item.lines.join('')}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {result && (
            <>
              <section className="card">
                {result.question && <p className="sub">问 · {result.question}</p>}
                <div className="pair">
                  <div>
                    <h2 className="hex-name">{result.calc.base.title}</h2>
                    <p className="sub">第 {result.calc.base.wenwang_order} 卦 · {result.calc.base.upper_trigram.image}上{result.calc.base.lower_trigram.image}下</p>
                    <Glyph lines={result.calc.lines} />
                  </div>
                  <div>
                    <h2 className="hex-name">{result.calc.changed.title}</h2>
                    <p className="sub">之卦 · 第 {result.calc.changed.wenwang_order} 卦{result.calc.movingPositions.length === 0 ? ' · 无动爻' : ''}</p>
                    <Glyph lines={result.calc.changedLines} />
                  </div>
                </div>
                {result.coins && (
                  <p className="note">
                    {result.coins.map((line, index) => `${LINE_LABEL[index]} ${line.coins.join('+')}=${line.value}`).join(' · ')}
                  </p>
                )}
                <p>{result.calc.base.judgment}</p>
              </section>
              <section className="card">
                <h2 className="hex-name">取辞</h2>
                <p className="sub">{result.reading.rulesetName}</p>
                {result.reading.passages.map((item) => (
                  <div className={item.primary ? 'pass' : 'pass dim'} key={`${item.label}-${item.text}`}>
                    <b>{item.primary ? '主' : '参照'} · {item.label}</b>
                    <p>{item.text}</p>
                  </div>
                ))}
                <p className="note">{result.reading.plain}</p>
                <p className="note">{result.reading.limit}</p>
                <p className="note"><a href={result.reading.sourceUrl} target="_blank" rel="noopener noreferrer">取辞依据</a></p>
              </section>
              <section className="card">
                <h2 className="hex-name">{result.chart.palace}宫 · {result.chart.palacePosition}</h2>
                <p className="sub">
                  日 {result.chart.dayGanzhi} · 月建 {result.chart.monthBranch} · 旬空 {result.chart.xunkong.join('')}
                  · 世 {LINE_LABEL[result.chart.world - 1]} · 应 {LINE_LABEL[result.chart.response - 1]}
                </p>
                <div className="pair">
                  <Board chart={result.chart} which="base" />
                  <Board chart={result.chart} which="changed" />
                </div>
                <p className="note">{result.chart.note}</p>
                <p className="note">{result.chart.calendarNote}</p>
              </section>
              {analysis && (
                <section className="card">
                  <h2 className="hex-name">用神与冲合</h2>
                  <p className="sub">{analysis.categoryLabel ?? '未选类别'} · 不裁定吉凶</p>
                  <p className="note">{analysis.basis}</p>
                  <div className="lines">
                    {analysis.candidates.map((item) => (
                      <article key={item.id}>
                        <button className={candidate === item.id ? 'go' : 'ghost'} type="button" onClick={() => setCandidate(candidate === item.id ? '' : item.id)}>
                          {item.kind} · {LINE_LABEL[item.position - 1]} · {item.relative} {item.stem}{item.branch}{item.element}
                          {item.flying ? ` · 飞 ${item.flying}` : ''}
                        </button>
                      </article>
                    ))}
                  </div>
                  {analysis.selection && <p>手动指定：{LINE_LABEL[analysis.selection.position - 1]} {analysis.selection.relative}</p>}
                  <h3>日月</h3>
                  {analysis.time.map((line) => (
                    <p key={line.position} className="note">
                      {LINE_LABEL[line.position - 1]} {line.branch}{line.element}
                      {' · 月：'}{timeElementText(line.monthElement)}
                      {' · 日：'}{timeElementText(line.dayElement)}
                      {line.monthBreak ? ' · 月破' : ''}
                      {line.dayClash ? ' · 日冲' : ''}
                      {line.monthRelation === '六合' ? ' · 月合' : ''}
                      {line.dayRelation === '六合' ? ' · 日合' : ''}
                      {line.xunkong ? ' · 旬空' : ''}
                    </p>
                  ))}
                  <h3>地支</h3>
                  <p className="note">
                    {analysis.baseKind ? `本卦${analysis.baseKind}` : '本卦不是六合卦或六冲卦'}
                    {' · '}
                    {analysis.changedKind ? `之卦${analysis.changedKind}` : '之卦不是六合卦或六冲卦'}
                  </p>
                  {[...analysis.basePairs.map((pair) => ({ scope: '本卦', pair })), ...analysis.changedPairs.map((pair) => ({ scope: '之卦', pair }))].map(({ scope, pair }) => (
                    <p key={`${scope}-${pair.positions.join('-')}-${pair.relation}`} className="note">
                      {scope}{pair.relation} · {LINE_LABEL[pair.positions[0] - 1]}{pair.branches[0]} · {LINE_LABEL[pair.positions[1] - 1]}{pair.branches[1]}
                    </p>
                  ))}
                  {analysis.basePairs.length + analysis.changedPairs.length === 0 && <p className="note">没有表列的六合或六冲配对。</p>}
                  <h3>动变</h3>
                  {analysis.moving.length === 0 && <p className="note">本卦没有动爻。</p>}
                  {analysis.moving.map((item) => (
                    <p key={item.position} className="note">
                      {LINE_LABEL[item.position - 1]} {item.from} → {item.to} · {movingElementText(item.element)}
                      {item.branch ? ` · 地支${item.branch}` : ''}
                    </p>
                  ))}
                  <p className="note">日冲不自动判作暗动或日破。月破、旬空和回头生克都不等于吉凶。</p>
                </section>
              )}
            </>
          )}
        </>
      )}

      {tab === 'atlas' && (
        <>
          <section className="card">
            <div className="atlas">
              {HEXAGRAMS.map((item) => (
                <button className={item.wenwang_order === picked ? 'on' : undefined} key={item.wenwang_order} type="button" onClick={() => setPicked(item.wenwang_order)}>
                  {item.name}
                  <small>{item.wenwang_order}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="card">
            <h2 className="hex-name">{pickedHex.title}</h2>
            <p className="sub">{pickedHex.upper_trigram.name}上 {pickedHex.lower_trigram.name}下 · {guide?.one_liner ?? ''}</p>
            <p>{pickedHex.judgment}</p>
            {pickedHex.special_line && <p>{pickedHex.special_line.text}</p>}
            <div className="lines">
              {pickedHex.line_texts.map((text, index) => (
                <article key={text}>
                  <h3>{text}</h3>
                  {guide?.line_guides[String(index + 1)] && <p>{guide.line_guides[String(index + 1)]}</p>}
                </article>
              ))}
            </div>
            {guide && <p className="note">{guide.overview}</p>}
            <p className="note">
              经文 <a href={pickedHex.source_url} target="_blank" rel="noopener noreferrer">维基文库修订 {pickedHex.source_revision_id}</a>
              {guide?.references.map((ref) => <span key={ref.url}> · <a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.title}</a></span>)}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
