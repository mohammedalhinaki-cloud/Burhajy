package com.burhajy.audio

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.listeningData by preferencesDataStore("listening")
data class ListeningPosition(val surah: Int, val verse: Int, val ms: Long)
class ListeningStore(private val context: Context) {
    private val surah = intPreferencesKey("surah")
    private val verse = intPreferencesKey("verse")
    private val ms = longPreferencesKey("position_ms")
    suspend fun read(): ListeningPosition? {
        val p = context.listeningData.data.first()
        return p[surah]?.takeIf { it in 1..114 }?.let { ListeningPosition(it, p[verse] ?: 1, (p[ms] ?: 0).coerceAtLeast(0)) }
    }
    suspend fun save(position: ListeningPosition) {
        context.listeningData.edit { p -> p[surah] = position.surah; p[verse] = position.verse; p[ms] = position.ms }
    }
}
