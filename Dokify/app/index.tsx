import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ThemedButton } from "@/components/ThemedButton";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import LottieView from "lottie-react-native";
import { useColorScheme } from "@/hooks/useColorScheme";

const LandinPage = () => {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const signin = () => {
    router.push("/(authenticated)/(tabs)/home");
  };
  const signup = () => {
    router.push("/onboarding");
  };
  return (
    <ThemedView style={style.container}>
      <ThemedText type="animeFont">Wellcome to Dokify </ThemedText>
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
        title="Sign In"
        onPress={signin}
        variant="primary"
        size="medium"
        fullWidth
        style={style.buttoncontainer}
      />
      <ThemedButton
        title="Sign Up"
        onPress={signup}
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
  title: {
    fontSize: 50,
  },
  lottie: { width: 450, height: 450 },
  buttoncontainer: {
    width: "90%",
    marginTop: 20,
  },
});

export default LandinPage;
