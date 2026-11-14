interface GearProps {
  chars: string;
  size?: number;
  duration?: number;
  reverse?: boolean;
  color?: string;
}

export default function Gear({ chars, size = 320, duration = 18, reverse = false, color = '#c9a961' }: GearProps) {
  const n = chars.length;
  const glyphs = Array.from(chars);
  return (
    <svg
      className={`gear ${reverse ? 'rev' : ''}`}
      viewBox="-100 -100 200 200"
      style={{ width: size, height: size, animationDuration: `${duration}s` }}
      aria-hidden="true"
    >
      {Array.from({ length: n }).map((_, i) => {
        const a = (360 / n) * i;
        return <rect key={'t' + i} x={-5} y={-97} width={10} height={21} rx={2.5} fill="none" stroke={color} strokeWidth={1.6} transform={`rotate(${a})`} opacity={0.9} />;
      })}
      <circle r={78} fill="none" stroke={color} strokeWidth={2.6} />
      <circle r={64} fill="none" stroke={color} strokeWidth={1} opacity={0.65} />
      <circle r={27} fill="none" stroke={color} strokeWidth={1.8} />
      {glyphs.map((ch, i) => {
        const a = ((360 / n) * i - 90) * (Math.PI / 180);
        const x = Math.cos(a) * 53;
        const y = Math.sin(a) * 53;
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="13.5" fill={color} fontFamily="'Noto Serif SC', serif">
            {ch}
          </text>
        );
      })}
    </svg>
  );
}
