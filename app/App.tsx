import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🏃 Chasquiya</Text>
      <Text style={styles.subtitle}>Marketplace de maestros</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Hito 0 · Cimientos ✅</Text>
      </View>
      <Text style={styles.hint}>Si ves esto en tu teléfono, la app funciona.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 34,
    fontWeight: '700',
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 4,
  },
  badge: {
    marginTop: 24,
    backgroundColor: '#166534',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeText: {
    color: '#dcfce7',
    fontWeight: '600',
  },
  hint: {
    marginTop: 24,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
});
