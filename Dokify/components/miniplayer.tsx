import {
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
} from "react-native";
import { useSharedAudioPlayer } from "../context/audioprovider";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useRouter } from "expo-router";
import TextTicker from "react-native-text-ticker";
import { useRef, useState } from "react";
import { ThemedText } from "@/components/ThemedText";

// Removed getAudioTitle helper, will use audiotitle from context

export default function Player() {
  const router = useRouter();
  const { player, status, audiotitle, currentBook } = useSharedAudioPlayer();
  const playerOpenedRef = useRef(false);

  const handleOpenPlayer = () => {
    if (!playerOpenedRef.current) {
      playerOpenedRef.current = true;
      router.push("/(authenticated)/player");
      setTimeout(() => {
        playerOpenedRef.current = false;
      }, 1000);
    }
  };

  // Helper to format seconds as mm:ss
  function formatTime(seconds: number) {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // State for progress bar width
  const [barWidth, setBarWidth] = useState(0);

  // Calculate progress and head position
  const progress =
    status &&
    typeof status.currentTime === "number" &&
    typeof status.duration === "number" &&
    status.duration > 0
      ? Math.min(Math.max(status.currentTime / status.duration, 0), 1)
      : 0;
  const headPosition = barWidth * progress;

  // Match ThemedView background color for both modes
  // Contrasting miniplayer: black in light mode, white in dark mode
  const backgroundColor = useThemeColor(
    { light: "#000", dark: "#fff" },
    "background",
  );
  // Use a soft but visible border color in both modes
  const borderColor = useThemeColor(
    { light: "#e0e4ea", dark: "#3a3d42" },
    "background",
  );
  // Contrasting text and icon color: white on black, black on white
  const textColor = useThemeColor(
    { light: "#fff", dark: "#000" },
    "background",
  );
  const iconColor = textColor;

  // Use currentBook from context if available
  const audioTitle = currentBook?.title || audiotitle || "No Audio Playing";
  const coverImageSource = {
    uri: currentBook?.coverImage || "https://placehold.co/80x100",
  };

  return (
    <View style={[styles.mini, { backgroundColor, borderColor }]}>
      <TouchableOpacity
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
        onPress={handleOpenPlayer}
        activeOpacity={0.8}
      >
        <Image
          source={coverImageSource}
          style={styles.miniCoverImage}
          resizeMode="cover"
        />
        <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
          <TextTicker
            style={{
              color: textColor,
              fontWeight: "black",
              width: "100%",
            }}
            duration={12000}
            loop
            bounce={false}
            repeatSpacer={50}
            marqueeDelay={1000}
            numberOfLines={1}
          >
            {audioTitle}
          </TextTicker>
          <View style={{ height: 4 }} />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 2,
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <ThemedText
              type="small"
              style={{
                color: textColor,
                opacity: 0.7,
                minWidth: 40,
                textAlign: "right",
                paddingRight: 8,
              }}
            >
              {status && status.currentTime
                ? formatTime(status.currentTime)
                : "0:00"}
            </ThemedText>
            <View
              style={{
                flex: 1,
                height: 3,
                backgroundColor: textColor,
                borderRadius: 2,
                overflow: "visible",
                position: "relative",
                marginLeft: 8,
                marginRight: 8,
              }}
              onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            >
              {/* Progress bar fill and head as before */}
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: barWidth * progress,
                  height: 3,
                  backgroundColor: iconColor,
                  borderRadius: 2,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  left: Math.max(Math.min(headPosition - 5, barWidth - 6), 0),
                  top: -4,
                  width: 11,
                  height: 11,
                  borderRadius: 6,
                  backgroundColor: iconColor,
                  borderWidth: 1,
                  borderColor: textColor,
                }}
              />
            </View>
            <ThemedText
              type="small"
              style={{
                color: textColor,
                opacity: 0.7,
                minWidth: 40,
                textAlign: "left",
                paddingLeft: 8,
              }}
            >
              {status && status.duration ? formatTime(status.duration) : "0:00"}
            </ThemedText>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (status.playing) {
              player.pause();
            } else {
              player.play();
            }
          }}
          activeOpacity={0.7}
        >
          {status.isBuffering ? (
            <ActivityIndicator size={36} color={iconColor} />
          ) : (
            <Ionicons
              name={status.playing ? "pause-circle" : "play-circle"}
              size={50}
              color={iconColor}
            />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mini: {
    position: "absolute",
    bottom: 72,
    left: 10,
    right: 10,
    borderRadius: 12, // softer corners
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1.5,
    // borderColor set inline in component
  },
  fullplayer: {
    flex: 1,
    paddingTop: 80,
  },
  miniCoverImage: {
    aspectRatio: 0.8,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
});
