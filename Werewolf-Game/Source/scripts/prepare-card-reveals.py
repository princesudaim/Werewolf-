#!/usr/bin/env python3
"""Prepare first <=4 seconds of the 14 original reveal MP3s, without padding.
Requires numpy, pyloudnorm and ffmpeg (or imageio-ffmpeg).
Example: PYTHONPATH=.cache/audio-tools python ... --input google_drive
Rebalance active 100ms K-weighted loudness, not whole-clip average alone.
Use gentle stereo-linked compression and oversampled peak protection.
Original MP3s remain untouched. The short-effect metric is NOT standard 400ms LUFS.
"""
import argparse
import hashlib
import json
import math
import re
import subprocess
import wave
from pathlib import Path

import numpy as np
import pyloudnorm as pyln

SR = 48000
MAX_SECONDS = 4
TARGET_ACTIVE = -12.0
EDITION = 'card-reveal-drive-20261106-v3'
METER = pyln.Meter(SR, block_size=.1)


def loudness_stats(audio):
    """100ms windows, 25ms hop; exclude silence/tails >25dB below loudest window.
    Matching the 90th percentile controls the loud audible body without allowing
    quiet tails or differing durations to make sharp recordings excessively loud.
    Keep integrated loudness as a diagnostic, NOT the normalization target.
    """
    weighted = audio.copy()
    for stage in METER._filters.values():
        for channel in range(2):
            weighted[:, channel] = stage.apply_filter(weighted[:, channel])
    power = np.sum(weighted ** 2, axis=1)
    cumulative = np.concatenate(([0.], np.cumsum(power)))
    size, hop = 4800, 1200
    assert len(audio) >= size
    starts = np.arange(0, len(audio) - size + 1, hop)
    if starts[-1] != len(audio) - size:
        starts = np.append(starts, len(audio) - size)
    energy = (cumulative[starts + size] - cumulative[starts]) / size
    levels = -.691 + 10 * np.log10(np.maximum(energy, 1e-15))
    floor = max(-60., float(levels.max()) - 25.)
    active = levels[levels >= floor]
    return {
        'active_p90': float(np.percentile(active, 90)),
        'active_p50': float(np.percentile(active, 50)),
        'max_100ms': float(levels.max()),
        'integrated': float(METER.integrated_loudness(audio)),
    }


