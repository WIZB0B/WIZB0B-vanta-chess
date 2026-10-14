#!/usr/bin/env python3
# The voice and lyrics half of the VCH music check (see audit.py). For a song it separates the
# voice from the music (UVR MDX-Net), transcribes it (Whisper) and checks that the singing is in
# the expected language, that its words are real words, and, where the lyrics were written for
# it, that they are those lyrics. For an instrumental in which audit.py heard a voice, it checks
# whether that voice sings words.
#
# Usage: python3 -I lyrics.py --out DIR --models DIR [--expect expect.json] [--all] FILE...
#   Run audit.py first: this adds a "lyrics" section and its flags to DIR/<name>.json and writes
#   the transcript to DIR/<name>.lyrics.txt. Songs (kind "song" in expect.json) are always
#   checked; with --all, every instrumental in which a voice was heard is checked too.
#   expect.json can give "language" (an ISO 639-1 code) and "lyrics" (as sent to the generator).
#   --models DIR holds UVR-MDX-NET-Voc_FT.onnx and sherpa-onnx-whisper-turbo/ from
#   https://github.com/k2-fsa/sherpa-onnx/releases (source-separation-models, asr-models).
# Needs ffmpeg, numpy, scipy, sherpa-onnx, rapidfuzz and wordfreq.
import argparse, json, os, re, subprocess, unicodedata
import numpy as np
import scipy.signal as sps

SR = 44100
WORDFREQ = {'en', 'es', 'fr', 'de', 'it', 'pt', 'tr', 'ru', 'ar', 'hi', 'nl', 'pl', 'sv'}
CJK = {'zh', 'ja'}


def decode(path, sr, channels):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', str(channels), '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, channels).T.copy()


