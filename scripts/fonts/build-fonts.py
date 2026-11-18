#!/usr/bin/env python3
"""Vendor the web fonts into public/fonts (no runtime requests to Google Fonts).

What it does
1. Fetches the exact Google Fonts CSS each page used before (same families / weights),
   downloads every woff2 slice Google serves (variable fonts, sliced by unicode-range).
2. Subsets ONLY the CJK ideograph code points of each slice to:
     GB2312 (6,763 hanzi)  ∪  every hanzi that appears in this repo's text
     (src/, data/, public/ incl. the ziwei/yijing builds, *.html).
   Everything else in a slice (Latin, punctuation, kana, symbols, OpenType features,
   vertical metrics, hinting, variation tables) is kept unchanged, so glyph outlines
   and metrics are identical to what Google served.
3. Writes per-page CSS with the same @font-face descriptors as Google's CSS (family,
   style, weight, font-display: swap), local URLs, and unicode-range narrowed to the
   code points actually present. Hanzi outside the subset fall back to the next font
   in each page's font-family stack (Songti SC / SimSun / serif ...).

Usage:  pip install fonttools brotli && python3 scripts/fonts/build-fonts.py
Needs network access to fonts.googleapis.com / fonts.gstatic.com (build time only).
"""
import hashlib, io, json, os, re, sys, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'public', 'fonts')
CACHE = os.path.join(ROOT, '.cache', 'gfonts')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
BASE = 'https://fonts.googleapis.com/css2?'
CORM_FULL = 'family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500'
SANS = 'family=Noto+Sans+SC:wght@300;400;500;600'
# The exact queries each page used before vendoring (kept so weights match 1:1).
PAGES = {
    'fonts-app.css': f'{CORM_FULL}&{SANS}&family=Noto+Serif+SC:wght@300;400;500;600;700;900&display=swap',
    'fonts-yijing.css': f'family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&{SANS}&family=Noto+Serif+SC:wght@400;500;600;700&display=swap',
    'fonts-intro.css': f'{CORM_FULL}&{SANS}&family=Noto+Serif+SC:wght@400;500;600;700;900&display=swap',
    # 导出的独立 HTML 命书（src/lib/exporters.ts）按绝对地址引用这份
    'fonts-export.css': 'family=Noto+Serif+SC:wght@300;400;600;700&family=Cormorant+Garamond:wght@400;500;600&display=swap',
}
LICENSES = {
    'OFL-NotoSerifSC.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifsc/OFL.txt',
    'OFL-NotoSansSC.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanssc/OFL.txt',
    'OFL-CormorantGaramond.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/OFL.txt',
}
TEXT_EXT = ('.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.html', '.css', '.md', '.txt')


def get(url, binary=False):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, hashlib.sha1(url.encode()).hexdigest())
    if not os.path.exists(p):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    body = r.read()
                break
            except OSError:
                if attempt == 3:
                    raise
        with open(p, 'wb') as f:
            f.write(body)
    data = open(p, 'rb').read()
    return data if binary else data.decode('utf-8')


def is_han(c):
    return 0x3400 <= c <= 0x4DBF or 0x4E00 <= c <= 0x9FFF or 0xF900 <= c <= 0xFAFF or 0x20000 <= c <= 0x3FFFF


def corpus():
    s = set()
    for c in range(0x4E00, 0xA000):
        try:
            chr(c).encode('gb2312'); s.add(c)
        except UnicodeEncodeError:
            pass
    roots = ['src', 'data', 'public', 'index.html', 'yijing.html', os.path.join('docs', 'index.html')]
    for r in roots:
        p = os.path.join(ROOT, r)
        files = [p] if os.path.isfile(p) else [os.path.join(dp, f) for dp, _, fn in os.walk(p) for f in fn]
        for f in files:
            if os.path.join('public', 'fonts') in f or not f.endswith(TEXT_EXT):
                continue
            try:
                s |= {ord(ch) for ch in open(f, encoding='utf-8').read() if is_han(ord(ch))}
            except (UnicodeDecodeError, OSError):
                pass
    return s


