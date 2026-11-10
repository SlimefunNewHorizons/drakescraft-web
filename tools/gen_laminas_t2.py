#!/usr/bin/env python3
"""Genera las láminas SVG de los cantos de la Temporada 2 (assets/svg/t2/*.svg).

Dibujo vectorial propio: capas con degradados, resplandores y engranajes con dientes
reales calculados. Reproducible (semilla fija). Uso: python3 tools/gen_laminas_t2.py
"""
import math, random
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets" / "svg" / "t2"
W, H = 800, 500

def f(x):
    return f"{x:.1f}".rstrip("0").rstrip(".")

DEFS = """
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0820"/><stop offset=".55" stop-color="#1b1140"/><stop offset="1" stop-color="#2a1550"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3c8"/><stop offset=".35" stop-color="#f0c66e"/><stop offset=".7" stop-color="#b9842f"/><stop offset="1" stop-color="#6e4614"/></linearGradient>
<linearGradient id="goldV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset=".5" stop-color="#d9a64c"/><stop offset="1" stop-color="#7a4f17"/></linearGradient>
<linearGradient id="stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2d55"/><stop offset="1" stop-color="#120b22"/></linearGradient>
<linearGradient id="marble" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f86a8"/><stop offset=".45" stop-color="#f3eee2"/><stop offset="1" stop-color="#9a90b2"/></linearGradient>
<radialGradient id="endglow"><stop offset="0" stop-color="#f3c6ff"/><stop offset=".35" stop-color="#b44dff" stop-opacity=".85"/><stop offset="1" stop-color="#5b10a8" stop-opacity="0"/></radialGradient>
<radialGradient id="cyanglow"><stop offset="0" stop-color="#d6fffb"/><stop offset=".4" stop-color="#3fe0d0" stop-opacity=".7"/><stop offset="1" stop-color="#0c6d74" stop-opacity="0"/></radialGradient>
<radialGradient id="sun"><stop offset="0" stop-color="#ffe7a6" stop-opacity=".9"/><stop offset=".4" stop-color="#e4a74a" stop-opacity=".35"/><stop offset="1" stop-color="#e4a74a" stop-opacity="0"/></radialGradient>
<filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="#000" flood-opacity=".55"/></filter>
"""

def stars(rng, n, ymax=H, cls=""):
    out = []
    for _ in range(n):
        x, y = rng.uniform(0, W), rng.uniform(0, ymax)
        r = rng.choice([.6, .8, 1, 1.2, 1.6])
        o = rng.uniform(.35, .95)
        c = rng.choice(["#fff", "#fff", "#ffe9b0", "#c9b6ff", "#a8fff4"])
        out.append(f'<circle cx="{f(x)}" cy="{f(y)}" r="{r}" fill="{c}" opacity="{o:.2f}"/>')
    return f'<g{cls}>' + "".join(out) + "</g>"

def svg(name, body, extra_defs="", title=""):
    s = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">'
         f'<title>{title}</title><defs>{DEFS}{extra_defs}</defs>'
         f'<rect width="{W}" height="{H}" fill="url(#sky)"/>{body}</svg>')
    s = "".join(line.strip() for line in s.splitlines())
    (OUT / f"{name}.svg").write_text(s, "utf8")
    return len(s)

def gear(cx, cy, r, teeth, depth, phase=0.0, broken=()):
    """Contorno de engranaje con dientes trapezoidales."""
    pts = []
    for i in range(teeth):
        a0 = phase + 2 * math.pi * i / teeth
        step = 2 * math.pi / teeth
        rr = r - depth * (0.85 if i in broken else 0)
        for frac, rad in ((0, r - depth), (.18, rr), (.5, rr), (.68, r - depth)):
            a = a0 + step * frac
            pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    return "M" + " L".join(f"{f(x)} {f(y)}" for x, y in pts) + "Z"

