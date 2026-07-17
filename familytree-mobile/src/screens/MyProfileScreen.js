import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import AppHeader from '../components/AppHeader';
import {
  getMyProfile,
  updateMyProfile,
} from '../api/profile';

import { useAuthStore } from '../store/authStore';
import { colors, radii, shadow } from '../theme/theme';

export default function MyProfileScreen() {
  const logout = useAuthStore(s => s.logout);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await getMyProfile();

      setProfile(data);

      setUsername(data.username || '');
      setEmail(data.email || '');
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
    } catch {
      Alert.alert(
        'Ошибка',
        'Не удалось загрузить профиль.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    try {
      setSaving(true);

      const updated = await updateMyProfile({
        username,
        first_name: firstName,
        last_name: lastName,
      });

      setProfile(updated);

      Alert.alert(
        'Готово',
        'Профиль обновлён.'
      );
    } catch {
      Alert.alert(
        'Ошибка',
        'Не удалось сохранить.'
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader onLogout={logout} />

        <ActivityIndicator
          size="large"
          color={colors.olive}
          style={{ marginTop: 80 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader onLogout={logout} />

      <ScrollView
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          <Text style={styles.heading}>
            Мой профиль
          </Text>

          <Text style={styles.label}>
            Имя пользователя
          </Text>

          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
          />

          <Text style={styles.label}>
            Email
          </Text>

          <TextInput
            editable={false}
            style={[
              styles.input,
              { backgroundColor: '#f5f5f5' },
            ]}
            value={email}
          />

          <Text style={styles.label}>
            Имя
          </Text>

          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
          />

          <Text style={styles.label}>
            Фамилия
          </Text>

          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={save}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>
                Сохранить
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  content: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },

  card: {
    width: '100%',
    maxWidth: 650,

    backgroundColor: '#fff',

    borderRadius: radii.lg,

    padding: 24,

    ...shadow,
  },

  heading: {
    fontSize: 28,
    fontWeight: '700',

    color: colors.ink,

    marginBottom: 24,
  },

  label: {
    marginBottom: 8,

    marginTop: 14,

    fontSize: 14,

    fontWeight: '600',

    color: colors.ink,
  },

  input: {
    borderWidth: 1,

    borderColor: '#ddd',

    borderRadius: radii.sm,

    backgroundColor: '#fff',

    paddingHorizontal: 14,

    paddingVertical: 12,

    fontSize: 15,

    color: colors.ink,
  },

  button: {
    marginTop: 28,

    height: 50,

    borderRadius: radii.sm,

    backgroundColor: colors.olive,

    alignItems: 'center',

    justifyContent: 'center',
  },

  buttonText: {
    color: '#fff',

    fontWeight: '700',

    fontSize: 16,
  },
});