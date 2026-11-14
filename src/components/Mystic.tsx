import { CSSProperties } from 'react';
import { GAN_ELEMENT, ZHI_ELEMENT, ELEMENT_META, Element } from '../lib/elements';

const WUXING: Element[] = ['木', '火', '土', '金', '水'];

/** 返回某个命理字对应的五行颜色；非命理字返回 null */
export function mysticColor(ch: string): string | null {
  if (GAN_ELEMENT[ch]) return ELEMENT_META[GAN_ELEMENT[ch]].color;
  if (ZHI_ELEMENT[ch]) return ELEMENT_META[ZHI_ELEMENT[ch]].color;
  if ((WUXING as string[]).includes(ch)) return ELEMENT_META[ch as Element].color;
  return null;
}

interface MysticProps {
  text: string;
  className?: string;
  style?: CSSProperties;
}

/** 将文本中所有命理字（天干 / 地支 / 五行）按对应五行上色，其余原样输出 */
export default function Mystic({ text, className, style }: MysticProps) {
  const chars = Array.from(text);
  return (
    <span className={className} style={style}>
      {chars.map((ch, i) => {
        const color = mysticColor(ch);
        return color ? (
          <span key={i} style={{ color }}>
            {ch}
          </span>
        ) : (
          <span key={i}>{ch}</span>
        );
      })}
    </span>
  );
}
