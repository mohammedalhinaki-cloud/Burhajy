package com.burhajy.audio

import android.content.Context
import org.json.JSONArray

data class Verse(val number: Int, val start: Long, val end: Long)
data class Surah(val number: Int, val name: String, val count: Int, val verses: List<Verse>) {
    fun verseAt(ms: Long): Int = verses.lastOrNull { it.start <= ms }?.number ?: 1
    fun startOf(verse: Int): Long = verses.first { it.number == verse }.start
}
class Catalog(context: Context) {
    val surahs: List<Surah>
    init {
        val rows = JSONArray(context.assets.open("surahs.json").bufferedReader().use { it.readText() })
        surahs = (0 until rows.length()).map { i ->
            val row = rows.getJSONObject(i)
            val id = row.getInt("number")
            val timings = JSONArray(context.assets.open("timings/%03d.json".format(id)).bufferedReader().use { it.readText() })
            val verses = (0 until timings.length()).map { j ->
                val t = timings.getJSONObject(j)
                Verse(t.getInt("ayah"), t.getLong("start"), t.getLong("end"))
            }
            require(verses.size == row.getInt("ayahCount"))
            Surah(id, row.getString("name"), row.getInt("ayahCount"), verses)
        }
        require(surahs.size == 114)
    }
    operator fun get(number: Int) = surahs[number - 1]
}
