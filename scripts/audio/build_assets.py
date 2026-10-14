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
    # More operas (owner, 2026-10-14: "I kept hearing one, like two or three over and over again"):
    # each boss's own words, sung in Latin or Italian; a boss's second take gets a name of its own.
    'boss-ember-warden-2': 'The Ember Warden · Ash Psalm', 'boss-pale-reflection-2': 'The Pale Reflection · Glass Lament',
    'boss-tidecaller-2': 'The Tidecaller · Bells of the Deep', 'boss-tidecaller-3': 'The Tidecaller · Bells at Low Tide',
    'boss-usurper-2': 'The Usurper · The False Crown', 'boss-usurper-3': 'The Usurper · The Crown Unearned',
    'boss-vanta-king-2': 'The Vanta King · Eclipse Requiem', 'boss-vanta-king-3': 'The Vanta King · Requiem at the Spire',
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

# ---- The second library (owner, 2026-10-13: "make sure all the audios we have currently now pass
# that test... no skips... no sudden change in tones or melody or some weird AI shit"). Every
# piece below passed two checks before it joined: Flow Music's Producer listened to it whole
# against a written bar, and scripts/audio/audit.py (and lyrics.py, for songs) measured it;
# where the two disagreed, the Producer listened again at the exact moment the measurement
# flagged, and the owner's ears have the last word (Theme Studio's Sound test). The verdicts are
# in docs/music-check.md.
# Pieces that did not pass are left out; where only an opening or an ending failed and the rest
# passed (the Producer confirmed it from there), only the clean part plays.
EXCLUDE = {
    # the relic sets' one-part pieces: their battle suites replace them (one piece in three parts,
    # one key and one tempo, so a change of part never changes key or ensemble)
    *(f'{t}-{p}' for t in ('ember', 'umbra', 'mirror', 'gilded', 'obsidian', 'rivalry') for p in ('opening', 'middlegame', 'time-trouble')),
    'vanta-time-trouble-2',      # 0:59 abrupt cut into another groove, 1:16 jumps back
    'lobby-vanta-2', 'lobby-tournament', 'skin-shadow', 'skin-celestial', 'focus-deep-calculation-3',
    'lobby-platinum-2',          # 1:10 cut mid-phrase into another ensemble
    'song-endgame-2',            # 1:40 jump, 2:26 and 2:36 stumbles
    'electric-neon-gambit',      # 0:14 and 1:31 dropouts mid-phrase
    'realm-japan',               # 0:12 jumps in; from there it cuts the opening phrase (new takes replace it)
    'lobby-bronze',              # soft humming at 0:25 in an instrumental
    'electric-overclocked',      # vocal chops at 0:13, 0:44 and 1:28 in an instrumental
    'vanta-advantage-2',         # could not be checked (Flow would not take the file back): left out until it is
}
# Pieces whose opening or ending failed: the part that plays (seconds), and a fade for an ending
# cut short.
TRIM = {
    'boss-pale-reflection': dict(start=25.7),  # from its full entrance (the opening jumped in)
    'lobby-bronze-2': dict(start=25.0),
    'realm-greece-b': dict(start=5.2),
    'result-win': dict(end=62.0, fade=3.0),    # a complete piece to 1:02; it then restarted
    'focus-night-analysis': dict(end=160.0, fade=4.0),  # resolved by 2:35; a dropout cut its tail at 2:51
}
# The old worlds (owner: "old civilization type music and themes... like the old chinese and
# japanese style, rome and so on"): a theme for the menus and a battle suite for games each.
# Their names (owner, 2026-10-13: "you cannot just name something ancient Egypt, ancient
# Greece... be creative with the names... live with the lore", and not names everyone knows
# already): each world is named for a game of strategy its people played, chess's ancestors and
# cousins, or for the land in its own people's words; each piece for a story from that world.
# The sources are in docs/music-check.md (Names).
WORLDS = {'egypt': 'Mehen', 'greece': 'Petteia', 'rome': 'Latrunculi', 'china': 'Liubo', 'japan': 'Heian', 'persia': 'Chatrang', 'babylon': 'Etemenanki', 'benin': 'Igodomigodo'}
THEME_TITLES = {
    'realm-egypt-v3a': 'Iteru at Low Water', 'realm-egypt-v3b': 'The Twelve Hours', 'realm-egypt-v3c': 'Lions of the Coil', 'realm-egypt-v3d': "The Soul's Road",
    'realm-greece': 'Cities of Pebble', 'realm-greece-b': 'Dogs of the Polis',
    'realm-rome-b': 'A Soldiery of Glass',
    'realm-china': 'Immortals at Play',
    'realm-japan-v2a': 'The Jade General', 'realm-japan-v2b': 'Incense Chariot', 'realm-japan-v2c': 'The Laurel Horse',
    'realm-persia': 'Emerald and Ruby',
    'realm-babylon': 'Foundation of Heaven and Earth',
    'realm-benin': 'Sand from a Snail Shell',
}
SUITE_TITLES = {
    'suite-egypt-b': "The Serpent's Head", 'suite-greece-b': 'Between Two Stones', 'suite-rome-v2': 'The Twin Foe', 'suite-china': 'The Owl and the Fish',
    'suite-japan-v3a': 'The Drunken Elephant', 'suite-japan-v3b': 'Silver and Gold', 'suite-persia-v2': "Wuzurgmihr's Answer",
    'suite-babylon': 'Powerful Like a Lion', 'suite-benin': 'Kings from the Sky',
    'suite-vanta-v3a': 'When the Candles Gutter', 'suite-vanta-v3b': 'The Storm Builds',
    'suite-ember': 'Cinders on the Wind', 'suite-umbra': 'Bells Under Water', 'suite-mirror': 'The Other Hand', 'suite-gilded': "The Usurper's Feast",
    'suite-rivalry': 'Old Scores', 'suite-obsidian-v2': 'The Last Ascent',
}
# Battle suites (one file each, its theme): played whole on a station, in its three parts in a
# game. Their sections come from suite_sections.py (<work dir>/suite_grid.json).
SUITES = {
    'suite-ember': 'ember', 'suite-umbra': 'umbra', 'suite-mirror': 'mirror', 'suite-gilded': 'gilded', 'suite-rivalry': 'rivalry', 'suite-obsidian-v2': 'obsidian',
    'suite-egypt-b': 'egypt', 'suite-greece-b': 'greece', 'suite-china': 'china', 'suite-babylon': 'babylon', 'suite-benin': 'benin', 'suite-rome-v2': 'rome', 'suite-persia-v2': 'persia',
    'suite-vanta-v3a': 'vanta', 'suite-vanta-v3b': 'vanta', 'suite-japan-v3a': 'japan', 'suite-japan-v3b': 'japan',
}
SUITE_PARTS = (('calm', 'Opening'), ('tense', 'Middlegame'), ('storm', 'Time Trouble'))
# The final hit of each suite (the Producer's time): the storm loops before it.
SUITE_FINAL = {'suite-ember': 173, 'suite-umbra': 168, 'suite-mirror': 170, 'suite-gilded': 171, 'suite-rivalry': 173, 'suite-obsidian-v2': 157,
               'suite-egypt-b': 170, 'suite-greece-b': 174, 'suite-china': 165, 'suite-babylon': 170, 'suite-benin': 170, 'suite-rome-v2': 161, 'suite-persia-v2': 174,
               'suite-vanta-v3a': 171.5, 'suite-vanta-v3b': 167, 'suite-japan-v3a': 165, 'suite-japan-v3b': 170}