def main():
    try:
        import imageio_ffmpeg
        default_ff = imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        default_ff = 'ffmpeg'
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--ffmpeg', default=default_ff)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    public = root / 'public'
    relative = 'werewolf/audio/card-reveal/v3'
    out = public / relative
    out.mkdir(parents=True, exist_ok=True)
    prior_path = root / 'src/card-reveal-catalog.json'
    prior = json.loads(prior_path.read_text()) if prior_path.exists() else {'clips': []}

    def run(extra, data=None):
        return subprocess.run([args.ffmpeg, '-hide_banner', '-loglevel', 'error',
                               '-threads', '1', *extra], input=data, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, check=True).stdout

    def process(data, filters):
        raw = run(['-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', 'pipe:0',
                   '-af', filters, '-f', 'f32le', '-ac', '2', 'pipe:1'],
                  data.astype('<f4').tobytes())
        result = np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(float)
        # FFmpeg latency compensation must preserve the exact decoded frame budget.
        assert len(result) == len(data), (len(result), len(data))
        return result

    def limit(data, gain=0):
        return process(data, f'volume={gain}dB,aresample=192000,'
                       'alimiter=limit=0.80:attack=5:release=50:level=false:latency=true,'
                       'aresample=48000')

    paths = sorted(args.input.glob('*.mp3'))
    assert len(paths) == 14, 'Expected exactly the 14 approved source clips'
    entries = []
    for number, path in enumerate(paths, 1):
        # Both reads let the audit independently verify min(original frames, 4s).
        raw = run(['-i', str(path), '-ar', str(SR), '-ac', '2', '-f', 'f32le', 'pipe:1'])
        original = np.frombuffer(raw, dtype='<f4').reshape(-1, 2).astype(float)
        audio = original[:MAX_SECONDS * SR].copy()
        assert len(audio) >= 4800
        frames = len(audio)
        audio[-240:] *= np.linspace(1, 0, 240)[:, None]  # 5ms end fade, no front trim.
        input_stats = loudness_stats(audio)
        assert all(math.isfinite(n) for n in input_stats.values())
        initial_gain = TARGET_ACTIVE - input_stats['active_p90']
        # Normalize detector input, then gentle 2:1 RMS compression. Linked stereo
        # preserves image; 8ms attack/100ms release avoids hard gating or pumping.
        compressed = process(audio, f'volume={initial_gain}dB,'
                             'acompressor=threshold=0.1:ratio=2:attack=8:release=100:'
                             'makeup=1:knee=2.8:link=maximum:detection=rms')
        low, high = -24., 24.
        for _ in range(15):
            mid = (low + high) / 2
            candidate = limit(compressed, mid)
            if loudness_stats(candidate)['active_p90'] < TARGET_ACTIVE:
                low = mid
            else:
                high = mid
        makeup = (low + high) / 2
        processed = limit(compressed, makeup)
        pcm = np.round(processed * 32767).astype('<i2')
        actual = pcm.astype(float) / 32768
        stats = loudness_stats(actual)
        assert len(actual) == min(len(original), MAX_SECONDS * SR)
        assert abs(stats['active_p90'] - TARGET_ACTIVE) < .08, (path, stats)
        assert stats['max_100ms'] <= -9.5, (path, stats)
        assert np.max(np.abs(actual)) < .999
        name = f'reveal-{number:02d}.wav'
        dest = out / name
        with wave.open(str(dest), 'wb') as output:
            output.setparams((2, 2, SR, 0, 'NONE', 'not compressed'))
            output.writeframes(pcm.tobytes())
        # Measure true peak on encoded output, rather than trusting sample peak.
        scan = subprocess.run([args.ffmpeg, '-hide_banner', '-i', str(dest), '-af',
                               'loudnorm=I=-14:TP=-1:LRA=11:print_format=json',
                               '-f', 'null', '-'], capture_output=True, text=True, check=True)
        true_peak = float(json.loads(re.findall(r'\{[^{}]+\}', scan.stderr)[-1])['input_tp'])
        assert true_peak <= -1., (name, true_peak)
        entry = {
            'file': './' + relative + '/' + name, 'source': path.name,
            'source_sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'source_frames': len(original), 'frames': frames, 'seconds': frames / SR,
            'bytes': dest.stat().st_size, 'sha256': hashlib.sha256(dest.read_bytes()).hexdigest(),
            'initial_gain_db': round(initial_gain, 3), 'makeup_gain_db': round(makeup, 3),
            'input_stats': {k: round(v, 3) for k, v in input_stats.items()},
            'output_stats': {k: round(v, 3) for k, v in stats.items()},
            'true_peak_db': true_peak,
        }
        entries.append(entry)
        print(name, f'{frames / SR:.3f}s', 'active P90', round(stats['active_p90'], 3),
              'max100ms', round(stats['max_100ms'], 3), 'dBTP', true_peak, flush=True)

    manifest = {
        'edition': EDITION, 'sample_rate': SR, 'channels': 2, 'maximum_seconds': MAX_SECONDS,
        'delay_ms': 250, 'selection': 'random-no-immediate-repeat',
        'loudness_method': '100ms K-weighted windows at 25ms hop; active P90, gate max(-60, peak-window minus 25) dB',
        'target_active_p90': TARGET_ACTIVE,
        'compression': {'ratio': 2, 'attack_ms': 8, 'release_ms': 100, 'stereo_link': 'maximum'},
        'normalization': 'Match louder audible sections, not whole-clip average. Gentle compression and oversampled peak protection; no time padding or leading-silence removal. Subjective equality across timbres/devices is not guaranteed.',
        'clips': entries,
    }
    prior_path.write_text(json.dumps(manifest, indent=2) + '\n')
    worker = public / 'sw.js'
    text = worker.read_text()
    match = re.search(r'const CORE = (\[[\s\S]*?\]);', text)
    core = json.loads(re.sub(r',\s*\]', ']', match[1]))
    core = [n for n in core if not n.startswith('werewolf/audio/card-reveal/')]
    core.extend(e['file'][2:] for e in entries)
    worker.write_text(text[:match.start(1)] + json.dumps(core, indent=2) + text[match.end(1):])
    # Versioned public URLs prevent a current online preview from fetching stale
    # previous-set audio from an older controlling worker. Old installed caches stay intact.
    new_paths = {entry['file'] for entry in entries}
    for clip in prior['clips']:
        old = clip['file']
        if old not in new_paths and re.fullmatch(r'\./werewolf/audio/card-reveal/(?:v\d+/)?reveal-\d\d\.wav', old):
            (public / old[2:]).unlink(missing_ok=True)
    print('PASS: 14 first-up-to-4s clips; active P90 matched; compression/true peak/durations verified.')


if __name__ == '__main__':
    main()
