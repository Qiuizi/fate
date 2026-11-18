#!/usr/bin/env python3
"""Generate the cross-check fixture: synthetic timestamps + independent reference results.

No real-person data: every timestamp is generated from a fixed random seed.

Reference = an implementation that does not use lunar-javascript:
  * Solar terms (节气): PyEphem (libastro / VSOP87) — apparent geocentric solar longitude of
    date, solved to < 1 s by bisection.  Cross-checked against sxtwl (寿星天文历 C++ port).
  * Year pillar: 立春 (λ=315°).  Month pillar: the 12 节 (λ=315°+30°k), 五虎遁 for the stem.
  * Day pillar: Julian Day Number arithmetic, (JDN − 11) mod 60.
  * Hour pillar: 五鼠遁; 23:00–24:00 is 子时 whose stem follows the NEXT day's stem.
    zishiSect 1 = day changes at 23:00; zishiSect 2 = day changes at 00:00 (晚子时日柱算当日).
  * True solar time: apparent solar time from PyEphem (local hour angle of the true sun + 12h).
  * 大运起运: exact minutes to the next / since the previous 节, 3 days = 1 year (linear).

Usage: pip install ephem sxtwl && python3 scripts/crosscheck/gen_reference.py
Writes scripts/crosscheck/cases.json (committed; the Node check needs no Python).
"""
import json, math, os, random
from datetime import datetime, timedelta
import ephem
import sxtwl
from importlib.metadata import version as _pkg_version

OUT = os.path.join(os.path.dirname(__file__), 'cases.json')
GAN = '甲乙丙丁戊己庚辛壬癸'
ZHI = '子丑寅卯辰巳午未申酉戌亥'
JIE = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒']  # λ = 315 + 30k
TZ = timedelta(hours=8)  # Beijing standard time (no DST: fate never auto-applies DST)


def gz(i):
    return GAN[i % 10] + ZHI[i % 12]


def sun_lon(d):
    s = ephem.Sun(d)
    return math.degrees(ephem.Ecliptic(ephem.Equatorial(s.ra, s.dec, epoch=d), epoch=d).lon)


def term_time(year, lon):
    """UT datetime when apparent solar longitude == lon, searched in Gregorian `year` (Beijing)."""
    # approximate day of year: 立春(315) ~ Feb 4; each 15° ~ 15.2 days
    approx = datetime(year, 3, 21) + timedelta(days=((lon - 0) % 360) * 365.2422 / 360)
    if approx.year > year:
        approx = approx.replace(year=year)
    lo, hi = ephem.Date(approx - timedelta(days=20)), ephem.Date(approx + timedelta(days=20))
    f = lambda d: ((sun_lon(d) - lon + 180) % 360) - 180
    for _ in range(60):
        mid = ephem.Date((lo + hi) / 2)
        if f(mid) < 0: lo = mid
        else: hi = mid
    return ephem.Date((lo + hi) / 2).datetime()


_terms = {}
def jie_list(year):
    """All 12 节 (Beijing time) whose Beijing date falls in Gregorian year; index k = month branch 寅+k."""
    if year not in _terms:
        out = []
        for k in range(12):
            t = term_time(year, (315 + 30 * k) % 360) + TZ
            if t.year != year:  # 小寒 (k=11) lies in early January of `year`
                t = term_time(year, (315 + 30 * k) % 360) + TZ
            out.append((t, k))
        _terms[year] = sorted(out)
    return _terms[year]


def surrounding_jie(t):
    allj = jie_list(t.year - 1) + jie_list(t.year) + jie_list(t.year + 1)
    prev = max(x for x in allj if x[0] <= t)
    nxt = min(x for x in allj if x[0] > t)
    return prev, nxt


