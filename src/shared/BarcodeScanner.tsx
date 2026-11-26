import React, { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../config';
import { clipScan, getAppConfig } from './appConfig';

/**
 * Full-screen camera that reads one barcode or QR code and hands back its
 * text. Covers what turns up on a warehouse shelf: FNSKU / UPC / EAN product
 * labels, courier tracking barcodes, and Amazon FBA box labels.
 *
 * Scanning starts a moment after the camera appears, so there is time to aim:
 * read at once, it picked up whatever barcode was in view on the way. How long,
 * and how much of a long code reaches the search box, are set on the portal's
 * App settings page (appConfig).
 */

export function BarcodeScanner({ visible, onScanned, onClose }: {
  visible: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  // The camera reports the same code many times a second; take the first.
  const done = useRef(false);
  const [armed, setArmed] = useState(false);
  const granted = Boolean(permission?.granted);

  // The aiming delay restarts every time the camera is shown.
  useEffect(() => {
    setArmed(false);
    if (!visible || !granted) return;
    const timer = setTimeout(() => setArmed(true), getAppConfig().scanDelaySeconds * 1000);
    return () => clearTimeout(timer);
  }, [visible, granted]);

  useEffect(() => {
    if (!visible) return;
    done.current = false;
    let closed = false;
    // Ask once per opening. Not tied to `permission`: a denial changes it, which would ask again at once.
    getPermission().then((p) => {
      if (!closed && !p.granted && p.canAskAgain) requestPermission();
    });
    // Coming back from Settings: pick up a permission allowed there.
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') getPermission();
    });
    return () => {
      closed = true;
      sub.remove();
    };
  }, [visible, getPermission, requestPermission]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['code128', 'code39', 'code93', 'ean13', 'ean8', 'upc_a', 'upc_e', 'itf14', 'codabar', 'qr', 'datamatrix', 'pdf417'],
            }}
            // No handler until armed: the camera does not read codes at all before then.
            onBarcodeScanned={!armed ? undefined : ({ data }) => {
              const code = (data ?? '').trim();
              if (done.current || !code) return;
              done.current = true;
              onScanned(clipScan(code));
            }}
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.message}>
              {permission && !permission.canAskAgain
                ? 'Camera access is turned off for this app. Allow it in Settings to scan.'
                : 'Allow camera access to scan barcodes.'}
            </Text>
            <Pressable
              style={styles.button}
              onPress={() => (permission && !permission.canAskAgain ? Linking.openSettings() : requestPermission())}
            >
              <Text style={styles.buttonText}>{permission && !permission.canAskAgain ? 'Open Settings' : 'Allow camera'}</Text>
            </Pressable>
          </View>
        )}

        {permission?.granted && (
          <View style={styles.overlay} pointerEvents="none">
            <View style={[styles.frame, armed && styles.frameArmed]} />
            <Text style={styles.hint}>{armed ? 'Scanning: point at a barcode or QR code' : 'Get ready…'}</Text>
          </View>
        )}

        <Pressable style={styles.close} onPress={onClose} hitSlop={12}>
          <Text style={styles.closeText}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  message: { color: '#fff', fontSize: 16, textAlign: 'center' },
  button: { backgroundColor: colors.navy, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 16 },
  frame: { width: '78%', aspectRatio: 1.6, borderWidth: 3, borderColor: '#fff', borderRadius: 12 },
  frameArmed: { borderColor: '#22c55e' },
  hint: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center', paddingHorizontal: 24, textShadowColor: '#000', textShadowRadius: 4 },
  close: { position: 'absolute', top: 48, right: 20, backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  closeText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
