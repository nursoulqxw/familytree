import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii, shadow } from '../theme/theme';

const LABELS = { private:'🔒︎ Закрытое', link:'🔗 По ссылке', public:'🌐 Открытое' };

export default function TreeCard({ tree, onPress, onDelete }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.icon}><Text style={{fontSize:18}}>𖠰</Text></View>
      <Text style={styles.name} numberOfLines={1}>{tree.name}</Text>
      <View style={styles.pill}><Text style={styles.pillText}>{LABELS[tree.privacy] || tree.privacy}</Text></View>
      {onDelete && <TouchableOpacity onPress={onDelete} style={styles.del}><Text style={styles.delText}>Удалить</Text></TouchableOpacity>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:     { backgroundColor:colors.creamLight, borderRadius:radii.lg, borderWidth:1, borderColor:colors.creamBorder, padding:16, marginBottom:12, ...shadow },
  icon:     { width:40, height:40, borderRadius:radii.pill, backgroundColor:colors.olive100, alignItems:'center', justifyContent:'center', marginBottom:10 },
  name:     { fontSize:17, fontWeight:'700', color:colors.ink, marginBottom:8 },
  pill:     { alignSelf:'flex-start', backgroundColor:colors.creamDark, borderRadius:radii.pill, paddingHorizontal:10, paddingVertical:3 },
  pillText: { fontSize:11.5, fontWeight:'600', color:colors.ink, opacity:0.7 },
  del:      { marginTop: 12, alignSelf: 'flex-start',borderWidth: 1,borderColor: colors.danger, borderRadius: 15,paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center'},
  delText:  { color:colors.danger, fontSize:12.5, fontWeight:'600' },
});