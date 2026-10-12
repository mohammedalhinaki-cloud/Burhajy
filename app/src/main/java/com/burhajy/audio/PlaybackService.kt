package com.burhajy.audio

import android.content.Intent
import androidx.media3.common.*
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.*
import kotlinx.coroutines.*

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
class PlaybackService : MediaSessionService() {
    private lateinit var player: ExoPlayer
    private lateinit var session: MediaSession
    private lateinit var catalog: Catalog
    private lateinit var store: ListeningStore
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    override fun onCreate() {
        super.onCreate()
        catalog = Catalog(this)
        store = ListeningStore(this)
        val saved = runBlocking(Dispatchers.IO) { store.read() }
        player = ExoPlayer.Builder(this).build().apply {
            setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_SPEECH).build(), true)
            setHandleAudioBecomingNoisy(true)
            setWakeMode(C.WAKE_MODE_LOCAL)
            val items = catalog.surahs.map { s ->
                MediaItem.Builder().setMediaId(s.number.toString())
                    .setUri("asset:///audio/%03d.mp3".format(s.number))
                    .setMediaMetadata(MediaMetadata.Builder().setTitle("سورة ${s.name}").setArtist("الشيخ أ.د. محمد برهجي").build()).build()
            }
            setMediaItems(items, (saved?.surah ?: 1) - 1, saved?.ms ?: 0)
            prepare()
            addListener(object : Player.Listener {
                override fun onIsPlayingChanged(isPlaying: Boolean) { persist() }
                override fun onPositionDiscontinuity(oldPosition: Player.PositionInfo, newPosition: Player.PositionInfo, reason: Int) { persist() }
                override fun onPlaybackStateChanged(playbackState: Int) { if (playbackState == Player.STATE_READY || playbackState == Player.STATE_ENDED) persist() }
            })
        }
        session = MediaSession.Builder(this, player).build()
        scope.launch { while (isActive) { delay(1000); persist() } }
    }
    private fun position(): ListeningPosition? {
        if (!::player.isInitialized || player.playbackState == Player.STATE_IDLE) return null
        val s = player.currentMediaItem?.mediaId?.toIntOrNull() ?: return null
        val ms = player.currentPosition.coerceAtLeast(0)
        return ListeningPosition(s, catalog[s].verseAt(ms), ms)
    }
    private fun persist() { val p = position() ?: return; scope.launch { store.save(p) } }
    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession = session
    override fun onTaskRemoved(rootIntent: Intent?) { persist(); if (!player.playWhenReady) stopSelf() }
    override fun onDestroy() {
        val p = position()
        if (p != null) runBlocking(Dispatchers.IO) { store.save(p) }
        scope.cancel()
        session.release()
        player.release()
        super.onDestroy()
    }
}
