import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { updatePerson, deletePerson } from '../api/persons';
import { listLifeEvents, createLifeEvent, deleteLifeEvent } from '../api/lifeEvents';
import { isNetworkError } from '../services/apiClient';
import { cacheGet, cacheSet, cacheKeys } from '../services/offlineCache';
import { enqueue } from '../services/syncQueue';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import LifeEventItem from '../components/LifeEventItem';
import AddLifeEventModal from '../components/AddLifeEventModal';
import OfflineBanner from '../components/OfflineBanner';
import { colors, radii, shadow } from '../theme/theme';
import { fullName, initials, formatDate, toDateInputText, parseDateInput } from '../utils/formatters';
import AppHeader from '../components/AppHeader';

const toForm = (p) => ({
  last_name: p.last_name||'', first_name: p.first_name||'', patronymic: p.patronymic||'',
  birthDateText: toDateInputText(p.birth_date), deathDateText: toDateInputText(p.death_date),
  birth_place: p.birth_place||'', bio: p.bio||'',
});

function Field({ label, style, ...props }) {
  return (
    <View style={{marginBottom:12}}>
      <Text style={{fontSize:12.5,fontWeight:'600',color:colors.ink,opacity:0.75,marginBottom:5}}>{label}</Text>
      <TextInput style={[{borderWidth:1,borderColor:colors.creamBorder,borderRadius:radii.sm,paddingHorizontal:12,paddingVertical:10,fontSize:14.5,color:colors.ink,backgroundColor:colors.white},style]}
        placeholderTextColor={colors.ink+'66'} {...props} />
    </View>
  );
}

