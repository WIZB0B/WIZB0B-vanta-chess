# Harvests a pack's isolated one-shot sounds: each onset that rises out of quiet, with how long it
# rings (to 30 dB under its peak), its brightness, and (when it is tonal) its pitch at the start
# and the end, so sounds can be chosen by what they are: a knock, a rising or falling blip, a ring.
# Usage: python3 -I events.py <downloads dir> <work dir> <pack name>
#   writes <work dir>/events-<pack>.json (build_assets.py cuts every hit before the next onset)
#   and prints the hits; ISO marks one that rises out of quiet and rings out before the next.
# Needs ffmpeg, numpy and librosa.
import subprocess, sys, json
import numpy as np, librosa
SRC = None
def decode(path, sr=44100):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy(), sr
def events(name, min_rise=18, verbose=True):
    y, sr = decode(f'{SRC}/vch-{name}.m4a')
    hop = 256
    oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    ons = librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=hop, backtrack=True, units='samples', delta=0.06, wait=4)
    h = int(sr * 0.005); n = len(y) // h
    env = 10 * np.log10(np.mean(y[:n * h].reshape(n, h) ** 2, axis=1) + 1e-12)
    out = []
    for i, s in enumerate(ons):
        t = s / sr
        nxt = ons[i + 1] / sr if i + 1 < len(ons) else len(y) / sr
        a = int(t / 0.005); b = int(min(nxt, t + 4) / 0.005)
        seg = env[a:b]
        if len(seg) < 4: continue
        pk = float(seg.max()); pki = int(seg.argmax())
        dec = np.where(seg[pki:] < pk - 30)[0]
        ring = (pki + dec[0]) * 0.005 if len(dec) else (b - a) * 0.005
        clean_end = bool(len(dec))
        pre = env[max(0, a - 30):a]
        rise = pk - (float(np.median(pre)) if len(pre) else -120)
        L = int(sr * min(1.5, max(0.04, ring)))
        clip = y[s:s + L]
        cent = float(np.mean(librosa.feature.spectral_centroid(y=clip, sr=sr, n_fft=1024, hop_length=256))) if len(clip) > 1024 else 0.0
        f0a = f0b = None; voiced = 0.0
        if len(clip) > 4096:
            f0, vflag, vprob = librosa.pyin(clip, fmin=80, fmax=2000, sr=sr, frame_length=2048, hop_length=256)
            v = ~np.isnan(f0)
            voiced = float(v.mean())
            if v.sum() >= 3:
                fv = f0[v]; k = max(1, len(fv) // 4)
                f0a, f0b = float(np.median(fv[:k])), float(np.median(fv[-k:]))
        out.append(dict(t=round(t, 3), peak=round(pk, 1), ring=round(ring, 3), gap=round(nxt - t, 3), rise=round(rise, 1), clean=clean_end, cent=round(cent), voiced=round(voiced, 2), f0a=f0a and round(f0a, 1), f0b=f0b and round(f0b, 1)))
    return out, len(y) / sr
if __name__ == '__main__':
    SRC, work, name = sys.argv[1], sys.argv[2], sys.argv[3]
    ev, dur = events(name)
    json.dump(ev, open(f'{work}/events-{name}.json', 'w'))
    for e in ev:
        contour = ''
        if e['f0a'] and e['f0b']:
            r = 12 * np.log2(e['f0b'] / e['f0a']); contour = f"pitch {e['f0a']:.0f}->{e['f0b']:.0f} ({r:+.1f} st)"
        flag = 'ISO' if e['rise'] > 18 and e['clean'] and e['gap'] >= e['ring'] else '   '
        print(f"{flag} {e['t']:7.3f}s pk {e['peak']:6.1f} ring {e['ring']:5.2f} gap {e['gap']:5.2f} rise {e['rise']:5.1f} cent {e['cent']:6} voiced {e['voiced']:.2f} {contour}")
    print(len(ev), 'events', f'{dur:.1f}s')