_sx = {}
def sxtwl_jie(year):
    """sxtwl 节 times (Beijing) keyed by month index k, for cross-validating PyEphem."""
    if year not in _sx:
        out = {}
        for y in (year - 1, year, year + 1):
            for q in sxtwl.getJieQiByYear(y):
                if q.jqIndex % 2 == 1:
                    d = sxtwl.JD2DD(q.jd)
                    t = datetime(int(d.Y), int(d.M), int(d.D), int(d.h), int(d.m)) + timedelta(seconds=float(d.s))
                    out[t.replace(microsecond=0)] = ((q.jqIndex - 3) // 2) % 12
        _sx[year] = out
    return _sx[year]


def sxtwl_diff_seconds(t, k):
    best = min((abs((u - t).total_seconds()), kk) for u, kk in sxtwl_jie(t.year).items() if kk == k)
    return best[0]


def jdn(y, m, d):
    a = (14 - m) // 12; yy = y + 4800 - a; mm = m + 12 * a - 3
    return d + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045


def pillars(t, sect):
    """t = naive Beijing-time datetime of the (possibly true-solar-corrected) moment."""
    lichun = [x for x in jie_list(t.year) if x[1] == 0][0][0]
    ty = t.year if t >= lichun else t.year - 1
    yi = (ty - 4) % 60
    (pt, k), _ = surrounding_jie(t)
    mz = (2 + k) % 12
    # year that owns this month for 五虎遁: the 立春-year of t
    mg = ((yi % 10) % 5 * 2 + 2 + k) % 10
    month = GAN[mg] + ZHI[mz]
    dd = t.date()
    if sect == 1 and t.hour >= 23:
        dd = dd + timedelta(days=1)
    di = (jdn(dd.year, dd.month, dd.day) - 11) % 60
    hz = ((t.hour + 1) // 2) % 12
    stem_day = di
    if sect == 2 and t.hour >= 23:  # 晚子时: stem from the next day
        stem_day = (di + 1) % 60
    hg = ((stem_day % 10) % 5 * 2 + hz) % 10
    return [gz(yi), month, gz(di), GAN[hg] + ZHI[hz]], (pt, k)


def sxtwl_pillars(t, sect):
    tt = t + timedelta(days=1) if (sect == 1 and t.hour >= 23) else t
    day = sxtwl.fromSolar(tt.year, tt.month, tt.day)
    y = day.getYearGZ(False); m = day.getMonthGZ(); d = day.getDayGZ()
    h = sxtwl.fromSolar(t.year, t.month, t.day).getHourGZ(t.hour, True)  # 23:00 → 子时, stem from next day
    f = lambda g: GAN[g.tg] + ZHI[g.dz]
    # sxtwl year/month depend on time of day near 节; it works per day, so only compare day/hour.
    return [f(y), f(m), f(d), f(h)]


def true_solar(t_local, lon):
    """Apparent solar time (naive datetime) for a Beijing-time instant at east longitude lon."""
    ut = t_local - TZ
    o = ephem.Observer(); o.lon = str(lon); o.lat = '35'; o.date = ephem.Date(ut); o.pressure = 0
    s = ephem.Sun(o)
    ha = (o.sidereal_time() - s.ra) % (2 * math.pi)  # local apparent hour angle
    ast_hours = (math.degrees(ha) / 15 + 12) % 24
    base = ut + timedelta(hours=lon / 15)
    cand = datetime(base.year, base.month, base.day) + timedelta(hours=ast_hours)
    for c in (cand - timedelta(days=1), cand, cand + timedelta(days=1)):
        if abs((c - base).total_seconds()) < 3 * 3600:
            return c
    raise RuntimeError('tst')


def yun_ref(t, gender, year_stem):
    yang = GAN.index(year_stem) % 2 == 0
    forward = (yang and gender == 'male') or ((not yang) and gender == 'female')
    (pt, _), (nt, _) = surrounding_jie(t)
    mins = (nt - t).total_seconds() / 60 if forward else (t - pt).total_seconds() / 60
    years = mins / (3 * 1440)
    return forward, years


def rand_dt(rng, y0=1901, y1=2099):
    a = datetime(y0, 1, 1); b = datetime(y1, 12, 31, 23, 59)
    return a + timedelta(minutes=rng.randrange(int((b - a).total_seconds() // 60)))


def main():
    rng = random.Random(20261117)
    raw = []
    for _ in range(200):
        raw.append(('random', rand_dt(rng), None))
    for _ in range(120):
        y = rng.randrange(1901, 2100); k = rng.randrange(12)
        t = [x for x in jie_list(y) if x[1] == k][0][0]
        off = rng.choice([2, 3, 5, 10, 30, 60, 180]) * rng.choice([-1, 1])
        raw.append(('jie-boundary', (t + timedelta(minutes=off)).replace(second=0, microsecond=0), None))
    for _ in range(100):
        d = rand_dt(rng).date()
        hm = rng.choice([(22, 30), (22, 59), (23, 0), (23, 1), (23, 30), (23, 59), (0, 0), (0, 1), (0, 30), (0, 59), (1, 0), (1, 1)]
                        + [(rng.choice([22, 23, 0, 1]), rng.randrange(60))] * 4)
        raw.append(('midnight', datetime(d.year, d.month, d.day, *hm), None))
    for _ in range(80):
        lon = round(rng.uniform(73.5, 135.0), 2)
        raw.append(('true-solar', rand_dt(rng), lon))
    cases = []
    for i, (kind, t, lon) in enumerate(raw):
        gender = rng.choice(['male', 'female'])
        c = {'id': i, 'kind': kind, 'civil': t.strftime('%Y-%m-%d %H:%M'), 'gender': gender}
        eff = t
        if lon is not None:
            eff = true_solar(t, lon)
            c['longitude'] = lon
            c['refTrueSolar'] = eff.strftime('%Y-%m-%d %H:%M:%S')
            eff = eff.replace(microsecond=0)
        ref = {}
        for sect in (1, 2):
            p, (pt, k) = pillars(eff, sect)
            ref[f'sect{sect}'] = p
            ref[f'sxtwl{sect}'] = sxtwl_pillars(eff, sect)
        (pt, pk), (nt, nk) = surrounding_jie(eff)
        ref['prevJie'] = [JIE[pk], pt.strftime('%Y-%m-%d %H:%M:%S')]
        ref['nextJie'] = [JIE[nk], nt.strftime('%Y-%m-%d %H:%M:%S')]
        ref['ephemVsSxtwlSec'] = round(max(sxtwl_diff_seconds(pt, pk), sxtwl_diff_seconds(nt, nk)), 1)
        fwd, yrs = yun_ref(eff, gender, ref['sect2'][0][0])
        ref['yun'] = {'forward': fwd, 'startYears': round(yrs, 5)}
        c['ref'] = ref
        cases.append(c)
    worst = max(c['ref']['ephemVsSxtwlSec'] for c in cases)
    meta = {
        'ephemVsSxtwlMaxSeconds': worst,
        'seed': 20261117, 'count': len(cases),
        'reference': 'PyEphem %s (solar terms, apparent solar time) + JDN arithmetic; sxtwl %s as second check' % (ephem.__version__, _pkg_version('sxtwl')),
        'timezone': 'UTC+8 standard time, no DST',
    }
    json.dump({'meta': meta, 'cases': cases}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('wrote', OUT, len(cases))


if __name__ == '__main__':
    main()
