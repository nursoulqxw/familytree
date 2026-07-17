import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { login as loginRequest } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { colors, radii } from '../theme/theme';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const loginSuccess = useAuthStore(s => s.loginSuccess);

  const handle = async () => {
    if (!username.trim() || !password) { setError('Введите логин и пароль'); return; }
    setError(''); setLoading(true);
    try { const d = await loginRequest({ username: username.trim(), password }); loginSuccess(d, username.trim()); }
    catch (e) { setError(e.response?.data?.error || 'Неверный логин или пароль'); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={styles.brand}>
        <Text style={{fontSize:30,marginBottom:8}}>𖤝</Text>
        <Text style={styles.brandTitle}>Родовое древо</Text>
        <Text style={styles.brandSub}>Каждая семья - своя история. Сохраните её для тех, кто придёт после вас.</Text>
        <Text style={styles.brandTitle2}>С возвращением!</Text>
        <Text style={styles.brandSubSub}>Войдите, чтобы продолжить работу над деревом</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.lbl}>Логин</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" />
        <Text style={[styles.lbl,{marginTop:12}]}>Пароль</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={{color:colors.danger,fontSize:13,marginTop:12}}>{error}</Text> : null}
        <TouchableOpacity style={styles.btn} onPress={handle} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white}/> : <Text style={styles.btnTxt}>Войти</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{marginTop:14,alignItems:'center'}}>
          <Text style={{ fontFamily:'Times',fontSize: 13, color: colors.olive800 }}>Нет аккаунта?{' '}<Text style={{ fontWeight: '700' }}>Зарегистрироваться</Text></Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex:1,backgroundColor:colors.cream,justifyContent:'center',padding:24},
  brand:     {alignItems:'center',marginBottom:28},
  brandTitle:{fontSize:22, fontFamily:'Times', fontWeight:'800',color:colors.ink, marginBottom:20},
  brandSub:  {fontSize:25,color:colors.ink,fontFamily:'Times',marginBottom:100,textAlign:'center'},
  brandTitle2: {fontSize:20, fontFamily:'Times', fontWeight:'800',color:colors.ink, marginBottom:10},
  brandSubSub:  {fontSize:17,color:colors.ink,opacity:0.6,fontFamily:'Times',marginBottom:2,textAlign:'center'},
  card:      {backgroundColor:colors.creamLight,borderRadius:radii.lg,borderWidth:0.1,borderColor:colors.creamBorder,padding:20},
  lbl:       {fontFamily:'Times',fontSize:12.5,fontWeight:'600',color:colors.ink,opacity:0.75,marginBottom:6},
  input:     {borderWidth:1,borderColor:colors.creamBorder,borderRadius:radii.sm,paddingHorizontal:12,paddingVertical:11,fontSize:15,color:colors.ink,backgroundColor:colors.white},
  btn:       {backgroundColor:colors.olive,borderRadius:radii.sm,paddingVertical:13,alignItems:'center',marginTop:18},
  btnTxt:    {color:colors.white,fontFamily:'Times',fontWeight:'700',fontSize:15},
});