def ring_ticks(cx, cy, r1, r2, n, every=0):
    d = []
    for i in range(n):
        a = 2 * math.pi * i / n
        rr = r2 + (6 if every and i % every == 0 else 0)
        d.append(f"M{f(cx + r1*math.cos(a))} {f(cy + r1*math.sin(a))}L{f(cx + rr*math.cos(a))} {f(cy + rr*math.sin(a))}")
    return "".join(d)

# ---------------------------------------------------------------- Anticitera
def anticitera():
    rng = random.Random(3)
    cx, cy = 380, 255
    g1 = gear(cx, cy, 168, 72, 9, broken=(5, 6, 31))
    g2 = gear(600, 120, 78, 34, 8, phase=.05)
    g3 = gear(612, 365, 56, 24, 7, phase=.1)
    spokes = "".join(
        f'<path d="M{f(cx + 40*math.cos(a))} {f(cy + 40*math.sin(a))}L{f(cx + 118*math.cos(a))} {f(cy + 118*math.sin(a))}" stroke="url(#gold)" stroke-width="13" stroke-linecap="round"/>'
        for a in [i * math.pi / 2 + .4 for i in range(4)])
    zod = "".join(
        f'<circle cx="{f(cx + 142*math.cos(a))}" cy="{f(cy + 142*math.sin(a))}" r="3.2" fill="#2a1a08"/>'
        for a in [i * math.pi / 6 for i in range(12)])
    body = f"""
<ellipse cx="{cx}" cy="{cy}" rx="300" ry="240" fill="url(#sun)" opacity=".55"/>
{stars(rng, 55)}
<circle cx="{cx}" cy="{cy}" r="225" fill="none" stroke="#c9a2ff" stroke-opacity=".18" stroke-dasharray="2 9"/>
<circle cx="{cx}" cy="{cy}" r="205" fill="none" stroke="#e4bb68" stroke-opacity=".25"/>
<path d="{ring_ticks(cx, cy, 205, 214, 120, 10)}" stroke="#e4bb68" stroke-opacity=".45"/>
<g filter="url(#shadow)">
 <path d="{g2}" fill="url(#gold)" stroke="#5a3a10" stroke-width="1.5"/>
 <circle cx="600" cy="120" r="54" fill="#2b1b0a" opacity=".55"/>
 <circle cx="600" cy="120" r="44" fill="none" stroke="url(#goldV)" stroke-width="6"/>
 <path d="M600 76V164M556 120H644" stroke="url(#goldV)" stroke-width="7"/>
 <circle cx="600" cy="120" r="11" fill="url(#goldV)"/>
 <path d="{g3}" fill="url(#gold)" stroke="#5a3a10" stroke-width="1.5"/>
 <circle cx="612" cy="365" r="36" fill="#2b1b0a" opacity=".6"/>
 <circle cx="612" cy="365" r="9" fill="#f7dca0"/>
 <path d="{g1}" fill="url(#gold)" stroke="#5a3a10" stroke-width="2"/>
 <circle cx="{cx}" cy="{cy}" r="150" fill="#24150a" opacity=".55"/>
 <circle cx="{cx}" cy="{cy}" r="142" fill="none" stroke="url(#goldV)" stroke-width="10"/>
 {zod}
 <circle cx="{cx}" cy="{cy}" r="124" fill="none" stroke="#f7dca0" stroke-opacity=".5" stroke-width="1"/>
 {spokes}
 <circle cx="{cx}" cy="{cy}" r="46" fill="url(#gold)" stroke="#5a3a10" stroke-width="2"/>
 <circle cx="{cx}" cy="{cy}" r="30" fill="url(#endglow)" filter="url(#glow)"/>
 <circle cx="{cx}" cy="{cy}" r="7" fill="#fff"/>
</g>
<path d="M{cx} {cy}L{cx+108} {cy-76}" stroke="#a8fff4" stroke-width="3" stroke-linecap="round" filter="url(#glow)"/>
<path d="M{cx} {cy}L{cx-40} {cy+118}" stroke="#ff7ad9" stroke-width="2.5" stroke-linecap="round" filter="url(#glow)"/>
<path d="M{cx-150} {cy-30}l-18 -6 6 14z M{cx-160} {cy+10}l-12 4 10 8z" fill="#f0c66e" opacity=".8"/>
<ellipse cx="{cx-60}" cy="{cy-70}" rx="90" ry="40" fill="#fff" opacity=".07" filter="url(#blur)"/>
"""
    return svg("anticitera", body, title="La Anticitera")