def normalise(text):
    text = unicodedata.normalize('NFKC', text).lower()
    text = re.sub(r'\[[^\]]*\]', ' ', text)
    text = re.sub(r"[^\w\s']", ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def words_of(text, lang):
    t = normalise(text)
    if lang in CJK: return [c for c in t if not c.isspace()]
    return t.split()


class Models:
    # The two models never sit in memory together (about 1.6 GB and 3 GB: a machine with 6 GB
    # holds one at a time): every voice is separated first, then the separator goes and the
    # transcriber comes.
    def __init__(self, d):
        import sherpa_onnx as so
        self.so, self.d, self.sep, self.rec_ = so, d, None, None

    def separator(self):
        if self.sep is None:
            so = self.so
            self.sep = so.OfflineSourceSeparation(so.OfflineSourceSeparationConfig(model=so.OfflineSourceSeparationModelConfig(
                uvr=so.OfflineSourceSeparationUvrModelConfig(model=os.path.join(self.d, 'UVR-MDX-NET-Voc_FT.onnx')), num_threads=2)))
        return self.sep

    def drop_separator(self):
        import gc
        self.sep = None; gc.collect()

    def rec(self, lang=None):
        # One recogniser that hears the language for itself. Whisper hearing the right language
        # is itself the check that the words are sung clearly in it.
        if self.rec_ is None:
            w = os.path.join(self.d, 'sherpa-onnx-whisper-turbo')
            enc, dec, tok = (os.path.join(w, f) for f in ('turbo-encoder.int8.onnx', 'turbo-decoder.int8.onnx', 'turbo-tokens.txt'))
            self.rec_ = self.so.OfflineRecognizer.from_whisper(encoder=enc, decoder=dec, tokens=tok, language='', task='transcribe', num_threads=2)
        return self.rec_

    def vocals(self, x, piece=4.0, overlap=0.25):
        # In pieces of four seconds (crossfaded over a quarter of a second): the separator's memory
        # grows with the piece it is given (about 1.4 GB for three seconds, 5 GB for ten), and
        # it must share the machine with the transcriber.
        n, step, ov = x.shape[1], int(piece * SR), int(overlap * SR)
        out, rate, pos = None, SR, 0
        while pos < n:
            a, b = max(0, pos - ov), min(n, pos + step)
            res = self.separator().process(SR, np.ascontiguousarray(x[:, a:b], dtype=np.float32))
            rate = res.sample_rate
            v = np.asarray(res.stems[0].data, dtype=np.float32)  # the vocal model's first stem is the voice
            v = v.mean(axis=0) if v.ndim == 2 else v
            if out is None: out = np.zeros(int(n * rate / SR) + rate, dtype=np.float32)
            o, k = int(a * rate / SR), int((pos - a) * rate / SR)
            if k:  # crossfade the overlap with what the last piece left
                ramp = np.linspace(0, 1, k, dtype=np.float32)
                out[o:o + k] = out[o:o + k] * (1 - ramp) + v[:k] * ramp
            out[o + k:o + len(v)] = v[k:]
            pos = b
        return out[:int(n * rate / SR)], rate


def chunks(v16, sr=16000, most=28.0):
    """Cut the voice into pieces of at most 28 s at its quietest moments, keeping those that sing."""
    hop = sr // 20
    n = len(v16) // hop
    e = 10 * np.log10(np.mean(v16[:n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    voiced = e > e.max() - 35
    out, s = [], 0
    while s < n:
        end = min(n, s + int(most * 20))
        if end < n:
            lo = max(s + 20 * 10, end - 20 * 8)
            end = lo + int(np.argmin(e[lo:end])) if lo < end else end
        if voiced[s:end].sum() >= 20: out.append((s / 20, end / 20))
        s = end
    return out


def separate(path, models):
    """The voice of a track at 16 kHz, and how loud it is against the whole (dB)."""
    x = decode(path, SR, 2)
    voice, vsr = models.vocals(x)
    v16 = sps.resample_poly(voice, 16000, vsr).astype(np.float32)
    level = 10 * np.log10(np.mean(voice ** 2) + 1e-12) - 10 * np.log10(np.mean(x.mean(axis=0) ** 2) + 1e-12)
    return v16, float(level)


def voice_level(v16, path):
    """How loud a voice kept at 16 kHz is against the whole track (dB), as separate() measures it."""
    x = decode(path, 16000, 1)
    mix = x.mean(axis=0) if x.ndim > 1 else x
    return float(10 * np.log10(np.mean(v16.astype(np.float64) ** 2) + 1e-12) - 10 * np.log10(np.mean(mix.astype(np.float64) ** 2) + 1e-12))


def check(v16, level, name, exp, models, report):
    kind = exp.get('kind', 'instrumental')
    want = exp.get('language') or ('en' if kind == 'song' else None)
    parts = chunks(v16)
    res = {'voiceLevel': round(float(level), 1), 'parts': len(parts)}
    flags = []
    if not parts:
        res['heard'] = []
        if kind == 'song': flags.append({'t': None, 'type': 'lyrics', 'severity': 'fail', 'why': 'no singing found in a song'})
        return res, flags, ''
    # Transcribe each part, noting the language Whisper hears in it.
    rec = models.rec()
    lines, heard = [], []
    for a, b in parts:
        st = rec.create_stream()
        st.accept_waveform(16000, v16[int(a * 16000):int(b * 16000)])
        rec.decode_stream(st)
        txt = st.result.text.strip()
        lg = (getattr(st.result, 'lang', '') or '').strip('<|>').lower()
        if txt: lines.append((a, txt)); heard.append(lg)
    heard = [h for h in heard if h]
    res['heard'] = heard
    lang = want or (max(set(heard), key=heard.count) if heard else 'en')
    if want and heard:
        share = sum(1 for h in heard if h == want or (want == 'zh' and h in ('zh', 'yue'))) / len(heard)
        res['inLanguage'] = round(share, 2)
        if share < 0.5: flags.append({'t': None, 'type': 'language', 'severity': 'fail', 'why': f"mostly heard as {'/'.join(sorted(set(heard)))}, not {want} ({int(share * 100)}% of the singing)"})
        elif share < 0.8: flags.append({'t': None, 'type': 'language', 'severity': 'review', 'why': f"{int(share * 100)}% of the singing is heard as {want}"})
    text = ' '.join(t for _, t in lines)
    ws = words_of(text, lang)
    res['words'] = len(ws)
    if lang in WORDFREQ and ws:
        from wordfreq import zipf_frequency
        known = [w for w in ws if zipf_frequency(w, lang) >= 1.5]
        res['known'] = round(len(known) / len(ws), 2)
    lyr = exp.get('lyrics')
    if lyr:
        from rapidfuzz import fuzz
        ref = []
        for l in lyr.splitlines():
            l = normalise(l)
            if l and l not in ref: ref.append(l)
        hyp = normalise(text)
        scores = [fuzz.partial_ratio(l, hyp) / 100 for l in ref] if hyp else [0.0] * len(ref)
        res['lyricsMatch'] = round(float(np.mean(scores)), 2) if scores else None
        res['linesHeard'] = f"{sum(1 for s in scores if s >= 0.7)}/{len(scores)}"
        res['missed'] = [l for l, s in zip(ref, scores) if s < 0.55][:8]
    # Judge.
    if kind == 'song':
        m = res.get('lyricsMatch')
        if m is not None:
            if m < 0.45: flags.append({'t': None, 'type': 'lyrics', 'severity': 'fail', 'why': f"the words sung are not the lyrics written (match {m:.2f}, lines heard {res['linesHeard']})"})
            elif m < 0.65: flags.append({'t': None, 'type': 'lyrics', 'severity': 'review', 'why': f"some lines are unclear (match {m:.2f}, lines heard {res['linesHeard']})"})
        k = res.get('known')
        if k is not None:
            if k < 0.7: flags.append({'t': None, 'type': 'lyrics', 'severity': 'fail', 'why': f'only {int(k * 100)}% of the sung words are real words: the singing is garbled'})
            elif k < 0.85: flags.append({'t': None, 'type': 'lyrics', 'severity': 'review', 'why': f'{int(k * 100)}% of the sung words are real words'})
        if len(ws) < (150 if lang in CJK else 40): flags.append({'t': None, 'type': 'lyrics', 'severity': 'review', 'why': f'few clear words were heard ({len(ws)})'})
    else:
        k = res.get('known', 0)
        if len(ws) >= 8 and k >= 0.6:
            flags.append({'t': lines[0][0] if lines else None, 'type': 'voice', 'severity': 'fail', 'why': f'a voice sings words in an instrumental ({len(ws)} words, e.g. "{text[:60]}")'})
    transcript = '\n'.join(f'[{int(a // 60)}:{int(a % 60):02d}] {t}' for a, t in lines)
    return res, flags, transcript


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--models', required=True)
    ap.add_argument('--expect')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('files', nargs='+')
    a = ap.parse_args()
    expect = json.load(open(a.expect)) if a.expect else {}
    todo = []
    for path in a.files:
        name = re.sub(r'^vch-', '', os.path.splitext(os.path.basename(path))[0])
        exp = expect.get(name, {})
        jp = os.path.join(a.out, f'{name}.json')
        if not os.path.exists(jp): print(name, 'run audit.py first'); continue
        r = json.load(open(jp))
        heard_voice = any(f['type'] == 'voice' for f in r.get('flags', []))
        if exp.get('kind') != 'song' and not (a.all and heard_voice): continue
        if (r.get('lyrics') or {}).get('size') == r.get('size'): continue
        todo.append((path, name, exp, jp))
    if not todo: return
    models = Models(a.models)
    # First every voice (kept on disk beside the report), then every transcript.
    voices = {}
    for path, name, exp, jp in todo:
        vp = os.path.join(a.out, f'{name}.voice16k.npy'); lp = vp[:-4] + '.level'
        if os.path.exists(vp) and os.path.getmtime(vp) >= os.path.getmtime(path):
            # Separated by a run that was cut short: kept (its level, when that run did not get to save it, from the voice kept).
            level = float(open(lp).read()) if os.path.exists(lp) else voice_level(np.load(vp), path)
            voices[name] = (vp, level)
            print(f'{name:30s} voice kept from an earlier run', flush=True)
            continue
        v16, level = separate(path, models)
        np.save(vp, v16); open(lp, 'w').write(str(level)); voices[name] = (vp, level)
        print(f'{name:30s} voice separated', flush=True)
    models.drop_separator()
    for path, name, exp, jp in todo:
        vp, level = voices[name]
        r = json.load(open(jp))
        res, flags, transcript = check(np.load(vp), level, name, exp, models, r)
        os.remove(vp)
        if os.path.exists(vp[:-4] + '.level'): os.remove(vp[:-4] + '.level')
        res['size'] = r.get('size')
        r['lyrics'] = res
        r['flags'] = [f for f in r.get('flags', []) if f['type'] not in ('lyrics', 'language') and not f.get('fromLyrics')] + [dict(f, fromLyrics=True) for f in flags]
        sev = {f['severity'] for f in r['flags']}
        r['verdict'] = 'fail' if 'fail' in sev else 'review' if 'review' in sev else 'pass'
        json.dump(r, open(jp, 'w'), indent=1)
        open(os.path.join(a.out, f'{name}.lyrics.txt'), 'w').write(transcript + '\n')
        sp = os.path.join(a.out, 'summary.json')
        s = json.load(open(sp)) if os.path.exists(sp) else {}
        s[name] = {'verdict': r['verdict'], 'flags': [f"{f['t']}s {f['severity']} {f['type']}: {f['why']}" for f in r['flags'] if f['severity'] != 'info']}
        json.dump(s, open(sp, 'w'), indent=1)
        print(f"{name:30s} {r['verdict'].upper():6s} {json.dumps({k: v for k, v in res.items() if k != 'missed'}, ensure_ascii=False)[:300]}", flush=True)


if __name__ == '__main__':
    main()