def parse_range(txt):
    out = set()
    for part in txt.split(','):
        part = part.strip()[2:]
        a, _, b = part.partition('-')
        out |= set(range(int(a, 16), int(b or a, 16) + 1))
    return out


def fmt_range(cps):
    cps = sorted(cps); out = []; i = 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1:
            j += 1
        out.append(f'U+{cps[i]:X}' if i == j else f'U+{cps[i]:X}-{cps[j]:X}')
        i = j + 1
    return ', '.join(out)


def slug(fam):
    return fam.lower().replace(' ', '-')


def main():
    os.makedirs(OUT, exist_ok=True)
    keep_han = corpus()
    print(f'hanzi kept: {len(keep_han)} (GB2312 ∪ repo text)')
    counters = {}
    done = {}  # google url -> (local name, cmap set)
    manifest = {'hanzi_kept': len(keep_han), 'files': {}}
    for css_name, q in PAGES.items():
        css = get(BASE + q)
        blocks = re.findall(r'(/\*[^*]*\*/)?\s*@font-face\s*\{(.*?)\}', css, re.S)
        out = ['/* Vendored from Google Fonts by scripts/fonts/build-fonts.py — SIL OFL 1.1, see OFL-*.txt. */']
        for comment, b in blocks:
            fam = re.search(r"font-family: '([^']+)'", b).group(1)
            style = re.search(r'font-style: (\w+)', b).group(1)
            weight = re.search(r'font-weight: (\d+)', b).group(1)
            url = re.search(r'url\(([^)]+)\)', b).group(1)
            rng = parse_range(re.search(r'unicode-range: ([^;]+);', b).group(1))
            label = (comment or '').strip('/* ').replace('[', '').replace(']', '')
            if url not in done:
                key = (fam, style)
                counters[key] = counters.get(key, -1) + 1
                name = f'{slug(fam)}{"-italic" if style == "italic" else ""}-{label or "%03d" % counters[key]}.woff2'
                font = TTFont(io.BytesIO(get(url, binary=True)), recalcTimestamp=False)
                cmap = set(font.getBestCmap())
                want = {c for c in cmap if not is_han(c) or c in keep_han}
                if want != cmap:
                    opts = subset.Options()
                    opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.name_languages = ['*']
                    opts.notdef_outline = True; opts.glyph_names = True; opts.hinting = True
                    opts.legacy_kern = True; opts.drop_tables = []; opts.passthrough_tables = True
                    opts.prune_unicode_ranges = False; opts.recalc_bounds = False; opts.recalc_timestamp = False
                    opts.flavor = 'woff2'
                    sub = subset.Subsetter(opts); sub.populate(unicodes=want); sub.subset(font)
                    font.flavor = 'woff2'
                    buf = io.BytesIO(); font.save(buf); data = buf.getvalue()
                else:
                    data = get(url, binary=True)
                if want:
                    open(os.path.join(OUT, name), 'wb').write(data)
                    manifest['files'][name] = {'bytes': len(data), 'source': url, 'codepoints': len(want)}
                done[url] = (name, want)
            name, have = done[url]
            eff = rng & have
            if not eff:
                continue
            out.append("@font-face{font-family:'%s';font-style:%s;font-weight:%s;font-display:swap;src:url(./%s) format('woff2');unicode-range:%s}"
                       % (fam, style, weight, name, fmt_range(eff)))
        open(os.path.join(OUT, css_name), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
        print(css_name, len(out) - 1, 'faces')
    for fn, u in LICENSES.items():
        open(os.path.join(OUT, fn), 'w', encoding='utf-8').write(get(u))
    manifest['total_bytes'] = sum(v['bytes'] for v in manifest['files'].values())
    json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w'), indent=1, ensure_ascii=False)
    print('files', len(manifest['files']), 'total MB', round(manifest['total_bytes'] / 1e6, 2))


if __name__ == '__main__':
    sys.exit(main())