# A part that loops must last at least this long (seconds); a shorter one carries on into the next.
MIN_LOOP = 24.0
# The old worlds' themes (menus): file id -> world.
WORLD_THEMES = {'realm-greece': 'greece', 'realm-greece-b': 'greece', 'realm-rome-b': 'rome', 'realm-china': 'china', 'realm-persia': 'persia', 'realm-babylon': 'babylon', 'realm-benin': 'benin',
                'realm-japan-v2a': 'japan', 'realm-japan-v2b': 'japan', 'realm-japan-v2c': 'japan',
                'realm-egypt-v3a': 'egypt', 'realm-egypt-v3b': 'egypt', 'realm-egypt-v3c': 'egypt', 'realm-egypt-v3d': 'egypt'}
# Songs in other languages (each with its own lyrics, written for it): title; the language is
# the id's second part.
SONG_TITLES = {
    'song-de-zug-um-zug': 'Zug um Zug', 'song-de-baeckerei': 'Die alte Bäckerei', 'song-es-jaque-al-rey': 'Jaque al rey', 'song-es-jaque-al-rey-b': 'Jaque al rey II',
    'song-es-cocina-abuela': 'La cocina de mi abuela', 'song-fr-echec-et-mat': 'Échec et mat', 'song-fr-vieux-velo': 'Mon vieux vélo', 'song-it-la-regina': 'La regina',
    'song-it-caffe-domenica': 'Il caffè della domenica', 'song-pt-xeque-mate': 'Xeque-mate', 'song-pt-varanda': 'A varanda', 'song-tr-hamle': 'Hamle', 'song-tr-hamle-b': 'Hamle II',
    'song-tr-cay-bahcesi': 'Çay Bahçesi', 'song-ru-hod-konyom': 'Ход конём', 'song-ru-dacha': 'Дача', 'song-ar-kish-malik': 'كش ملك', 'song-ar-qahwat-alsabah': 'قهوة الصباح',
    'song-hi-shah-aur-maat': 'शह और मात', 'song-hi-shah-aur-maat-b': 'शह और मात II', 'song-hi-chai-ki-tapri': 'चाय की टपरी', 'song-zh-yi-bu-yi-bu': '一步一步',
    'song-zh-waipo-xiaoyuan': '外婆的小院', 'song-ja-itte-zutsu': '一手ずつ', 'song-ja-shotengai': '商店街の夕暮れ', 'song-ko-han-su': '한 수 한 수',
}

