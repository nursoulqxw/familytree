import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/theme';

export default function AppHeader({ onLogout }) {

  const navigation = useNavigation();

  const { width } = useWindowDimensions();
  const username = useAuthStore(s => s.username);

  const isDesktop = width >= 900;
  const isTablet = width >= 700;

  return (
    <SafeAreaView
      edges={['top']}
      style={styles.safe}
    >
      <View style={styles.container}>

        {/* LEFT */}

        <View style={styles.left}>

          <TouchableOpacity
  activeOpacity={0.8}
  style={styles.left}
  onPress={() => navigation.navigate('Dashboard')}
>
  <Image
    source={require('../../assets/logo.png')}
    style={styles.logo}
  />

  <View style={{ flexShrink: 1 }}>
    {/* title + badge + subtitle */}
  </View>
</TouchableOpacity>

          <View style={{ flexShrink: 1 }}>

            <View
              style={[
                styles.titleRow,
                !isTablet && styles.mobileTitleRow,
              ]}
            >
              <Text style={styles.title}>
                Родовое древо
              </Text>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  Цифровой архив
                </Text>
              </View>

            </View>

            <Text
              style={styles.subtitle}
            >
              Семейная летопись,{"\n"}
              хроника и архив медиа
            </Text>

          </View>

        </View>

        {/* RIGHT */}

        {isDesktop ? (

          <View style={styles.rightDesktop}>

            <Text style={styles.username}>
              {username}
            </Text>

            <TouchableOpacity
              style={styles.logout}
              onPress={onLogout}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutText}>
                Выйти
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
  activeOpacity={0.8}
  onPress={() => navigation.navigate('MyProfile')}
>
  <Image
    source={require('../../assets/profile.png')}
    style={styles.profile}
  />
</TouchableOpacity>

          </View>

        ) : (

          <View style={styles.rightMobile}>

            <TouchableOpacity
  activeOpacity={0.8}
  onPress={() => navigation.navigate('MyProfile')}
>
  <Image
    source={require('../../assets/profile.png')}
    style={styles.profile}
  />
</TouchableOpacity>

            <Text
              numberOfLines={1}
              style={styles.usernameMobile}
            >
              {username}
            </Text>

            <TouchableOpacity
              onPress={onLogout}
              style={styles.logoutMobile}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutMobileText}>
                Выйти
              </Text>
            </TouchableOpacity>

          </View>

        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#ffffff',
  },

  container: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd7ca',

    paddingHorizontal: 20,
    paddingVertical: 14,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    ...(Platform.OS === 'web'
      ? {
          minHeight: 82,
        }
      : {
          minHeight: 72,
        }),
  },

  left: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },

  logo: {
    width: 46,
    height: 46,
    resizeMode: 'contain',
    marginRight: 14,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  mobileTitleRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  title: {
    fontSize: Platform.OS === 'web' ? 18 : 20,
    fontWeight: '700',
    color: '#232323',
  },

  badge: {
    marginLeft: Platform.OS === 'web' ? 10 : 0,
    marginTop: Platform.OS === 'web' ? 0 : 6,

    backgroundColor: '#F2E4AE',

    borderRadius: 5,

    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#444',
  },

  subtitle: {
    marginTop: 5,

    color: '#666',

    fontSize: Platform.OS === 'web' ? 13 : 12,

    flexShrink: 1,

    flexWrap:'wrap',
    
  },

  rightDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
  },

  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',

    marginRight: 16,
  },

  logout: {
    borderWidth: 1,
    borderColor: '#d8d8d8',

    borderRadius: 8,

    paddingHorizontal: 16,
    paddingVertical: 8,

    marginRight: 16,

    backgroundColor: '#fff',
  },

  logoutText: {
    color: '#222',
    fontWeight: '600',
    fontSize: 14,
  },

  profile: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },

  rightMobile: {
    alignItems: 'center',
    justifyContent: 'center'
  },

  usernameMobile: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#222',

    maxWidth: 90,
  },

  logoutMobile: {
    marginTop: 8,

    backgroundColor: colors.olive,

    borderRadius: 8,

    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  logoutMobileText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
});