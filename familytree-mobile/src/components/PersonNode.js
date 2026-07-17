import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { NODE_WIDTH, NODE_HEIGHT } from '../utils/graphLayout';
import { fullName, initials, formatYear } from '../utils/formatters';
import { colors, radii, shadow } from '../theme/theme';

export default function PersonNode({ person, x, y, onTap }) {
  const deceased = Boolean(person.death_date);
  return (
    <Pressable onPress={() => onTap(person)} hitSlop={4}
      style={[styles.node, { left: x - NODE_WIDTH/2, top: y - NODE_HEIGHT/2 }, deceased && { opacity:0.72 }]}>
      {person.photo
        ? <Image source={{ uri: person.photo }} style={styles.avatar} />
        : <View style={styles.avatarFb}><Text style={styles.initials}>{initials(person)}</Text></View>}
      <View style={{ flex:1 }}>
        <Text style={styles.name} numberOfLines={2}>{fullName(person)}</Text>
        <Text style={styles.years}>{formatYear(person.birth_date)} – {deceased ? formatYear(person.death_date) : 'н.в.'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  node:     { position:'absolute', width:NODE_WIDTH, height:NODE_HEIGHT, backgroundColor:colors.creamLight, borderRadius:radii.md, borderWidth:1, borderColor:colors.creamBorder, flexDirection:'row', alignItems:'center', padding:8, ...shadow },
  avatar:   { width:44, height:44, borderRadius:radii.pill, marginRight:8 },
  avatarFb: { width:44, height:44, borderRadius:radii.pill, backgroundColor:colors.olive100, alignItems:'center', justifyContent:'center', marginRight:8 },
  initials: { fontWeight:'800', color:colors.ink, fontSize:14 },
  name:     { fontSize:12.5, fontWeight:'700', color:colors.ink, lineHeight:15 },
  years:    { fontSize:11, color:colors.ink, opacity:0.65, marginTop:3 },
});