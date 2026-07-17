import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii } from '../theme/theme';
import { parseDateInput } from '../utils/formatters';

export default function AddLifeEventModal({ visible, onClose, onSubmit }) {
  const [title, setTitle]       = useState('');
  const [desc, setDesc]         = useState('');
  const [dateText, setDateText] = useState('');
  const [error, setError]       = useState('');

  const submit = () => {
    if (!title.trim()) { setError('Название обязательно'); return; }
    const event_date = dateText ? parseDateInput(dateText) : null;
    if (dateText && !event_date) { setError('Дата — ДД.ММ.ГГГГ'); return; }
    onSubmit({ title: title.trim(), description: desc.trim(), event_date });
    setTitle(''); setDesc(''); setDateText(''); setError('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Новое событие</Text>
          <Text style={styles.lbl}>Название</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} />
          <Text style={[styles.lbl,{marginTop:12}]}>Дата</Text>
          <TextInput style={styles.input} value={dateText} onChangeText={setDateText} placeholder="ДД.ММ.ГГГГ" keyboardType="number-pad" />
          <Text style={[styles.lbl,{marginTop:12}]}>Описание</Text>
          <TextInput style={[styles.input,{height:80,textAlignVertical:'top'}]} value={desc} onChangeText={setDesc} multiline />
          {error ? <Text style={{color:colors.danger,fontSize:13,marginTop:10}}>{error}</Text> : null}
          <View style={{flexDirection:'row',justifyContent:'flex-end',marginTop:16,gap:8}}>
            <TouchableOpacity onPress={onClose} style={{paddingVertical:10,paddingHorizontal:14}}><Text style={{color:colors.ink,opacity:0.7,fontWeight:'600'}}>Отмена</Text></TouchableOpacity>
            <TouchableOpacity onPress={submit} style={styles.submitBtn}><Text style={{color:colors.white,fontWeight:'700'}}>Добавить</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:   { flex:1, backgroundColor:'rgba(44,44,36,0.45)', justifyContent:'flex-end' },
  sheet:     { backgroundColor:colors.creamLight, borderTopLeftRadius:radii.lg, borderTopRightRadius:radii.lg, padding:18 },
  title:     { fontSize:17, fontWeight:'800', color:colors.ink, marginBottom:14 },
  lbl:       { fontSize:12.5, fontWeight:'600', color:colors.ink, opacity:0.75, marginBottom:5 },
  input:     { borderWidth:1, borderColor:colors.creamBorder, borderRadius:radii.sm, paddingHorizontal:12, paddingVertical:10, fontSize:14.5, backgroundColor:colors.white, color:colors.ink },
  submitBtn: { backgroundColor:colors.olive, paddingVertical:10, paddingHorizontal:18, borderRadius:radii.sm },
});