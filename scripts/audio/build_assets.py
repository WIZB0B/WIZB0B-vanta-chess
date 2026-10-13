# Builds VCH's audio from the Flow Music (Lyria 3.5) downloads:
#   public/assets/vch/music/<id>.m4a        the music, copied as it came (AAC, no re-encoding)
#   public/assets/vch/music/sting-*.m4a     stings: the ending (or opening) of each sting piece
#   public/assets/vch/music/library.json    every track with its metadata and analysis
#   public/assets/vch/sfx/<set>/<name>.mp3  sound effects, built from the cleanest one-shot hits (MP3:
#                                           every browser decodes it, and its gapless header starts it at once)
#   public/assets/vch/sfx/sfx.json          the sound sets
# Usage: python3 -I build_assets.py <downloads dir> <work dir> <repo public/assets/vch>
#   (the work dir holds analyze.py's cache/ and events.py's events-<pack>.json; ONLY=music or
#   ONLY=sfx builds one half). Needs ffmpeg (with libmp3lame), numpy and scipy.
import json, os, shutil, subprocess, sys, tempfile
import numpy as np
from scipy.signal import butter, sosfilt, resample_poly
from fractions import Fraction

SRC, WORK, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
CACHE = os.path.join(WORK, 'cache')
MUSIC, SFX = os.path.join(OUT, 'music'), os.path.join(OUT, 'sfx')
SR = 48000

# ---- Music ----
TITLES = {
    'vanta-opening': 'Vanta · Opening', 'vanta-opening-2': 'Vanta · Opening II', 'vanta-middlegame': 'Vanta · Middlegame',
    'vanta-middlegame-2': 'Vanta · Middlegame II', 'vanta-time-trouble': 'Vanta · Time Trouble', 'vanta-time-trouble-2': 'Vanta · Time Trouble II',
    'vanta-time-trouble-3': 'Vanta · Time Trouble III', 'vanta-advantage': 'Vanta · Advantage', 'vanta-advantage-2': 'Vanta · Advantage II',
    'vanta-under-siege': 'Vanta · Under Siege',
    'lobby-vanta': 'The Vanta Hall', 'lobby-vanta-2': 'The Vanta Hall II', 'lobby-tournament': 'Tournament Hall', 'lobby-tournament-2': 'Tournament Hall II',
    'focus-quiet-mind': 'Quiet Mind', 'focus-quiet-mind-2': 'Quiet Mind II', 'focus-deep-calculation': 'Deep Calculation',
    'focus-deep-calculation-2': 'Deep Calculation II', 'focus-deep-calculation-3': 'Deep Calculation III', 'focus-night-analysis': 'Night Analysis',
    'focus-study-hall': 'Study Hall', 'focus-study-hall-2': 'Study Hall II', 'focus-puzzle-garden': 'Puzzle Garden',
    'electric-neon-gambit': 'Neon Gambit', 'electric-blitz-funk': 'Blitz Funk', 'electric-bullet': 'Bullet', 'electric-swing-gambit': 'Swing Gambit',
    'electric-overclocked': 'Overclocked', 'electric-arena-lights': 'Arena Lights',
    'boss-ember-warden': 'The Ember Warden', 'boss-tidecaller': 'The Tidecaller', 'boss-pale-reflection': 'The Pale Reflection',
    'boss-usurper': 'The Usurper', 'boss-vanta-king': 'The Vanta King',
    'song-old-chair': 'The Old Chair', 'song-pawns-journey': "The Pawn's Journey", 'song-tick-tock': 'Tick Tock', 'song-grandpas-chessboard': "Grandpa's Chessboard",
    'song-rain-window': 'Rain on the Window', 'song-morning-coffee': 'Morning Coffee', 'song-long-game': 'Life Is a Long Game', 'song-kitchen-stove': 'Kitchen Stove',
    'song-knights-ride': "The Knight's Ride", 'song-queen-of-the-board': 'Queen of the Board', 'song-saturday-market': 'Saturday Market',
    'song-endgame': 'Endgame', 'song-endgame-2': 'Endgame II',
    'result-win': 'After the Win', 'result-loss': 'After the Loss',
}
REALM = {'ember': 'Ashen March', 'umbra': 'Drowned Keep', 'mirror': 'Mirror Court', 'gilded': 'Hollow Crown', 'obsidian': 'Obsidian Spire', 'rivalry': 'Rivalry'}
PART_OF = {'opening': 'calm', 'middlegame': 'tense', 'time-trouble': 'storm'}
PART_TITLE = {'opening': 'Opening', 'middlegame': 'Middlegame', 'time-trouble': 'Time Trouble'}
DIVISIONS = ['bronze', 'silver', 'gold', 'platinum', 'diamond']
BOSS_THEME = {'boss-ember-warden': 'ember', 'boss-tidecaller': 'umbra', 'boss-pale-reflection': 'mirror', 'boss-usurper': 'gilded', 'boss-vanta-king': 'obsidian'}
SKINS = ['ember', 'crystal', 'shadow', 'celestial', 'gilded', 'tidal']