# ---------------------------------------------------------------- Radar Duga
def duga():
    rng = random.Random(4)
    vx, vy = 690, 300  # punto de fuga
    towers = []
    n = 11
    for i in range(n):
        t = i / (n - 1)
        x = 40 + (vx - 60 - 40) * (t ** .8)
        s = 1 - .78 * (t ** .8)
        top = vy - 250 * s
        base = vy + 90 * s
        towers.append((x, top, base, s))
    lattice = []
    for (x0, t0, b0, s0), (x1, t1, b1, s1) in zip(towers, towers[1:]):
        rows = 4
        for k in range(rows):
            ya0 = t0 + (b0 - t0) * k / rows; yb0 = t0 + (b0 - t0) * (k + 1) / rows
            ya1 = t1 + (b1 - t1) * k / rows; yb1 = t1 + (b1 - t1) * (k + 1) / rows
            lattice.append(f"M{f(x0)} {f(ya0)}L{f(x1)} {f(yb1)}M{f(x0)} {f(yb0)}L{f(x1)} {f(ya1)}M{f(x0)} {f(ya0)}L{f(x1)} {f(ya1)}")
    x0, t0, b0, _ = towers[0]; x1, t1, b1, _ = towers[-1]
    wall = f'<path d="M{f(x0)} {f(t0)}L{f(x1)} {f(t1)}L{f(x1)} {f(b1)}L{f(x0)} {f(b0)}Z" fill="url(#wallg)"/>'
    posts = "".join(
        f'<path d="M{f(x-9*s)} {f(b)}L{f(x-1.5*s)} {f(t)}H{f(x+1.5*s)}L{f(x+9*s)} {f(b)}Z" fill="#160d28" stroke="url(#goldV)" stroke-width="{f(1.6*s+.6)}"/>'
        f'<path d="M{f(x-6*s)} {f(b-(b-t)*.25)}L{f(x+5*s)} {f(b-(b-t)*.5)}L{f(x-3.5*s)} {f(b-(b-t)*.72)}" stroke="#e4bb68" stroke-opacity=".7" stroke-width="{f(s+.4)}" fill="none"/>'
        for x, t, b, s in towers)
    lattice_wall = wall
    caps = "".join(f'<circle cx="{f(x)}" cy="{f(t)}" r="{f(3*s+1.5)}" fill="#ff5c7a" filter="url(#glow)"/>' for x, t, b, s in towers[::2])
    waves = "".join(
        f'<path d="M{f(300 - r*.2)} {f(200 - r)}A{r} {r} 0 0 1 {f(300 + r*1.25)} {f(210 - r*.3)}" fill="none" stroke="#3fe0d0" stroke-opacity="{.75 - k*.13:.2f}" stroke-width="{2.4 - k*.3:.1f}"/>'
        for k, r in enumerate([60, 100, 145, 195, 250]))
    def dish(x, y, s, flip=1):
        return (f'<g transform="translate({x} {y}) scale({s * flip} {s})" filter="url(#shadow)">'
                '<path d="M-6 0L-18 70H18L6 0Z" fill="#20142f" stroke="#e4bb68" stroke-opacity=".5"/>'
                '<path d="M-58 -52Q-20 32 52 -6Q8 -6 -58 -52Z" fill="url(#marble)" stroke="#5f5577"/>'
                '<path d="M-58 -52Q-20 32 52 -6" fill="none" stroke="#fff" stroke-opacity=".7"/>'
                '<path d="M-3 -14L30 -48" stroke="#e4bb68" stroke-width="2.5"/><circle cx="30" cy="-48" r="4" fill="#a8fff4"/></g>')
    body = f"""
<rect y="300" width="{W}" height="200" fill="#0b0716"/>
<path d="M0 330Q200 300 400 318T800 300V500H0Z" fill="url(#stone)"/>
<ellipse cx="560" cy="80" rx="380" ry="70" fill="#3fe0d0" opacity=".14" filter="url(#blur)"/>
<ellipse cx="300" cy="40" rx="300" ry="50" fill="#b44dff" opacity=".18" filter="url(#blur)"/>
{stars(rng, 60, 300)}
<g filter="url(#glow)">{waves}</g>
{lattice_wall}<g stroke="#e4bb68" stroke-opacity=".5" stroke-width="1.1" fill="none"><path d="{''.join(lattice)}"/></g>
{posts}{caps}
<path d="M30 {vy+95}L{vx} {vy+20}" stroke="#f0c66e" stroke-width="3" filter="url(#glow)"/>
<path d="M0 470Q300 420 {vx} {vy+20}" stroke="#a8fff4" stroke-width="2" stroke-dasharray="10 8" fill="none" filter="url(#glow)"/>
{dish(150, 405, 1.05)}{dish(735, 395, .7, -1)}
"""
    return svg("duga", body, extra_defs='<linearGradient id="wallg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a1a48" stop-opacity=".75"/><stop offset="1" stop-color="#0d0820" stop-opacity=".3"/></linearGradient>', title="El radar")