export default function PersonProfileScreen({ route, navigation }) {
  const { treeId, person: init } = route.params;
  const [person, setPerson]   = useState(init);
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState(() => toForm(init));
  const [saving, setSaving]   = useState(false);
  const [events, setEvents]   = useState([]);
  const [evLoading, setEvLoading] = useState(true);
  const [showAddEv, setShowAddEv] = useState(false);
  const { isOnline, pendingCount, syncing, refreshPendingCount } = useNetworkStatus();

  useEffect(() => { navigation.setOptions({ title: fullName(person)||'Профиль' }); }, [navigation, person]);

  const loadEvents = useCallback(async () => {
    try {
      const data = await listLifeEvents(treeId, person.id);
      setEvents(data); cacheSet(cacheKeys.lifeEvents(treeId, person.id), data);
    } catch (e) {
      if (isNetworkError(e)) { const c = await cacheGet(cacheKeys.lifeEvents(treeId, person.id)); if(c) setEvents(c.value); }
    } finally { setEvLoading(false); }
  }, [treeId, person.id]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const pickPhoto = async (cam) => {
    const perm = cam ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Нет доступа', cam?'Разрешите доступ к камере':'Разрешите доступ к галерее'); return; }
    const res = cam
      ? await ImagePicker.launchCameraAsync({ quality:0.7, allowsEditing:true, aspect:[1,1] })
      : await ImagePicker.launchImageLibraryAsync({ quality:0.7, allowsEditing:true, aspect:[1,1] });
    if (res.canceled) return;
    try { setSaving(true); const u = await updatePerson(treeId, person.id, { photo: res.assets[0] }); setPerson(u); }
    catch { Alert.alert('Ошибка', 'Не удалось загрузить фото'); }
    finally { setSaving(false); }
  };

  const handleSave = async () => {
    if (!form.last_name.trim()||!form.first_name.trim()) { Alert.alert('Проверьте данные','Фамилия и имя обязательны'); return; }
    const birth_date = form.birthDateText ? parseDateInput(form.birthDateText) : null;
    const death_date = form.deathDateText ? parseDateInput(form.deathDateText) : null;
    if ((form.birthDateText&&!birth_date)||(form.deathDateText&&!death_date)) { Alert.alert('Проверьте данные','Даты — ДД.ММ.ГГГГ'); return; }
    const payload = { last_name:form.last_name.trim(), first_name:form.first_name.trim(), patronymic:form.patronymic.trim()||undefined, birth_date, death_date, birth_place:form.birth_place.trim()||undefined, bio:form.bio };
    setSaving(true);
    try {
      if (!isOnline) {
        await enqueue({ type:'updatePerson', treeId, personId:person.id, payload });
        setPerson(p => ({...p,...payload})); await refreshPendingCount(); setEditing(false);
        Alert.alert('Сохранено локально','Будет отправлено при появлении сети.'); return;
      }
      const u = await updatePerson(treeId, person.id, payload); setPerson(u); setEditing(false);
    } catch { Alert.alert('Ошибка','Не удалось сохранить'); }
    finally { setSaving(false); }
  };

  const handleDelPerson = () => Alert.alert('Удалить?', fullName(person), [
    { text:'Отмена', style:'cancel' },
    { text:'Удалить', style:'destructive', onPress: async () => {
      try { await deletePerson(treeId, person.id); navigation.goBack(); }
      catch { Alert.alert('Ошибка','Не удалось удалить'); }
    }},
  ]);

  const handleAddEvent = async (payload) => {
    setShowAddEv(false);
    try {
      if (!isOnline) { await enqueue({ type:'createLifeEvent', treeId, personId:person.id, payload }); setEvents(p=>[...p,{...payload,id:`local-${Date.now()}`}]); await refreshPendingCount(); return; }
      await createLifeEvent(treeId, person.id, payload); await loadEvents();
    } catch { Alert.alert('Ошибка','Не удалось добавить событие'); }
  };

  const handleDelEvent = (id) => Alert.alert('Удалить событие?','', [
    { text:'Отмена', style:'cancel' },
    { text:'Удалить', style:'destructive', onPress: async () => {
      try { await deleteLifeEvent(treeId, person.id, id); setEvents(p=>p.filter(e=>e.id!==id)); }
      catch { Alert.alert('Ошибка','Не удалось удалить событие'); }
    }},
  ]);

  return (
  <KeyboardAvoidingView
    style={{ flex: 1, backgroundColor: colors.cream }}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  >
    <AppHeader
      title="Профиль"
      navigation={navigation}
      showBack
    />

    <OfflineBanner
      isOnline={isOnline}
      syncing={syncing}
      pendingCount={pendingCount}
    />

    <ScrollView
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 40,
      }}
    >
        <View style={styles.card}>
          <View style={{position:'relative'}}>
            {person.photo
              ? <Image source={{uri:person.photo}} style={styles.avatar}/>
              : <View style={styles.avatarFb}><Text style={styles.initials}>{initials(person)}</Text></View>}
            {saving && <View style={styles.avatarOvl}><ActivityIndicator color={colors.white}/></View>}
          </View>
          <View style={{flexDirection:'row',gap:8,marginTop:10}}>
            {[[true,'📷 Камера'],[false,'🖼 Галерея']].map(([cam,lbl]) => (
              <TouchableOpacity key={lbl} style={styles.photoBtn} onPress={()=>pickPhoto(cam)}><Text style={styles.photoBtnTxt}>{lbl}</Text></TouchableOpacity>
            ))}
          </View>
          {!editing ? (
            <View style={{marginTop:14,alignItems:'center'}}>
              <Text style={styles.name}>{fullName(person)}</Text>
              <Text style={styles.meta}>{formatDate(person.birth_date)||'Дата рождения не указана'}{person.birth_place?` (${person.birth_place})`:''}</Text>
              {person.death_date && <Text style={[styles.meta,{opacity:0.55,fontWeight:'600'}]}>Скончался(лась): {formatDate(person.death_date)}</Text>}
              {person.bio && <Text style={styles.bio}>{person.bio}</Text>}
              <View style={styles.actRow}>
                <TouchableOpacity style={styles.editBtn} onPress={()=>setEditing(true)}><Text style={{color:colors.white,fontWeight:'700',fontSize:13}}>Редактировать</Text></TouchableOpacity>
                <TouchableOpacity style={{paddingVertical:10,paddingHorizontal:14}} onPress={handleDelPerson}><Text style={{color:colors.danger,fontWeight:'600',fontSize:13}}>Удалить</Text></TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{marginTop:14,width:'100%'}}>
              <Field label="Фамилия"    value={form.last_name}    onChangeText={v=>setForm(f=>({...f,last_name:v}))} />
              <Field label="Имя"        value={form.first_name}   onChangeText={v=>setForm(f=>({...f,first_name:v}))} />
              <Field label="Отчество"   value={form.patronymic}   onChangeText={v=>setForm(f=>({...f,patronymic:v}))} />
              <Field label="Дата рождения" value={form.birthDateText} onChangeText={v=>setForm(f=>({...f,birthDateText:v}))} placeholder="ДД.ММ.ГГГГ" keyboardType="number-pad" />
              <Field label="Дата смерти"   value={form.deathDateText} onChangeText={v=>setForm(f=>({...f,deathDateText:v}))} placeholder="ДД.ММ.ГГГГ" keyboardType="number-pad" />
              <Field label="Место рождения" value={form.birth_place} onChangeText={v=>setForm(f=>({...f,birth_place:v}))} />
              <Field label="Заметки" value={form.bio} onChangeText={v=>setForm(f=>({...f,bio:v}))} multiline style={{height:80,textAlignVertical:'top'}} />
              <View style={styles.actRow}>
                <TouchableOpacity style={{paddingVertical:10,paddingHorizontal:14}} onPress={()=>{setForm(toForm(person));setEditing(false);}}>
                  <Text style={{color:colors.ink,opacity:0.7,fontWeight:'600'}}>Отмена</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editBtn} onPress={handleSave} disabled={saving}>
                  {saving?<ActivityIndicator color={colors.white}/>:<Text style={{color:colors.white,fontWeight:'700',fontSize:13}}>Сохранить</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:22,marginBottom:10}}>
          <Text style={{fontSize:15.5,fontWeight:'800',color:colors.ink}}>Хронология жизни</Text>
          <TouchableOpacity onPress={()=>setShowAddEv(true)}><Text style={{color:colors.olive800,fontWeight:'700',fontSize:12.5}}>+ Событие</Text></TouchableOpacity>
        </View>
        {evLoading
          ? <ActivityIndicator color={colors.olive} style={{marginTop:12}}/>
          : events.length===0
            ? <Text style={{color:colors.ink,opacity:0.5,fontSize:13,textAlign:'center',marginTop:10}}>Событий пока нет</Text>
            : events.map(ev => <LifeEventItem key={ev.id} event={ev} onDelete={()=>handleDelEvent(ev.id)}/>)
        }
      </ScrollView>
      <AddLifeEventModal visible={showAddEv} onClose={()=>setShowAddEv(false)} onSubmit={handleAddEvent}/>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card:      {backgroundColor:colors.creamLight,borderRadius:radii.lg,borderWidth:1,borderColor:colors.creamBorder,padding:18,alignItems:'center',...shadow},
  avatar:    {width:88,height:88,borderRadius:radii.pill,borderWidth:2,borderColor:colors.creamBorder},
  avatarFb:  {width:88,height:88,borderRadius:radii.pill,backgroundColor:colors.olive100,alignItems:'center',justifyContent:'center'},
  initials:  {fontWeight:'800',fontSize:24,color:colors.ink},
  avatarOvl: {...StyleSheet.absoluteFillObject,borderRadius:radii.pill,backgroundColor:'rgba(44,44,36,0.4)',alignItems:'center',justifyContent:'center'},
  photoBtn:  {backgroundColor:colors.creamDark,borderRadius:radii.pill,paddingHorizontal:12,paddingVertical:6},
  photoBtnTxt:{fontSize:11.5,fontWeight:'600',color:colors.ink},
  name:      {fontSize:19,fontWeight:'800',color:colors.ink},
  meta:      {fontSize:12.5,color:colors.ink,opacity:0.7,textAlign:'center',marginTop:6},
  bio:       {fontSize:13.5,color:colors.ink,opacity:0.85,marginTop:12,lineHeight:19,textAlign:'center'},
  actRow:    {flexDirection:'row',justifyContent:'center',gap:10,marginTop:16,width:'100%'},
  editBtn:   {backgroundColor:colors.olive,borderRadius:radii.sm,paddingVertical:10,paddingHorizontal:18},
});