def base_of(i):
    return i[:-2] if i[-2:] in ('-2', '-3') else i

def meta(i):
    """Where and how the player uses a track (src/music-library.js)."""
    b = base_of(i)
    roman = {'-2': ' II', '-3': ' III'}.get(i[len(b):], '')
    for theme, realm in REALM.items():
        for p, part in PART_OF.items():
            if b == f'{theme}-{p}':
                return dict(title=f'{realm} · {PART_TITLE[p]}{roman}', station='cinematic', place='game', part=part, theme=theme)
    if b in ('vanta-opening', 'vanta-middlegame', 'vanta-time-trouble'):
        return dict(station='cinematic', place='game', part=PART_OF[b[6:]], theme='vanta')
    if b == 'vanta-advantage': return dict(station='cinematic', place='game', part='ahead', theme='vanta')
    if b == 'vanta-under-siege': return dict(station='cinematic', place='game', part='behind', theme='vanta')
    if b == 'lobby-vanta': return dict(station='cinematic', place='lobby')
    if b.startswith('lobby-') and b[6:] in DIVISIONS:
        d = b[6:]
        return dict(title=f'{d.capitalize()} Hall{roman}', station='cinematic', place='lobby', division=d)
    if b == 'lobby-tournament': return dict(station='electric', place='blitz')
    if b.startswith('focus-'): return dict(station='focus', place='focus')
    if b.startswith('electric-'): return dict(station='electric', place='blitz')
    if b in BOSS_THEME: return dict(station='opera', place='boss', theme=BOSS_THEME[b])
    if b.startswith('song-'): return dict(station='songs', place='lobby', kind='song')
    if b == 'result-win': return dict(station='cinematic', place='result', part='win')
    if b == 'result-loss': return dict(station='cinematic', place='result', part='loss')
    if b.startswith('skin-') and b[5:] in SKINS:
        s = b[5:]
        return dict(title=f'{s.capitalize()} Relics', station='cinematic', place='skin', skin=s)
    return None

# Stings: the part of each sting piece to keep (seconds), its moment, and its fades. Lyria writes
# a whole piece, so a sting is its ending: from a strong onset before the final chord to the end
# of the ring-out (the start sting is the piece's opening instead). Chosen from each piece's
# loudness and onsets (tools/sting_end.py).
STINGS = [
    # id, source, moment, title, start, end, fade in, fade out
    ('sting-win', 'sting-victory', 'win', 'Victory', 50.40, 58.40, 0.006, 0.6),
    ('sting-loss', 'sting-defeat', 'loss', 'Defeat', 52.00, 56.20, 0.006, 0.6),
    ('sting-draw', 'sting-draw', 'draw', 'Draw', 47.95, 54.00, 0.006, 0.8),
    ('sting-checkmate', 'sting-checkmate', 'checkmate', 'Checkmate', 57.57, 62.70, 0.006, 0.6),
    ('sting-start', 'sting-game-start', 'start', 'Game start', 0.00, 4.00, 0.006, 1.4),
    ('sting-rank-up', 'sting-rank-up', 'rank-up', 'Rank up', 56.87, 63.30, 0.006, 0.6),
    ('sting-rank-down', 'sting-rank-down', 'rank-down', 'Rank down', 50.00, 55.70, 0.25, 0.6),
    ('sting-rank-down-2', 'sting-rank-down-2', 'rank-down', 'Rank down II', 50.84, 59.00, 0.006, 0.8),
    ('sting-relic', 'sting-relic', 'relic', 'Relic earned', 52.50, 58.40, 0.02, 0.6),
    ('sting-realm', 'sting-realm-freed', 'realm', 'Realm freed', 52.48, 58.30, 0.006, 0.6),
    ('sting-solved', 'sting-puzzle-solved', 'solved', 'Puzzle solved', 50.86, 54.00, 0.006, 1.2),
    ('sting-failed', 'sting-puzzle-failed', 'failed', 'Puzzle failed', 55.96, 59.00, 0.006, 1.2),
    ('sting-brilliant', 'sting-brilliant', 'brilliant', 'Brilliant move', 53.45, 57.10, 0.006, 0.6),
]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: raise RuntimeError(' '.join(cmd) + '\n' + r.stderr[-2000:])
    return r