# ---------------------------------------------------------------- Islas
def isla(x, y, w, seed, ruins=True):
    rng = random.Random(seed)
    h = w * .9
    top = f"M{x-w/2} {y}Q{x-w/4} {y-14} {x} {y-8}T{x+w/2} {y}"
    pts = [(x + w/2, y)]
    k = 7
    for i in range(1, k):
        t = i / k
        px = x + w/2 - w * t
        py = y + h * math.sin(math.pi * t) ** 1.4 * rng.uniform(.6, 1) + rng.uniform(0, 8)
        pts.append((px, py))
    pts.append((x - w/2, y))
    under = " ".join(f"L{f(px)} {f(py)}" for px, py in pts)
    tip = max(pts, key=lambda p: p[1])
    roots = "".join(f'<path d="M{f(tip[0]+dx)} {f(tip[1]-10)}q{rng.uniform(-8,8):.0f} 22 {rng.uniform(-6,6):.0f} 44" stroke="#5b3d1f" stroke-width="1.4" fill="none" opacity=".8"/>' for dx in (-14, 0, 12))
    cols = ""
    if ruins:
        for i in range(3):
            cxp = x - w/4 + i * w/5
            hh = rng.uniform(.18, .32) * w
            cols += (f'<rect x="{f(cxp-4)}" y="{f(y-8-hh)}" width="8" height="{f(hh)}" fill="url(#marble)"/>'
                     f'<rect x="{f(cxp-7)}" y="{f(y-12-hh)}" width="14" height="4" fill="#f3eee2"/>')
    return (f'<g filter="url(#shadow)"><path d="{top} {under}Z" fill="url(#stone)"/>'
            f'<path d="{top} {under}Z" fill="#b44dff" opacity=".08"/>'
            f'<path d="{top}L{x+w/2} {y+7}Q{x} {y+2} {x-w/2} {y+7}Z" fill="#3f9c5a"/>'
            f'<path d="{top}" stroke="#a7f0a0" stroke-width="2" fill="none"/>{cols}{roots}</g>')

