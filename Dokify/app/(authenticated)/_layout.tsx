import { AudioPlayerProvider } from "@/context/audioprovider";
import { Slot, Stack } from "expo-router";

export default function HomeLayout() {
  return (
    <AudioPlayerProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="player"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
            statusBarAnimation: "slide",
          }}
        />
      </Stack>
    </AudioPlayerProvider>
  );
}
