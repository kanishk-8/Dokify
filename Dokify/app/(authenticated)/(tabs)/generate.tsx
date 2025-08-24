import AnimatedProgressbar from "@/components/animatedProgressbar";
import { ThemedButton } from "@/components/ThemedButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useState } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated";

const GenerateAudioBook = () => {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Animated values
  const uploadScale = useSharedValue(1);
  const uploadOpacity = useSharedValue(1);
  const buttonScale = useSharedValue(0.9); // Gentle, like ThemeToggler
  const progressOpacity = useSharedValue(0);

  const handleFileSelect = async () => {
    // Animate upload area interaction
    uploadScale.value = withSpring(0.95, { damping: 15 });

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/epub+zip"],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log("Document selected:", file);

        // First animate out the upload area
        uploadOpacity.value = withTiming(0, { duration: 200 });

        // Then set the file and animate everything in
        setTimeout(() => {
          setSelectedFile(file);
          console.log("File set in state:", file.name);

          // Animate in button: scale from 0.9 to 1 with spring (gentle)
          buttonScale.value = withSpring(1, {
            damping: 15,
            stiffness: 300,
          });
        }, 250);
      } else {
        // Reset scale if no file selected
        uploadScale.value = withSpring(1);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      uploadScale.value = withSpring(1);
    }
  };

  const handleGenerate = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Show progress bar with animation
    progressOpacity.value = withTiming(1, { duration: 300 });

    // Animate button gently during upload (optional: scale to 0.95 then back to 1)
    buttonScale.value = withSpring(0.95, {
      damping: 15,
      stiffness: 300,
    });
    setTimeout(() => {
      buttonScale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
    }, 200);

    try {
      const formData = new FormData();

      const fileToUpload = {
        uri: selectedFile.uri,
        type: selectedFile.mimeType || "application/octet-stream",
        name: selectedFile.name,
      } as any;

      formData.append("file", fileToUpload);

      // Simulate progress animation
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      const response = await fetch("http://192.168.1.11:8000/uploadfile/", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (response.ok) {
        const result = await response.json();
        console.log("Upload successful:", result);

        // Complete progress
        setUploadProgress(100);

        // Success animation: gentle bounce
        buttonScale.value = withSpring(1.05, {
          damping: 15,
          stiffness: 300,
        });
        setTimeout(() => {
          buttonScale.value = withSpring(1, {
            damping: 15,
            stiffness: 300,
          });
        }, 180);
      } else {
        const errorText = await response.text();
        console.error("Upload failed:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        buttonScale.value = withSpring(1);
      }, 1000);
    }
  };

  const removeFile = () => {
    // Animate out file display and button
    buttonScale.value = withSpring(0.9, {
      damping: 15,
      stiffness: 300,
    });

    // Reset immediately and then animate upload area back in
    setSelectedFile(null);
    setUploadProgress(0);
    progressOpacity.value = withTiming(0, { duration: 100 });

    setTimeout(() => {
      uploadOpacity.value = withTiming(1, { duration: 300 });
      uploadScale.value = withSpring(1);
    }, 200);
  };

  // Animated styles
  const uploadAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: uploadScale.value }],
    opacity: uploadOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progressOpacity.value,
  }));

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">Generate AudioBook</ThemedText>

      <ThemedView style={{ marginTop: 20 }}>
        {!selectedFile ? (
          <Animated.View style={uploadAnimatedStyle}>
            <TouchableOpacity style={styles.upload} onPress={handleFileSelect}>
              <Ionicons name="cloud-upload-outline" size={60} color="#888" />
              <ThemedText type="defaultSemiBold">Upload the Book</ThemedText>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <ThemedView style={styles.fileDisplay}>
            <View style={styles.fileInfo}>
              <Ionicons name="document-text-outline" size={40} color="#888" />
              <View style={styles.fileDetails}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>
                  {selectedFile.name}
                </ThemedText>
                <ThemedText type="default" style={styles.fileSize}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </ThemedText>
              </View>
              <TouchableOpacity
                onPress={removeFile}
                style={styles.removeButton}
              >
                <Ionicons name="close-circle" size={24} color="#ff4444" />
              </TouchableOpacity>
            </View>
          </ThemedView>
        )}

        {/* Debug info */}
        {selectedFile && (
          <ThemedText style={{ fontSize: 10, marginTop: 5 }}>
            Debug: File selected - {selectedFile.name}
          </ThemedText>
        )}

        {selectedFile && (
          <Animated.View style={buttonAnimatedStyle}>
            <Animated.View
              entering={SlideInDown.delay(200).duration(500)}
              exiting={FadeOut.duration(300)}
            >
              <ThemedButton
                onPress={handleGenerate}
                title={isUploading ? "Generating..." : "Generate"}
                fullWidth
                disabled={isUploading}
                style={{ marginTop: 20 }}
              />
            </Animated.View>
          </Animated.View>
        )}

        {isUploading && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
          >
            <Animated.View style={[progressAnimatedStyle, { marginTop: 20 }]}>
              <AnimatedProgressbar progress={uploadProgress} />
              <Animated.View entering={SlideInDown.delay(200).duration(400)}>
                <ThemedText type="default" style={styles.progressText}>
                  {Math.round(uploadProgress)}% Complete
                </ThemedText>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        )}
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  upload: {
    marginVertical: 10,
    padding: 20,
    paddingVertical: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fileDisplay: {
    marginVertical: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  fileDetails: {
    flex: 1,
  },
  fileSize: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  removeButton: {
    padding: 5,
  },
  progressText: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
    opacity: 0.8,
  },
});

export default GenerateAudioBook;
