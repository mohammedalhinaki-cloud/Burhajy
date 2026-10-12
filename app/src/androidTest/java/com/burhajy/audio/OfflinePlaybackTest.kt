package com.burhajy.audio

import android.content.ComponentName
import android.content.Intent
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import androidx.test.core.app.ActivityScenario
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.uiautomator.UiDevice
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.TimeUnit

@RunWith(AndroidJUnit4::class)
class OfflinePlaybackTest {
    private val instrumentation = InstrumentationRegistry.getInstrumentation()
    private val context = instrumentation.targetContext
    private fun main(block: () -> Unit) = instrumentation.runOnMainSync(block)
    private fun connect(): MediaController {
        var future: com.google.common.util.concurrent.ListenableFuture<MediaController>? = null
        main { future = MediaController.Builder(context, SessionToken(context, ComponentName(context, PlaybackService::class.java))).buildAsync() }
        return future!!.get(20, TimeUnit.SECONDS)
    }
    private fun waitFor(block: () -> Boolean) {
        repeat(100) {
            var result = false
            main { result = block() }
            if (result) return
            Thread.sleep(100)
        }
        fail("Playback condition timed out")
    }
    @Test fun offlineSeekBackgroundAndRestore() {
        val catalog = Catalog(context)
        assertEquals(6236, catalog.surahs.sumOf { it.count })
        val permissions = context.packageManager.getPackageInfo(context.packageName, android.content.pm.PackageManager.GET_PERMISSIONS).requestedPermissions?.toList() ?: emptyList()
        assertFalse(permissions.contains("android.permission.INTERNET"))
        val scenario = ActivityScenario.launch(MainActivity::class.java)
        var controller = connect()
        for ((surah, verse) in listOf(1 to 1, 2 to 100, 18 to 50)) {
            val start = catalog[surah].startOf(verse)
            main { controller.seekTo(surah - 1, start); controller.play() }
            waitFor { controller.isPlaying && controller.currentMediaItem?.mediaId == surah.toString() && controller.currentPosition > start + 300 }
            main { assertNull(controller.playerError); assertTrue(controller.currentPosition < start + 10000) }
        }
        UiDevice.getInstance(instrumentation).sleep()
        var before = 0L
        main { before = controller.currentPosition }
        Thread.sleep(1500)
        main { assertTrue("Playback did not continue with screen off", controller.currentPosition > before + 500); controller.pause() }
        Thread.sleep(1200)
        var paused = 0L
        main { paused = controller.currentPosition }
        val saved = runBlocking { ListeningStore(context).read() }!!
        assertEquals(18, saved.surah)
        assertTrue(kotlin.math.abs(saved.ms - paused) < 250)
        // Recreate the service and its ExoPlayer, keeping the durable DataStore file.
        main { controller.release() }
        scenario.close()
        context.stopService(Intent(context, PlaybackService::class.java))
        Thread.sleep(2000)
        UiDevice.getInstance(instrumentation).wakeUp()
        val reopened = ActivityScenario.launch(MainActivity::class.java)
        controller = connect()
        waitFor { controller.currentMediaItem?.mediaId == "18" && kotlin.math.abs(controller.currentPosition - paused) < 250 }
        main { assertFalse(controller.isPlaying); controller.release() }
        reopened.close()
    }
}
