import React, { useRef, useCallback } from "react";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useSharedAudioPlayer } from "@/context/audioprovider";
import { useRouter } from "expo-router";
// import book from "../../assets/audiobooks.json";

import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";

export default function Player() {
  const { player, status, audiotitle, currentBook } = useSharedAudioPlayer();
  const sheetRef = useRef<BottomSheet>(null);
  const router = useRouter();
  const backgroundColor = useThemeColor({}, "background");
  const thumbTintColor = useThemeColor(
    { light: "black", dark: "white" },
    "text",
  );
  const iconColor = useThemeColor({ light: "black", dark: "white" }, "tint");

  // Helper to format seconds as mm:ss
  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // Callback when sheet is closed
  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        router.back();
      }
    },
    [router],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      snapPoints={["100%"]}
      index={0}
      enablePanDownToClose={true}
      onChange={handleSheetChanges}
      style={[{ backgroundColor }]}
      containerStyle={{
        flex: 1,
      }}
      backgroundStyle={{
        backgroundColor,
        borderTopWidth: 0,
        borderTopColor: "transparent",
        elevation: 0,
        shadowColor: "transparent",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      }}
      topInset={0}
      animationConfigs={{ duration: 150 }}
      handleComponent={() => null} // optional, cleaner look
    >
      <BottomSheetScrollView contentContainerStyle={{ flex: 1 }}>
        <BottomSheetView style={[styles.full, { backgroundColor }]}>
          <Image
            style={styles.coverImage}
            source={{
              uri: currentBook?.coverImage || "https://placehold.co/300x300",
            }}
          />
          <ThemedText type="title">
            {currentBook?.title || audiotitle || "No Audio Playing"}
          </ThemedText>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={status.duration}
            value={status.currentTime}
            onSlidingComplete={(value) => player.seekTo(value)}
            minimumTrackTintColor={thumbTintColor}
            maximumTrackTintColor="#d3d3d3"
            thumbTintColor={thumbTintColor}
          />

          <View style={styles.timerContainer}>
            <ThemedText type="small">
              {formatTime(status.currentTime)}
            </ThemedText>
            <ThemedText type="small">{formatTime(status.duration)}</ThemedText>
          </View>
          <View style={styles.playerControls}>
            <TouchableOpacity
              onPress={() => {
                player.seekTo(Math.max(status.currentTime - 10, 0));
              }}
            >
              <Ionicons
                name="play-skip-back-circle"
                size={70}
                color={iconColor}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: 100,
                height: 100,
              }}
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
                <ActivityIndicator
                  size="large"
                  color={thumbTintColor}
                  style={{ marginVertical: 20 }}
                />
              ) : (
                <Ionicons
                  name={status.playing ? "pause-circle" : "play-circle"}
                  size={90}
                  color={iconColor}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                player.seekTo(
                  Math.min(status.currentTime + 10, status.duration),
                );
              }}
            >
              <Ionicons
                name="play-skip-forward-circle"
                size={70}
                color={iconColor}
              />
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    zIndex: 100,
    height: "100%",
    alignItems: "center",
    paddingTop: 90,
  },
  coverImage: {
    width: "80%",
    aspectRatio: 1,
    borderRadius: 10,
    marginBottom: 20,
  },
  slider: {
    width: "90%",
    height: 40,
    marginVertical: 0,
  },
  timerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
    marginTop: 4,
    marginBottom: 8,
  },
  durationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "90%",
    marginBottom: 8,
  },
  playerControls: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
    alignItems: "center",
  },
});
