import { useEffect, useMemo, useState } from 'react';
import { BaziInput, BaziResult, computeBazi, defaultInputFromNow, lunarLeapMonthOf, resolveCivilSolar } from '../lib/bazi';
import { chinaDSTRange, dstInputKey, dstMinusOneHour, isChinaDST } from '../lib/dstCn';
import { ELEMENT_META } from '../lib/elements';
import { computeCompat, type CompatResult } from '../lib/compat';
import { buildCompatReportHTML } from '../lib/compatReport';
import { downloadFile } from '../lib/exporters';
import { exportCompatPDF } from '../lib/pdf';
import DateTriple from './DateTriple';
import CityCombo from './CityCombo';

interface Props {
  a: BaziResult;
  initialB?: BaziInput | null;
  onSaveCompat?: (bInput: BaziInput, bLabel: string, score: number) => void;
  onBack: () => void;
}

function FullSide({ r, label }: { r: BaziResult; label: string }) {
  return (
    <div className="im">
      <div className="im-head">
        <span className="im-label">{label}</span>
        <span className="im-dm">
          日主 <b style={{ color: ELEMENT_META[r.dayMaster.element].color }}>{r.dayMaster.gan}</b>
          {r.dayMaster.element} · 生肖{r.pillars[0].zhi} · {r.pillars[0].ganZhi}年
        </span>
      </div>
      <div className="im-grid">
        {r.pillars.map((p, i) => (
          <div className="im-col" key={i}>
            <div className="im-role">{['年', '月', '日', '时'][i]}柱</div>
            <div className="im-gan" style={{ color: ELEMENT_META[p.ganEl].color }}>
              {p.gan}
            </div>
            <div className="im-ss">{p.shiShen}</div>
            <div className="im-zhi" style={{ color: ELEMENT_META[p.zhiEl].color }}>
              {p.zhi}
            </div>
            <div className="im-hid">{p.hidden.map((h) => h.gan).join(' ')}</div>
            <div className="im-ny">{p.naYin}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CompatPage({ a, initialB, onSaveCompat, onBack }: Props) {
  const init = initialB;
  const fallback = defaultInputFromNow();
  const [gender, setGender] = useState<'male' | 'female'>(init?.gender ?? 'female');
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>(init?.calendar ?? 'solar');
  const [year, setYear] = useState(init?.year ?? fallback.year);
  const [month, setMonth] = useState(init?.month ?? fallback.month);
  const [day, setDay] = useState(init?.day ?? fallback.day);
  const [hour, setHour] = useState(init?.hour ?? fallback.hour);
  const [minute, setMinute] = useState(init?.minute ?? fallback.minute);
  const [isLeapMonth, setIsLeapMonth] = useState(init?.isLeapMonth ?? false);
  const [trueSolar, setTrueSolar] = useState(init?.trueSolar ?? false);
  const [useEot, setUseEot] = useState(init?.useEot ?? true);
  const [longitude, setLongitude] = useState(init?.longitude ?? 116.41);
  const [cityName, setCityName] = useState(init?.cityName ?? '北京');
  // 合盘页没有口径选项：对方沿用本命盘的时区与子时换日口径，保证双方日柱按同一规则起
  const [utcOffset] = useState(init?.utcOffset ?? a.input.utcOffset ?? 8);
  const [zishiSect] = useState<1 | 2>(init?.zishiSect ?? a.input.zishiSect ?? 2);
  const leapMonth = useMemo(() => (calendar === 'lunar' ? lunarLeapMonthOf(year) : 0), [calendar, year]);
  const leapAvailable = calendar === 'lunar' && leapMonth === month;
  useEffect(() => {
    if (isLeapMonth && !leapAvailable) setIsLeapMonth(false);
  }, [isLeapMonth, leapAvailable]);
  // 用户点过「减 1 小时」后记下结果签名；之后只要日期 / 时间没再改，就显示「已按标准时间调整」
  const [dstAdjustedKey, setDstAdjustedKey] = useState<string | null>(null);
  const dstAdjusted = dstAdjustedKey !== null && dstAdjustedKey === dstInputKey({ calendar, year, month, day, isLeapMonth, hour, minute });
  const dstDate = useMemo(() => {
    try {
      const civil = resolveCivilSolar({
        calendar,
        year,
        month,
        day,
        isLeapMonth,
        hour,
        minute,
        gender,
        trueSolar,
        useEot,
        longitude,
        utcOffset,
        zishiSect,
      });
      return isChinaDST(civil.y, civil.m, civil.d) ? civil : null;
    } catch {
      return null;
    }
  }, [calendar, year, month, day, isLeapMonth, hour, minute, gender, trueSolar, useEot, longitude, utcOffset, zishiSect]);
  const [b, setB] = useState<BaziResult | null>(null);
  const [res, setRes] = useState<CompatResult | null>(null);

  const run = (override?: BaziInput) => {
    const input: BaziInput = override ?? {
      calendar,
      year,
      month,
      day,
      hour,
      minute,
      gender,
      isLeapMonth,
      trueSolar,
      useEot,
      longitude,
      cityName,
      utcOffset,
      zishiSect,
    };
    let bb: BaziResult;
    try {
      bb = computeBazi(input, new Date().getFullYear());
    } catch (e) {
      console.warn('对方排盘失败', e);
      return;
    }
    setB(bb);
    const r2 = computeCompat(a, bb);
    setRes(r2);
    onSaveCompat?.(input, bb.solarText.slice(0, 10), r2.score);
  };

  useEffect(() => {
    if (initialB) run(initialB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportReport = () => {
    if (!b || !res) return;
    downloadFile('合盘报告.html', buildCompatReportHTML(a, b, res), 'text/html');
  };
  const exportPDF = () => {
    if (!b || !res) return;
    exportCompatPDF(a, b, res, '合盘报告.pdf').catch((e) => console.warn('合盘 PDF 导出失败', e));
  };

  const numInput = (v: number, set: (n: number) => void, min: number, max: number) => (
    <input
      className="ti cm-num"
      value={String(v)}
      inputMode="numeric"
      onChange={(e) => {
        const n = Number(e.target.value.replace(/[^\d]/g, '').slice(0, 2));
        set(Math.min(max, Math.max(min, isNaN(n) ? min : n)));
      }}
    />
  );

  return (
    <div className="compat-page">
      <div className="result-bar compat-bar">
        <div className="result-left">
          <button className="btn-ghost" onClick={onBack}>
            ← 返回命盘
          </button>
          <div className="result-crumb">
            <span>合盘 · 双人</span>
            <span style={{ color: 'var(--line-2)' }}>·</span>
            <span>以双方八字参合</span>
          </div>
        </div>
      </div>

      {!res || !b ? (
        <div className="compat-setup">
          <h2>对方生辰</h2>
          <div className="cm-row">
            <label>对方</label>
            <div className="seg">
              <button className={gender === 'female' ? 'on' : ''} onClick={() => setGender('female')}>
                坤造 · 女
              </button>
              <button className={gender === 'male' ? 'on' : ''} onClick={() => setGender('male')}>
                乾造 · 男
              </button>
            </div>
            <div className="seg">
              <button className={calendar === 'solar' ? 'on' : ''} onClick={() => setCalendar('solar')}>
                公历
              </button>
              <button className={calendar === 'lunar' ? 'on' : ''} onClick={() => setCalendar('lunar')}>
                农历
              </button>
            </div>
            {calendar === 'lunar' && (
              <label className={`switch-line${leapAvailable ? '' : ' is-disabled'}`}>
                <button
                  className={`switch ${isLeapMonth ? 'on' : ''}`}
                  disabled={!leapAvailable}
                  onClick={() => setIsLeapMonth((v) => !v)}
                  aria-label="闰月"
                />
                <small>{leapMonth ? `闰月（本年闰${leapMonth}月）` : '闰月（本年无）'}</small>
              </label>
            )}
          </div>
          <div className="cm-row">
            <label>生辰</label>
            <DateTriple
              year={year}
              month={month}
              day={day}
              calendar={calendar}
              isLeapMonth={isLeapMonth}
              onChange={(y, m, d) => {
                setYear(y);
                setMonth(m);
                setDay(d);
              }}
            />
            <div className="cm-time">
              {numInput(hour, setHour, 0, 23)}
              <span>时</span>
              {numInput(minute, setMinute, 0, 59)}
              <span>分</span>
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
                      const next = dstMinusOneHour(calendar, dstDate);
                      setDstAdjustedKey(dstInputKey({ calendar, ...next }));
                      setYear(next.year);
                      setMonth(next.month);
                      setDay(next.day);
                      setIsLeapMonth(next.isLeapMonth);
                      setHour(next.hour);
                      setMinute(next.minute);
                    }}
                  >
                    减 1 小时
                  </button>
                </span>
              )
            )}
          </div>
          <div className="cm-row">
            <label>真太阳时</label>
            <button className={`switch ${trueSolar ? 'on' : ''}`} onClick={() => setTrueSolar((v) => !v)} aria-label="真太阳时" />
            <span className="cm-hint">{trueSolar ? '按出生地点校准' : '北京时间（平太阳时）'}</span>
            {trueSolar && (
              <>
                <CityCombo
                  name={cityName}
                  onChange={(nm, lng) => {
                    setCityName(nm);
                    setLongitude(lng);
                  }}
                />
                <label className="switch-line">
                  <button className={`switch ${useEot ? 'on' : ''}`} style={{ width: 34, height: 20 }} onClick={() => setUseEot((v) => !v)} aria-label="均时差" />
                  <small>均时差</small>
                </label>
              </>
            )}
          </div>
          <button className="btn-primary cm-run" onClick={() => run()}>
            开始合盘<span className="arrow">→</span>
          </button>
          <p className="cm-tip">对方默认按北京时间（未启用真太阳时）；合盘为传统命理参考、非确定结论。</p>
        </div>
      ) : (
        <div className="compat-body">
          <div className="cp-overview">
            <div className="cm-score">
              <div className="cm-score-num">{res.score}</div>
              <div className="cm-score-meta">
                <div className="cm-score-level">{res.level}</div>
                <div className="cm-bar">
                  <span style={{ width: `${res.score}%` }} />
                </div>
              </div>
            </div>
            <div className="cm-dims">
              {res.dims.map((d) => (
                <div className="cp-dim" key={d.title}>
                  <span className="cp-dim-t">{d.title}</span>
                  <div className="cm-bar">
                    <span
                      style={{
                        width: `${d.score}%`,
                        background: d.tag === '需留意' ? 'linear-gradient(90deg,#a25a4c,#e0705c)' : undefined,
                      }}
                    />
                  </div>
                  <span className="cp-dim-s">{d.score}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="cm-sides">
            <FullSide r={a} label="本命 · 你" />
            <FullSide r={b} label="对方" />
          </div>

          <div className="cm-lucks">
            <div className="cm-block-title">大运同步</div>
            <div className="cl-row">
              <span className="cl-name">你</span>
              <div className="cl-track">
                {a.luck.slice(0, 8).map((l, i) => (
                  <span className={`cl-chip ${l.current ? 'on' : ''}`} key={i}>
                    {l.ganZhi}
                    <em>{l.startAge}</em>
                  </span>
                ))}
              </div>
            </div>
            <div className="cl-row">
              <span className="cl-name">对方</span>
              <div className="cl-track">
                {b.luck.slice(0, 8).map((l, i) => (
                  <span className={`cl-chip ${l.current ? 'on' : ''}`} key={i}>
                    {l.ganZhi}
                    <em>{l.startAge}</em>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="cm-items">
            {res.dims.map((d) => (
              <div className="cm-item" key={d.title}>
                <div className="cm-item-head">
                  <span className="cm-item-title">{d.title}</span>
                  <span className={`cm-tag ${d.tag === '吉' ? 'good' : d.tag === '平' ? 'mid' : 'warn'}`}>{d.tag}</span>
                </div>
                <p>{d.text}</p>
              </div>
            ))}
          </div>

          <div className="cm-summary">
            {res.paragraphs.map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>

          <div className="cm-actions">
            <button className="btn-ghost" onClick={exportReport}>
              导出报告
            </button>
            <button className="btn-ghost" onClick={exportPDF}>
              导出PDF
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setB(null);
                setRes(null);
              }}
            >
              重新输入对方
            </button>
            <button className="btn-primary" onClick={onBack}>
              返回命盘
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
