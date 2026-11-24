import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, errorMessage } from '../api/client';
import { colors } from '../config';
import { dateLabel } from '../shared/format';
import { showAlert } from '../shared/alert';
import { EmptyRow, FormField, PrimaryButton } from '../shared/ui';

/** What the API returns per product (ProductStockService::summary). */
export type Stock = {
  expected: number;
  in_warehouse: number;
  preparing: number;
  shipped: number;
  damaged: number;
  received: number;
  adjusted: number;
};

export type HistoryEntry = {
  date?: string | null;
  kind: 'in' | 'out' | 'expected' | 'adjusted';
  text: string;
  detail?: string | null;
  by?: string | null;
  shipment_id?: number | null;
  reference_code?: string | null;
  direction_label?: string | null;
};

export const NO_STOCK: Stock = { expected: 0, in_warehouse: 0, preparing: 0, shipped: 0, damaged: 0, received: 0, adjusted: 0 };

/** One figure with its caption. `strong` is the headline number (In warehouse). */
function Tile({ value, label, tone, strong }: { value: number; label: string; tone?: 'bad'; strong?: boolean }) {
  return (
    <View style={[styles.tile, strong && styles.tileStrong]}>
      <Text style={[styles.tileValue, strong && styles.tileValueStrong, tone === 'bad' && value > 0 && { color: colors.danger }, value === 0 && !strong && { color: colors.muted }]}>
        {value}
      </Text>
      <Text style={[styles.tileLabel, strong && { color: 'rgba(255,255,255,0.8)' }]}>{label}</Text>
    </View>
  );
}

/** The product's stock as tiles: the same figures as the web Inventory. */
export function StockTiles({ stock, freeToSend }: { stock?: Stock | null; freeToSend?: number }) {
  const s = stock ?? NO_STOCK;
  return (
    <View>
      <View style={styles.row}>
        <Tile strong value={s.in_warehouse} label="In warehouse" />
        <Tile value={s.received} label="Total received" />
      </View>
      <View style={styles.row}>
        <Tile value={s.preparing} label="Preparing" />
        <Tile value={s.shipped} label="Shipped" />
        <Tile value={s.expected} label="On the way" />
      </View>
      {(s.damaged > 0 || freeToSend !== undefined) && (
        <View style={styles.row}>
          {freeToSend !== undefined && <Tile value={freeToSend} label="Free to send" />}
          {s.damaged > 0 && <Tile value={s.damaged} label="Damaged" tone="bad" />}
        </View>
      )}
    </View>
  );
}

/** Compact stock line for a list row: "In warehouse 251 · Preparing 0". */
export function StockLine({ stock }: { stock?: Stock | null }) {
  const s = stock ?? NO_STOCK;
  return (
    <View style={styles.line}>
      <Text style={[styles.lineMain, s.in_warehouse === 0 && { color: colors.muted }]}>{s.in_warehouse}</Text>
      <Text style={styles.lineLabel}>in warehouse</Text>
      {s.preparing > 0 && <Text style={styles.lineExtra}>· {s.preparing} preparing</Text>}
      {s.expected > 0 && <Text style={styles.lineExtra}>· {s.expected} on the way</Text>}
      {s.damaged > 0 && <Text style={[styles.lineExtra, { color: colors.danger }]}>· {s.damaged} damaged</Text>}
    </View>
  );
}

const KIND_COLOR: Record<string, string> = { in: '#2563EB', out: colors.success, expected: colors.muted, adjusted: colors.amber };
const KIND_LABEL: Record<string, string> = { in: 'Received', out: 'Sent out', expected: 'Expected', adjusted: 'Adjusted' };

