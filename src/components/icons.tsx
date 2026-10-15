import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { palette, ui } from "./ui";

const paths = {
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13M12 8S5 8 5 4s7 0 7 4Zm0 0s7 0 7-4-7 0-7 4Z"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  edit: '<path d="m4 16-1 5 5-1L21 7l-4-4L4 16ZM14 6l4 4"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  play: '<path d="m7 4 14 8-14 8V4Z"/>',
  upload: '<path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  cash: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M5 9v6M19 9v6"/>',
  bank: '<path d="m3 8 9-5 9 5H3ZM3 21h18M6 10v8M12 10v8M18 10v8"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  receipt: '<path d="M5 3v18l3-2 4 2 4-2 3 2V3H5ZM8 7h8M8 11h8M8 15h5"/>',
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
