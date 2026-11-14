import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BaziInput } from '../lib/bazi';
import { downloadFile } from '../lib/exporters';

export interface HistoryItem {
  id: string;
  label: string;
  ts: number;
  input: BaziInput;
  kind?: 'chart' | 'compat';
  bInput?: BaziInput;
  score?: number;
  name?: string;
  group?: string;
}

interface Props {
  items: HistoryItem[];
  onPick: (it: HistoryItem) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: Partial<HistoryItem>) => void;
  onReplace: (items: HistoryItem[]) => void;
  onClose: () => void;
}

export default function HistoryModal({ items, onPick, onDelete, onUpdate, onReplace, onClose }: Props) {
  const [filter, setFilter] = useState('全部');
  const [editing, setEditing] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const groups = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => set.add((i.group || '未分组').trim() || '未分组'));
    return ['全部', ...Array.from(set)];
  }, [items]);
  const shown = items.filter((i) => filter === '全部' || ((i.group || '未分组').trim() || '未分组') === filter);

  const exportJSON = () => {
    // 统一走 downloadFile：链接挂进 DOM、延迟回收 blob URL，避免点击后立即 revoke 导致下载失败
    downloadFile(`bazi-history-${Date.now()}.json`, JSON.stringify(items, null, 2), 'application/json');
  };
  const importJSON = (f: File) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const arr = JSON.parse(String(r.result));
        if (Array.isArray(arr)) onReplace(arr.filter((x) => x && x.input && x.id));
      } catch {
        /* ignore */
      }
    };
    r.readAsText(f);
  };

  return createPortal(
    <div className="hm-overlay" role="dialog" aria-modal="true" aria-label="历史记录">
      <div className="hm-panel">
        <div className="hm-top">
          <h3>历史 · 收藏</h3>
          <button className="hm-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="hm-tools">
          <button className="hm-tool" onClick={exportJSON}>
            导出备份
          </button>
          <button className="hm-tool" onClick={() => fileRef.current?.click()}>
            导入备份
          </button>
          <button className="hm-tool" onClick={() => items.length && onReplace([])}>
            清空
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJSON(f);
              e.target.value = '';
            }}
          />
        </div>
        <div className="hm-groups">
          {groups.map((g) => (
            <button key={g} className={`hm-gchip ${filter === g ? 'on' : ''}`} onClick={() => setFilter(g)}>
              {g}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <p className="hm-empty">还没有记录。排盘或合盘后会自动存入本地历史（仅本机）。</p>
        ) : (
          <ul className="hm-list">
            {shown.map((it) => (
              <li key={it.id} className="hm-item">
                <button className="hm-main" onClick={() => onPick(it)}>
                  <span className="hm-label">
                    {it.kind === 'compat' ? '合盘 · ' : ''}
                    {it.name || it.label}
                    {it.score != null ? `（${it.score}分）` : ''}
                  </span>
                  <span className="hm-sub">
                    {(it.group || '未分组').trim() || '未分组'} · {new Date(it.ts).toLocaleString()}
                  </span>
                </button>
                <button className="hm-edit" onClick={() => setEditing(editing === it.id ? null : it.id)} title="命名/分组">
                  ✎
                </button>
                <button className="hm-del" onClick={() => onDelete(it.id)} title="删除">
                  ✕
                </button>
                {editing === it.id && (
                  <div className="hm-editrow">
                    <input
                      className="hm-in"
                      placeholder="命名"
                      defaultValue={it.name || ''}
                      onBlur={(e) => onUpdate(it.id, { name: e.target.value })}
                    />
                    <input
                      className="hm-in"
                      placeholder="分组"
                      defaultValue={it.group || ''}
                      onBlur={(e) => onUpdate(it.id, { group: e.target.value })}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body
  );
}
