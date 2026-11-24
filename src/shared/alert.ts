import { Alert, AlertButton, Platform } from 'react-native';

/**
 * Alert.alert is a no-op in react-native-web, which would make every error
 * message and every "are you sure?" silently disappear when testing in a
 * browser. Native keeps the real dialog; web falls back to window.alert /
 * window.confirm, mapping the cancel-styled button to "Cancel" and the other
 * to "OK".
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }

  const cancel = buttons.find((b) => b.style === 'cancel');
  const action = buttons.find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];

  if (window.confirm(`${text}\n\nOK → ${action.text ?? 'Confirm'}`)) {
    action.onPress?.();
  } else {
    cancel?.onPress?.();
  }
}