def islas():
    rng = random.Random(7)
    body = f"""
<ellipse cx="420" cy="520" rx="520" ry="160" fill="#b44dff" opacity=".35" filter="url(#blur)"/>
<ellipse cx="640" cy="60" rx="200" ry="120" fill="url(#sun)"/>
{stars(rng, 50, 260)}
<path d="M250 500L400 340L560 500Z" fill="#160d28" opacity=".9"/>
<path d="M330 500L400 380L470 500Z" fill="#b44dff" opacity=".25" filter="url(#soft)"/>
<g fill="#fff" opacity=".07" filter="url(#blur)"><ellipse cx="150" cy="430" rx="160" ry="30"/><ellipse cx="640" cy="450" rx="200" ry="34"/></g>
<g fill="none" stroke="#3fe0d0" stroke-width="2.2" stroke-dasharray="4 10" stroke-linecap="round" filter="url(#glow)">
 <path d="M240 200Q380 120 545 120"/><path d="M275 345Q400 300 520 330"/><path d="M175 240Q170 300 230 330"/>
</g>
{isla(170, 200, 190, 1)}{isla(610, 118, 210, 2)}{isla(590, 330, 170, 3)}{isla(250, 345, 120, 4, False)}
<g filter="url(#glow)"><circle cx="545" cy="120" r="5" fill="#a8fff4"/><circle cx="240" cy="200" r="5" fill="#a8fff4"/><circle cx="520" cy="330" r="5" fill="#ff7ad9"/><circle cx="275" cy="345" r="5" fill="#ff7ad9"/></g>
"""
    return svg("islas", body, title="Islas a la deriva")

# ---------------------------------------------------------------- Grieta
def grieta():
    rng = random.Random(11)
    crack = "M520 210L505 245L530 270L470 320L495 350L420 410L440 440L380 500"
    branch = "M505 245L590 262L660 252M470 320L380 330L320 318"
    spikes = ""
    for x, y, h in [(470, 300, 70), (535, 255, 52), (410, 395, 90), (600, 270, 40), (360, 330, 46), (455, 430, 60)]:
        spikes += (f'<path d="M{x-9} {y}L{x} {y-h}L{x+9} {y}Z" fill="url(#endglow)" stroke="#f3c6ff" stroke-width=".8"/>'
                   f'<path d="M{x} {y-h}L{x+9} {y}H{x+2}Z" fill="#2b0b4c" opacity=".55"/>')
    temple = "".join(f'<rect x="{560 + i*22}" y="132" width="10" height="68" fill="url(#marble)"/>' for i in range(7) if i != 5)
    body = f"""
<ellipse cx="620" cy="70" rx="260" ry="110" fill="url(#sun)"/>
{stars(rng, 45, 200)}
<path d="M0 205Q400 180 800 200V500H0Z" fill="#1f3b2a"/>
<path d="M0 205Q400 180 800 200V230Q400 210 0 240Z" fill="#3f9c5a" opacity=".7"/>
<path d="M0 260Q400 230 800 250V500H0Z" fill="#1a1030" opacity=".7"/><ellipse cx="200" cy="300" rx="160" ry="30" fill="#3f9c5a" opacity=".25" filter="url(#blur)"/>
<g filter="url(#shadow)"><path d="M548 132L640 98L732 132Z" fill="url(#marble)"/><rect x="548" y="128" width="184" height="8" fill="#f3eee2"/>{temple}<rect x="540" y="198" width="200" height="10" fill="#cfc6dc"/><path d="M670 198l14 -40 10 44z" fill="#2b0b4c"/></g>
<path d="{crack}" stroke="#b44dff" stroke-width="40" fill="none" opacity=".45" filter="url(#blur)"/>
<path d="{crack}{branch}" stroke="#09040f" stroke-width="12" fill="none" stroke-linejoin="round"/>
<path d="{crack}{branch}" stroke="#e7a8ff" stroke-width="3" fill="none" filter="url(#glow)" stroke-linejoin="round"/>
{spikes}
<g fill="#e7a8ff" filter="url(#glow)">{''.join(f'<circle cx="{rng.uniform(340,640):.0f}" cy="{rng.uniform(220,480):.0f}" r="{rng.choice([1.2,1.8,2.4])}"/>' for _ in range(26))}</g>
"""
    return svg("grieta", body, title="La Grieta")

