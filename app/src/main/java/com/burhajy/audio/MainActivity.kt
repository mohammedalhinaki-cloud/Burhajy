package com.burhajy.audio

import android.content.ComponentName
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.media3.common.Player
import androidx.media3.session.*
import com.google.common.util.concurrent.ListenableFuture
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    private var controller by mutableStateOf<MediaController?>(null)
    private var connectionError by mutableStateOf<String?>(null)
    private lateinit var future: ListenableFuture<MediaController>
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val catalog = try { Catalog(this) } catch (e: Exception) {
            setContent { MaterialTheme { Text("ملفات الصوت أو توقيتات الآيات غير مكتملة. أعد بناء النسخة الكاملة.", Modifier.padding(24.dp)) } }
            return
        }
        val token = SessionToken(this, ComponentName(this, PlaybackService::class.java))
        future = MediaController.Builder(this, token).buildAsync()
        future.addListener({ try { controller = future.get() } catch (e: Exception) { connectionError = "تعذر الاتصال بالمشغل. أعد فتح التطبيق." } }, mainExecutor)
        setContent { MaterialTheme(colorScheme = lightColorScheme(primary = androidx.compose.ui.graphics.Color(0xFF146B57))) {
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                Surface(Modifier.fillMaxSize()) { AudioApp(catalog, controller, connectionError) }
            }
        } }
    }
    override fun onDestroy() {
        if (::future.isInitialized) MediaController.releaseFuture(future)
        super.onDestroy()
    }
}

private fun normalize(s: String) = s.replace(Regex("[أإآ]"), "ا").replace("ى", "ي").replace(Regex("[ً-ْ]"), "")
private fun clock(ms: Long): String { val t = (ms / 1000).coerceAtLeast(0); return "%d:%02d".format(t / 60, t % 60) }
private fun numeric(s: String): String = s.map { c -> when (c) { in '٠'..'٩' -> '0' + (c - '٠'); in '۰'..'۹' -> '0' + (c - '۰'); else -> c } }.joinToString("")

@Composable
private fun AudioApp(catalog: Catalog, controller: MediaController?, connectionError: String?) {
    var selected by rememberSaveable { mutableStateOf(0) }
    var query by rememberSaveable { mutableStateOf("") }
    var verseInput by rememberSaveable { mutableStateOf("1") }
    var validation by remember { mutableStateOf<String?>(null) }
    var time by remember { mutableStateOf(0L) }
    var duration by remember { mutableStateOf(0L) }
    var activeSurah by remember { mutableStateOf(1) }
    var playing by remember { mutableStateOf(false) }
    var hasPosition by remember { mutableStateOf(false) }
    var playerError by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(controller) {
        while (controller != null) {
            time = controller.currentPosition.coerceAtLeast(0)
            duration = controller.duration.coerceAtLeast(0)
            activeSurah = controller.currentMediaItem?.mediaId?.toIntOrNull() ?: 1
            playing = controller.isPlaying
            hasPosition = time > 0 || activeSurah > 1
            playerError = controller.playerError?.let { "تعذر تشغيل الملف المحلي (${it.errorCodeName})." }
            delay(250)
        }
    }
    fun start(s: Int, verse: Int) {
        controller ?: return
        controller.seekTo(s - 1, catalog[s].startOf(verse))
        controller.play()
    }
    Column(Modifier.fillMaxSize().safeDrawingPadding().padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("مصحف الشيخ محمد برهجي", style = MaterialTheme.typography.headlineSmall)
        Text("المصحف الصوتي • يعمل دون إنترنت", style = MaterialTheme.typography.bodyMedium)
        (connectionError ?: playerError)?.let { Text(it, color = MaterialTheme.colorScheme.error) }
        if (controller == null && connectionError == null) LinearProgressIndicator(Modifier.fillMaxWidth())
        if (selected == 0) {
            if (hasPosition) Button(onClick = { selected = activeSurah; verseInput = catalog[activeSurah].verseAt(time).toString(); controller?.play() }, Modifier.fillMaxWidth()) {
                Text("متابعة الاستماع — ${catalog[activeSurah].name}، الآية ${catalog[activeSurah].verseAt(time)} (${clock(time)})")
            }
            OutlinedTextField(query, { query = it }, label = { Text("ابحث عن سورة بالاسم أو الرقم") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            LazyColumn(Modifier.weight(1f)) {
                items(catalog.surahs.filter { normalize(it.name).contains(normalize(query)) || it.number.toString() == numeric(query) }, key = { it.number }) { s ->
                    TextButton(onClick = { selected = s.number; verseInput = "1"; validation = null }, Modifier.fillMaxWidth()) { Text("${s.number}. سورة ${s.name} — ${s.count} آية", Modifier.fillMaxWidth()) }
                    HorizontalDivider()
                }
            }
        } else {
            val s = catalog[selected]
            TextButton(onClick = { selected = 0 }) { Text("العودة إلى السور") }
            Text("سورة ${s.name}", style = MaterialTheme.typography.headlineMedium)
            OutlinedTextField(verseInput, { verseInput = numeric(it); validation = null }, label = { Text("ابدأ من الآية (1–${s.count})") }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true, modifier = Modifier.fillMaxWidth())
            validation?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(onClick = { val v = verseInput.toIntOrNull(); if (v == null || v !in 1..s.count) validation = "أدخل رقم آية بين 1 و${s.count}" else start(selected, v) }, enabled = controller != null, modifier = Modifier.fillMaxWidth()) { Text("تشغيل من هذه الآية") }
            if (activeSurah == selected && controller != null) {
                val current = s.verseAt(time)
                Text("الآية الحالية: $current • ${clock(time)} / ${clock(duration)}")
                Slider(value = time.toFloat().coerceIn(0f, duration.toFloat().coerceAtLeast(1f)), onValueChange = { controller.seekTo(it.toLong()) }, valueRange = 0f..duration.toFloat().coerceAtLeast(1f), enabled = duration > 0)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(onClick = { start(selected, (current - 1).coerceAtLeast(1)) }, Modifier.weight(1f)) { Text("السابقة") }
                    Button(onClick = { if (controller.isPlaying || controller.playWhenReady) controller.pause() else controller.play() }, Modifier.weight(1f)) { Text(if (playing) "إيقاف" else "متابعة") }
                    OutlinedButton(onClick = { start(selected, (current + 1).coerceAtMost(s.count)) }, Modifier.weight(1f)) { Text("التالية") }
                }
            }
            Text("يحفظ التطبيق موضع الاستماع تلقائيًا، ويواصل التشغيل عند قفل الشاشة.", style = MaterialTheme.typography.bodyMedium)
        }
    }
}
