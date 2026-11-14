import { useEffect, useMemo, useRef, useState } from 'react';
import type { Region } from '../lib/regions';

type RegionMod = typeof import('../lib/regions');

export default function CityCombo({ name, onChange }: { name: string; onChange: (name: string, lng: number) => void }) {
  const [mod, setMod] = useState<RegionMod | null>(null);
  const [text, setText] = useState(name);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const ensure = () => {
    if (!mod) import('../lib/regions').then(setMod).catch(() => {});
  };
  useEffect(() => setText(name), [name]);
  useEffect(() => {
    if (open) ensure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const list = useMemo(() => (mod ? mod.searchRegions(q, 80) : []), [mod, q]);

  const pick = (r: Region) => {
    onChange(r.display, r.lng);
    setText(r.display);
    setOpen(false);
    setQ('');
  };

  return (
    <div className="combo" ref={ref}>
      <input
        className="ti"
        value={text}
        placeholder="搜索省 / 市 / 区县（如 长安区）"
        aria-label="出生地点"
        onFocus={() => {
          ensure();
          setOpen(true);
          setQ('');
        }}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          setQ(v);
          setOpen(true);
          const hit = mod?.regionByName(v.trim());
          if (hit) onChange(hit.display, hit.lng);
        }}
        onBlur={() =>
          setTimeout(() => {
            setOpen(false);
            const c = mod?.regionByName(text.trim());
            setText(c ? c.display : name);
          }, 150)
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const hit = mod?.regionByName(text.trim()) || list[0];
            if (hit) pick(hit);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      <span className="unit">地</span>
      {open && (
        <div className="combo-regions">
          <div className="cr-head">
            {q ? `搜索“${q}”` : '常用城市'} · 共 {mod ? mod.REGION_LIST.length : '…'} 个区县
          </div>
          <ul className="combo-list">
            {!mod ? (
              <li className="empty">加载地址库…</li>
            ) : list.length ? (
              list.map((r) => (
                <li
                  key={r.full}
                  className={r.display === name ? 'on' : ''}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(r);
                  }}
                >
                  <span className="rn">{r.county}</span>
                  <span className="rs">{r.sub}</span>
                </li>
              ))
            ) : (
              <li className="empty">无匹配，试试区/县名</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
