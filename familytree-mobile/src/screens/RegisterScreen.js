import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { register as registerRequest } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { colors, radii } from '../theme/theme';

export default function RegisterScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const loginSuccess = useAuthStore(s => s.loginSuccess);

  const handle = async () => {
    if (!username.trim() || !password) { setError('Логин и пароль обязательны'); return; }
    setError(''); setLoading(true);
    try { const d = await registerRequest({ username: username.trim(), email: email.trim(), password }); loginSuccess(d, username.trim()); }
    catch (e) {
    console.log("REGISTER ERROR");

    console.log(e);

    console.log(e.response);

    console.log(e.response?.data);

    if (!e.response) {
        setError("Cannot connect to server");
        return;
    }

    setError(
        Object.values(e.response.data)
            .flat()
            .join("\n")
    );
}
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{flex:1,backgroundColor:colors.cream,padding:24}} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView contentContainerStyle={{flexGrow:1,justifyContent:'center'}} keyboardShouldPersistTaps="handled">
        <View style={{alignItems:'center',marginBottom:28}}>
          <Text style={{fontSize:30,marginBottom:8}}>📖</Text>
          <Text style={{fontSize:22,fontWeight:'800',color:colors.ink}}>Родовое древо</Text>
          <Text style={{fontSize:12.5,color:colors.ink,opacity:0.6,marginTop:4,textAlign:'center'}}>Создайте аккаунт, чтобы начать своё дерево</Text>
        </View>
        <View style={{backgroundColor:colors.creamLight,borderRadius:radii.lg,borderWidth:1,borderColor:colors.creamBorder,padding:20}}>
          {[['Логин',username,setUsername,'none',false],['Email',email,setEmail,'none',false],['Пароль',password,setPassword,'sentences',true]].map(([lbl,val,setter,cap,sec]) => (
            <View key={lbl} style={{marginBottom:12}}>
              <Text style={{fontSize:12.5,fontWeight:'600',color:colors.ink,opacity:0.75,marginBottom:6}}>{lbl}</Text>
              <TextInput style={{borderWidth:1,borderColor:colors.creamBorder,borderRadius:radii.sm,paddingHorizontal:12,paddingVertical:11,fontSize:15,color:colors.ink,backgroundColor:colors.white}}
                value={val} onChangeText={setter} autoCapitalize={cap} secureTextEntry={sec} />
            </View>
          ))}
          {error ? <Text style={{color:colors.danger,fontSize:13,marginTop:4}}>{error}</Text> : null}
          <TouchableOpacity style={{backgroundColor:colors.olive,borderRadius:radii.sm,paddingVertical:13,alignItems:'center',marginTop:18}} onPress={handle} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.white}/> : <Text style={{color:colors.white,fontWeight:'700',fontSize:15}}>Зарегистрироваться</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{marginTop:14,alignItems:'center'}}>
            <Text style={{color:colors.olive800,fontWeight:'600',fontSize:13}}>Уже есть аккаунт? Войти</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}