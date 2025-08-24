import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/HapticTab";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Player from "@/components/miniplayer";
import { useSharedAudioPlayer } from "@/context/audioprovider";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { audiourl } = useSharedAudioPlayer();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            height: 70,
            paddingBottom: 8,
            paddingTop: 8,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <Feather name="home" size={focused ? 28 : 26} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="generate"
          options={{
            title: "Generate",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name="book-music-outline"
                size={focused ? 28 : 26}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, focused }) => (
              <Feather name="settings" size={focused ? 28 : 26} color={color} />
            ),
          }}
        />
      </Tabs>

      {audiourl && <Player />}
    </>
  );
}