/** Where the units came from and went: receivings, shipments and count corrections. */
export function StockHistory({ entries, onOpenShipment }: { entries: HistoryEntry[]; onOpenShipment?: (id: number) => void }) {
  if (entries.length === 0) return <EmptyRow text="No stock movement yet." />;
  return (
    <View>
      {entries.map((e, i) => {
        const tint = KIND_COLOR[e.kind] ?? colors.muted;
        return (
          <View key={`${e.date}-${i}`} style={styles.hist}>
            <View style={[styles.histDot, { backgroundColor: tint }]} />
            <View style={{ flex: 1 }}>
              <View style={styles.histTop}>
                <Text style={[styles.histKind, { color: tint }]}>{KIND_LABEL[e.kind] ?? e.kind}</Text>
                <Text style={styles.histText}>{e.text}</Text>
              </View>
              <Text style={styles.histMeta}>
                {dateLabel(e.date, true)}
                {e.by ? ` · ${e.by}` : ''}
                {e.detail ? ` · ${e.detail}` : ''}
              </Text>
              {!!e.reference_code && (
                <Pressable disabled={!onOpenShipment || !e.shipment_id} onPress={() => e.shipment_id && onOpenShipment?.(e.shipment_id)}>
                  <Text style={styles.histLink}>
                    {e.reference_code}
                    {e.direction_label ? ` · ${e.direction_label}` : ''}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Count correction, as a sheet: add or take away units, with a note. Staff only
 * (products.adjust_stock); the server picks which inbound shipment the units go
 * on or come from, and refuses a correction it cannot make.
 */
export function AdjustStockSheet({
  productId,
  title,
  freeToSend,
  visible,
  onClose,
  onDone,
}: {
  productId: number | string;
  title: string;
  freeToSend: number;
  visible: boolean;
  onClose: () => void;
  onDone: (result: { stock: Stock; free_to_send: number; history: HistoryEntry[] }) => void;
}) {
  const [direction, setDirection] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const adding = direction === 'add';
  const units = Number(quantity);
  const valid = Number.isInteger(units) && units > 0;

  async function save() {
    if (!valid) return showAlert('Enter a quantity', 'How many units to add or take away?');
    setBusy(true);
    try {
      const res = await api.post(`/products/${productId}/stock-adjustments`, {
        direction,
        quantity: units,
        note: note.trim() || undefined,
      });
      setQuantity('');
      setNote('');
      onDone(res.data.data);
      onClose();
    } catch (e) {
      showAlert('Stock not adjusted', errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHead}>
            <Text style={styles.sheetTitle}>Adjust stock</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.sheetClose}>Close</Text>
            </Pressable>
          </View>
          <Text style={styles.sheetSub} numberOfLines={2}>{title}</Text>

          <View style={styles.seg}>
            {(['add', 'subtract'] as const).map((d) => (
              <Pressable key={d} onPress={() => setDirection(d)} style={[styles.segBtn, direction === d && styles.segBtnOn]}>
                <Text style={[styles.segText, direction === d && styles.segTextOn]}>{d === 'add' ? 'Add units' : 'Take away'}</Text>
              </Pressable>
            ))}
          </View>

          <FormField label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="number-pad" placeholder="e.g. 5" autoFocus />
          <FormField label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. counted 48, system said 50" maxLength={500} multiline />

          <Text style={styles.hint}>
            {adding
              ? 'Added units go on this product’s most recent inbound shipment in stock. With none, they are recorded on a new completed inbound shipment.'
              : `${freeToSend} free unit${freeToSend === 1 ? '' : 's'} can be taken away. Units already on an outbound shipment have to come off it first.`}
          </Text>

          <PrimaryButton title={adding ? 'Add to stock' : 'Take away'} onPress={save} busy={busy} disabled={!valid} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tile: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 10 },
  tileStrong: { backgroundColor: colors.navy, borderColor: colors.navy },
  tileValue: { fontSize: 22, fontWeight: '800', color: colors.navy },
  tileValueStrong: { fontSize: 28, color: '#fff' },
  tileLabel: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  line: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  lineMain: { fontSize: 18, fontWeight: '800', color: colors.navy },
  lineLabel: { fontSize: 12, color: colors.muted },
  lineExtra: { fontSize: 12, color: colors.muted },

  hist: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  histDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  histTop: { flexDirection: 'row', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' },
  histKind: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  histText: { fontWeight: '700', color: '#0F172A' },
  histMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  histLink: { color: colors.navy, fontSize: 12, fontWeight: '700', marginTop: 2 },

  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 28 },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  sheetClose: { color: colors.amber, fontWeight: '700' },
  sheetSub: { color: colors.muted, marginTop: 2, marginBottom: 14 },
  seg: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 10, padding: 3, marginBottom: 14 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center' },
  segBtnOn: { backgroundColor: '#fff' },
  segText: { fontWeight: '700', color: colors.muted },
  segTextOn: { color: colors.navy },
  hint: { color: colors.muted, fontSize: 12, marginBottom: 6 },
});
