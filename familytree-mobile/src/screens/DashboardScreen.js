import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';

import {
  listTrees,
  createTree,
  deleteTree,
} from '../api/trees';

import {
  cacheGet,
  cacheSet,
  cacheKeys,
} from '../services/offlineCache';

import { isNetworkError } from '../services/apiClient';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useAuthStore } from '../store/authStore';

import TreeCard from '../components/TreeCard';
import CreateTreeModal from '../components/CreateTreeModal';
import OfflineBanner from '../components/OfflineBanner';
import AppHeader from '../components/AppHeader';

import { colors, radii } from '../theme/theme';

export default function DashboardScreen({ navigation }) {
  const [trees, setTrees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const { isOnline, pendingCount, syncing } =
    useNetworkStatus();

  const logout = useAuthStore(s => s.logout);

  const load = useCallback(async () => {
    try {
      const data = await listTrees();

      setTrees(data);

      cacheSet(cacheKeys.treeList(), data);
    } catch (e) {
      if (isNetworkError(e)) {
        const cache = await cacheGet(cacheKeys.treeList());

        if (cache) {
          setTrees(cache.value);
        }
      } else {
        Alert.alert(
          'Ошибка',
          'Не удалось загрузить деревья'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async ({ name, privacy }) => {
  setShowCreate(false);

  try {
    const tree = await createTree({
      name,
      privacy,
    });

    setTrees(prev => [...prev, tree]);
  } catch {
    Alert.alert(
      'Ошибка',
      'Не удалось создать дерево'
    );
  }
};
  
  const handleDelete = async (tree) => {
  if (Platform.OS === 'web') {
    const ok = window.confirm(`Удалить дерево "${tree.name}"?`);

    if (!ok) return;

    try {
      await deleteTree(tree.id);

      setTrees(prev =>
        prev.filter(t => t.id !== tree.id)
      );
    } catch {
      Alert.alert(
        'Ошибка',
        'Не удалось удалить дерево'
      );
    }

    return;
  }

  Alert.alert(
    'Удалить дерево?',
    tree.name,
    [
      {
        text: 'Отмена',
        style: 'cancel',
      },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTree(tree.id);

            setTrees(prev =>
              prev.filter(t => t.id !== tree.id)
            );
          } catch {
            Alert.alert(
              'Ошибка',
              'Не удалось удалить дерево'
            );
          }
        },
      },
    ]
  );
};

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader onLogout={logout} />

        <ActivityIndicator
          size="large"
          color={colors.olive}
          style={{ marginTop: 60 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader onLogout={logout} />

      <OfflineBanner
        isOnline={isOnline}
        syncing={syncing}
        pendingCount={pendingCount}
      />

      <View style={styles.topBar}>
        <Text style={styles.title}>
          Мои деревья
        </Text>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreate(true)}
        >
          <Text style={styles.createText}>
            + Создать дерево
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trees}
        keyExtractor={item => String(item.id)}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load();
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            У вас пока нет деревьев
          </Text>
        }
        renderItem={({ item }) => (
          <TreeCard
            tree={item}
            onPress={() =>
              navigation.navigate('TreeGraph', {
                treeId: item.id,
                treeName: item.name,
              })
            }
            onDelete={() => {
  console.log('DELETE CLICKED');
  handleDelete(item);
}}
          />
        )}
      />

      <CreateTreeModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: colors.cream,
  },

  topBar: {
    flexDirection: Platform.OS === 'web'
      ? 'row'
      : 'column',

    justifyContent: 'space-between',

    alignItems: Platform.OS === 'web'
      ? 'center'
      : 'flex-start',

    paddingHorizontal: 22,

    paddingTop: 24,

    paddingBottom: 18,
  },

  title: {
    fontSize: Platform.OS === 'web'
      ? 34
      : 28,

    fontWeight: '700',

    color: colors.ink,

    marginBottom:
      Platform.OS === 'web'
        ? 0
        : 16,
  },

  createButton: {
    backgroundColor: colors.olive,

    borderRadius: radii.sm,

    paddingHorizontal: 18,

    paddingVertical: 12,

    alignSelf:
      Platform.OS === 'web'
        ? 'auto'
        : 'stretch',

    alignItems: 'center',
  },

  createText: {
    color: '#fff',

    fontWeight: '700',

    fontSize: 14,
  },

  list: {
    paddingHorizontal: 18,
    paddingBottom: 30,
  },

  empty: {
    textAlign: 'center',
    marginTop: 70,
    opacity: .5,
    color: colors.ink,
    fontSize: 15,
  },

});