# ---------------------------------------------------------------- Atlas
def atlas():
    rng = random.Random(5)
    body = f"""
{stars(rng, 70, 500)}
<circle cx="400" cy="140" r="160" fill="#b44dff" opacity=".35" filter="url(#blur)"/>
<g filter="url(#shadow)">
 <circle cx="400" cy="140" r="108" fill="url(#endglow)"/>
 <circle cx="400" cy="140" r="104" fill="#3a1268" opacity=".55"/>
 <circle cx="372" cy="110" r="18" fill="#2a0b50" opacity=".7"/><circle cx="440" cy="168" r="12" fill="#2a0b50" opacity=".7"/><circle cx="430" cy="96" r="8" fill="#2a0b50" opacity=".6"/>
 <path d="M318 90L370 132L352 160L410 205L398 246" stroke="#fde3ff" stroke-width="3" fill="none" filter="url(#glow)"/>
 <path d="M370 132L420 118L470 74" stroke="#fde3ff" stroke-width="2" fill="none" filter="url(#glow)"/>
</g>
<path d="M0 430Q400 390 800 430V500H0Z" fill="#120a20"/>
<path d="M0 438Q400 400 800 438" stroke="#e4bb68" stroke-opacity=".35" fill="none"/>
<g filter="url(#shadow)">
 <path d="M352 292Q300 360 262 470L300 478Q330 400 372 330Z M448 292Q500 360 538 470L500 478Q470 400 428 330Z" fill="#5a1f9a"/>
 <path d="M300 478Q330 400 372 330L360 300Q318 380 286 474Z" fill="#8a3fe0" opacity=".6"/>
 <g fill="none" stroke="url(#titan)" stroke-linecap="round" stroke-linejoin="round">
  <path d="M350 292L300 250L326 212" stroke-width="28"/><path d="M450 292L500 250L474 212" stroke-width="28"/>
  <path d="M382 372L350 412L334 466" stroke-width="32"/><path d="M418 372L450 412L466 466" stroke-width="32"/>
 </g>
 <path d="M342 284Q400 266 458 284L448 330L430 376H370L352 330Z" fill="url(#titan)"/>
 <path d="M336 282Q400 262 464 282L456 312Q400 296 344 312Z" fill="url(#gold)"/>
 <path d="M372 312L400 300L428 312L422 352L400 362L378 352Z" fill="url(#gold)"/>
 <path d="M372 312L400 300L400 362L378 352Z" fill="#fff3c8" opacity=".35"/>
 <path d="M318 270Q300 236 330 236Q350 246 352 282Z M482 270Q500 236 470 236Q450 246 448 282Z" fill="url(#gold)"/>
 <path d="M366 372H434L438 386H362Z" fill="url(#goldV)"/>
 <path d="M326 452L322 470H348L344 452Z M474 452L478 470H452L456 452Z" fill="url(#gold)"/>
 <circle cx="400" cy="262" r="19" fill="url(#titan)"/>
 <path d="M381 258Q400 236 419 258L416 252Q400 232 384 252Z" fill="url(#gold)"/>
 <path d="M388 262h24" stroke="#a8fff4" stroke-width="3" filter="url(#glow)"/>
 <path d="M300 250L326 212M500 250L474 212" stroke="#ffe9a8" stroke-width="2" stroke-opacity=".7" fill="none"/>
</g>
"""
    return svg("atlas", body, extra_defs='<linearGradient id="titan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8d7bb8"/><stop offset=".5" stop-color="#3f2f63"/><stop offset="1" stop-color="#1a1030"/></linearGradient>', title="Atlas")

