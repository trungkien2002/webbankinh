import React, { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export const palette = {
  green: "#284e43",
  cream: "#faf9f6",
  sage: "#dce2d6",
  ink: "#202922",
  muted: "#69756b",
  line: "#e2e7df",
};
export const money = (value: number) => `${value.toLocaleString("vi-VN")} đ`;
export function Button({
  children,
  onPress,
  primary = false,
  disabled = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        ui.button,
        primary && ui.primary,
        hovered && { backgroundColor: primary ? "#1c3e34" : "#edf2e9" },
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Text style={[ui.buttonText, primary && { color: "#fff" }]}>
        {children}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  secure = false,
  placeholder = "",
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  placeholder?: string;
  numeric?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={ui.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#879084"
        secureTextEntry={secure}
        keyboardType={numeric ? "numeric" : "default"}
        autoCapitalize="none"
        style={ui.input}
      />
    </View>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      {label && <Text style={ui.label}>{label}</Text>}
      <View style={ui.row}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: value === o.value }}
            onPress={() => onChange(o.value)}
            style={[
              ui.chip,
              value === o.value && {
                backgroundColor: palette.green,
                borderColor: palette.green,
              },
            ]}
          >
            <Text
              style={{
                color: value === o.value ? "#fff" : palette.ink,
                fontSize: 12,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={ui.overlay}>
        <View style={ui.dialog}>
          <View
            style={[
              ui.row,
              { justifyContent: "space-between", marginBottom: 22 },
            ]}
          >
            <Text style={ui.h2}>{title}</Text>
            <Button onPress={onClose}>Đóng</Button>
          </View>
          <ScrollView>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export function Table({
  headings,
  rows,
}: {
  headings: string[];
  rows: React.ReactNode[][];
}) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [rows.length, headings.join("|")]);
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const current = Math.min(page, pages);
  return (
    <>
      <ScrollView
        horizontal
        style={ui.table}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ minWidth: 720, flex: 1 }}>
          <View style={[ui.tableRow, { backgroundColor: "#f4f6f2" }]}>
            {headings.map((h, i) => (
              <Text
                key={i}
                style={[
                  ui.cell,
                  { fontWeight: "600", color: palette.muted, fontSize: 12 },
                ]}
              >
                {h}
              </Text>
            ))}
          </View>
          {rows.length ? (
            rows.slice((current - 1) * 10, current * 10).map((row, i) => (
              <View key={i} style={ui.tableRow}>
                {row.map((c, j) => (
                  <View key={j} style={ui.cell}>
                    {typeof c === "string" || typeof c === "number" ? (
                      <Text style={ui.text}>{c}</Text>
                    ) : (
                      c
                    )}
                  </View>
                ))}
              </View>
            ))
          ) : (
            <View style={{ padding: 45 }}>
              <Text style={ui.muted}>Chưa có dữ liệu phù hợp.</Text>
            </View>
          )}
        </View>
      </ScrollView>
      {rows.length > 10 && (
        <View
          style={[ui.row, { justifyContent: "flex-end", paddingVertical: 18 }]}
        >
          <Button disabled={current === 1} onPress={() => setPage(current - 1)}>
            Trang trước
          </Button>
          <Text style={ui.muted}>
            {current} / {pages} · {rows.length} bản ghi
          </Text>
          <Button
            disabled={current === pages}
            onPress={() => setPage(current + 1)}
          >
            Trang sau
          </Button>
        </View>
      )}
    </>
  );
}
export const ui = StyleSheet.create({
  button: {
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#fff",
  },
  primary: { backgroundColor: palette.green, borderColor: palette.green },
  buttonText: { color: palette.green, fontSize: 13, fontWeight: "600" },
  label: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: "#c9d2c7",
    borderRadius: 5,
    minHeight: 46,
    padding: 12,
    backgroundColor: "#fff",
    color: palette.ink,
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 20,
  },
  h1: { fontSize: 28, fontWeight: "600", color: palette.ink, marginBottom: 8 },
  h2: { fontSize: 20, fontWeight: "600", color: palette.ink },
  text: { color: palette.ink, fontSize: 14, lineHeight: 21 },
  muted: { color: palette.muted, fontSize: 13, lineHeight: 21 },
  card: {
    padding: 22,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 9,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#0006",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialog: {
    backgroundColor: palette.cream,
    padding: 26,
    width: "100%",
    maxWidth: 720,
    maxHeight: "90%",
    borderRadius: 12,
  },
  table: {
    flexGrow: 0,
    width: "100%",
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: palette.line,
    alignItems: "center",
  },
  cell: { flex: 1, minWidth: 130, paddingHorizontal: 20, paddingVertical: 18 },
  error: { color: "#a02d29", fontSize: 13, lineHeight: 20, marginBottom: 16 },
});
