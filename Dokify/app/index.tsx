import React, { useEffect, useState } from "react";
import { StyleSheet, ActivityIndicator } from "react-native";
import { AntDesign } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemedButton } from "@/components/ThemedButton";
import LottieView from "lottie-react-native";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAuth, useSSO } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";

export const useWarmUpBrowser = () => {
  React.useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
};

WebBrowser.maybeCompleteAuthSession();

const LandinPage = () => {
  useWarmUpBrowser();
  const colorScheme = useColorScheme();
  const { startSSOFlow } = useSSO();
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (isSignedIn) {
      setRedirecting(true);
      setTimeout(() => {
        router.replace("/(authenticated)/(tabs)/home");
      }, 100);
    }
  }, [isSignedIn, router]);

  // Handle Google OAuth
  const handleGoogleLogin = async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: Linking.createURL("/"),
      });
      if (createdSessionId) {
        setActive!({ session: createdSessionId });
        router.replace("/(authenticated)/(tabs)/home");
      }
    } catch {
      // Optionally handle error
    }
  };

  if (redirecting) {
    return (
      <ThemedView style={style.container}>
        <ActivityIndicator size="large" color="#888" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={style.container}>
      <ThemedText type="animeFont">Welcome to Dokify</ThemedText>
      <LottieView
        source={
          colorScheme === "dark"
            ? require("../assets/lottie/darkMusic.json")
            : require("../assets/lottie/LightMusic.json")
        }
        autoPlay
        loop
        style={style.lottie}
      />
      <ThemedButton
        title="Continue with Google"
        icon={
          <AntDesign
            name="google"
            size={24}
            color={colorScheme === "dark" ? "#000" : "#fff"}
            style={{ marginRight: 8 }}
          />
        }
        onPress={handleGoogleLogin}
        variant="primary"
        size="medium"
        fullWidth
        style={style.buttoncontainer}
      />
    </ThemedView>
  );
};

const style = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  lottie: { width: 450, height: 450 },
  buttoncontainer: {
    width: "90%",
    marginTop: 20,
  },
});

export default LandinPage;
