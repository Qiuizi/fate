import { useEffect, useRef, useState } from 'react';
import { Solar } from 'lunar-javascript';
import { lunarMonthDays } from '../lib/extras';

interface Props {
  year: number;
  month: number;
  day: number;
  calendar: 'solar' | 'lunar';
  isLeapMonth?: boolean;
  onChange: (y: number, m: number, d: number) => void;
}

const pad2 = (n: number) => String(n).padStart(2, '0');
const daysInSolar = (y: number, m: number) => new Date(y, m, 0).getDate();
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const DAY_CN = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
const FEST: Record<string, string> = {
  '1-1': '春节',
  '1-15': '元宵',
  '2-2': '龙抬头',
  '5-5': '端午',
  '7-7': '七夕',
  '7-15': '中元',
  '8-15': '中秋',
  '9-9': '重阳',
  '12-8': '腊八',
  '12-23': '小年',
};

function annotSolar(y: number, m: number, d: number) {
  try {
    const lunar: any = Solar.fromYmd(y, m, d).getLunar();
    const jq: string = lunar.getJieQi ? lunar.getJieQi() : '';
    const lm = lunar.getMonth();
    const ld = lunar.getDay();
    const fest = FEST[`${Math.abs(lm)}-${ld}`];
    const label = jq || fest || lunar.getDayInChinese();
    return { label, term: !!jq, fest: !!fest && !jq };
  } catch {
    return { label: '', term: false, fest: false };
  }
}

function useOutside(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, close]);
  return ref;
}

