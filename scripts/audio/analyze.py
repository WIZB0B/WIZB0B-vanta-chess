# Analyses the downloaded tracks (cached by name and size): loudness, the silence at their ends,
# and their beat grid (tempo and the time of the first downbeat), for VCH's music player.
# Usage: python3 -I analyze.py <downloads dir> <work dir> <bpm.json> <name> ...
#   <downloads dir> holds vch-<name>.m4a (as downloaded from Flow Music);
#   <work dir>/cache/<name>.json gets each result (build_assets.py reads them);
#   bpm.json: [{"id": name, "bpm": the tempo asked for in the prompt}, ...] (helps the tracker).
# Needs ffmpeg, numpy and librosa.
import json, subprocess, sys, os
import numpy as np
import librosa
SRC, CACHE = sys.argv[1], os.path.join(sys.argv[2], 'cache')
os.makedirs(CACHE, exist_ok=True)

def decode(path, sr=22050):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy(), sr

def loudness(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True)
    j = json.loads(r.stderr[r.stderr.rindex('{'):])
    return float(j['input_i']), float(j['input_tp'])

def grid_score(onset, times, bpm, duration):
    period = 60.0 / bpm
    best = (-1, 0)
    for ph in np.linspace(0, period, 48, endpoint=False):
        ts = np.arange(ph, duration, period)
        ix = np.clip(np.searchsorted(times, ts), 0, len(onset) - 1)
        s = float(np.mean(onset[ix]))
        if s > best[0]: best = (s, ph)
    return best

def analyse(name, bpm_asked):
    path = f'{SRC}/vch-{name}.m4a'
    size = os.path.getsize(path)
    cache = os.path.join(CACHE, f'{name}.json')
    if os.path.exists(cache):
        c = json.load(open(cache))
        if c.get('size') == size and c.get('bpmAsked') == bpm_asked: return c
    y, sr = decode(path)
    dur = len(y) / sr
    h = int(sr * 0.02); n = len(y) // h
    env = 10 * np.log10(np.mean(y[:n * h].reshape(n, h) ** 2, axis=1) + 1e-12)
    loud = np.where(env > -50)[0]
    start = max(0.0, loud[0] * 0.02 - 0.05) if len(loud) else 0.0
    end = min(dur, (loud[-1] + 1) * 0.02 + 0.05) if len(loud) else dur
    I, TP = loudness(path)
    gain = max(-12.0, min(12.0, -16.0 - I)); gain = min(gain, -1.0 - TP)
    onset = librosa.onset.onset_strength(y=y, sr=sr)
    times = librosa.times_like(onset, sr=sr)
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=sr, start_bpm=bpm_asked or 120, units='time', tightness=200)
    tracked = float(np.atleast_1d(tempo)[0])
    cands = {round(tracked * f, 2) for f in (1, 2, 0.5, 1.5, 2 / 3) if 40 <= tracked * f <= 220}
    if bpm_asked: cands.add(float(bpm_asked))
    scored = []
    for c in cands:
        s, ph = grid_score(onset, times, c, dur)
        bonus = 1.08 if bpm_asked and abs(c - bpm_asked) / bpm_asked < 0.03 else 1.0
        scored.append((s * bonus, c, ph, s))
    scored.sort(reverse=True)
    _, bpm, phase, raw = scored[0]
    # Refine the tempo around the winner (±3%).
    fine = max(((grid_score(onset, times, b, dur), b) for b in np.linspace(bpm * 0.97, bpm * 1.03, 31)), key=lambda x: x[0][0])
    (raw, phase), bpm = fine
    period = 60.0 / bpm
    # The downbeat: of four beat phases, the one carrying the most low-end onsets.
    low = librosa.onset.onset_strength(y=y, sr=sr, fmax=250, n_mels=32)
    lt = librosa.times_like(low, sr=sr)
    best = max(range(4), key=lambda p: float(np.mean(low[np.clip(np.searchsorted(lt, np.arange(phase + p * period, dur, 4 * period)), 0, len(low) - 1)])))
    downbeat = phase + best * period
    while downbeat - 4 * period >= 0: downbeat -= 4 * period
    out = dict(id=name, size=size, seconds=round(dur, 2), start=round(start, 2), end=round(end, 2), lufs=round(I, 1), truePeak=round(TP, 1), gain=round(gain, 1),
               bpmAsked=bpm_asked, bpmTracked=round(tracked, 1), bpm=round(float(bpm), 2), beat=round(float(downbeat), 3), gridScore=round(raw, 3), candidates=sorted((round(c, 1), round(s, 3)) for _, c, _, s in scored))
    json.dump(out, open(cache, 'w'))
    return out

if __name__ == '__main__':
    asked = {r['id']: r['bpm'] for r in json.load(open(sys.argv[3]))}
    names = sys.argv[4:]
    for n in names:
        base = n
        for suffix in ('-2', '-3'):
            if n.endswith(suffix) and n[:-2] in asked and n not in asked: base = n[:-2]
        r = analyse(n, asked.get(n, asked.get(base)))
        print(json.dumps({k: r[k] for k in ('id', 'seconds', 'start', 'end', 'gain', 'bpmAsked', 'bpmTracked', 'bpm', 'beat', 'gridScore')}))
