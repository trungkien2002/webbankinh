import { Icon, IconName } from "./icons";
import React, { useState, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
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
  iconOnly = true,
}: {
  children: React.ReactNode;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
}) {
  const content = Array.isArray(children) && children.every(v => typeof v === 'string' || typeof v === 'number') ? children.join('') : children;
  const label = typeof content === 'string' ? content.trim().replace(/^[←+]\s+/, '') : '';
  const actionIcon: IconName | undefined = !iconOnly ? undefined : label === 'Đóng' ? 'close' : label === 'Chi tiết' || label === 'Xem hồ sơ' ? 'eye' : label === 'Sửa' ? 'edit' : label === 'Xóa' ? 'trash' : label === 'Mở tại quầy' ? 'receipt' : label.startsWith('Thêm ') ? 'plus' : label === 'Tạm dừng' ? 'pause' : label === 'Kích hoạt' ? 'play' : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      {...({ title: label } as any)}
      accessibilityLabel={content === "‹" ? "Trang trước" : content === "›" ? "Trang sau" : typeof content === "string" ? content.replace(/^[←+]\s+/, "") : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ hovered, pressed }: any) => [
        ui.button,
        actionIcon && { width: 44, height: 44, paddingHorizontal: 0, paddingVertical: 0, flexShrink: 0 },
        primary && ui.primary,
        hovered && { backgroundColor: primary ? "#1c3e34" : "#edf2e9" },
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.4 },
      ]}
    >
      {actionIcon ? <Icon name={actionIcon} color={primary ? "#fff" : palette.green} size={20} /> : <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {typeof content === 'string' && (() => { const label = content.toLowerCase(); const icon: IconName | undefined = label === '‹' ? 'left' : label === '›' ? 'right' : label.includes('thêm') || label.includes('tạo') ? 'plus' : label.includes('thanh toán') ? 'cash' : label.includes('đặt hàng') ? 'bag' : label.includes('menu') ? 'menu' : label.includes('hóa đơn') ? 'receipt' : label.includes('trang chủ') || label.includes('tiếp tục') || label.includes('cửa hàng') ? 'left' : label.includes('đóng') ? 'close' : undefined; return icon ? <Icon name={icon} size={17} color={primary ? '#fff' : palette.green} /> : null; })()}
        <Text style={[ui.buttonText, primary && { color: "#fff" }, { flexShrink: 1, textAlign: "center" }]}>{typeof content === 'string' ? content.replace(/^[←+]\s+/, '').replace(/[‹›]/g, '') : content}</Text>
      </View>}
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
              { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 42 },
              value === o.value && {
                backgroundColor: palette.green,
                borderColor: palette.green,
              },
            ]}
          >
            {(o.value === 'cash' || o.value === 'transfer') && <Icon name={o.value === 'cash' ? 'cash' : 'bank'} color={o.value === value ? '#fff' : palette.green} size={25} />}
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
export function Table({ headings, rows }: { headings: string[]; rows: React.ReactNode[][] }) {
  const { width } = useWindowDimensions();
  const mobile = width < 700;
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [rows.length, headings.join('|')]);
  const pages = Math.max(1, Math.ceil(rows.length / (mobile ? 5 : 10)));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * (mobile ? 5 : 10), current * (mobile ? 5 : 10));
  const cell = (v: React.ReactNode) => typeof v === 'string' || typeof v === 'number' ? <Text style={ui.text}>{v}</Text> : v;
  return <View style={{ width: '100%', gap: 15 }}>
    {mobile ? shown.map((row, i) => <View key={i} style={[ui.card, { padding: 18, gap: 13 }]}>{row.map((v,j) => <View key={j} style={{ gap: 4 }}><Text style={[ui.muted,{fontSize:11}]}>{headings[j]}</Text>{cell(v)}</View>)}</View>) : <ScrollView horizontal style={ui.table} contentContainerStyle={{flexGrow:1}}><View style={{flex:1,minWidth:headings.length * 120}}><View style={[ui.tableRow,{backgroundColor:'#f1f4ef'}]}>{headings.map(h=><Text key={h} style={[ui.cell,{fontSize:12,color:palette.muted,fontWeight:'600', minWidth:['Thao tác','Hồ sơ'].includes(h)?190:0,flexShrink:['Thao tác','Hồ sơ'].includes(h)?0:1, flex:['Thao tác','Hồ sơ'].includes(h)?0:h==='Sản phẩm'?2.2:1, width:['Thao tác','Hồ sơ'].includes(h)?190:undefined, paddingHorizontal:14}]}>{h}</Text>)}</View>{shown.map((row,i)=><View key={i} style={ui.tableRow}>{row.map((v,j)=><View key={j} style={[ui.cell,{minWidth:['Thao tác','Hồ sơ'].includes(headings[j])?190:0,flexShrink:['Thao tác','Hồ sơ'].includes(headings[j])?0:1,flex:['Thao tác','Hồ sơ'].includes(headings[j])?0:headings[j]==='Sản phẩm'?2.2:1,width:['Thao tác','Hồ sơ'].includes(headings[j])?190:undefined,paddingHorizontal:14}]}>{cell(v)}</View>)}</View>)}</View></ScrollView>}
    {!rows.length && <View style={ui.card}><Text style={ui.muted}>Chưa có dữ liệu phù hợp.</Text></View>}
    {pages>1&&<View style={[ui.row,{justifyContent:'center',paddingVertical:12}]}><Button disabled={current===1} onPress={()=>setPage(current-1)}>‹</Button>{Array.from({length:pages},(_,i)=><Button key={i} primary={current===i+1} onPress={()=>setPage(i+1)}>{i+1}</Button>)}<Button disabled={current===pages} onPress={()=>setPage(current+1)}>›</Button></View>}
  </View>;
}
export const ui = StyleSheet.create({
  button: {
    minHeight: 42,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
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