def meta(i):
    """Where and how the player uses a track (src/music-library.js)."""
    b = base_of(i)
    roman = {'-2': ' II', '-3': ' III'}.get(i[len(b):], '')
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
    if i in SONG_TITLES: return dict(title=SONG_TITLES[i], station='songs', place='lobby', kind='song', lang=i.split('-')[1])
    if b.startswith('song-'): return dict(station='songs', place='lobby', kind='song', lang='en')
    if b == 'result-win': return dict(station='cinematic', place='result', part='win')
    if b == 'result-loss': return dict(station='cinematic', place='result', part='loss')
    if i in WORLD_THEMES:
        w = WORLD_THEMES[i]
        return dict(title=f'{WORLDS[w]} · {THEME_TITLES[i]}', station='worlds', place='lobby', theme=w)
    if b.startswith('skin-') and b[5:] in SKINS:
        s = b[5:]
        return dict(title=f'{s.capitalize()} Relics', station='cinematic', place='skin', skin=s)
    return None

def suite_entries(i, a, key_of, grid):
    """A battle suite: the whole piece (stations, the music list) and its three parts (games)."""
    theme = SUITES[i]; name = WORLDS.get(theme) or REALM.get(theme) or 'Vanta'
    station = 'worlds' if theme in WORLDS else 'cinematic'
    n = [k for k in SUITES if SUITES[k] == theme].index(i)
    sfx = '' if n == 0 else f'-{n + 1}'  # a theme's second suite: ids of its own (each suite has its own title)
    g = grid[i]; secs = g['sections']; final = SUITE_FINAL[i]
    starts = [a['start']] + [s['start'] for s in secs[1:]]
    whole = dict(id=i, title=f'{name} · {SUITE_TITLES[i]}', file=f'{i}.m4a', station=station, place='game', theme=theme, seconds=a['seconds'], start=a['start'], end=a['end'], gain=a['gain'],
                 bpm=round(secs[0]['bpm'], 2), beat=round(starts[1] % (240 / secs[0]['bpm']), 3))
    keys = key_of(i, sections=True)
    if keys and keys.get('global'): whole['key'] = keys['global']
    out = [whole]
    for k, (part, label) in enumerate(SUITE_PARTS):
        bar = 240 / secs[k]['bpm']
        start = starts[k]
        nxt = starts[k + 1] if k < 2 else final
        end = nxt - bar if k < 2 else final - 2 * bar
        j = k
        while end - start < MIN_LOOP and j < 2:  # too short to loop: it carries on into the next part
            j += 1; nxt = starts[j + 1] if j < 2 else final; end = nxt - bar if j < 2 else final - 2 * bar
        e = dict(id=f'{theme}-{part}{sfx}', title=f'{SUITE_TITLES[i]} · {label}', file=f'{i}.m4a', station=station, place='game', part=part, theme=theme, of=i,
                 seconds=a['seconds'], start=round(start, 3), end=round(end, 3), gain=a['gain'], bpm=round(secs[k]['bpm'], 2), beat=round(start % bar, 3))
        sk = (keys or {}).get('sections') or []
        if len(sk) == 3 and sk[k]: e['key'] = sk[k]
        out.append(e)
    return out

