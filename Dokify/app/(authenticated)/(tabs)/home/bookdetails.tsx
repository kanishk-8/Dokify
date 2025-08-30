import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useSharedAudioPlayer } from "@/context/audioprovider";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useLocalSearchParams, useRouter } from "expo-router";

const BookDetails = () => {
  const {
    setAudiourl,
    setAudiotitle,
    setCurrentBook,
    audiourl,
    player,
    status,
  } = useSharedAudioPlayer();
  const iconColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");
  const backendUrl = process.env.EXPO_PUBLIC_BACKENDURL;
  const params = useLocalSearchParams();
  const router = useRouter();
  // Contrasting colors for chapters list
  const chapterCardBg = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background",
  );
  const chapterTextColor = useThemeColor(
    { light: "#000", dark: "#fff" },
    "text",
  );
  const chapterCircleBg = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background",
  );
  const chapterCircleText = useThemeColor(
    { light: "#000", dark: "#fff" },
    "text",
  );
  // Soft border color to match generate.tsx, more visible in dark mode
  const chapterCardBorder = useThemeColor(
    { light: "#e0e4ea", dark: "#444" },
    "text",
  );
  // Add requestedUrl state for immediate playback
  const [requestedUrl, setRequestedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (requestedUrl && status?.isLoaded && !status?.playing) {
      player.play();
      setRequestedUrl(null); // Reset after playing
    }
  }, [requestedUrl, status, player]);

  // Parse book from params if available
  const book = useMemo(() => {
    if (params.book) {
      try {
        return JSON.parse(params.book as string);
      } catch {
        return null;
      }
    }
    return null;
  }, [params.book]);

  if (!book) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">No Book Details Found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back-circle" size={40} color={iconColor} />
      </TouchableOpacity>
      {/* Chapters List */}
      {book.chapters && book.chapters.length > 0 && (
        <View style={styles.chaptersContainer}>
          <FlatList
            data={book.chapters}
            keyExtractor={(_, idx) => idx.toString()}
            contentContainerStyle={{ paddingBottom: 70 }}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              <View>
                <View style={styles.bookHeader}>
                  <View style={styles.coverImageWrapper}>
                    <Image
                      style={styles.coverImage}
                      source={{
                        uri: book.coverImage || "https://placehold.co/300x300",
                      }}
                    />
                    <View style={styles.fullOverlay}>
                      <ThemedText
                        type="title"
                        style={styles.overlayTitle}
                        numberOfLines={2}
                      >
                        {book.title}
                      </ThemedText>
                      <ThemedText
                        type="default"
                        style={styles.overlayDescription}
                        numberOfLines={3}
                      >
                        {book.description}
                      </ThemedText>
                      <ThemedText
                        type="defaultSemiBold"
                        style={styles.overlayAuthor}
                        numberOfLines={1}
                      >
                        ~ {book.author}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <ThemedText type="subtitle" style={{ marginVertical: 10 }}>
                  Chapters
                </ThemedText>
              </View>
            }
            renderItem={({ item: chapter, index }) => {
              const chapterAudioUrl = `${backendUrl}/audiobook/${chapter.audioUrl}`;
              const isCurrentBook = audiourl === chapterAudioUrl;
              const isPlaying = isCurrentBook && status?.playing;

              return (
                <View
                  style={[
                    styles.chapterCard,
                    {
                      backgroundColor: chapterCardBg,
                      borderColor: chapterCardBorder,
                      borderWidth: 1.5,
                      borderRadius: 12,
                    },
                  ]}
                >
                  <View style={styles.chapterInfo}>
                    <View
                      style={[
                        styles.chapterNumberCircle,
                        {
                          backgroundColor: chapterCircleBg,
                          borderColor: chapterCardBorder,
                          borderWidth: 1.5,
                          borderRadius: 12,
                        },
                      ]}
                    >
                      <ThemedText
                        type="defaultSemiBold"
                        style={[
                          styles.chapterNumberText,
                          { color: chapterCircleText },
                        ]}
                      >
                        {index + 1}
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="defaultSemiBold"
                      style={[styles.chapterTitle, { color: chapterTextColor }]}
                      numberOfLines={2}
                    >
                      {chapter.title}
                    </ThemedText>
                  </View>
                  <TouchableOpacity
                    style={styles.playChapterButton}
                    onPress={() => {
                      if (!isCurrentBook) {
                        setAudiourl(chapterAudioUrl);
                        setAudiotitle(`${book.title} - Chapter ${index + 1}`);
                        setCurrentBook(book);
                        setRequestedUrl(chapterAudioUrl); // Ensure immediate playback
                      } else {
                        if (isPlaying) {
                          player.pause();
                        } else {
                          player.play();
                        }
                      }
                    }}
                  >
                    {status.isBuffering && isCurrentBook ? (
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <ActivityIndicator size={32} color={iconColor} />
                      </View>
                    ) : (
                      <Ionicons
                        name={isPlaying ? "pause-circle" : "play-circle"}
                        size={40}
                        color={iconColor}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 4,
    backgroundColor: undefined, // handled by ThemedView
  },
  bookHeader: {
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 40,
  },
  coverImageWrapper: {
    position: "relative",
    width: 220,
    height: 300,
    marginBottom: 0,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
  },
  coverImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: undefined, // handled by ThemedView
  },
  fullOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 32,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  overlayTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 32,
    marginBottom: 10,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  overlayDescription: {
    color: "#fff",
    fontSize: 15,
    marginBottom: 18,
    textAlign: "center",
    lineHeight: 22,
  },
  overlayAuthor: {
    color: "#fff",
    fontSize: 12,
    position: "absolute",
    right: 20,
    bottom: 18,
    textAlign: "right",
    opacity: 0.98,
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  chaptersContainer: {
    flex: 1,
    width: "100%",
    marginTop: 8,
  },
  chapterCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // borderRadius handled inline for soft corners
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 14,
    // Remove shadow for strict monochrome
    borderWidth: 1.5,
    // borderColor set inline in component
  },
  chapterInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chapterNumberCircle: {
    width: 36,
    height: 36,
    // borderRadius handled inline for soft corners
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    // border handled inline
    borderWidth: 1.5,
    // borderColor set inline in component
  },
  chapterNumberText: {
    fontSize: 17,
  },
  chapterTitle: {
    fontSize: 16,
    flex: 1,
  },
  playChapterButton: {
    marginLeft: 16,
    padding: 4,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 8,
    zIndex: 10,
    backgroundColor: "transparent",
    padding: 6,
    borderRadius: 20,
  },
});

export default BookDetails;
