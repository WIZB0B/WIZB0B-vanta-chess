#!/usr/bin/env python3
# The VCH music check. Every track must pass it before it joins the library (owner, 2026-10-13:
# "no skips... no mismatch... no sudden change in tones or melody or some weird AI shit...
# double check, triple check"). It measures each track for what a listener would hear as a fault
# and writes a report with timestamps, and pictures to review by eye. It is one of three checks:
# Flow Music's Producer listens to each track first, this measures it, and the owner's ears have
# the last word (Theme Studio's Sound test).
#
# Usage: python3 -I audit.py --out DIR [--expect expect.json] [--models DIR] [--force] FILE...
#   expect.json: {"<name>": {"kind": "suite|theme|lobby|song|opera|sting|instrumental",
#                 "bpm": 90, "language": "ko", "lyrics": "..."}}, <name> being the file name
#                 without a leading "vch-" and the extension. Unknown names are instrumentals.
#   --models DIR: the sherpa-onnx models for the voice and lyrics checks, from
#     https://github.com/k2-fsa/sherpa-onnx/releases: sherpa-onnx-ced-base-audio-tagging-2024-04-19/
#     (audio-tagging-models), UVR-MDX-NET-Voc_FT.onnx (source-separation-models) and
#     sherpa-onnx-whisper-turbo/ (asr-models). Without them those checks are skipped.
# Writes DIR/<name>.json (kept while the file is unchanged), DIR/<name>.png (an overview),
# DIR/<name>@<seconds>.png (a close view of each flag) and DIR/summary.json.
# Needs ffmpeg, numpy, scipy, librosa, essentia and matplotlib; sherpa-onnx for the models.
import argparse, json, os, re, subprocess, unicodedata
import numpy as np
import scipy.signal as sps

VERSION = 7
SR = 44100
FPS = 10  # analysis frames per second
PC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
# Temperley's key profiles (major, minor), from C.
MAJ = np.array([5, 2, 3.5, 2, 4.5, 4, 2, 4.5, 2, 3.5, 1.5, 4])
MIN = np.array([5, 2, 3.5, 4.5, 2, 4, 2, 4.5, 3.5, 2, 1.5, 4])
KEYS = [f'{p} major' for p in PC] + [f'{p} minor' for p in PC]
# AudioSet classes: a voice with words; wordless voices (allowed in opera and some themes); noise.
WORDS = ['Speech', 'Male speech, man speaking', 'Female speech, woman speaking', 'Child speech, kid speaking',
         'Narration, monologue', 'Conversation', 'Singing', 'Male singing', 'Female singing', 'Child singing',
         'Synthetic singing', 'Rapping', 'Whispering', 'Shout', 'Yell', 'Babbling', 'Speech synthesizer']
CHOIR = ['Choir', 'Chant', 'Mantra', 'Humming', 'Yodeling', 'Vocal music', 'A capella']
NOISE = ['Static', 'White noise', 'Pink noise', 'Hiss', 'Crackle', 'Hum', 'Buzz', 'Mains hum', 'Distortion', 'Cacophony']


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, **kw)


def probe(path):
    j = json.loads(run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', path], text=True).stdout or '{}')
    s = next((x for x in j.get('streams', []) if x.get('codec_type') == 'audio'), {})
    f = j.get('format', {})
    return {'codec': s.get('codec_name'), 'rate': int(s.get('sample_rate') or 0), 'channels': s.get('channels'),
            'seconds': round(float(f.get('duration') or 0), 3), 'kbps': round(int(f.get('bit_rate') or 0) / 1000)}


def decode(path, sr, channels):
    raw = run(['ffmpeg', '-v', 'error', '-i', path, '-ac', str(channels), '-ar', str(sr), '-f', 'f32le', '-'], check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).T.copy()


def decode_errors(path):
    return [l.strip() for l in run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'null', '-'], text=True).stderr.splitlines() if l.strip()]


def loudness(path):
    """EBU R128: integrated loudness, range and true peak, and the momentary loudness every 0.1 s."""
    err = run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true:framelog=info', '-f', 'null', '-'], text=True).stderr
    m = [(float(a), float(b)) for a, b in re.findall(r't:\s*([\d.]+)\s+TARGET:\S+ LUFS\s+M:\s*(-?[\d.]+|-inf)', err) if b != '-inf']
    tail = err[err.rfind('Summary:'):]
    def num(pat):
        g = re.search(pat, tail)
        return float(g.group(1)) if g and g.group(1) != '-inf' else None
    return {'I': num(r'I:\s*(-?[\d.]+) LUFS'), 'LRA': num(r'LRA:\s*(-?[\d.]+) LU'), 'TP': num(r'Peak:\s*(-?[\d.]+|-inf) dBFS')}, np.array(m) if m else np.zeros((0, 2))


def frames_db(x, size):
    n = len(x) // size
    return 10 * np.log10(np.mean(x[:n * size].reshape(n, size) ** 2, axis=1) + 1e-12)


def keyvec(chroma):
    """How well a pitch-class profile fits each of the 24 keys (correlations)."""
    c = np.asarray(chroma, dtype=float)
    if c.sum() <= 0: return np.zeros(24)
    return np.array([np.corrcoef(c, np.roll(p, k))[0, 1] for p in (MAJ, MIN) for k in range(12)])


