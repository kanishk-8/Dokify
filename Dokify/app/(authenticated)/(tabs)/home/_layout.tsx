import { Stack } from "expo-router";

import { useThemeColor } from "@/hooks/useThemeColor";
export default function HomeLayout() {
  const backgroundColor = useThemeColor({}, "background");
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="bookdetails"
        options={{
          contentStyle: { backgroundColor },
        }}
      />
    </Stack>
  );
}
