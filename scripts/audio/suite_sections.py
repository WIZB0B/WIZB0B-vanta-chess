# A battle suite's sections on their own beat grids, for the game's calm, tense and storm parts
# (build_assets.py makes one library entry of each). For each section: the tempo heard inside it
# (near the tempo asked: Lyria keeps within a few per cent of it) and its first beat, which is
# the beat within 3 s of the time Flow Music's Producer heard the section change at where the
# sound changes most (level, spectrum, a sudden rise).
# Usage: python3 -I suite_sections.py <out.json> <name>=<asked bpm>=<path>=<t2>,<t3>,<final> ...
#   t2, t3: the Producer's times (seconds) of the first downbeat of sections two and three;
#   final: the time of the final hit. Needs ffmpeg, numpy and librosa.
import json, subprocess, sys
import numpy as np
import librosa

SR = 22050


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def grid(onset, times, bpm, a, b):
    period, best = 60.0 / bpm, (-1.0, 0.0)
    sel = (times >= a) & (times < b); o, t = onset[sel], times[sel]
    if len(o) < 10: return best
    for ph in np.linspace(0, period, 48, endpoint=False):
        ts = np.arange(a + ph, b, period)
        ix = np.clip(np.searchsorted(t, ts), 0, len(o) - 1)
        s = float(np.mean(o[ix])) / (float(np.mean(o)) + 1e-9)
        if s > best[0]: best = (s, a + ph)
    return best


def tempo_in(onset, times, asked, a, b):
    # Lyria keeps near the tempo asked (within a few per cent): only those, so a half or double
    # tempo never wins on a busy rhythm.
    cands = list(np.arange(asked * 0.93, asked * 1.08, asked * 0.0015))
    scored = [(grid(onset, times, c, a, b)[0], c) for c in cands]
    s, bpm = max(scored)
    return float(bpm), float(s)


def main():
    out = {}
    for arg in sys.argv[2:]:
        name, asked, path, times = arg.split('=', 3)
        asked = float(asked); t2, t3, fin = [float(x) for x in times.split(',')]
        y = decode(path); dur = len(y) / SR
        onset = librosa.onset.onset_strength(y=y, sr=SR, hop_length=256)
        times_ = librosa.times_like(onset, sr=SR, hop_length=256)
        hop = SR // 20
        S = librosa.feature.melspectrogram(y=y, sr=SR, n_fft=2048, hop_length=hop, n_mels=48)
        L = 10 * np.log10(S.sum(axis=0) + 1e-10); M = librosa.power_to_db(S + 1e-10)
        def change(t, w=2.0):
            a, b, c = int((t - w) * 20), int(t * 20), int((t + w) * 20)
            if a < 0 or c > M.shape[1]: return -1
            x, z = M[:, a:b].mean(axis=1), M[:, b:c].mean(axis=1); x, z = x - x.mean(), z - z.mean()
            dist = 1 - np.dot(x, z) / (np.linalg.norm(x) * np.linalg.norm(z) + 1e-9)
            sharp = float(np.mean(L[b:b + 6]) - np.mean(L[b - 6:b]))
            return abs(float(np.mean(L[b:c]) - np.mean(L[a:b]))) * 0.5 + dist * 30 + max(0.0, sharp) * 0.6
        bounds, secs = [], []
        edges = [0.0, t2, t3, fin]
        for i in range(3):
            a, b = edges[i], edges[i + 1]
            bpm, conf = tempo_in(onset, times_, asked, a + 1, b - 1)
            secs.append([bpm, conf])
        # each change: the beat (on the tempo of the section it starts) within 3 s with the biggest change
        starts = [None]
        for i, p in ((1, t2), (2, t3)):
            bpm = secs[i][0]; period = 60 / bpm
            _, ph = grid(onset, times_, bpm, p - 6, p + 12)
            beats = [ph + k * period for k in range(int((p - 3 - ph) / period), int((p + 3 - ph) / period) + 2)]
            beats = [t for t in beats if p - 3 <= t <= p + 3]
            best = max(beats, key=change) if beats else p
            starts.append(round(best, 3))
        res = {'seconds': round(dur, 2), 'producer': [t2, t3, fin], 'sections': []}
        for i in range(3):
            bpm = secs[i][0]; bar = 240 / bpm
            s = 0.0 if i == 0 else starts[i]
            e_next = starts[i + 1] if i < 2 else fin
            res['sections'].append({'start': s, 'next': e_next, 'bpm': round(bpm, 2), 'conf': round(secs[i][1], 2), 'bar': round(bar, 3),
                                    'len': round(e_next - s, 1)})
        out[name] = res
        print(name, json.dumps(res['sections']), flush=True)
    json.dump(out, open(sys.argv[1], 'w'), indent=1)


if __name__ == '__main__':
    main()
