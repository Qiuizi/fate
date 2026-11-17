import { useEffect, useMemo, useState } from 'react';
import { BaziInput, lunarLeapMonthOf, resolveCivilSolar, trueSolarDelta } from '../lib/bazi';
import { chinaDSTRange, dstInputKey, dstMinusOneHour, isChinaDST } from '../lib/dstCn';
import { SHICHEN, shichenOf } from '../lib/elements';
import { lunarMonthDays } from '../lib/extras';
import DateTriple from './DateTriple';
import CityCombo from './CityCombo';

interface Props {
  input: BaziInput;
  setInput: (patch: Partial<BaziInput>) => void;
  onSubmit: () => void;
}

const pad = (x: number) => String(x).padStart(2, '0');

function isCivilNow(input: BaziInput, now = new Date()) {
  return (
    input.calendar === 'solar' &&
    !input.isLeapMonth &&
    input.year === now.getFullYear() &&
    input.month === now.getMonth() + 1 &&
    input.day === now.getDate()
  );
}

function fillNow(): Partial<BaziInput> {
  const n = new Date();
  return {
    calendar: 'solar',
    year: n.getFullYear(),
    month: n.getMonth() + 1,
    day: n.getDate(),
    hour: n.getHours(),
    minute: n.getMinutes(),
    isLeapMonth: false,
  };
}

function daysInSolarMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function midpointHour(zhi: string) {
  const s = SHICHEN.find((x) => x.zhi === zhi);
  if (!s) return 0;
  return (s.startHour + 1) % 24;
}

