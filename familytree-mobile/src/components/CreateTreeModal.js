import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii } from '../theme/theme';

const OPTS = [{ value:'private', label:'Закрытое' }, { value:'link', label:'По ссылке' }, { value:'public', label:'Открытое' }];

export default function CreateTreeModal({ visible, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState('private');
  const submit = () => { if (!name.trim()) return; onSubmit({ name: name.trim(), privacy }); setName(''); setPrivacy('private'); };
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.hdr}><Text style={styles.title}>Создать дерево</Text></View>
          <View style={{ padding:18 }}>
            <Text style={styles.lbl}>Название</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Семья Ивановых" />
            <Text style={[styles.lbl,{marginTop:14}]}>Приватность</Text>
            <View style={{ flexDirection:'row', gap:8 }}>
              {OPTS.map(o => (
                <TouchableOpacity key={o.value} style={[styles.opt, privacy===o.value && styles.optA]} onPress={() => setPrivacy(o.value)}>
                  <Text style={[styles.optTxt, privacy===o.value && { opacity:1 }]}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop:20, gap:8 }}>
              <TouchableOpacity onPress={onClose} style={{ paddingVertical:10, paddingHorizontal:14 }}><Text style={{ color:colors.ink, opacity:0.7, fontWeight:'600' }}>Отмена</Text></TouchableOpacity>
              <TouchableOpacity onPress={submit} style={styles.submitBtn}><Text style={{ color:colors.white, fontWeight:'700' }}>Создать</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:   { flex:1, backgroundColor:'rgba(44,44,36,0.5)', justifyContent:'center', padding:24 },
  card:      { backgroundColor:colors.creamLight, borderRadius:radii.lg, overflow:'hidden' },
  hdr:       { backgroundColor:colors.olive, paddingVertical:14, paddingHorizontal:18 },
  title:     { color:colors.white, fontWeight:'800', fontSize:16 },
  lbl:       { fontSize:12.5, fontWeight:'600', color:colors.ink, opacity:0.75, marginBottom:6 },
  input:     { borderWidth:1, borderColor:colors.creamBorder, borderRadius:radii.sm, paddingHorizontal:12, paddingVertical:10, fontSize:14.5, backgroundColor:colors.white, color:colors.ink },
  opt:       { flex:1, paddingVertical:9, borderRadius:radii.sm, borderWidth:1, borderColor:colors.creamBorder, alignItems:'center' },
  optA:      { backgroundColor:colors.olive100, borderColor:colors.olive },
  optTxt:    { fontSize:12.5, fontWeight:'600', color:colors.ink, opacity:0.75 },
  submitBtn: { backgroundColor:colors.olive, paddingVertical:10, paddingHorizontal:18, borderRadius:radii.sm },
});