def corr(a, b):
    if a is None or b is None or np.std(a) == 0 or np.std(b) == 0: return None
    return float(np.corrcoef(a, b)[0, 1])


def fold_bpm(b):
    while b < 70: b *= 2
    while b >= 140: b /= 2
    return b


def same_pulse(a, b):
    """Two tempi feel the same if they match, or one is double the other."""
    return abs(fold_bpm(a) / fold_bpm(b) - 1) <= 0.04 or abs(abs(fold_bpm(a) / fold_bpm(b) - 1) - 1) <= 0.04


class Track:
    def __init__(self, path, expect, models, out):
        self.path, self.expect, self.models, self.out = path, expect, models, out
        self.name = re.sub(r'^vch-', '', os.path.splitext(os.path.basename(path))[0])
        self.kind = expect.get('kind', 'instrumental')
        self.flags = []

    def flag(self, t, kind, severity, why, **extra):
        self.flags.append({'t': None if t is None else round(float(t), 2), 'type': kind, 'severity': severity, 'why': why, **extra})

    def measure(self, tagger=None, voice=None):
        import essentia
        essentia.log.infoActive = False
        essentia.log.warningActive = False
        import essentia.standard as es
        import librosa
        r = {'name': self.name, 'kind': self.kind, 'probe': probe(self.path), 'decodeErrors': decode_errors(self.path)}
        if r['decodeErrors']: self.flag(None, 'decode', 'fail', 'the file has decoding errors: ' + r['decodeErrors'][0][:120])
        x = decode(self.path, SR, 2)
        mono = np.ascontiguousarray(x.mean(axis=0), dtype=np.float32)
        dur = len(mono) / SR
        r['seconds'] = round(dur, 2)
        lvl, self.mom = loudness(self.path)
        lvl['overs'] = int((np.abs(x) > 1.0).sum())
        r['level'] = lvl
        if lvl['TP'] is not None and lvl['TP'] > 1.0: self.flag(None, 'peak', 'review', f"true peak {lvl['TP']:+.1f} dBTP: it clips unless turned down")

        # Where the music is (10 ms levels), how it starts and how it ends.
        db10 = frames_db(mono, SR // 100)
        loud = np.where(db10 > -50)[0]
        first = loud[0] / 100 if len(loud) else 0.0
        last = (loud[-1] + 1) / 100 if len(loud) else dur
        body = db10[int(first * 100):int(last * 100)]
        med = float(np.median(body)) if len(body) else -60.0
        self.first, self.last = first, last
        strong = np.where(db10[:int(last * 100)] > med - 6)[0]
        decay = last - (strong[-1] + 1) / 100 if len(strong) else 0.0
        r['music'] = {'first': round(first, 2), 'last': round(last, 2), 'medianDb': round(med, 1), 'decay': round(decay, 2)}
        if self.kind == 'pack': pass  # a pack of separate sounds: gaps and endings are by design
        elif db10[-3:].max() > med - 12 and db10[-3:].max() > -40:
            self.flag(dur, 'ending', 'review', 'the file stops while the music is still playing (cut off: it needs a fade or a trim)')
        elif decay < 0.35 and self.kind != 'sting':
            self.flag(last, 'ending', 'review', f'the music stops within {decay:.2f} s, with no ring-out (an abrupt ending)')
        quiet = db10 < max(-55.0, med - 35)
        self.gaps = []
        i = int(first * 100) + 50
        while self.kind != 'pack' and i < int(last * 100) - 50:
            if quiet[i]:
                j = i
                while j < len(quiet) and quiet[j]: j += 1
                if j - i >= 25:
                    around = db10[max(0, i - 300):i + 300]
                    sparse = np.median(around) < med - 10  # a sparse passage, where short rests are natural
                    sev = 'fail' if j - i >= 100 else 'info' if sparse and j - i < 60 else 'review'
                    self.flag(i / 100, 'silence', sev, f'{(j - i) / 100:.2f} s of silence inside the music (a gap or a false ending)')
                    self.gaps.append((i / 100, j / 100))
                i = j
            i += 1

        # Essentia's detectors: clicks, gaps (dropouts) and saturation.
        fs, hs = 512, 256
        cd = es.ClickDetector(frameSize=fs, hopSize=hs, sampleRate=SR)
        sd = es.SaturationDetector(frameSize=fs, hopSize=hs, sampleRate=SR)
        clicks, sats = [], []
        for fr in es.FrameGenerator(mono, frameSize=fs, hopSize=hs, startFromZero=True):
            s, _ = cd(fr)
            clicks += [float(v) for v in s]
            s2, e2 = sd(fr)
            sats += [(float(a), float(c)) for a, c in zip(s2, e2)]
        gd = es.GapsDetector(frameSize=2048, hopSize=1024, sampleRate=SR)
        gaps = []
        for fr in es.FrameGenerator(mono, frameSize=2048, hopSize=1024, startFromZero=True):
            s, e = gd(fr)
            gaps += [(float(a), float(c)) for a, c in zip(s, e)]
        for a, c in gaps:
            if first + 0.5 < a < last - 0.5: self.flag(a, 'dropout', 'fail', f'a dropout of {1000 * (c - a):.0f} ms (the sound drops out and comes back)')
        r['saturation'] = round(sum(c - a for a, c in sats), 3)
        if r['saturation'] > 0.05: self.flag(sats[0][0], 'clipping', 'review', f"{1000 * r['saturation']:.0f} ms of flattened peaks (clipping)")

        # Beats (Essentia's multi-feature tracker) and the tempo along the track (a tempogram).
        bpm, ticks, conf, _, _ = es.RhythmExtractor2013(method='multifeature')(mono)
        ticks = np.asarray(ticks, dtype=float)
        self.ticks, self.beatconf = ticks, float(conf)
        r['beats'] = {'bpm': round(float(bpm), 1), 'confidence': round(float(conf), 2), 'count': int(len(ticks))}
        y22 = decode(self.path, 22050, 1)[0]
        oe = librosa.onset.onset_strength(y=y22, sr=22050, hop_length=512)
        self.tgm = librosa.feature.tempogram(onset_envelope=oe, sr=22050, hop_length=512, win_length=384)
        self.tgm_bpm = librosa.tempo_frequencies(self.tgm.shape[0], sr=22050, hop_length=512)
        self.tgm_fps = 22050 / 512

        # A sudden change of rhythm: the pattern of beats (the tempogram) just before and just after
        # differ (a slow, free passage that turns at once into a fast dance, say).
        sel = (self.tgm_bpm >= 40) & (self.tgm_bpm <= 240)
        tf = self.tgm_fps
        pulse = []
        for t in np.arange(max(10.0, first + 8), min(dur, last) - 8, 0.5):
            a = self.tgm[sel, int((t - 8) * tf):int((t - 0.5) * tf)].mean(axis=1)
            b = self.tgm[sel, int((t + 0.5) * tf):int((t + 8) * tf)].mean(axis=1)
            c = corr(a, b)
            pulse.append((float(t), 1.0 if c is None else c))
        self.pulse = pulse
        kept = []
        for t, c in sorted([z for z in pulse if z[1] < 0.3], key=lambda z: z[1]):
            if all(abs(t - u) > 8 for u, _ in kept): kept.append((t, c))
        r['beats']['pulseChanges'] = [(round(t, 1), round(c, 2)) for t, c in sorted(kept)]
        for t, c in sorted(kept)[:6]:
            self.flag(t, 'pulse', 'review', f'the rhythm changes suddenly (the beat pattern before and after match only {c:.2f})')

        # A click is a lone impulse: each detection is checked against the high band around it, so a
        # drum hit (whose brightness lasts) is not taken for one.
        hp = np.abs(sps.sosfilt(sps.butter(4, 5000, 'hp', fs=SR, output='sos'), mono))
        real = []
        for t in sorted(set(round(c, 3) for c in clicks)):
            n = int(t * SR)
            if n < (first + 0.3) * SR or n > (last - 0.3) * SR: continue
            p = hp[max(0, n - 66):n + 66].max()
            bg = np.median(np.r_[hp[max(0, n - 2650):max(0, n - 441)], hp[n + 441:n + 2650]]) + 1e-9
            q = 20 * np.log10(p / bg)
            if q >= 20 and 20 * np.log10(p + 1e-9) > -50: real.append((t, q))
        on_beat = [t for t, _ in real if len(ticks) and np.min(np.abs(ticks - t)) < 0.03]
        periodic = len(real) >= 4 and len(on_beat) >= 0.7 * len(real)
        r['clicks'] = {'detected': len(clicks), 'impulses': [(round(t, 3), round(q, 1)) for t, q in real[:40]], 'onBeat': periodic}
        if not periodic:
            for t, q in real[:12]: self.flag(t, 'click', 'review', f'a click (an impulse {q:.0f} dB above its surroundings)')

        # A skip moves the beat grid by part of a beat; only judged where the beat is clear.
        jumps = []
        if len(ticks) > 20 and conf >= 2.5:
            for k in range(8, len(ticks) - 8):
                Lk, Rk = np.arange(k - 7, k + 1), np.arange(k + 1, k + 9)
                pl, pr = np.polyfit(Lk, ticks[Lk], 1), np.polyfit(Rk, ticks[Rk], 1)
                if abs(pl[0] / pr[0] - 1) > 0.05: continue
                off = (np.polyval(pr, k + 0.5) - np.polyval(pl, k + 0.5)) / ((pl[0] + pr[0]) / 2)
                res = max(np.abs(ticks[Lk] - np.polyval(pl, Lk)).max(), np.abs(ticks[Rk] - np.polyval(pr, Rk)).max()) / pl[0]
                if abs(off) > 0.18 and res < 0.08: jumps.append((float(ticks[k]), round(float(off), 2)))
        kept = []
        for t, o in sorted(jumps, key=lambda z: -abs(z[1])):
            if all(abs(t - u) > 1.0 for u, _ in kept): kept.append((t, o))
        r['beats']['skips'] = [(round(t, 2), o) for t, o in sorted(kept)[:20]]
        for t, o in sorted(kept): self.flag(t, 'skip', 'review', f'the beat grid jumps by {abs(o):.2f} of a beat (a skip in the rhythm)')

        # Harmony: Essentia HPCP every 0.1 s, folded to twelve pitch classes (C first).
        win = es.Windowing(type='blackmanharris62', size=4096)
        spec = es.Spectrum(size=4096)
        peaks = es.SpectralPeaks(orderBy='magnitude', magnitudeThreshold=1e-5, minFrequency=40, maxFrequency=5000, maxPeaks=100, sampleRate=SR)
        hpcp = es.HPCP(size=36, referenceFrequency=440, harmonics=8, bandPreset=True, minFrequency=40, maxFrequency=5000, weightType='cosine', nonLinear=False, windowSize=1.0, sampleRate=SR)
        roll = es.RollOff(cutoff=0.99, sampleRate=SR)
        H, specs, rolls = [], [], []
        for fr in es.FrameGenerator(mono, frameSize=4096, hopSize=SR // FPS, startFromZero=False):
            sp = spec(win(fr))
            f, m = peaks(sp)
            H.append(hpcp(f, m)); specs.append(sp); rolls.append(roll(sp))
        H = np.array(H)
        self.specs, self.rolls = np.array(specs), np.array(rolls)
        # HPCP bin 0 is A (the 440 Hz reference), three bins a semitone centred on 0, 3, 6...
        self.chroma = np.roll(np.roll(H, 1, axis=1).reshape(len(H), 12, 3).sum(axis=2).T, -3, axis=0)
        P = self.specs.T ** 2
        pw = P.sum(axis=0)
        n = P.shape[1]
        wch = self.chroma * pw / (self.chroma.sum(axis=0, keepdims=True) + 1e-12)  # each frame's profile, weighted by its energy
        self.wch = wch
        gkv = keyvec(wch.sum(axis=1))
        r['key'] = {'global': KEYS[int(np.argmax(gkv))], 'fit': round(float(gkv.max()), 2)}
        self.gkv = gkv
        # The key along the track (16-s windows) and how well each fits the track's key.
        kw = []
        for s in np.arange(0, max(dur - 16, 0) + 1e-6, 4.0):
            a, b = int(s * FPS), min(n, int((s + 16) * FPS))
            if pw[a:b].sum() < pw.sum() * 1e-4: continue
            v = keyvec(wch[:, a:b].sum(axis=1))
            kw.append((float(s), KEYS[int(np.argmax(v))], corr(v, gkv)))
        self.kw = kw
        r['key']['windows'] = [(round(s + 8), k, round(c, 2) if c is not None else None) for s, k, c in kw]
        # A long passage in another key (three windows in a row that fit the track's key badly).
        bad = [(s, k) for s, k, c in kw if c is not None and c < 0.3]
        for (s, k) in bad[:1]:
            if sum(1 for u, _ in bad if s <= u <= s + 8) >= 3:
                self.flag(s + 8, 'key', 'review', f"a passage in {k}, far from the track's {r['key']['global']}")
        def kv_between(a, b):
            a, b = max(0, int(a * FPS)), min(n, int(b * FPS))
            return keyvec(wch[:, a:b].sum(axis=1)) if b - a >= FPS * 2 else None
        self.kv_between = kv_between

        # Bandwidth: when the top end suddenly disappears for a while (compared with the music around
        # it, at a similar level), it sounds muffled or "underwater". Soft passages are naturally duller.
        persec = np.array([float(np.median(self.rolls[i:i + FPS])) for i in range(0, len(self.rolls) - FPS + 1, FPS)])
        lvl1 = np.array([float(np.median(db10[i * 100:(i + 1) * 100])) for i in range(len(persec))])
        span = persec[int(first):max(int(first) + 1, int(last))]
        if len(span):
            r['bandwidth'] = {'median': round(float(np.median(span))), 'low': round(float(span.min()))}
            k = 0
            for i in range(len(persec)):
                around = np.r_[persec[max(0, i - 10):max(0, i - 1)], persec[i + 2:i + 11]]
                lev = np.r_[lvl1[max(0, i - 10):max(0, i - 1)], lvl1[i + 2:i + 11]]
                if first + 2 < i < last - 3 and len(around) >= 8 and persec[i] < 0.4 * np.median(around) and lvl1[i] > np.median(lev) - 4:
                    k += 1
                    if k == 2: self.flag(i - 1, 'muffled', 'review', f'the top end suddenly drops to {persec[i] / 1000:.1f} kHz (around it {np.median(around) / 1000:.1f} kHz): it sounds muffled')
                else: k = 0
        # Stereo: out-of-phase channels cancel out on a phone speaker.
        cor = []
        for s in range(0, x.shape[1] - SR, SR):
            a, b = x[0, s:s + SR], x[1, s:s + SR]
            den = np.sqrt((a * a).sum() * (b * b).sum())
            cor.append(float((a * b).sum() / den) if den > 1e-9 else 1.0)
        r['stereo'] = {'medianCorr': round(float(np.median(cor)), 2) if cor else None, 'minCorr': round(min(cor), 2) if cor else None}
        neg = [i for i, c in enumerate(cor) if c < -0.2]
        if len(neg) >= 2: self.flag(neg[0], 'phase', 'review', 'the left and right channels are out of phase (it thins out or vanishes in mono)')

        # Voices and the sound's character every 2.5 s (the AudioSet tagger), when it is here.
        self.tagwin = []
        if tagger is not None:
            y16 = decode(self.path, 16000, 1)[0]
            tg, names = tagger
            for s in np.arange(0, max(len(y16) / 16000 - 5, 0) + 1e-6, 2.5):
                st = tg.create_stream()
                st.accept_waveform(16000, y16[int(s * 16000):int((s + 5) * 16000)])
                v = np.zeros(len(names), np.float32)
                for e in tg.compute(st): v[e.index] = e.prob
                self.tagwin.append((float(s), v))
            ix = {nm: i for i, nm in enumerate(names)}
            pick = lambda group: np.array([max(v[ix[w]] for w in group if w in ix) for _, v in self.tagwin])
            self.words, self.choir, self.noise = pick(WORDS), pick(CHOIR), pick(NOISE)
            top = np.mean([v for _, v in self.tagwin], axis=0)
            r['tags'] = [(names[i], round(float(top[i]), 2)) for i in np.argsort(-top)[:12]]
            r['voice'] = {'words': round(float(self.words.max()), 2), 'choir': round(float(self.choir.max()), 2), 'noise': round(float(self.noise.max()), 2)}
            if self.kind not in ('song', 'pack'):
                hot = np.where(self.words >= 0.35)[0]
                if len(hot):
                    w0 = self.tagwin[hot[0]][0]
                    sev = 'fail' if self.words.max() >= 0.55 and self.kind != 'opera' else 'review'
                    self.flag(w0 + 2.5, 'voice', sev, f'a voice (singing or speech, {self.words.max():.2f}) in an instrumental, from {w0:.0f} s, in {len(hot)} of {len(self.words)} windows')
                elif self.choir.max() >= 0.45 and self.kind != 'opera':
                    w0 = self.tagwin[int(np.argmax(self.choir))][0]
                    self.flag(w0 + 2.5, 'voice', 'review', f'a choir or wordless voice ({self.choir.max():.2f}) at {w0:.0f} s')
            hn = np.where(self.noise >= 0.3)[0]
            if len(hn): self.flag(self.tagwin[hn[0]][0] + 2.5, 'noise', 'review', f'noise or distortion heard ({self.noise.max():.2f})')
        def tags_between(a, b):
            vs = [v for s, v in self.tagwin if s >= a and s + 5 <= b]
            return np.mean(vs, axis=0) if vs else None

        # Moments of change: how much the sound (timbre), the harmony and the level differ just
        # before and just after; then whether each was sudden, prepared, and what switched.
        mel = librosa.filters.mel(sr=SR, n_fft=4096, n_mels=96, fmin=30, fmax=16000)
        self.lm = librosa.power_to_db(mel @ P + 1e-12)
        mf = librosa.feature.mfcc(S=self.lm, n_mfcc=20)[1:]
        mf = (mf - mf.mean(axis=1, keepdims=True)) / (mf.std(axis=1, keepdims=True) + 1e-9)
        def sides(F, w):
            c = np.concatenate([np.zeros((F.shape[0], 1)), np.cumsum(F, axis=1)], axis=1)
            idx = np.arange(n)
            lo, hi = np.clip(idx - w, 0, n), np.clip(idx + w, 0, n)
            return (c[:, idx] - c[:, lo]) / np.maximum(idx - lo, 1), (c[:, hi] - c[:, idx]) / np.maximum(hi - idx, 1)
        l3, r3 = sides(mf, 30); dT = np.linalg.norm(r3 - l3, axis=0) / np.sqrt(mf.shape[0])
        l0, r0 = sides(mf, 4); A = np.linalg.norm(r0 - l0, axis=0) / np.sqrt(mf.shape[0])
        lh, rh = sides(wch, 40)
        dH = 1 - (lh * rh).sum(axis=0) / (np.linalg.norm(lh, axis=0) * np.linalg.norm(rh, axis=0) + 1e-12)
        lp, rp = sides(pw[None], 20); dL = 10 * np.log10((rp[0] + 1e-12) / (lp[0] + 1e-12))
        ls, rs = sides(pw[None], 3); dLs = 10 * np.log10((rs[0] + 1e-12) / (ls[0] + 1e-12))
        edge = int(max(first, 2) * FPS), int(min(last, dur - 2) * FPS)
        for arr in (dT, A, dH, dL, dLs): arr[:edge[0]] = 0; arr[edge[1]:] = 0
        self.dT, self.A, self.dH, self.dL = dT, A, dH, dL
        fdb = 10 * np.log10(pw + 1e-12)
        cands = set()
        for arr, h in ((dT, 0.75), (dH, 0.22)):
            pk, _ = sps.find_peaks(arr, height=h, distance=40)
            cands.update(int(p) for p in pk)
        pk, _ = sps.find_peaks(np.abs(dLs), height=6, distance=40)
        cands.update(int(p) for p in pk)
        merged = []
        for c in sorted(cands):
            if merged and c - merged[-1] < 25:
                if dT[c] > dT[merged[-1]]: merged[-1] = c
            else: merged.append(c)
        changes = []
        period = float(np.median(np.diff(ticks))) if len(ticks) > 4 else None
        for c in merged:
            lo, hi = max(0, c - 15), min(n, c + 16)
            b = lo + int(np.argmax(np.abs(dLs[lo:hi]) / 6 + A[lo:hi]))
            t = b / FPS
            pre = fdb[max(0, b - 40):max(1, b - 3)]
            slope = float(np.polyfit(np.arange(len(pre)) / FPS, pre, 1)[0]) if len(pre) >= 10 else 0.0
            kc = corr(kv_between(t - 8, t), kv_between(t, t + 8))
            ga, gb = tags_between(t - 10, t), tags_between(t, t + 10)
            dtag = float(1 - (ga @ gb) / (np.linalg.norm(ga) * np.linalg.norm(gb) + 1e-12)) if ga is not None and gb is not None else None
            ch_ = {'t': round(t, 1), 'timbre': round(float(dT[c]), 2), 'sudden': round(float(A[b]), 2), 'harmony': round(float(dH[c]), 2),
                   'step': round(float(dLs[b]), 1), 'level': round(float(dL[b]), 1), 'build': round(slope, 2),
                   'keyFit': round(kc, 2) if kc is not None else None, 'tags': round(dtag, 2) if dtag is not None else None,
                   'phase': round(float(np.min(np.abs(ticks - t)) / period), 2) if period else None, 'vanish': round(self.vanish(mono, t), 2)}
            changes.append(ch_)
            self.judge(ch_)
        r['changes'] = changes

        # Suites: three sections rising at 1:00 and 2:00 in one key and one tempo, so the game can
        # move between them.
        if self.kind == 'suite':
            secs = [(3, 58), (66, 118), (126, last - 3)]
            tempi, kvs = [], []
            for a, b in secs:
                seg = self.tgm[:, int(a * self.tgm_fps):int(b * self.tgm_fps)].mean(axis=1)
                fold = {}
                for bp, v in zip(self.tgm_bpm, seg):
                    if 50 <= bp <= 220:
                        f = round(fold_bpm(bp), 0)
                        fold[f] = fold.get(f, 0) + v
                best = sorted(fold.items(), key=lambda z: -z[1])
                tempi.append(best[0][0] if best else None)
                kvs.append(kv_between(a, b))
            sel = (self.tgm_bpm >= 50) & (self.tgm_bpm <= 220)
            prof = [self.tgm[sel, int(a * self.tgm_fps):int(b * self.tgm_fps)].mean(axis=1) for a, b in secs]
            pulse = [corr(prof[0], p) for p in prof]
            lv = [round(float(np.median(db10[int(a * 100):int(b * 100)])), 1) for a, b in secs]
            r['sections'] = {'tempo': tempi, 'key': [KEYS[int(np.argmax(v))] if v is not None else None for v in kvs],
                             'keyFit': [round(corr(kvs[0], v), 2) if v is not None else None for v in kvs], 'level': lv,
                             'pulseFit': [round(p, 3) if p is not None else None for p in pulse]}
            want = self.expect.get('bpm')
            for i in (1, 2):
                if tempi[0] and tempi[i] and not same_pulse(tempi[0], tempi[i]):
                    self.flag(secs[i][0] - 6, 'tempo', 'review', f'section {i + 1} pulses at about {tempi[i]:.0f}, section 1 at {tempi[0]:.0f} (folded to one octave)')
                kf = corr(kvs[0], kvs[i])
                if kf is not None and kf < 0.6:
                    self.flag(secs[i][0] - 6, 'key', 'fail', f"section {i + 1} is in {r['sections']['key'][i]}, section 1 in {r['sections']['key'][0]} (key fit {kf:.2f}): the parts clash when the game moves between them")
            if want and tempi[0] and not same_pulse(tempi[0], want):
                self.flag(None, 'tempo', 'info', f'the pulse is about {tempi[0]:.0f}, not the {want} BPM asked for')
            if not (lv[1] >= lv[0] + 1.5 and lv[2] >= lv[1] - 1.0):
                self.flag(None, 'rise', 'review', f'the sections do not rise in level as asked ({lv[0]}, {lv[1]}, {lv[2]} dB)')
        r['flags'] = sorted(self.flags, key=lambda f: (f['t'] is None, f['t'] or 0))
        sev = {f['severity'] for f in self.flags}
        r['verdict'] = 'fail' if 'fail' in sev else 'review' if 'review' in sev else 'pass'
        self.r, self.mono, self.dur, self.db10 = r, mono, dur, db10
        return r

    def vanish(self, mono, t):
        """The share of the strong partials sounding just before t that are gone 30 ms after it: a
        cut silences everything at once, while music lets its sounds ring out."""
        import librosa
        n = int(t * SR)
        seg = mono[max(0, n - 4096):n + 4096]
        if len(seg) < 8192: return 0.0
        S = np.abs(librosa.stft(seg, n_fft=1024, hop_length=256, center=False)) ** 2
        mid = (len(seg) // 2 - 512) // 256
        before = S[:, max(0, mid - 4):mid - 1].mean(axis=1)
        after = S[:, mid + 3:mid + 7].mean(axis=1)
        strong = before > before.max() * 10 ** -3.5
        return float(np.mean(after[strong] < before[strong] * 0.01)) if strong.sum() >= 5 else 0.0

    def judge(self, c):
        """A jump cut: the music changes at once, with no build-up, into something else (another
        key or another sound), or straight after a gap. Ordinary accents and planned rises pass."""
        if self.kind == 'pack': return
        t = c['t']
        gap_before = any(t - 1.5 <= b <= t + 0.3 for a, b in self.gaps)
        surge = c['level'] >= 8 and c['build'] < 1.0 and c['timbre'] >= 1.0
        harmonic = c['keyFit'] is not None and c['keyFit'] < 0.3
        style = c['tags'] is not None and c['tags'] >= 0.3
        what = [f"the level jumps {c['level']:+.0f} dB with no build-up"] if surge else []
        if gap_before: what.append('straight after a gap')
        if harmonic: what.append(f"the harmony moves to an unrelated key (fit {c['keyFit']:.2f})")
        if style: what.append(f"the sound switches (tags {c['tags']:.2f} apart)")
        if surge and (harmonic or style or gap_before):
            self.flag(t, 'jump', 'fail', 'a jump cut: ' + ', '.join(what))
        elif c['vanish'] >= 0.5 and c['level'] <= -6:
            self.flag(t, 'cut', 'review', f"{int(c['vanish'] * 100)}% of the sound stops dead (a cut)")
        elif c['keyFit'] is not None and c['keyFit'] < 0.0 and style and c['sudden'] >= 1.0:
            self.flag(t, 'switch', 'review', 'a sudden switch: ' + ', '.join(what))

    # ---- pictures -----------------------------------------------------------------------------
    def draw(self):
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import librosa
        r, dur = self.r, self.dur
        tt = np.arange(self.lm.shape[1]) / FPS
        rows = 7 if self.tagwin else 6
        fig, ax = plt.subplots(rows, 1, figsize=(16, 15 if self.tagwin else 13.5), sharex=True,
                               gridspec_kw={'height_ratios': [1, 3, 1.6, 1.6, 1.2, 1.2] + ([1.1] if self.tagwin else [])})
        if len(self.mom): ax[0].plot(self.mom[:, 0], self.mom[:, 1], lw=.6, color='#2b6cb0')
        ax[0].set_ylabel('LUFS'); ax[0].set_ylim(-60, 0)
        ax[1].imshow(self.lm, origin='lower', aspect='auto', extent=[0, tt[-1], 0, 96], cmap='magma', vmin=self.lm.max() - 80, vmax=self.lm.max())
        ax[1].set_ylabel('mel 30 Hz-16 kHz')
        ch = self.chroma / (self.chroma.max(axis=0, keepdims=True) + 1e-9)
        ax[2].imshow(ch, origin='lower', aspect='auto', extent=[0, tt[-1], 0, 12], cmap='Greys', vmin=0, vmax=1)
        ax[2].set_yticks(np.arange(12) + .5); ax[2].set_yticklabels(PC, fontsize=6)
        prev = None
        for s, k, c in self.kw:
            if k != prev: ax[2].text(s + 8, 12.2, k.replace(' major', '').replace(' minor', 'm'), fontsize=7, color='#c05621' if (c or 0) < 0.3 else '#2f855a')
            prev = k
        sel = (self.tgm_bpm >= 40) & (self.tgm_bpm <= 240)
        tg = self.tgm[sel]
        ax[3].imshow(tg[::-1] if self.tgm_bpm[sel][0] > self.tgm_bpm[sel][-1] else tg, origin='lower', aspect='auto', cmap='viridis',
                     extent=[0, self.tgm.shape[1] / self.tgm_fps, 0, sel.sum()])
        bp = np.sort(self.tgm_bpm[sel])
        for v in (60, 90, 120, 180):
            j = int(np.searchsorted(bp, v)); ax[3].axhline(j, color='w', lw=.3, alpha=.6); ax[3].text(1, j, str(v), color='w', fontsize=6)
        want = self.expect.get('bpm')
        if want:
            for m_ in (0.5, 1, 2):
                if 40 <= want * m_ <= 240: ax[3].axhline(int(np.searchsorted(bp, want * m_)), color='red', lw=.6, ls='--')
        ax[3].set_ylabel('tempo'); ax[3].set_yticks([])
        ax[4].plot(tt, self.dT, lw=.6, label='timbre'); ax[4].plot(tt, self.A, lw=.4, alpha=.7, label='sudden')
        ax[4].plot(tt, self.dH * 4, lw=.6, label='harmony x4')
        if self.pulse: ax[4].plot([t for t, _ in self.pulse], [2 * (1 - c) for _, c in self.pulse], lw=.7, color='#d53f8c', label='rhythm change x2')
        ax[4].legend(fontsize=6, loc='upper right'); ax[4].set_ylim(0, 3)
        ax[5].plot(np.arange(len(self.rolls)) / FPS, np.array(self.rolls) / 1000, lw=.4, color='#718096'); ax[5].set_ylabel('99% kHz'); ax[5].set_ylim(0, 22)
        if len(self.ticks) > 2 and self.beatconf >= 1.5:
            a2 = ax[5].twinx(); a2.plot(self.ticks[1:], 60 / np.diff(self.ticks), '.', ms=1.5, color='#2f855a'); a2.set_ylim(40, 240); a2.set_ylabel('beat BPM', fontsize=7)
        if self.tagwin:
            ts = [s + 2.5 for s, _ in self.tagwin]
            ax[6].plot(ts, self.words, lw=.8, label='voice (words)', color='#c53030')
            ax[6].plot(ts, self.choir, lw=.8, label='choir', color='#805ad5')
            ax[6].plot(ts, self.noise, lw=.8, label='noise', color='#718096')
            ax[6].set_ylim(0, 1); ax[6].legend(fontsize=6, loc='upper right')
        for f in r['flags']:
            if f['t'] is None: continue
            col = {'fail': 'red', 'review': 'orange'}.get(f['severity'], 'grey')
            for a in ax: a.axvline(f['t'], color=col, lw=1.1, alpha=.85)
        for a in ax:
            for s in range(0, int(dur) + 1, 10): a.axvline(s, color='c', lw=.25, alpha=.5)
        ax[-1].set_xticks(range(0, int(dur) + 1, 10)); ax[-1].set_xlim(0, dur)
        fig.suptitle(f"{self.name}  [{r['verdict'].upper()}]  {r['key']['global']} (fit {r['key']['fit']})  beat {r['beats']['bpm']} (conf {r['beats']['confidence']})  {r['level']['I']} LUFS  TP {r['level']['TP']}", fontsize=10)
        fig.tight_layout()
        fig.savefig(os.path.join(self.out, f'{self.name}.png'), dpi=60)
        plt.close(fig)
        for f in r['flags']:
            if f['t'] is None or f['severity'] not in ('fail', 'review'): continue
            t0, t1 = max(0.0, f['t'] - 4), min(dur, f['t'] + 4)
            seg = self.mono[int(t0 * SR):int(t1 * SR)]
            if len(seg) < SR: continue
            S = librosa.amplitude_to_db(np.abs(librosa.stft(seg, n_fft=2048, hop_length=256)), ref=np.max)
            fig, ax = plt.subplots(2, 1, figsize=(12, 6), sharex=True, gridspec_kw={'height_ratios': [1, 3]})
            ax[0].plot(np.arange(len(seg)) / SR + t0, seg, lw=.3); ax[0].set_ylim(-1, 1)
            ax[1].imshow(S[:560], origin='lower', aspect='auto', extent=[t0, t1, 0, 560 * SR / 2048 / 1000], cmap='magma', vmin=-80, vmax=0)
            ax[1].set_ylabel('kHz')
            for a in ax: a.axvline(f['t'], color='cyan', lw=.8, alpha=.7)
            fig.suptitle(f"{self.name} @ {f['t']:.2f}s  {f['severity']}: {f['why'][:120]}", fontsize=9)
            fig.tight_layout(); fig.savefig(os.path.join(self.out, f"{self.name}@{f['t']:.1f}.png"), dpi=60); plt.close(fig)


def load_tagger(models):
    d = os.path.join(models or '', 'sherpa-onnx-ced-base-audio-tagging-2024-04-19')
    if not models or not os.path.isdir(d): return None
    import csv, sherpa_onnx
    model = next(os.path.join(d, f) for f in ('model.int8.onnx', 'model.onnx') if os.path.exists(os.path.join(d, f)))
    labels = os.path.join(d, 'class_labels_indices.csv')
    cfg = sherpa_onnx.AudioTaggingConfig(model=sherpa_onnx.AudioTaggingModelConfig(ced=model, num_threads=2), labels=labels, top_k=600)
    names = [row[2] for row in list(csv.reader(open(labels)))[1:]]
    return sherpa_onnx.AudioTagging(cfg), names


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--expect')
    ap.add_argument('--models')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('files', nargs='+')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    expect = json.load(open(a.expect)) if a.expect else {}
    tagger = load_tagger(a.models)
    sp = os.path.join(a.out, 'summary.json')
    summary = json.load(open(sp)) if os.path.exists(sp) else {}
    for path in a.files:
        name = re.sub(r'^vch-', '', os.path.splitext(os.path.basename(path))[0])
        jp = os.path.join(a.out, f'{name}.json')
        size = os.path.getsize(path)
        if not a.force and os.path.exists(jp):
            old = json.load(open(jp))
            if old.get('size') == size and old.get('version') == VERSION and old.get('tagged') == (tagger is not None): continue
        tr = Track(path, expect.get(name, {}), a.models, a.out)
        try:
            r = tr.measure(tagger)
            tr.draw()
        except Exception as e:  # a file that cannot be measured fails; it does not stop the run
            import traceback; traceback.print_exc()
            r = {'name': name, 'verdict': 'fail', 'flags': [{'t': None, 'type': 'error', 'severity': 'fail', 'why': f'{type(e).__name__}: {e}'}]}
        r.update(size=size, version=VERSION, tagged=tagger is not None)
        json.dump(r, open(jp, 'w'), indent=1, default=lambda o: o.item() if hasattr(o, 'item') else str(o))
        summary[name] = {'verdict': r['verdict'], 'flags': [f"{f['t']}s {f['severity']} {f['type']}: {f['why']}" for f in r['flags'] if f['severity'] != 'info']}
        json.dump(summary, open(sp, 'w'), indent=1)
        print(f"{name:30s} {r['verdict'].upper():6s} " + ' | '.join(f"{f['t']}s {f['type']}" for f in r['flags'] if f['severity'] != 'info')[:300], flush=True)


if __name__ == '__main__':
    main()