# ---------------------------------------------------------------- Wither Storm
def wither():
    rng = random.Random(9)
    clouds = "".join(f'<ellipse cx="{rng.uniform(0,800):.0f}" cy="{rng.uniform(40,200):.0f}" rx="{rng.uniform(80,180):.0f}" ry="{rng.uniform(20,40):.0f}" fill="#2a1d44" opacity=".8"/>' for _ in range(10))
    tent = "".join(f'<path d="M{400+dx} 250Q{400+dx*2.2} {330+abs(dx)*.2} {400+dx*2.8} 470" stroke="#140a1f" stroke-width="{rng.uniform(8,14):.0f}" fill="none" stroke-linecap="round"/>' for dx in (-90, -50, -15, 20, 55, 95))
    def head(x, y, r):
        return (f'<rect x="{x-r}" y="{y-r}" width="{2*r}" height="{2*r}" rx="6" fill="#1a1022" stroke="#3a2a4c" stroke-width="2"/>'
                f'<rect x="{x-r*.62}" y="{y-r*.2}" width="{r*.42}" height="{r*.22}" fill="#c58bff" filter="url(#glow)"/>'
                f'<rect x="{x+r*.2}" y="{y-r*.2}" width="{r*.42}" height="{r*.22}" fill="#c58bff" filter="url(#glow)"/>')
    body = f"""
<rect width="800" height="500" fill="#07040c" opacity=".5"/>
<ellipse cx="400" cy="230" rx="320" ry="190" fill="#7a1fd1" opacity=".35" filter="url(#blur)"/>
{clouds}
<path d="M560 0L520 120L560 130L500 260" stroke="#e8d0ff" stroke-width="3" fill="none" filter="url(#glow)"/>
<path d="M180 30L210 110L180 118L230 200" stroke="#a8fff4" stroke-width="2" fill="none" filter="url(#glow)"/>
{tent}
<g filter="url(#shadow)">
 <path d="M300 300Q400 200 500 300Q470 380 400 390Q330 380 300 300Z" fill="#160c1f"/>
 {head(320, 210, 46)}{head(400, 160, 60)}{head(480, 210, 46)}
</g>
<path d="M0 460Q200 440 400 470T800 450V500H0Z" fill="#05030a"/>
<g fill="#c58bff" opacity=".7">{''.join(f'<rect x="{rng.uniform(250,560):.0f}" y="{rng.uniform(260,460):.0f}" width="5" height="5" transform="rotate({rng.uniform(0,90):.0f} 400 300)"/>' for _ in range(22))}</g>
"""
    return svg("wither", body, title="Wither Storm")

