import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme/theme';

export default function OfflineBanner({ isOnline, syncing, pendingCount }) {
  if (isOnline && !syncing && pendingCount === 0) return null;
  if (!isOnline)
    return <View style={[styles.banner, { backgroundColor: '#f3e4c8' }]}><Text style={styles.text}>Нет сети — показаны сохранённые данные</Text></View>;
  if (syncing)
    return <View style={[styles.banner, { backgroundColor: colors.olive100 }]}><ActivityIndicator size="small" color={colors.olive800} /><Text style={[styles.text,{marginLeft:8}]}>Синхронизация…</Text></View>;
  return <View style={[styles.banner, { backgroundColor: colors.olive100 }]}><Text style={styles.text}>Ожидают синхронизации: {pendingCount}</Text></View>;
}

const styles = StyleSheet.create({
  banner: { flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:8, paddingHorizontal:12 },
  text:   { fontSize:12.5, fontWeight:'600', color: colors.ink },
});