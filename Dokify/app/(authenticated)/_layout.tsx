import { AudioPlayerProvider } from "@/context/audioprovider";
import { Stack } from "expo-router";

import { useThemeColor } from "@/hooks/useThemeColor";
export default function HomeLayout() {
  const backgroundColor = useThemeColor({}, "background");
  return (
    <AudioPlayerProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="player"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
            statusBarAnimation: "slide",
            contentStyle: { backgroundColor },
          }}
        />
      </Stack>
    </AudioPlayerProvider>
  );
}