function NumField({
  value,
  onCommit,
  min,
  max,
  len = 2,
  widthClass,
  unit,
}: {
  value: number;
  onCommit: (n: number) => void;
  min: number;
  max: number;
  len?: number;
  widthClass?: string;
  unit: string;
}) {
  const fmt = (n: number) => (len === 4 ? String(n) : String(n).padStart(2, '0'));
  const [t, setT] = useState(fmt(value));
  useEffect(() => setT(fmt(value)), [value, len]);
  const commit = () => {
    // 0 是合法值（00 时 / 00 分）；空串和非法输入才退回原值
    const parsed = t === '' ? NaN : Number(t);
    const n = Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : value));
    setT(fmt(n));
    onCommit(n);
  };
  return (
    <div className={`field ${widthClass || ''}`}>
      <input
        className="ti"
        type="text"
        inputMode="numeric"
        value={t}
        maxLength={len}
        aria-label={unit}
        onChange={(e) => {
          const s = e.target.value.replace(/[^\d]/g, '').slice(0, len);
          setT(s);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
      <span className="unit">{unit}</span>
    </div>
  );
}

export default function ChartForm({ input, setInput, onSubmit }: Props) {
  const isLunar = input.calendar === 'lunar';
  const [advOpen, setAdvOpen] = useState(false);
  // 用户点过「减 1 小时」后记下结果签名；之后只要日期 / 时间没再改，就显示「已按标准时间调整」
  const [dstAdjustedKey, setDstAdjustedKey] = useState<string | null>(null);
  const dstAdjusted = dstAdjustedKey !== null && dstAdjustedKey === dstInputKey(input);
  const atNow = isCivilNow(input);

  const dstDate = useMemo(() => {
    try {
      const civil = resolveCivilSolar(input);
      return isChinaDST(civil.y, civil.m, civil.d) ? civil : null;
    } catch {
      return null;
    }
  }, [input]);

  const activeShichen = shichenOf(input.hour);
  // 该农历年的闰月：只有录入月份恰好是闰月所在月时，闰月开关才有意义
  const leapMonth = useMemo(() => (isLunar ? lunarLeapMonthOf(input.year) : 0), [isLunar, input.year]);
  const leapAvailable = isLunar && leapMonth === input.month;
  useEffect(() => {
    if (input.isLeapMonth && !leapAvailable) setInput({ isLeapMonth: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input.isLeapMonth, leapAvailable]);

  function setCalendar(cal: 'solar' | 'lunar') {
    const md = cal === 'lunar' ? lunarMonthDays(input.year, input.month, false) : daysInSolarMonth(input.year, input.month);
    setInput({ calendar: cal, isLeapMonth: false, day: Math.min(input.day, md) });
  }

  // 真太阳时实时预览（农历录入先换算成公历，再按与排盘完全相同的公式计算）
  const tstPreview = useMemo(() => {
    if (!input.trueSolar) return null;
    let civil;
    try {
      civil = resolveCivilSolar(input);
    } catch {
      return null;
    }
    const { eot, deltaMinutes: delta } = trueSolarDelta(input, civil);
    const ms = Date.UTC(civil.y, civil.m - 1, civil.d, civil.hh, civil.mm) + delta * 60000;
    const t = new Date(Math.round(ms));
    return {
      delta,
      eot,
      hh: t.getUTCHours(),
      mm: t.getUTCMinutes(),
      dayShift: t.getUTCDate() !== civil.d,
    };
  }, [input]);

  return (
    <div className="card form-card">
      {/* 历法 + 性别 */}
      <div className="form-row">
        <div className="row-key">
          历法 <em>CAL</em>
        </div>
        <div className="row-body">
          <div className="seg">
            <button className={!isLunar ? 'on' : ''} onClick={() => setCalendar('solar')}>
              公历
            </button>
            <button className={isLunar ? 'on' : ''} onClick={() => setCalendar('lunar')}>
              农历
            </button>
          </div>
          {isLunar && (
            <label
              className={`switch-line${leapAvailable ? '' : ' is-disabled'}`}
              style={{ marginLeft: 4 }}
              title={leapMonth ? `${input.year} 年闰${leapMonth}月` : `${input.year} 年无闰月`}
            >
              <button
                className={`switch ${input.isLeapMonth ? 'on' : ''}`}
                disabled={!leapAvailable}
                onClick={() => {
                  const leap = !input.isLeapMonth;
                  const md = lunarMonthDays(input.year, input.month, leap);
                  setInput({ isLeapMonth: leap, day: Math.min(input.day, md) });
                }}
                aria-label="闰月"
              />
              <small>{leapMonth ? `闰月（本年闰${leapMonth}月）` : '闰月（本年无）'}</small>
            </label>
          )}
          <span className="row-gap" aria-hidden="true" />
          <div className="seg">
            <button className={input.gender === 'male' ? 'on' : ''} onClick={() => setInput({ gender: 'male' })}>
              乾造 · 男
            </button>
            <button className={input.gender === 'female' ? 'on' : ''} onClick={() => setInput({ gender: 'female' })}>
              坤造 · 女
            </button>
          </div>
        </div>
      </div>

      {/* 生辰 */}
      <div className="form-row">
        <div className="row-key">
          生辰 <em className={atNow ? 'now-label' : undefined}>{atNow ? '此刻' : 'DATE'}</em>
        </div>
        <div className="row-body">
          <div className="date-fields">
            <DateTriple
              year={input.year}
              month={input.month}
              day={input.day}
              calendar={input.calendar}
              isLeapMonth={input.isLeapMonth ?? false}
              onChange={(y, m, d) => setInput({ year: y, month: m, day: d })}
            />
            <span style={{ width: 8 }} />
            <NumField value={input.hour} min={0} max={23} len={2} widthClass="w-h" unit="时" onCommit={(n) => setInput({ hour: n })} />
            <NumField value={input.minute} min={0} max={59} len={2} widthClass="w-mi" unit="分" onCommit={(n) => setInput({ minute: n })} />
            <button
              type="button"
              className={`now-fill${atNow ? ' on' : ''}`}
              title="填入当前时间"
              onClick={() => setInput(fillNow())}
            >
              此刻
            </button>
          </div>
          {dstAdjusted ? (
            <span className="cm-hint" style={{ flexBasis: '100%', lineHeight: 1.6 }}>
              已按标准时间调整（减 1 小时）。
            </span>
          ) : (
            dstDate && (
              <span className="cm-hint" style={{ flexBasis: '100%', lineHeight: 1.6 }}>
                该时间处于中国历史夏令时期间
                {chinaDSTRange(dstDate.y) ? `（${dstDate.y} 年 ${chinaDSTRange(dstDate.y)!.start}–${chinaDSTRange(dstDate.y)!.end}）` : ''}
                。此处只提示、不自动改时间；若填的是当年钟表读数，可
                <button
                  type="button"
                  className="ref-link"
                  style={{ marginLeft: 4 }}
                  onClick={() => {
                    const next = dstMinusOneHour(input.calendar, dstDate);
                    setDstAdjustedKey(dstInputKey({ calendar: input.calendar, ...next }));
                    setInput(next);
                  }}
                >
                  减 1 小时
                </button>
              </span>
            )
          )}
        </div>
      </div>

      {/* 时辰 */}
      <div className="form-row">
        <div className="row-key">
          时辰 <em>HOUR</em>
        </div>
        <div className="row-body">
          <div className="chips">
            {SHICHEN.map((s) => (
              <button
                key={s.zhi}
                className={`chip ${activeShichen === s.zhi ? 'on' : ''}`}
                onClick={() => setInput({ hour: midpointHour(s.zhi), minute: 0 })}
                title={`${s.label} ${s.range}时`}
              >
                <span className="cz">{s.zhi}</span>
                <span className="cr">{s.range}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 真太阳时 */}
      <div className="form-row">
        <div className="row-key">
          真太阳时 <em>SOLAR</em>
        </div>
        <div className="row-body">
          <label className="switch-line">
            <button
              className={`switch ${input.trueSolar ? 'on' : ''}`}
              onClick={() => setInput({ trueSolar: !input.trueSolar })}
              aria-label="启用真太阳时"
            />
            <span>{input.trueSolar ? '按出生地点校准' : '按北京时间（平太阳时）'}</span>
          </label>

          {input.trueSolar && (
            <>
              <CityCombo name={input.cityName || ''} onChange={(nm, lng) => setInput({ cityName: nm, longitude: lng })} />
              <label className="switch-line">
                <button
                  className={`switch ${input.useEot ? 'on' : ''}`}
                  style={{ width: 36, height: 21 }}
                  onClick={() => setInput({ useEot: !input.useEot })}
                  aria-label="叠加均时差"
                />
                <small>均时差</small>
              </label>
              {tstPreview && (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                  真太阳时 ≈ <b style={{ color: 'var(--ink-2)' }}>{pad(tstPreview.hh)}:{pad(tstPreview.mm)}</b>
                  <span style={{ color: 'var(--muted-2)' }}>
                    {' '}
                    （{tstPreview.delta >= 0 ? '+' : ''}
                    {tstPreview.delta.toFixed(1)} 分{tstPreview.dayShift ? ' · 跨日' : ''}）
                  </span>
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* 口径 */}
      <div className="form-row">
        <div className="row-key">
          口径 <em>RULES</em>
        </div>
        <div className="row-body" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <button className="adv-toggle" onClick={() => setAdvOpen((v) => !v)}>
            <span style={{ transform: advOpen ? 'rotate(90deg)' : 'none', transition: '0.25s', display: 'inline-block' }}>
              ›
            </span>
            {advOpen ? '收起高级口径' : '展开高级口径（子时换日 / 时区）'}
          </button>
          {advOpen && (
            <div className="adv-panel">
              <div className="adv-item">
                <label>子时换日</label>
                <div className="seg">
                  <button className={input.zishiSect === 1 ? 'on' : ''} onClick={() => setInput({ zishiSect: 1 })}>
                    23:00 换日
                  </button>
                  <button className={input.zishiSect === 2 ? 'on' : ''} onClick={() => setInput({ zishiSect: 2 })}>
                    00:00 换日
                  </button>
                </div>
              </div>
              <div className="adv-item">
                <label>所在时区</label>
                <div className="field" style={{ alignSelf: 'flex-start' }}>
                  <select value={input.utcOffset} onChange={(e) => setInput({ utcOffset: Number(e.target.value) })}>
                    {[5.5, 6, 7, 8, 9].map((o) => (
                      <option key={o} value={o}>
                        UTC{o >= 0 ? '+' : ''}
                        {o}
                      </option>
                    ))}
                  </select>
                  <span className="chev" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="submit-row">
        <button className="btn-primary" onClick={onSubmit}>
          开始排盘
          <span className="arrow">→</span>
        </button>
      </div>
      <p className="form-foot">
        以立春换年 · 以节气换月 · 日柱依干支纪日 · 可选真太阳时与子时换日口径
      </p>
    </div>
  );
}
