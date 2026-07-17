import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Dimensions, Platform, ScrollView
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { fullTree } from '../api/trees';
import { createPerson } from '../api/persons';
import { createRelationship } from '../api/relationships';
import { isNetworkError } from '../services/apiClient';
import { cacheGet, cacheSet, cacheKeys } from '../services/offlineCache';
import { enqueue } from '../services/syncQueue';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { resolvePositions, canvasBounds, relationshipArgsFor } from '../utils/graphLayout';
import PersonNode from '../components/PersonNode';
import AddPersonModal from '../components/AddPersonModal';
import OfflineBanner from '../components/OfflineBanner';
import { colors, radii } from '../theme/theme';
import AppHeader from '../components/AppHeader';

const { width: SW } = Dimensions.get('window');
const clamp = (v, mn, mx) => Math.min(Math.max(v, mn), mx);

function WebCanvas({ canvasW, canvasH, children }) {
  return (
    <ScrollView
      horizontal
      style={{ flex: 1 }}
      contentContainerStyle={{ minWidth: canvasW }}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ width: canvasW, height: Math.max(canvasH, 600) }}
      >
        <View style={{ width: canvasW, height: Math.max(canvasH, 600) }}>
          {children}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

function NativeCanvas({ canvasW, canvasH, children, resetRef, zoomRef }) {
  const { Gesture, GestureDetector } = require('react-native-gesture-handler');
  const Animated = require('react-native-reanimated').default;
  const { useAnimatedStyle, useSharedValue, withTiming } = require('react-native-reanimated');

  const tx  = useSharedValue((SW - canvasW) / 2);
  const ty  = useSharedValue(40);
  const sc  = useSharedValue(0.85);
  const stx = useSharedValue(0);
  const sty = useSharedValue(0);
  const ssc = useSharedValue(1);

  const pan = Gesture.Pan()
    .minDistance(6)
    .onStart(() => { stx.value = tx.value; sty.value = ty.value; })
    .onUpdate(e => { tx.value = stx.value + e.translationX; ty.value = sty.value + e.translationY; });

  const pinch = Gesture.Pinch()
    .onStart(() => { ssc.value = sc.value; })
    .onUpdate(e => { sc.value = clamp(ssc.value * e.scale, 0.3, 3); });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: sc.value },
    ],
  }));

  resetRef.current = () => {
    tx.value = withTiming((SW - canvasW) / 2);
    ty.value = withTiming(40);
    sc.value = withTiming(0.85);
  };
  zoomRef.current = (f) => {
    sc.value = withTiming(clamp(sc.value * f, 0.3, 3));
  };

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View style={[{ width: canvasW, height: canvasH }, style]}>
          {children}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export default function TreeGraphScreen({ route, navigation }) {
  const { treeId, treeName } = route.params;
  const [persons, setPersons]             = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const { isOnline, pendingCount, syncing, refreshPendingCount } = useNetworkStatus();

  const resetRef = React.useRef(() => {});
  const zoomRef  = React.useRef(() => {});

  useEffect(() => {
    navigation.setOptions({ title: treeName || 'Древо' });
  }, [navigation, treeName]);

  const load = useCallback(async () => {
    try {
      const data = await fullTree(treeId);
      setPersons(data.persons);
      setRelationships(data.relationships);
      cacheSet(cacheKeys.fullTree(treeId), data);
    } catch (e) {
      if (isNetworkError(e)) {
        const c = await cacheGet(cacheKeys.fullTree(treeId));
        if (c) {
          setPersons(c.value.persons);
          setRelationships(c.value.relationships);
        }
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить дерево');
      }
    } finally {
      setLoading(false);
    }
  }, [treeId]);

  useEffect(() => { load(); }, [load]);

  const { positions } = useMemo(
    () => resolvePositions(persons, relationships),
    [persons, relationships]
  );
  const bounds  = useMemo(() => canvasBounds(positions), [positions]);
  const canvasW = bounds.maxX - bounds.minX;
  const canvasH = bounds.maxY - bounds.minY;

  const handleAdd = async ({ person, relation }) => {
    setShowAdd(false);
    setSaving(true);
    try {
      if (!isOnline) {
        await enqueue({ type: 'createPerson', treeId, payload: person });
        setPersons(p => [...p, { ...person, id: `local-${Date.now()}` }]);
        await refreshPendingCount();
        Alert.alert('Сохранено локально', 'Будет отправлено при появлении сети.');
        return;
      }
      const created = await createPerson(treeId, person);
      if (relation?.relatedToId) {
        const args = relationshipArgsFor(
          relation.relationType,
          created.id,
          Number(relation.relatedToId)
        );
        if (args) await createRelationship(treeId, args);
      }
      await load();
    } catch {
      Alert.alert('Ошибка', 'Не удалось добавить человека');
    } finally {
      setSaving(false);
    }
  };

  const lines = useMemo(() => relationships.map(r => {
    const f = positions[String(r.person_from)];
    const t = positions[String(r.person_to)];
    if (!f || !t) return null;
    return (
      <Line
        key={r.id}
        x1={f.x - bounds.minX} y1={f.y - bounds.minY}
        x2={t.x - bounds.minX} y2={t.y - bounds.minY}
        stroke={colors.creamLine}
        strokeWidth={r.relationship_type === 'spouse' ? 3 : 1.5}
        strokeDasharray={r.relationship_type === 'spouse' ? undefined : '4,4'}
      />
    );
  }), [relationships, positions, bounds]);

  const canvasContent = (
    <>
      <Svg
        width={canvasW}
        height={Math.max(canvasH, 600)}
        style={StyleSheet.absoluteFill}
      >
        {lines}
      </Svg>
      {persons.map(p => {
        const pos = positions[String(p.id)];
        if (!pos) return null;
        return (
          <PersonNode
            key={p.id}
            person={p}
            x={pos.x - bounds.minX}
            y={pos.y - bounds.minY}
            onTap={person => navigation.navigate('PersonProfile', { treeId, person })}
          />
        );
      })}
    </>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.olive} size="large" />
      </View>
    );
  }

  return (
  <View style={styles.container}>
    <AppHeader
      title={treeName}
      navigation={navigation}
      showBack
    />
      <OfflineBanner isOnline={isOnline} syncing={syncing} pendingCount={pendingCount} />

      {Platform.OS === 'web' ? (
        <WebCanvas canvasW={canvasW} canvasH={canvasH}>
          {canvasContent}
        </WebCanvas>
      ) : (
        <NativeCanvas
          canvasW={canvasW}
          canvasH={canvasH}
          resetRef={resetRef}
          zoomRef={zoomRef}
        >
          {canvasContent}
        </NativeCanvas>
      )}

      {persons.length === 0 && (
        <View style={styles.empty} pointerEvents="none">
          <Text style={styles.emptyTxt}>В этом дереве пока нет людей</Text>
          <Text style={styles.emptyHint}>Нажмите «＋ Добавить родственника»</Text>
        </View>
      )}

      {Platform.OS !== 'web' && (
        <View style={styles.zoom}>
          {[
            ['+', () => zoomRef.current(1.25)],
            ['−', () => zoomRef.current(0.8)],
            ['⤢', () => resetRef.current()],
          ].map(([lbl, fn]) => (
            <TouchableOpacity key={lbl} style={styles.zoomBtn} onPress={fn}>
              <Text style={styles.zoomTxt}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAdd(true)}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color={colors.white} />
          : <Text style={styles.fabTxt}>＋ Добавить родственника</Text>
        }
      </TouchableOpacity>

      <AddPersonModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={handleAdd}
        existingPersons={persons}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  empty:     { position: 'absolute', top: '40%', left: 0, right: 0, alignItems: 'center' },
  emptyTxt:  { color: colors.ink, opacity: 0.5, fontSize: 14, fontWeight: '600' },
  emptyHint: { color: colors.ink, opacity: 0.35, fontSize: 12, marginTop: 6 },
  zoom:      { position: 'absolute', right: 20, top: 180, gap: 8 },
  zoomBtn:   { width: 35, height: 35, borderRadius: radii.pill, backgroundColor: colors.creamLight, borderWidth: 1, borderColor: colors.creamBorder, alignItems: 'center', justifyContent: 'center' },
  zoomTxt:   { fontSize: 18, fontWeight: '700', color: colors.ink },
  fab:       { position: 'absolute', bottom: 24, alignSelf: 'center', backgroundColor: colors.olive, paddingVertical: 13, paddingHorizontal: 22, borderRadius: radii.pill, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  fabTxt:    { color: colors.white, fontWeight: '700', fontSize: 14 },
});