def loudness(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    j = json.loads(r.stderr[r.stderr.rindex('{'):])
    return float(j['input_i']), float(j['input_tp'])

def build_music():
    os.makedirs(MUSIC, exist_ok=True)
    tracks = []
    for f in sorted(os.listdir(CACHE)):
        a = json.load(open(os.path.join(CACHE, f)))
        i = a['id']; m = meta(i)
        if not m: raise SystemExit(f'no metadata for {i}')
        title = m.pop('title', None) or TITLES[i]
        shutil.copyfile(os.path.join(SRC, f'vch-{i}.m4a'), os.path.join(MUSIC, f'{i}.m4a'))
        t = dict(id=i, title=title, file=f'{i}.m4a', **m, seconds=a['seconds'], start=a['start'], end=a['end'], gain=a['gain'])
        if a.get('bpm'): t.update(bpm=a['bpm'], beat=a['beat'])
        tracks.append(t)
    for sid, src, part, title, a, b, fi, fo in STINGS:
        out = os.path.join(MUSIC, f'{sid}.m4a'); d = round(b - a, 3)
        run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-t', str(d), '-i', os.path.join(SRC, f'vch-{src}.m4a'),
             '-af', f'afade=t=in:st=0:d={fi},afade=t=out:st={max(0, d - fo):.3f}:d={fo}', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', out])
        I, TP = loudness(out)
        gain = round(min(max(-12.0, -14.0 - I), -1.0 - TP), 1) # stings sit a little above the music (-14 LUFS)
        tracks.append(dict(id=sid, title=title, file=f'{sid}.m4a', place='sting', part=part, seconds=d, start=0, end=d, gain=gain))
    tracks.sort(key=lambda t: t['id'])
    json.dump({'tracks': tracks}, open(os.path.join(MUSIC, 'library.json'), 'w'), indent=1)
    return tracks

# ---- Sound effects ----
_decoded = {}
def pack(name):
    if name not in _decoded:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(SRC, f'vch-{name}.m4a'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
        _decoded[name] = np.frombuffer(raw, dtype=np.float32).copy()
    return _decoded[name]

def fade(y, fin=0.002, fout=0.03):
    y = y.copy(); n = len(y)
    a = min(n, int(fin * SR)); b = min(n, int(fout * SR))
    if a: y[:a] *= np.sin(np.linspace(0, np.pi / 2, a)) ** 2
    if b: y[n - b:] *= np.cos(np.linspace(0, np.pi / 2, b)) ** 2
    return y

_onsets = {}
def onsets(src):
    """Every onset found in a pack (tools/events.py wrote them beside this folder)."""
    if src not in _onsets:
        path = os.path.join(WORK, f'events-{src}.json')
        _onsets[src] = sorted(e['t'] for e in json.load(open(path)))
    return _onsets[src]

def cut(src, t, length, fout=None):
    """One hit from a pack: from just before its onset, `length` seconds at most, always ending
    before the next onset (so no part of the next hit comes along), faded out."""
    nxt = min([o for o in onsets(src) if o > t + 0.03], default=1e9)
    length = min(length, nxt - t - 0.008)
    y = pack(src); a = max(0, int((t - 0.004) * SR)); seg = y[a:a + int(length * SR)]
    return fade(seg, 0.002, fout if fout is not None else max(0.03, min(0.1, length * 0.4)))

def shift(y, semitones):
    if not semitones: return y
    r = Fraction(2 ** (semitones / 12)).limit_denominator(200) # play faster (higher) or slower (lower)
    return resample_poly(y, r.denominator, r.numerator).astype(np.float32)

def lowpass(y, hz):
    return sosfilt(butter(4, hz, 'low', fs=SR, output='sos'), y).astype(np.float32)

def mix(*layers):
    """layers: (clip, at seconds, gain dB)."""
    n = max(int(at * SR) + len(c) for c, at, _ in layers)
    out = np.zeros(n, dtype=np.float32)
    for c, at, db in layers:
        i = int(at * SR); out[i:i + len(c)] += c * 10 ** (db / 20)
    return out

def finish(y, target):
    """Trims the silence after the sound, then sets its loudness (the loudest 50 ms, dBFS RMS)
    to `target`, never letting a peak over -1 dBFS."""
    level = 20 * np.log10(np.abs(y) + 1e-9); top = level.max()
    alive = np.where(level > top - 55)[0]
    first = np.argmax(level > top - 36) # the sound starts at once: no quiet lead-in before the hit
    y = y[max(0, first - int(0.002 * SR)):alive[-1] + int(0.01 * SR)] if len(alive) else y
    y = fade(y, 0.0015, 0.012)
    w = int(0.05 * SR); rms = np.sqrt(np.convolve(y ** 2, np.ones(w) / w, mode='valid')).max() if len(y) > w else np.sqrt(np.mean(y ** 2))
    g = 10 ** ((target - 20 * np.log10(rms + 1e-9)) / 20)
    g = min(g, 10 ** (-1 / 20) / (np.abs(y).max() + 1e-9))
    return (y * g).astype(np.float32)

def write(y, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.f32', delete=False) as f: f.write(y.astype('<f4').tobytes()); tmp = f.name
    try:
        run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', tmp, '-c:a', 'libmp3lame', '-q:a', '2', path])
    finally: os.unlink(tmp)
    return round(len(y) / SR, 3)

W, UI, TU, CR, TI, GI, EM = 'sfx-pieces-wood', 'sfx-ui-dark', 'test-ui', 'sfx-skin-crystal', 'sfx-skin-tidal', 'sfx-skin-gilded', 'sfx-skin-ember'
def wood_hits():
    """The wooden pack's cleanest hits (tools/events.py)."""
    return dict(
        knock=cut(W, 49.000, 0.22), knock2=cut(W, 19.000, 0.22), knock3=cut(W, 2.995, 0.2), clack=cut(W, 37.001, 0.22),
        tap=cut(W, 52.477, 0.28), tap2=cut(W, 54.486, 0.28),
        block=cut(W, 22.100, 0.34), block2=cut(W, 52.094, 0.36), block3=cut(W, 24.108, 0.34), block4=cut(W, 26.099, 0.34), block5=cut(W, 54.102, 0.34),
        e5=cut(W, 44.716, 0.5), f5=cut(W, 44.356, 0.45), g5=cut(W, 41.987, 0.5), g5b=cut(W, 27.997, 0.5), a5=cut(W, 43.352, 0.45),
        c6=cut(W, 42.974, 0.45), c6b=cut(W, 42.475, 0.42), d5=cut(W, 31.208, 0.4),
    )

def sets():
    w = wood_hits()
    ui_click, ui_click2 = cut(UI, 21.020, 0.16), cut(UI, 23.023, 0.16)
    blip_fall, ping, tick = cut(UI, 24.021, 0.5), cut(TU, 8.243, 0.55), cut(TU, 53.981, 0.24)
    shimmer = cut(CR, 2.740, 1.7, 0.5)
    S = {}
    # The interface: soft wooden mallets and clicks, rising for forward and falling for back.
    S['ui'] = dict(target=-27, sounds=dict(
        tap=mix((ui_click, 0, 0)),
        page=mix((w['g5'], 0, -2), (w['c6'], 0.055, 0)),
        back=mix((w['c6'], 0, -2), (w['g5'], 0.055, 0)),
        open=mix((ui_click2, 0, -8), (w['e5'], 0.005, -2), (w['a5'], 0.05, 0)),
        close=mix((w['a5'], 0, -2), (w['e5'], 0.05, 0)),
        **{'toggle-on': mix((fade(shift(w['knock'], 5)[:int(0.12 * SR)]), 0, 0)), 'toggle-off': mix((fade(shift(w['knock'], -3)[:int(0.13 * SR)]), 0, 0))},
        notify=mix((ping, 0, 0)),
        error=mix((blip_fall, 0, 0)),
        success=mix((w['e5'], 0, -1), (w['g5'], 0.07, -1), (w['c6'], 0.14, 0)),
        match=mix((shimmer, 0, 0)),
        warning=mix((w['c6b'], 0, 0), (w['c6b'], 0.15, -2)),
        start=mix((w['knock'], 0, -6), (w['g5'], 0, -3), (w['c6'], 0.0, -3)),
        win=mix((w['e5'], 0, -2), (w['g5'], 0.08, -2), (w['c6'], 0.16, -1), (shift(w['e5'], 12), 0.24, -1)),
        lose=mix((w['g5'], 0, -1), (shift(w['e5'], -1), 0.13, -1), (shift(w['c6'], -12), 0.26, 0)),
        draw=mix((w['a5'], 0, -1), (w['f5'], 0.13, 0)),
        tick=mix((tick, 0, 0)),
    ))
    # Wooden pieces (the default set): a light knock for a pawn, heavier blocks for the major
    # pieces and the king, two hits for a capture or castling, mallets for promotion and check.
    S['wood'] = dict(target=-20, sounds=dict(
        pawn=mix((w['knock'], 0, 0)),
        knight=mix((w['clack'], 0, 0)),
        bishop=mix((w['tap'], 0, 0)),
        rook=mix((w['block'], 0, 0)),
        queen=mix((shift(w['block2'], -2), 0, 0)),
        king=mix((shift(w['block3'], -4), 0, 0), (w['knock2'], 0, -10)),
        capture=mix((w['knock2'], 0, 0), (w['block4'], 0.018, -1)),
        castle=mix((w['tap2'], 0, 0), (w['block5'], 0.14, 0)),
        promote=mix((w['knock'], 0, -4), (w['e5'], 0.02, -1), (w['g5'], 0.1, -1), (w['c6'], 0.18, 0)),
        check=mix((w['knock3'], 0, 0), (w['c6b'], 0.015, -2)),
        mate=mix((shift(w['block'], -5), 0, 0), (w['g5b'], 0.05, -3), (w['e5'], 0.21, -3), (shift(w['c6'], -12), 0.37, -2)),
        illegal=mix((lowpass(shift(w['tap'], -4), 1200), 0, 0), (lowpass(shift(w['tap'], -4), 1200), 0.11, -2)),
    ))
    # Crystal: glass tones (the crystal pack's mallets and its octave shimmer).
    S['crystal'] = dict(target=-21, sounds=dict(
        pawn=mix((cut(CR, 8.725, 0.3), 0, 0)),
        knight=mix((cut(CR, 15.209, 0.3), 0, 0)),
        bishop=mix((cut(CR, 30.697, 0.3), 0, 0)),
        rook=mix((cut(CR, 12.725, 0.5), 0, 0)),
        queen=mix((cut(CR, 4.714, 0.55), 0, 0)),
        king=mix((cut(CR, 39.224, 0.9, 0.35), 0, 0)),
        capture=mix((cut(CR, 37.227, 0.3), 0, 0), (w['knock2'], 0, -9)),
        castle=mix((cut(CR, 34.725, 0.45), 0, 0), (cut(CR, 35.225, 0.45), 0.14, 0)),
        promote=mix((shimmer, 0, 0)),
        check=mix((cut(CR, 17.206, 0.9, 0.35), 0, 0)),
        mate=mix((cut(CR, 24.735, 1.6, 0.6), 0, 0), (cut(CR, 39.224, 1.2, 0.5), 0.05, -3)),
        illegal=mix((lowpass(cut(CR, 45.349, 0.16), 1500), 0, 0), (lowpass(cut(CR, 45.349, 0.16), 1500), 0.11, -2)),
    ))
    # Tidal: drops and water (the tidal pack's plinks, bloops and its wave).
    S['tidal'] = dict(target=-21, sounds=dict(
        pawn=mix((cut(TI, 0.975, 0.22), 0, 0)),
        knight=mix((cut(TI, 9.990, 0.32), 0, 0)),
        bishop=mix((cut(TI, 20.991, 0.2), 0, 0)),
        rook=mix((cut(TI, 14.007, 0.42), 0, 0)),
        queen=mix((cut(TI, 10.989, 0.5), 0, 0)),
        king=mix((cut(TI, 34.011, 0.45), 0, 0), (cut(TI, 14.007, 0.42), 0, -6)),
        capture=mix((cut(TI, 14.007, 0.42), 0, 0), (cut(TI, 2.003, 0.3), 0.012, -3)),
        castle=mix((cut(TI, 0.975, 0.22), 0, 0), (cut(TI, 2.984, 0.22), 0.14, 0)),
        promote=mix((cut(TI, 49.993, 0.4), 0, 0), (shift(cut(TI, 49.993, 0.4), 4), 0.09, -1), (shift(cut(TI, 49.993, 0.4), 7), 0.18, 0)),
        check=mix((cut(TI, 37.988, 0.5), 0, 0)),
        mate=mix((cut(TI, 24.004, 1.8, 0.8), 0, 0), (cut(TI, 14.007, 0.42), 0, 0)),
        illegal=mix((lowpass(cut(TI, 34.011, 0.3), 900), 0, 0), (lowpass(cut(TI, 34.011, 0.3), 900), 0.11, -2)),
    ))
    # Gilded: bells over a royal drum (the gilded pack's bells and kick).
    bell_f, bell_g, bell_a, bell_d = cut(GI, 45.981, 0.9, 0.35), cut(GI, 46.991, 0.9, 0.35), cut(GI, 48.007, 0.9, 0.35), cut(GI, 18.982, 0.55)
    kick = cut(GI, 54.004, 0.26)
    S['gilded'] = dict(target=-21, sounds=dict(
        pawn=mix((cut(GI, 11.755, 0.25), 0, 0)),
        knight=mix((cut(GI, 23.870, 0.14), 0, 0), (w['clack'], 0, -8)),
        bishop=mix((cut(GI, 31.742, 0.28), 0, 0)),
        rook=mix((kick, 0, -4), (cut(GI, 38.998, 0.28), 0.005, 0)),
        queen=mix((bell_d, 0, 0)),
        king=mix((bell_g, 0, 0), (cut(GI, 70.008, 0.25), 0, -6)),
        capture=mix((cut(GI, 74.008, 0.26), 0, -2), (cut(GI, 57.742, 0.28), 0.01, 0)),
        castle=mix((bell_f, 0, 0), (bell_g, 0.14, 0)),
        promote=mix((bell_f, 0, -1), (bell_g, 0.11, -1), (bell_a, 0.22, 0)),
        check=mix((cut(GI, 64.987, 0.55), 0, 0)),
        mate=mix((cut(GI, 23.992, 1.0, 0.4), 0, -4), (bell_a, 0.03, 0), (bell_f, 0.2, -2)),
        illegal=mix((lowpass(cut(GI, 4.005, 0.26), 700), 0, 0), (lowpass(cut(GI, 4.005, 0.26), 700), 0.11, -2)),
    ))
    # Ember: crackles and war drums (the ember pack's hits).
    S['ember'] = dict(target=-21, sounds=dict(
        pawn=mix((cut(EM, 10.519, 0.25), 0, 0)),
        knight=mix((cut(EM, 22.506, 0.25), 0, 0)),
        bishop=mix((cut(EM, 6.502, 0.26), 0, 0)),
        rook=mix((cut(EM, 6.020, 0.45), 0, 0)),
        queen=mix((cut(EM, 1.771, 0.24), 0, 0), (cut(EM, 10.014, 0.5), 0.01, -6)),
        king=mix((cut(EM, 7.999, 0.5), 0, 0)),
        capture=mix((cut(EM, 24.004, 0.5), 0, 0), (cut(EM, 22.761, 0.25), 0.01, -2)),
        castle=mix((cut(EM, 6.769, 0.25), 0, 0), (cut(EM, 6.020, 0.45), 0.14, 0)),
        promote=mix((cut(EM, 56.999, 0.36), 0, 0), (cut(EM, 21.763, 0.27), 0.12, 0)),
        check=mix((cut(EM, 21.763, 0.27), 0, 0), (cut(EM, 16.016, 0.5), 0, -8)),
        mate=mix((cut(EM, 27.997, 0.5), 0, 0), (cut(EM, 0.023, 0.5), 0.2, -2)),
        illegal=mix((lowpass(cut(EM, 7.018, 0.46), 900), 0, 0)),
    ))
    return S

LABELS = {'ui': 'Interface', 'wood': 'Wood', 'crystal': 'Crystal', 'tidal': 'Tidal', 'gilded': 'Gilded', 'ember': 'Ember'}
def build_sfx():
    manifest = {'sets': {}}
    for sid, spec in sets().items():
        sounds = {}
        for name, y in spec['sounds'].items():
            y = finish(y, spec['target'])
            sounds[name] = dict(file=f'{sid}/{name}.mp3', seconds=write(y, os.path.join(SFX, sid, f'{name}.mp3')))
        manifest['sets'][sid] = dict(name=LABELS[sid], sounds=sounds)
    json.dump(manifest, open(os.path.join(SFX, 'sfx.json'), 'w'), indent=1)
    return manifest

if __name__ == '__main__':
    what = os.environ.get('ONLY', 'music,sfx').split(',')
    if 'music' in what:
        tracks = build_music()
        print(len(tracks), 'tracks;', sum(1 for t in tracks if t['place'] == 'sting'), 'stings')
    if 'sfx' in what:
        m = build_sfx()
        for sid, s in m['sets'].items(): print(sid, len(s['sounds']), 'sounds', round(sum(x['seconds'] for x in s['sounds'].values()), 2), 's')
