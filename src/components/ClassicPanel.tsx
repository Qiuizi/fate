import { useMemo, useState } from 'react';
import { BaziResult } from '../lib/bazi';
import { buildClassicBook } from '../lib/classics';
import { buildClassicBookVerticalHTML } from '../lib/classicsReport';
import { exportBookPDF } from '../lib/pdf';
import { printHTML } from '../lib/print';

interface Props {
  result: BaziResult;
  openKey?: string | null;
  onOpen?: (key: string | null) => void;
}

const FONT_SIZES = [11.5, 12.5, 14];
const LIMITS = [380, 470, 560];

export default function ClassicPanel({ result, openKey = null, onOpen }: Props) {
  const sections = useMemo(() => buildClassicBook(result), [result]);
  const open = openKey;
  const active = sections.find((s) => s.key === open) || null;
  const [fontIdx, setFontIdx] = useState(1);
  const [limitIdx, setLimitIdx] = useState(1);
  const [pdfPreface, setPdfPreface] = useState(true);

  return (
    <div className="classics">
      <div className="rel-head">
        <h4>古籍断语</h4>
        <span className="en">CLASSICS</span>
        <span className="ss-note">点击标题展开 · 与上方命盘联动</span>
      </div>

      <div className="vbook-bar">
        <span className="vb-lbl">字号</span>
        <div className="seg mini">
          {['小', '中', '大'].map((t, i) => (
            <button key={t} className={fontIdx === i ? 'on' : ''} onClick={() => setFontIdx(i)}>
              {t}
            </button>
          ))}
        </div>
        <span className="vb-lbl">每页字数</span>
        <div className="seg mini">
          {['少', '中', '多'].map((t, i) => (
            <button key={t} className={limitIdx === i ? 'on' : ''} onClick={() => setLimitIdx(i)}>
              {t}
            </button>
          ))}
        </div>
        <button
          className="ref-link"
          onClick={() =>
            printHTML(
              buildClassicBookVerticalHTML(result, { fontSizePt: FONT_SIZES[fontIdx], limit: LIMITS[limitIdx] }),
              '命书·竖排线装'
            )
          }
        >
          竖排线装 →
        </button>
        <button className={`vbook-toggle ${pdfPreface ? 'on' : ''}`} onClick={() => setPdfPreface((v) => !v)}>
          含序跋
        </button>
        <button className="ref-link" onClick={() => exportBookPDF(result, { fontSizePt: FONT_SIZES[fontIdx], includePreface: pdfPreface })}>
          下载命书PDF →
        </button>
      </div>

      <div className="classic-tabs">
        {sections.map((s) => (
          <button
            key={s.key}
            className={`ct-chip ${open === s.key ? 'on' : ''}`}
            onClick={() => onOpen?.(open === s.key ? null : s.key || null)}
          >
            {s.title.replace(/ · .*/, '')}
          </button>
        ))}
      </div>

      <div className="classic-body">
        {active ? (
          <article className="classic-sec" key={active.key}>
            <div className="cs-head">
              <h5>{active.title}</h5>
              <span className="cs-src">{active.source}</span>
            </div>
            {active.paragraphs.map((p, j) =>
              p.quote ? (
                <blockquote className="cs-quote" key={j}>
                  「{p.text}」
                </blockquote>
              ) : (
                <p className="cs-p" key={j}>
                  {p.text}
                </p>
              )
            )}
          </article>
        ) : (
          <p className="classic-empty">
            点击上方任意标题展开对应断语：总论 · 五行旺衰 · 性情 · 格局 · 十神 · 六亲 · 事业 · 婚姻 · 健康 · 日柱 · 神煞 · 大运 · 总结。也可点上方日主、神煞、十神、日柱旁的「断语」直接跳转。
          </p>
        )}
      </div>

      <p className="classic-note">
        古籍断语为传统命理参考，非确定结论；原文以常见通行版本为准，扩展解读（标注“综合参论”）为据经典原则之归纳，仅供参考。
      </p>
    </div>
  );
}
