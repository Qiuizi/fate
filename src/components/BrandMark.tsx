interface Props {
  size?: number;
}

/** 品牌标志：墨色圆角印面上的四柱条形标记（金色一根为强调） */
export default function BrandMark({ size = 38 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" className="brand-mark">
      <rect x="0" y="0" width="40" height="40" rx="12" fill="var(--ink, #141519)" />
      <g strokeLinecap="round" strokeWidth="3">
        <line x1="11.5" y1="28.5" x2="11.5" y2="20.5" stroke="#ffffff" strokeOpacity="0.45" />
        <line x1="17.5" y1="28.5" x2="17.5" y2="13.5" stroke="#ffffff" strokeOpacity="0.92" />
        <line x1="23.5" y1="28.5" x2="23.5" y2="17" stroke="#ffffff" strokeOpacity="0.65" />
        <line x1="29.5" y1="28.5" x2="29.5" y2="11.5" stroke="var(--gold-2, #d2a659)" />
      </g>
    </svg>
  );
}
