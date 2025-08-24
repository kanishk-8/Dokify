import { StyleSheet } from "react-native";
import { ThemedText } from "../components/ThemedText";
import { ThemedView } from "../components/ThemedView";
import { useState } from "react";
import { useRouter } from "expo-router";

const Onboarding = () => {
  const [slide, setSlide] = useState(0);
  const router = useRouter();
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Wellcome</ThemedText>
      <ThemedView style={styles.onboardingcontainer}>
        {slide === 0 && (
          <>
            <ThemedText style={styles.onboardingtext}>
              Dokify is an app that helps you to find doctors and book
              appointments easily.
            </ThemedText>
            <ThemedText
              style={[styles.onboardingtext, { marginTop: 40 }]}
              onPress={() => setSlide(1)}
              type="defaultSemiBold"
            >
              Next
            </ThemedText>
          </>
        )}
        {slide === 1 && (
          <>
            <ThemedText style={styles.onboardingtext}>
              You can also find information about doctors, clinics, and
              hospitals.
            </ThemedText>
            <ThemedText
              style={[styles.onboardingtext, { marginTop: 40 }]}
              onPress={() => setSlide(2)}
              type="defaultSemiBold"
            >
              Next
            </ThemedText>
          </>
        )}
        {slide === 2 && (
          <>
            <ThemedText style={styles.onboardingtext}>
              You can also find information about doctors, clinics, and
              hospitals.
            </ThemedText>
            <ThemedText
              style={[styles.onboardingtext, { marginTop: 40 }]}
              onPress={() => router.replace("/(authenticated)/(tabs)/home")}
              type="defaultSemiBold"
            >
              Get Started
            </ThemedText>
          </>
        )}
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 80, alignItems: "center" },
  onboardingtext: {
    marginTop: 20,
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  onboardingcontainer: {
    borderRadius: 20,
    marginTop: 40,
  },
});

export default Onboarding;
