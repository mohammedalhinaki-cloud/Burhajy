#!/usr/bin/env python3
"""Fetch matched read=340 audio/timing data at BUILD time, never at runtime."""
import argparse
import concurrent.futures
import hashlib
import json
import pathlib
import subprocess
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'app/src/main/assets'
API = 'https://www.mp3quran.net/api/v3/'
SERVER = 'https://cdn.mp3quran.net/audio/muhammad-burhaji/r1/'

def download(url, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(5):
        tmp = target.with_suffix(target.suffix + '.part')
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'BurhajyOfflineBuild/1.0'})
            with urllib.request.urlopen(req, timeout=120) as response, tmp.open('wb') as out:
                if response.status != 200:
                    raise ValueError(f'Unexpected status {response.status}')
                expected = response.headers.get('Content-Length')
                while chunk := response.read(1024 * 1024):
                    out.write(chunk)
            if expected and tmp.stat().st_size != int(expected):
                raise ValueError('Incomplete download')
            tmp.replace(target)
            return
        except Exception:
            tmp.unlink(missing_ok=True)
            if attempt == 4:
                raise
            time.sleep(min(2 ** attempt, 10))

def validate_timings(rows, count):
    if not isinstance(rows, list):
        raise ValueError('Timing API did not return an array')
    # Some API rows split the SVG polygons for the same ayah; merge their ranges.
    grouped = {}
    for row in rows:
        n, start, end = row['ayah'], row['start_time'], row['end_time']
        if not all(isinstance(x, int) and not isinstance(x, bool) for x in (n, start, end)):
            raise ValueError('Noninteger timing')
        if n == 0:  # Intro/basmala, not a numbered verse.
            continue
        if n not in range(1, count + 1) or start < 0 or end <= start:
            raise ValueError('Invalid timing range')
        if n in grouped:
            grouped[n]['start'] = min(grouped[n]['start'], start)
            grouped[n]['end'] = max(grouped[n]['end'], end)
        else:
            grouped[n] = {'ayah': n, 'start': start, 'end': end}
    if sorted(grouped) != list(range(1, count + 1)):
        raise ValueError('Missing ayah timing: no estimated fallback is allowed')
    timings = [grouped[i] for i in range(1, count + 1)]
    if any(a['start'] >= b['start'] for a, b in zip(timings, timings[1:])):
        raise ValueError('Nonmonotonic verse starts')
    return timings

def prepare_surah(s):
    n = s['number']
    audio = ASSETS / f'audio/{n:03}.mp3'
    raw = ASSETS / f'timings/{n:03}.raw.json'
    if not audio.exists():
        original = audio.with_suffix('.source.mp3')
        download(f'{SERVER}{n:03}.mp3', original)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(original), '-map', '0:a:0', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '96k', str(audio)], check=True)
        original.unlink()
    download(f'{API}ayat_timing?surah={n}&read=340', raw)
    timings = validate_timings(json.loads(raw.read_text()), s['ayahCount'])
    info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_name,codec_type', '-of', 'json', str(audio)]))
    if not any(x.get('codec_type') == 'audio' and x.get('codec_name') == 'mp3' for x in info.get('streams', [])):
        raise ValueError(f'{n}: Not MP3 audio')
    duration = round(float(info['format']['duration']) * 1000)
    if timings[-1]['start'] >= duration or timings[-1]['end'] > duration + 2000:
        raise ValueError(f'{n}: Timing exceeds recording duration ({timings[-1]["end"]} vs {duration})')
    target = ASSETS / f'timings/{n:03}.json'
    target.write_text(json.dumps(timings, separators=(',', ':')))
    raw.unlink()
    digest = hashlib.file_digest(audio.open('rb'), 'sha256').hexdigest()
    print(f'{n:03} {s["name"]}: {len(timings)} ayat, {duration/1000:.1f}s, {audio.stat().st_size/1048576:.1f} MiB', flush=True)
    return {'surah': n, 'bytes': audio.stat().st_size, 'sha256': digest, 'durationMs': duration, 'ayahCount': len(timings), 'source': f'{SERVER}{n:03}.mp3'}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', nargs='+', type=int, help='Development check only; not a deliverable APK')
    args = parser.parse_args()
    surahs = json.loads((ASSETS / 'surahs.json').read_text())
    assert len(surahs) == 114 and sum(s['ayahCount'] for s in surahs) == 6236
    metadata = ASSETS / 'source.json'
    download(API + 'reciters?language=ar', metadata)
    reciters = json.loads(metadata.read_text())['reciters']
    matching = [(r, m) for r in reciters for m in r['moshaf'] if m['id'] == 340]
    if len(matching) != 1:
        raise ValueError('Read 340 identity could not be resolved')
    reciter, moshaf = matching[0]
    if reciter['name'] != 'محمد برهجي' or moshaf['server'] != SERVER or moshaf['rewaya_id'] != 1 or moshaf['surah_total'] != 114:
        raise ValueError('Source identity changed; refuse to substitute another recording')
    metadata.unlink()
    if args.only:
        surahs = [s for s in surahs if s['number'] in args.only]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        records = sorted(pool.map(prepare_surah, surahs), key=lambda r: r['surah'])
    manifest = {'encoding': 'MP3 96 kbps mono; no trimming or speed change', 'readId': 340, 'reciter': reciter['name'], 'moshaf': moshaf['name'], 'complete': len(records) == 114, 'files': records,
                'verification': 'Source identity, MP3 format, duration and timing coverage checked; no listening test or qasr-al-munfasil verification performed.'}
    (ASSETS / 'media-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f'Total: {sum(r["bytes"] for r in records)/1048576:.1f} MiB')

if __name__ == '__main__':
    main()
