import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii } from '../theme/theme';
import { formatDate } from '../utils/formatters';

export default function LifeEventItem({ event, onDelete }) {
  return (
    <View style={styles.row}>
      <View style={styles.dot} />
      <View style={styles.body}>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
          <Text style={styles.title}>{event.title}</Text>
          {onDelete && <TouchableOpacity onPress={onDelete}><Text style={{ color:colors.danger, fontSize:12 }}>Удалить</Text></TouchableOpacity>}
        </View>
        {event.event_date ? <Text style={styles.date}>{formatDate(event.event_date)}</Text> : null}
        {event.description ? <Text style={styles.desc}>{event.description}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection:'row', marginBottom:14 },
  dot:   { width:9, height:9, borderRadius:5, backgroundColor:colors.olive, marginTop:5, marginRight:10 },
  body:  { flex:1, backgroundColor:colors.creamLight, borderRadius:radii.md, borderWidth:1, borderColor:colors.creamBorder, padding:10 },
  title: { fontWeight:'700', color:colors.ink, fontSize:14, flex:1, marginRight:8 },
  date:  { fontSize:11.5, color:colors.ink, opacity:0.6, marginTop:2 },
  desc:  { fontSize:13, color:colors.ink, opacity:0.85, marginTop:6, lineHeight:18 },
});