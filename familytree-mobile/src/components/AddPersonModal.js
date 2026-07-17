import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, radii } from '../theme/theme';
import { RELATION_OPTIONS } from '../utils/graphLayout';
import { parseDateInput } from '../utils/formatters';

export default function AddPersonModal({ visible, onClose, onSubmit, existingPersons = [] }) {
  const [lastName, setLastName]     = useState('');
  const [firstName, setFirstName]   = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [birthText, setBirthText]   = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [relatedToId, setRelatedToId] = useState(existingPersons[0]?.id ?? null);
  const [relationType, setRelationType] = useState('CHILD');
  const [error, setError] = useState('');

  const reset = () => { setLastName(''); setFirstName(''); setPatronymic(''); setBirthText(''); setBirthPlace(''); setError(''); };

  const handleSubmit = () => {
    if (!lastName.trim() || !firstName.trim()) { setError('Фамилия и имя обязательны'); return; }
    const birth_date = birthText ? parseDateInput(birthText) : null;
    if (birthText && !birth_date) { setError('Дата рождения — ДД.ММ.ГГГГ'); return; }
    onSubmit({
      person: { last_name: lastName.trim(), first_name: firstName.trim(), patronymic: patronymic.trim()||undefined, birth_date: birth_date||undefined, birth_place: birthPlace.trim()||undefined },
      relation: existingPersons.length > 0 ? { relatedToId, relationType } : null,
    });
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
          <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%' }}
          >
        <View style={styles.sheet}>
          <View style={styles.hdr}>
            <Text style={styles.title}>Добавить члена семьи</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.close}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
    contentContainerStyle={{
        paddingBottom: 40,
    }}
>
            {[['Фамилия *', lastName, setLastName], ['Имя *', firstName, setFirstName], ['Отчество', patronymic, setPatronymic]].map(([lbl, val, setter]) => (
              <View key={lbl} style={{ marginBottom:12 }}>
                <Text style={styles.lbl}>{lbl}</Text>
                <TextInput style={styles.input} value={val} onChangeText={setter} />
              </View>
            ))}
            <View style={{ marginBottom:12 }}>
              <Text style={styles.lbl}>Дата рождения</Text>
              <TextInput style={styles.input} value={birthText} onChangeText={setBirthText} placeholder="ДД.ММ.ГГГГ" keyboardType="default" autoCorrect={false} autoCapitalize="none" maxLength={10} />
            </View>
            <View style={{ marginBottom:12 }}>
              <Text style={styles.lbl}>Место рождения</Text>
              <TextInput style={styles.input} value={birthPlace} onChangeText={setBirthPlace} />
            </View>
            {existingPersons.length > 0 && (
              <>
                <Text style={styles.lbl}>Кем приходится</Text>
                <View style={{ flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:14 }}>
                  {RELATION_OPTIONS.map(({ value, label }) => (
                    <TouchableOpacity key={value} style={[styles.chip, relationType===value && styles.chipA]} onPress={() => setRelationType(value)}>
                      <Text style={[styles.chipTxt, relationType===value && { color:colors.white }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.lbl}>По отношению к</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:14 }}>
                  {existingPersons.map(p => (
                    <TouchableOpacity key={p.id} style={[styles.chip, relatedToId===p.id && styles.chipA, { marginRight:8 }]} onPress={() => setRelatedToId(p.id)}>
                      <Text style={[styles.chipTxt, relatedToId===p.id && { color:colors.white }]}>{p.first_name} {p.last_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}
            {error ? <Text style={{ color:colors.danger, fontSize:13, marginBottom:8 }}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={{ paddingVertical:10, paddingHorizontal:16 }}><Text style={{ color:colors.ink, opacity:0.7, fontWeight:'600' }}>Отмена</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}><Text style={{ color:colors.white, fontWeight:'700' }}>Внедрить в древо</Text></TouchableOpacity>
          </View>
        </View>
</KeyboardAvoidingView>
</View>
</Modal>
  );
}

const styles = StyleSheet.create({
  overlay:   { flex:1, backgroundColor:'rgba(44,44,36,0.45)', justifyContent:'flex-end' },
  sheet:     { backgroundColor:colors.creamLight, borderTopLeftRadius:radii.lg, borderTopRightRadius:radii.lg, maxHeight:'85%', padding:18 },
  hdr:       { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  title:     { fontSize:17, fontWeight:'800', color:colors.ink },
  close:     { fontSize:18, color:colors.ink, opacity:0.6 },
  lbl:       { fontSize:12.5, fontWeight:'600', color:colors.ink, opacity:0.75, marginBottom:5 },
  input:     { borderWidth:1, borderColor:colors.creamBorder, borderRadius:radii.sm, paddingHorizontal:12, paddingVertical:10, fontSize:14.5, color:colors.ink, backgroundColor:colors.white },
  chip:      { paddingHorizontal:12, paddingVertical:7, borderRadius:radii.pill, backgroundColor:colors.creamDark, marginBottom:8 },
  chipA:     { backgroundColor:colors.olive },
  chipTxt:   { fontSize:12.5, fontWeight:'600', color:colors.ink },
  footer:    { flexDirection:'row', justifyContent:'flex-end', marginTop:8, paddingTop:10, borderTopWidth:1, borderTopColor:colors.creamBorder },
  submitBtn: { backgroundColor:colors.olive, paddingVertical:10, paddingHorizontal:18, borderRadius:radii.sm },
});