/* ---------- 年 ---------- */
function YearField({ year, onChange }: { year: number; onChange: (y: number) => void }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(Math.floor(year / 12) * 12);
  const [text, setText] = useState(String(year));
  useEffect(() => setText(String(year)), [year]);
  const ref = useOutside(open, () => setOpen(false));
  useEffect(() => {
    if (open) setPage(Math.floor(year / 12) * 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const commit = () => {
    const raw = text.trim();
    const n = Number(raw);
    if (!/^\d{4}$/.test(raw) || !Number.isFinite(n) || n < 1800 || n > 2100) {
      setText(String(year));
      return;
    }
    setText(String(n));
    onChange(n);
  };
  return (
    <div className="dfield w-year" ref={ref}>
      <input
        className="ti"
        value={text}
        inputMode="numeric"
        maxLength={4}
        aria-label="出生年"
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
      <span className="unit">年</span>
      <button className="df-chev" onClick={() => setOpen((o) => !o)} aria-label="选择年份">
        ▾
      </button>
      {open && (
        <div className="df-pop">
          <div className="df-year-head">
            <button onClick={() => setPage((p) => p - 12)}>‹</button>
            <span>
              {page} – {page + 11}
            </span>
            <button onClick={() => setPage((p) => p + 12)}>›</button>
          </div>
          <div className="df-years">
            {Array.from({ length: 12 }, (_, i) => page + i).map((y) => (
              <button
                key={y}
                className={`df-cell ${y === year ? 'on' : ''}`}
                onClick={() => {
                  onChange(y);
                  setOpen(false);
                }}
              >
                {y}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 月 ---------- */
function MonthField({ month, onChange }: { month: number; onChange: (m: number) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(pad2(month));
  useEffect(() => setText(pad2(month)), [month]);
  const ref = useOutside(open, () => setOpen(false));
  const commit = () => {
    const raw = text.trim();
    const n = Number(raw);
    if (!/^\d{1,2}$/.test(raw) || !Number.isFinite(n) || n < 1 || n > 12) {
      setText(pad2(month));
      return;
    }
    setText(pad2(n));
    onChange(n);
  };
  return (
    <div className="dfield w-month" ref={ref}>
      <input
        className="ti"
        value={text}
        inputMode="numeric"
        maxLength={2}
        aria-label="出生月"
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
      <span className="unit">月</span>
      <button className="df-chev" onClick={() => setOpen((o) => !o)} aria-label="选择月份">
        ▾
      </button>
      {open && (
        <div className="df-pop">
          <div className="df-months">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <button
                key={m}
                className={`df-cell ${m === month ? 'on' : ''}`}
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
              >
                {pad2(m)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 日 ---------- */
function DayField({
  year,
  month,
  day,
  calendar,
  isLeapMonth = false,
  onChange,
}: {
  year: number;
  month: number;
  day: number;
  calendar: 'solar' | 'lunar';
  isLeapMonth?: boolean;
  onChange: (y: number, m: number, d: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(pad2(day));
  const [vy, setVy] = useState(year);
  const [vm, setVm] = useState(month);
  useEffect(() => setText(pad2(day)), [day]);
  useEffect(() => {
    setVy(year);
    setVm(month);
  }, [year, month, open]);
  const ref = useOutside(open, () => setOpen(false));
  const effLeap = isLeapMonth && vm === month;
  const maxDay = calendar === 'lunar' ? lunarMonthDays(vy, vm, effLeap) : daysInSolar(vy, vm);
  const firstDow = calendar === 'lunar' ? 0 : new Date(vy, vm - 1, 1).getDay();
  const commit = () => {
    const raw = text.trim();
    const n = Number(raw);
    const mdParent = calendar === 'lunar' ? lunarMonthDays(year, month, isLeapMonth) : daysInSolar(year, month);
    if (!/^\d{1,2}$/.test(raw) || !Number.isFinite(n) || n < 1 || n > mdParent) {
      setText(pad2(day));
      return;
    }
    setText(pad2(n));
    onChange(year, month, n);
  };
  const stepMonth = (delta: number) => {
    let m = vm + delta;
    let y = vy;
    if (m < 1) {
      m = 12;
      y--;
    } else if (m > 12) {
      m = 1;
      y++;
    }
    setVm(m);
    setVy(y);
  };
  return (
    <div className="dfield w-day" ref={ref}>
      <input
        className="ti"
        value={text}
        inputMode="numeric"
        maxLength={2}
        aria-label="出生日"
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
      <span className="unit">日</span>
      <button className="df-chev" onClick={() => setOpen((o) => !o)} aria-label="选择日期">
        ▾
      </button>
      {open && (
        <div className="df-pop df-cal">
          <div className="dp-head">
            <button onClick={() => stepMonth(-1)}>‹</button>
            <span className="dp-label">
              {vy} 年 {pad2(vm)} 月
            </span>
            <button onClick={() => stepMonth(1)}>›</button>
          </div>
          {calendar !== 'lunar' && (
            <div className="dp-week">
              {WEEK.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
          )}
          <div className="dp-grid df-grid">
            {calendar !== 'lunar' && Array.from({ length: firstDow }).map((_, i) => <span className="dp-empty" key={'e' + i} />)}
            {Array.from({ length: maxDay }).map((_, i) => {
              const d = i + 1;
              const on = d === day && vm === month && vy === year;
              let label = '';
              let cls = '';
              if (calendar === 'lunar') {
                label = FEST[`${vm}-${d}`] || DAY_CN[d];
                if (FEST[`${vm}-${d}`]) cls = 'fest';
              } else {
                const a = annotSolar(vy, vm, d);
                label = a.label;
                cls = a.term ? 'term' : a.fest ? 'fest' : '';
              }
              return (
                <button key={d} className={`dp-day ${on ? 'on' : ''}`} onClick={() => onChange(vy, vm, d)} title={label}>
                  <span className="dnum">{pad2(d)}</span>
                  <span className={`dann ${cls}`}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DateTriple({ year, month, day, calendar, isLeapMonth = false, onChange }: Props) {
  const maxDay = (y: number, m: number) => (calendar === 'lunar' ? lunarMonthDays(y, m, isLeapMonth) : daysInSolar(y, m));
  const set = (y: number, m: number, d: number) => onChange(y, m, Math.min(d, maxDay(y, m)));
  return (
    <div className="date-triple">
      <YearField year={year} onChange={(y) => set(y, month, day)} />
      <MonthField month={month} onChange={(m) => set(year, m, day)} />
      <DayField year={year} month={month} day={day} calendar={calendar} isLeapMonth={isLeapMonth} onChange={set} />
    </div>
  );
}
