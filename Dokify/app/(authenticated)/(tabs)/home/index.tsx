import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";

import {
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  View,
} from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";

type Audiobook = {
  id: string;
  title: string;
  author: string;
  duration: string;
  coverImage: string;
  description: string;
  audioUrl: string;
  bookmarked: boolean;
  chapters?: {
    title: string;
    audioUrl: string;
    duration: string;
  }[];
};

// const audiobooksData: Audiobook[] = audiodata as Audiobook[];

const Index = () => {
  const router = useRouter();
  const [audioBooks, setAudioBooks] = useState<Audiobook[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cardBgColor = useThemeColor(
    { light: "#fff", dark: "#151718" },
    "background",
  );
  // Soft border color to match generate.tsx, more visible in dark mode
  const cardBorderColor = useThemeColor(
    { light: "#e0e4ea", dark: "#3a3d42" },
    "background",
  );
  const cardTextColor = useThemeColor({ light: "#000", dark: "#fff" }, "text");

  // Fetch audiobooks from backend API (updated to use correct endpoint and data structure)
  const fetchAudioBooks = () => {
    setLoading(true);
    setError(null);
    fetch(`${process.env.EXPO_PUBLIC_BACKENDURL}/audiobooks/`, {
      method: "GET",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch audiobooks");
        }
        return res.json();
      })
      .then((data) => {
        // Use the 'books' array from the backend response
        // Construct the correct audioUrl for each book
        const books = (data.books || []).map((book: Audiobook) => ({
          ...book,
          audioUrl: `${process.env.EXPO_PUBLIC_BACKENDURL}/audiobook/${book.audioUrl}`,
        })) as Audiobook[];
        setAudioBooks(books);
        setError(null);
      })
      .catch((err) => {
        setError("Unable to fetch audiobooks. Please try again.");
        setAudioBooks([]);
        console.error("Failed to fetch audiobooks:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAudioBooks();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={audioBooks}
        keyExtractor={(book) => book.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          audioBooks.length > 0 ? (
            <ThemedText type="subtitle" style={{ marginBottom: 30 }}>
              Library
            </ThemedText>
          ) : null
        }
        ListEmptyComponent={
          <ThemedView style={styles.noAudioBooks}>
            {error ? (
              <>
                <ThemedText type="subtitle" style={{ color: "#ff4444" }}>
                  {error}
                </ThemedText>
                <ThemedButton
                  title={loading ? "Refreshing..." : "Refresh"}
                  variant="primary"
                  size="small"
                  onPress={fetchAudioBooks}
                  disabled={loading}
                />
              </>
            ) : (
              <>
                <ThemedText type="subtitle">No Audio Books Found</ThemedText>
                <ThemedText type="defaultSemiBold">
                  Get Started by creating one!
                </ThemedText>
                <ThemedButton
                  title="Create Audio Book"
                  variant="primary"
                  size="small"
                  onPress={() =>
                    router.push("/(authenticated)/(tabs)/generate")
                  }
                />
              </>
            )}
          </ThemedView>
        }
        contentContainerStyle={
          audioBooks.length === 0
            ? { flex: 1, justifyContent: "center", alignItems: "center" }
            : { paddingBottom: 80 }
        }
        columnWrapperStyle={{ justifyContent: "space-between", gap: 10 }}
        renderItem={({ item: book }) => (
          <TouchableOpacity
            style={[
              styles.bookcontainer,
              {
                backgroundColor: cardBgColor,
                borderColor: cardBorderColor,
                borderWidth: 1,
                flex: 1,
                marginHorizontal: 4,
                marginVertical: 6,
                maxWidth: "49%",
              },
            ]}
            activeOpacity={0.85}
            onPress={() => {
              router.push({
                pathname: "/(authenticated)/(tabs)/home/bookdetails",
                params: { book: JSON.stringify(book) },
              });
            }}
          >
            <View>
              <Image
                style={styles.coverImage}
                source={{ uri: book.coverImage }}
              />
              <View style={styles.infoContainer}>
                <ThemedText
                  type="buttonText"
                  numberOfLines={1}
                  style={[styles.bookTitle, { color: cardTextColor }]}
                >
                  {book.title}
                </ThemedText>
                <ThemedText
                  type="buttonText"
                  numberOfLines={1}
                  style={[styles.bookAuthor, { color: cardTextColor }]}
                >
                  ~ {book.author}
                </ThemedText>
              </View>
            </View>
          </TouchableOpacity>
        )}
        refreshing={loading}
        onRefresh={fetchAudioBooks}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  noAudioBooks: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  bookmarkicon: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
  },
  bookcontainer: {
    flex: 1,
    padding: 10,
    borderRadius: 12, // softer corners
    borderWidth: 1.5,
    // borderColor set inline in component
    marginHorizontal: 4,
    marginVertical: 6,
    maxWidth: "49%",
  },
  coverImage: {
    width: "100%",
    aspectRatio: 0.75,
    borderRadius: 10,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  infoContainer: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 2,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
    textAlign: "center",
  },
  bookAuthor: {
    fontSize: 13,
    marginBottom: 2,
    textAlign: "center",
  },
  bookDescription: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 4,
    lineHeight: 18,
    letterSpacing: 0.1,
  },
});

export default Index;