# Stings: the part of each sting piece to keep (seconds), its moment, and its fades. Lyria writes
# a whole piece, so a sting is its ending: from a strong onset before the final chord to the end
# of the ring-out (the start sting is the piece's opening instead). Chosen from each piece's
# loudness and onsets (tools/sting_end.py). An ending runs on until the piece's own decay is below
# -60 dB, the fade only taking away what is left under about -48 dB (the music check, 2026-10-13:
# cut sooner, the realm sting's "reverb tail cut off abruptly before natural decay completes").
# Solved, failed and start fade out music that goes on, by design.
STINGS = [
    # id, source, moment, title, start, end, fade in, fade out
    ('sting-win', 'sting-victory', 'win', 'Victory', 50.40, 59.15, 0.006, 0.85),
    ('sting-loss', 'sting-defeat', 'loss', 'Defeat', 52.00, 56.90, 0.006, 0.9),
    ('sting-draw', 'sting-draw', 'draw', 'Draw', 47.95, 54.90, 0.006, 1.1),
    ('sting-checkmate', 'sting-checkmate', 'checkmate', 'Checkmate', 57.57, 63.15, 0.006, 0.65),
    ('sting-start', 'sting-game-start', 'start', 'Game start', 0.00, 4.00, 0.006, 1.4),
    ('sting-rank-up', 'sting-rank-up', 'rank-up', 'Rank up', 56.87, 63.95, 0.006, 0.8),
    ('sting-rank-down', 'sting-rank-down', 'rank-down', 'Rank down', 50.00, 56.95, 0.25, 1.3),
    ('sting-rank-down-2', 'sting-rank-down-2', 'rank-down', 'Rank down II', 50.84, 59.85, 0.006, 0.8),
    ('sting-relic', 'sting-relic', 'relic', 'Relic earned', 52.50, 59.35, 0.02, 1.1),
    ('sting-realm', 'sting-realm-freed', 'realm', 'Realm freed', 52.48, 59.35, 0.006, 1.3),
    ('sting-solved', 'sting-puzzle-solved', 'solved', 'Puzzle solved', 50.86, 54.00, 0.006, 1.2),
    ('sting-failed', 'sting-puzzle-failed', 'failed', 'Puzzle failed', 55.96, 59.00, 0.006, 1.2),
    ('sting-brilliant', 'sting-brilliant', 'brilliant', 'Brilliant move', 53.45, 58.10, 0.006, 1.05),
]

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: raise RuntimeError(' '.join(cmd) + '\n' + r.stderr[-2000:])
    return r

