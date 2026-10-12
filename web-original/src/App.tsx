import { useEffect, useState } from "react";
import HomeScreen from "./components/HomeScreen";
import PlayerScreen from "./components/PlayerScreen";
import { usePlayer } from "./lib/usePlayer";
import { LastPosition, loadLastPosition } from "./lib/storage";

export default function App() {
  const player = usePlayer();
  const [screen, setScreen] = useState<
    { name: "home" } | { name: "player"; surah: number }
  >({ name: "home" });
  const [lastPosition, setLastPosition] = useState<LastPosition | null>(null);

  // قراءة آخر موضع عند الفتح وعند العودة للرئيسية
  useEffect(() => {
    if (screen.name === "home") {
      setLastPosition(loadLastPosition());
    }
  }, [screen, player.isPlaying]);

  const handleResume = () => {
    const last = loadLastPosition();
    if (!last) return;
    setScreen({ name: "player", surah: last.surah });
    void player.resumeAt(last.surah, last.positionMs);
  };

  if (screen.name === "player") {
    return (
      <PlayerScreen
        surahNumber={screen.surah}
        player={player}
        onBack={() => setScreen({ name: "home" })}
      />
    );
  }

  return (
    <HomeScreen
      lastPosition={lastPosition}
      onResume={handleResume}
      onOpenSurah={(surah) => setScreen({ name: "player", surah })}
      nowPlaying={
        player.surah
          ? {
              surah: player.surah,
              ayah: player.currentAyah,
              isPlaying: player.isPlaying,
            }
          : null
      }
      onTogglePlay={() => player.togglePlay()}
    />
  );
}
