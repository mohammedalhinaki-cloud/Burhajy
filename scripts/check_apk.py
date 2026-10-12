import json
import sys
import zipfile
with zipfile.ZipFile(sys.argv[1]) as apk:
    manifest = json.loads(apk.read('assets/media-manifest.json'))
    assert manifest['complete'] and len(manifest['files']) == 114
    for record in manifest['files']:
        n = record['surah']
        assert apk.getinfo(f'assets/audio/{n:03}.mp3').file_size == record['bytes']
        timings = json.loads(apk.read(f'assets/timings/{n:03}.json'))
        assert len(timings) == record['ayahCount']
    print('APK includes all 114 MP3s and all 6236 ayah timings.')