# ---------------------------------------------------------------- Coliseo
def coliseo():
    rng = random.Random(13)
    cx, cy, rx, ry = 400, 330, 300, 110
    tiers = ""
    for k, (h, dy) in enumerate([(52, 0), (44, -52), (36, -96)]):
        arches = ""
        n = 26
        for i in range(n):
            a = math.pi * (i + .5) / n
            x = cx - rx * math.cos(a)
            y = cy + dy + ry * .25 * math.sin(a)
            w = 16 * (0.55 + .45 * math.sin(a))
            arches += f'<path d="M{f(x-w/2)} {f(y)}v{-h*.55:.1f}a{f(w/2)} {f(w/2)} 0 0 1 {f(w)} 0v{h*.55:.1f}z" fill="#0c0718" opacity="{.55 + .4*math.sin(a):.2f}"/>'
        tiers += (f'<path d="M{cx-rx} {cy+dy}Q{cx} {cy+dy+ry*.5} {cx+rx} {cy+dy}V{cy+dy-h}Q{cx} {cy+dy-h+ry*.5} {cx-rx} {cy+dy-h}Z" fill="url(#marble)" opacity="{.95 - k*.08:.2f}"/>'
                  + arches)
    body = f"""
<ellipse cx="400" cy="200" rx="360" ry="150" fill="url(#sun)"/>
{stars(rng, 60, 180)}
<path d="M0 360Q400 330 800 360V500H0Z" fill="url(#stone)"/>
<g filter="url(#shadow)">
<ellipse cx="{cx}" cy="{cy-150}" rx="{rx}" ry="{ry*.55}" fill="#1b1030"/>
{tiers}
<ellipse cx="{cx}" cy="{cy-142}" rx="{rx*.6}" ry="{ry*.3}" fill="#c99a52"/>
<ellipse cx="{cx}" cy="{cy-142}" rx="{rx*.6}" ry="{ry*.3}" fill="none" stroke="#fff1c8" stroke-opacity=".5"/>
</g>
<g transform="translate(400 120)" filter="url(#glow)">
 <path d="M-70 30L-80 -20L-45 8L-20 -34L0 0L22 -38L44 8L80 -22L70 30Z" fill="url(#gold)" stroke="#6e4614"/>
 <path d="M22 -38L30 -10L14 4L26 30" stroke="#0a0614" stroke-width="5" fill="none"/>
 <circle cx="0" cy="12" r="6" fill="#ff5c7a"/><circle cx="-45" cy="16" r="4" fill="#3fe0d0"/><circle cx="44" cy="16" r="4" fill="#b44dff"/>
</g>
<path d="M450 160l30 30-6 18 22 14" stroke="url(#goldV)" stroke-width="5" fill="none" opacity=".8"/>
"""
    return svg("coliseo", body, title="El Coliseo")

# ---------------------------------------------------------------- Olimpo (panorámica)
def olimpo():
    rng = random.Random(21)
    cols = "".join(f'<rect x="{318 + i*24}" y="190" width="12" height="74" fill="url(#marble)"/><rect x="{315 + i*24}" y="186" width="18" height="5" fill="#f3eee2"/>' for i in range(7))
    body = f"""
<rect width="800" height="250" fill="#2a1a12" opacity=".25"/>
<ellipse cx="400" cy="90" rx="420" ry="150" fill="url(#sun)"/>
<ellipse cx="400" cy="470" rx="420" ry="120" fill="#b44dff" opacity=".4" filter="url(#blur)"/>
{stars(rng, 55)}
<g fill="#fff" opacity=".1" filter="url(#blur)"><ellipse cx="160" cy="300" rx="200" ry="40"/><ellipse cx="660" cy="290" rx="220" ry="44"/></g>
<g filter="url(#shadow)">
 <path d="M150 280Q400 250 650 280L560 360L470 450L400 500L330 430L240 360Z" fill="url(#stone)"/>
 <path d="M150 280Q400 250 650 280L640 292Q400 268 160 292Z" fill="#3f9c5a"/>
 <path d="M300 186L400 140L500 186Z" fill="url(#marble)"/><path d="M330 182L400 150L470 182Z" fill="#cfc6dc"/>
 {cols}
 <rect x="300" y="262" width="200" height="10" fill="#e6dfef"/><rect x="290" y="270" width="220" height="8" fill="#a59cbc"/>
 <circle cx="400" cy="168" r="7" fill="url(#goldV)"/>
</g>
<path d="M470 190L486 225L470 245L500 280L476 330L505 380" stroke="#09040f" stroke-width="7" fill="none"/>
<path d="M470 190L486 225L470 245L500 280L476 330L505 380" stroke="#e7a8ff" stroke-width="2.4" fill="none" filter="url(#glow)"/>
<g fill="#e4bb68">{''.join(f'<path d="M{x} {y}l3 -9 3 9z" opacity=".8"/>' for x, y in [(180,250),(620,240),(700,300),(90,330)])}</g>
"""
    return svg("olimpo", body, title="El Olimpo")

if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for fn in (anticitera, duga, islas, grieta, atlas, wither, coliseo, olimpo):
        total += fn()
    print("bytes", total)
