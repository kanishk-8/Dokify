import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/HapticTab";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import {
  Feather,
  FontAwesome6,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import Player from "@/components/miniplayer";
import { useSharedAudioPlayer } from "@/context/audioprovider";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { audiourl } = useSharedAudioPlayer();
  console.log("audiourl now", audiourl);

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
            title: "Library",
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons
                name="book-music"
                size={focused ? 28 : 26}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="generate"
          options={{
            title: "Generate",
            tabBarIcon: ({ color, focused }) => (
              <FontAwesome6
                name="wand-magic-sparkles"
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
