import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';

import { colors, radii } from '../theme/theme';

const TABS = [
  'members',
  'journal',
  'invites',
];

const LABELS = {
  members: 'Участники',
  journal: 'Журнал',
  invites: 'Приглашения',
};

export default function TreeTabs({
  activeTab,
  onChange,
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {TABS.map(tab => {
          const active = activeTab === tab;

          return (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.9}
              style={[
                styles.tab,
                active && styles.activeTab,
              ]}
              onPress={() => onChange(tab)}
            >
              <Text
                style={[
                  styles.text,
                  active && styles.activeText,
                ]}
              >
                {LABELS[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({

  wrapper: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: colors.cream,
  },

  container: {
    flexDirection: 'row',

    backgroundColor: '#ECE6D7',

    borderRadius: 999,

    padding: 5,
  },

  tab: {
    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 11,

    borderRadius: 999,
  },

  activeTab: {
    backgroundColor: colors.olive,

    shadowColor: '#000',

    shadowOpacity: 0.12,

    shadowRadius: 6,

    elevation: 3,
  },

  text: {
    fontSize: 14,

    fontWeight: '600',

    color: colors.ink,

    opacity: 0.65,
  },

  activeText: {
    color: colors.white,

    opacity: 1,

    fontWeight: '700',
  },

});