def loudness(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    j = json.loads(r.stderr[r.stderr.rindex('{'):])
    return float(j['input_i']), float(j['input_tp'])

def load_keys():
    """The key the music check measured for each piece (audit.py's reports in the work dir)."""
    import glob
    found = {}
    for d in sorted(glob.glob(os.path.join(WORK, 'audit', '*'))):
        for f in glob.glob(os.path.join(d, '*.json')):
            if f.endswith('summary.json'): continue
            try: r = json.load(open(f))
            except Exception: continue
            k = r.get('key') or {}
            if r.get('name') and k.get('global'): found[r['name']] = {'global': k['global'], 'sections': (r.get('sections') or {}).get('key')}
    def key_of(i, sections=False):
        v = found.get(i)
        return v if sections else (v or {}).get('global')
    return key_of

def build_music():
    os.makedirs(MUSIC, exist_ok=True)
    key_of = load_keys()
    grid_path = os.path.join(WORK, 'suite_grid.json')
    grid = json.load(open(grid_path)) if os.path.exists(grid_path) else {}
    tracks, files = [], set()
    for f in sorted(os.listdir(CACHE)):
        a = json.load(open(os.path.join(CACHE, f)))
        i = a['id']
        if i in EXCLUDE: continue
        if i in SUITES:
            if i not in grid: raise SystemExit(f'no sections for {i}: run suite_sections.py')
            entries = suite_entries(i, a, key_of, grid)
        else:
            m = meta(i)
            if not m: raise SystemExit(f'no metadata for {i}')
            title = m.pop('title', None) or TITLES[i]
            t = dict(id=i, title=title, file=f'{i}.m4a', **m, seconds=a['seconds'], start=a['start'], end=a['end'], gain=a['gain'])
            if a.get('bpm'): t.update(bpm=a['bpm'], beat=a['beat'])
            k = key_of(i)
            if k: t['key'] = k
            trim = TRIM.get(i, {})
            if 'start' in trim:
                t['start'] = trim['start']
                if t.get('bpm'):  # the beat grid's origin moves to the new first downbeat
                    t['beat'] = round(trim['start'] % (240 / t['bpm']), 3)
            if 'end' in trim: t['end'] = trim['end']
            if 'fade' in trim: t['fade'] = trim['fade']
            entries = [t]
        shutil.copyfile(os.path.join(SRC, f'vch-{i}.m4a'), os.path.join(MUSIC, f'{i}.m4a'))
        files.add(f'{i}.m4a')
        tracks.extend(entries)
    for sid, src, part, title, a, b, fi, fo in STINGS:
        out = os.path.join(MUSIC, f'{sid}.m4a'); d = round(b - a, 3)
        run(['ffmpeg', '-v', 'error', '-y', '-ss', str(a), '-t', str(d), '-i', os.path.join(SRC, f'vch-{src}.m4a'),
             '-af', f'afade=t=in:st=0:d={fi},afade=t=out:st={max(0, d - fo):.3f}:d={fo}', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', out])
        I, TP = loudness(out)
        gain = round(min(max(-12.0, -14.0 - I), -1.0 - TP), 1) # stings sit a little above the music (-14 LUFS)
        tracks.append(dict(id=sid, title=title, file=f'{sid}.m4a', place='sting', part=part, seconds=d, start=0, end=d, gain=gain))
        files.add(f'{sid}.m4a')
    # Files of pieces no longer in the library go (the folder holds exactly what it lists).
    for f in os.listdir(MUSIC):
        if f.endswith(('.m4a', '.mp3')) and f not in files: os.remove(os.path.join(MUSIC, f))
    tracks.sort(key=lambda t: t['id'])
    json.dump({'tracks': tracks}, open(os.path.join(MUSIC, 'library.json'), 'w'), indent=1, ensure_ascii=False)
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
