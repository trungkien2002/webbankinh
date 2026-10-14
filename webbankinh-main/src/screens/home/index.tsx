import { ScrollView, StyleSheet, Text, View } from 'react-native';

export function Home() {
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>NHÓM 4 · PMA1011</Text>
        <Text accessibilityRole="header" style={styles.title}>Quản lý bán kính thời trang</Text>
        <Text style={styles.description}>Nền dự án React Native chạy trên web đã sẵn sàng.</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trạng thái khởi tạo</Text>
          <Text style={styles.body}>Đã thiết lập React Native, Expo và TypeScript.</Text>
          <Text style={styles.body}>Backend, cơ sở dữ liệu và các chức năng nghiệp vụ chưa triển khai.</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: '#f3f6fb', padding: 24, justifyContent: 'center' },
  content: { width: '100%', maxWidth: 800, alignSelf: 'center', gap: 20 },
  eyebrow: { color: '#2563eb', fontSize: 14, fontWeight: '700' },
  title: { color: '#172033', fontSize: 32, fontWeight: '700' },
  description: { color: '#475569', fontSize: 18, lineHeight: 28 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, gap: 12, borderWidth: 1, borderColor: '#dbe3ef' },
  cardTitle: { color: '#172033', fontSize: 20, fontWeight: '600' },
  body: { color: '#475569', fontSize: 16, lineHeight: 26 },
});

