import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { palette, ui } from "./ui";

const paths = {
  bag: '<path d="M6 7h12l2 14H4L6 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  right: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  search: '<circle cx="10.5" cy="10.5" r="7"/><path d="m16 16 5 5"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
};
export type IconName = keyof typeof paths;
export function Icon({
  name,
  color = palette.green,
  size = 21,
}: {
  name: IconName;
  color?: string;
  size?: number;
}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
  return (
    <Image
      source={{
        uri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      }}
      style={{ width: size, height: size }}
    />
  );
}
export function IconButton({
  name,
  label,
  count,
  onPress,
}: {
  name: IconName;
  label: string;
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        ui.button,
        {
          width: 46,
          paddingHorizontal: 0,
          backgroundColor: hovered ? "#e7eee4" : "#fff",
          opacity: pressed ? 0.65 : 1,
        },
      ]}
    >
      <Icon name={name} />
      {!!count && (
        <View
          style={{
            position: "absolute",
            right: -5,
            top: -5,
            minWidth: 19,
            height: 19,
            borderRadius: 10,
            backgroundColor: palette.green,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontFamily: "ElanSans", color: "#fff", fontSize: 10 }}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
