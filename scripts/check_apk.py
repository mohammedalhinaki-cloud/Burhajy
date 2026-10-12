import hashlib
import json
import sys
import zipfile
with zipfile.ZipFile(sys.argv[1]) as apk:
    manifest = json.loads(apk.read('assets/media-manifest.json'))
    assert manifest['complete'] and len(manifest['files']) == 114
    for record in manifest['files']:
        n = record['surah']
        assert apk.getinfo(f'assets/audio/{n:03}.mp3').file_size == record['bytes']
        with apk.open(f'assets/audio/{n:03}.mp3') as audio:
            assert hashlib.file_digest(audio, 'sha256').hexdigest() == record['sha256']
        timings = json.loads(apk.read(f'assets/timings/{n:03}.json'))
        assert len(timings) == record['ayahCount']
    print('APK includes all 114 MP3s and all 6236 ayah timings.')
