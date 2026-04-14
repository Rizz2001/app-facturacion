/**
 * OfflineBanner.tsx — Banner animado de estado offline/sincronización.
 * Usa estado local para controlar la visibilidad (evita __getValue()).
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOffline } from '@/context/OfflineContext';
import { useTheme } from '@/context/ThemeContext';

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, syncPendingSales } = useOffline();
  const { colors: C } = useTheme();

  const slideAnim = useRef(new Animated.Value(-60)).current;
  const [isVisible, setIsVisible] = useState(false);

  const shouldShow = !isOnline || pendingCount > 0;

  useEffect(() => {
    if (shouldShow) {
      setIsVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: -60,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start(({ finished }) => {
        if (finished) setIsVisible(false);
      });
    }
  }, [shouldShow, slideAnim]);

  if (!isVisible) return null;

  const bgColor = !isOnline ? '#EF4444' : '#F59E0B';
  const iconName: React.ComponentProps<typeof Ionicons>['name'] = !isOnline
    ? 'cloud-offline-outline'
    : 'cloud-upload-outline';

  const message = !isOnline
    ? pendingCount > 0
      ? `Sin conexión · ${pendingCount} venta${pendingCount !== 1 ? 's' : ''} en cola`
      : 'Sin conexión a Internet'
    : `${pendingCount} venta${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''} · Listo para sincronizar`;

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: bgColor },
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Ionicons name={iconName} size={15} color="#fff" />
      <Text style={styles.text} numberOfLines={1}>{message}</Text>
      {pendingCount > 0 && isOnline && (
        <TouchableOpacity
          style={styles.syncBtn}
          onPress={syncPendingSales}
          disabled={isSyncing}
          activeOpacity={0.75}
        >
          <Ionicons
            name={isSyncing ? 'reload-outline' : 'cloud-upload-outline'}
            size={13}
            color="#fff"
          />
          <Text style={styles.syncText}>{isSyncing ? 'Sync...' : 'Sincronizar'}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    zIndex: 999,
  },
  text: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  syncText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
