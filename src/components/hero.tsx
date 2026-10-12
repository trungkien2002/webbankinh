import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { db } from "../services/database";
import { catalogImage } from "./catalogAssets";
import { Button, palette, ui } from "./ui";
import { IconButton } from "./icons";

const slides = [
  {
    title: "Đeo kính.\nĐậm chất bạn.",
    tag: "THE EVERYDAY COLLECTION",
    caption: "Đường nét riêng, phong cách riêng.",
    sku: "EL0001",
    text: "Thiết kế tinh giản, sắc màu tự nhiên. Khám phá chiếc kính vừa vặn với phong cách của bạn.",
    bg: "#e9eddf",
  },
  {
    title: "Mang theo\nmột chút nắng.",
    tag: "SUNLIGHT STORIES",
    caption: "Một góc nhìn mới cho ngày đầy nắng.",
    sku: "EL0021",
    text: "Kính râm với những đường nét đầy cá tính, dành cho những ngày bạn muốn bước ra ngoài.",
    bg: "#ece2d2",
  },
  {
    title: "Một góc nhìn\nrất riêng.",
    tag: "FIND YOUR FRAME",
    caption: "Chi tiết nhỏ. Cá tính lớn.",
    sku: "EL0004",
    text: "Từ gọng thanh mảnh đến kiểu dáng nổi bật. Chọn thiết kế khiến bạn tự tin mỗi ngày.",
    bg: "#e1e9e5",
  },
];
export function Hero({ onExplore }: { onExplore: () => void }) {
  const { width } = useWindowDimensions();
  const small = width < 850;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [reduced, setReduced] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (paused || hovered || reduced) return;
    const timer = setInterval(() => {
      if (Platform.OS !== "web" || document.visibilityState === "visible")
        setIndex((i) => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [paused, hovered, reduced]);
  useEffect(() => {
    opacity.setValue(reduced ? 1 : 0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: reduced ? 0 : 650,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [index, reduced, opacity]);
  const slide = slides[index];
  const product = db.products.find((p) => p.sku === slide.sku);
  const image = product
    ? catalogImage(product.id) || product.imageUrl
    : undefined;
  return (
    <Pressable
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={{
        backgroundColor: slide.bg,
        borderRadius: 18,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <Animated.View
        style={{
          opacity,
          flexDirection: small ? "column" : "row",
          alignItems: "stretch",
        }}
      >
        <View
          style={{
            flex: 1,
            padding: small ? 26 : 44,
            justifyContent: "center",
            minWidth: 0,
          }}
        >
          <Text
            style={{
              fontFamily: "ElanSans",
              color: palette.green,
              fontSize: 11,
              letterSpacing: 1.5,
              marginBottom: 22,
            }}
          >
            {slide.tag}
          </Text>
          <Text
            style={{
              fontFamily: "ElanSans",
              fontSize: small ? 34 : width < 1200 ? 43 : 54,
              lineHeight: small ? 48 : width < 1200 ? 59 : 72,
              color: palette.green,
              letterSpacing: -1.3,
            }}
          >
            {slide.title}
          </Text>
          <Text
            style={[
              ui.muted,
              { marginVertical: 24, maxWidth: 370, lineHeight: 24 },
            ]}
          >
            {slide.text}
          </Text>
          <View style={ui.row}>
            <Button primary onPress={onExplore}>
              Khám phá bộ sưu tập ↗
            </Button>
          </View>
        </View>
        <View
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: "#ffffff55",
            padding: small ? 22 : 36,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {image && (
            <Image
              accessibilityLabel={product?.name}
              source={{ uri: image }}
              style={{ width: "100%", height: small ? 230 : 350 }}
              resizeMode="contain"
            />
          )}
          <Text style={[ui.muted, { textAlign: "center", marginTop: 12 }]}>
            {slide.caption}
          </Text>
          <Text
            style={{
              fontFamily: "ElanSans",
              color: palette.green,
              marginTop: 12,
              fontSize: 12,
            }}
          >
            {product?.name}
          </Text>
        </View>
      </Animated.View>
      <View
        style={[
          ui.row,
          {
            justifyContent: "space-between",
            paddingHorizontal: small ? 24 : 44,
            paddingBottom: 24,
          },
        ]}
      >
        <View style={ui.row}>
          {slides.map((s, i) => (
            <Pressable
              key={s.tag}
              accessibilityRole="button"
              accessibilityLabel={`Đến slide ${i + 1}`}
              accessibilityState={{ selected: i === index }}
              onPress={() => {
                setPaused(true);
                setIndex(i);
              }}
              style={{
                width: i === index ? 28 : 8,
                height: 8,
                borderRadius: 5,
                backgroundColor: i === index ? palette.green : "#a5b4a3",
              }}
            />
          ))}
        </View>
        <View style={ui.row}>
          <Button onPress={() => setPaused(!paused)}>
            {paused ? "Tiếp tục" : "Tạm dừng"}
          </Button>
          <IconButton
            name="left"
            label="Slide trước"
            onPress={() => {
              setPaused(true);
              setIndex((index + 2) % slides.length);
            }}
          />
          <IconButton
            name="right"
            label="Slide tiếp theo"
            onPress={() => {
              setPaused(true);
              setIndex((index + 1) % slides.length);
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}
