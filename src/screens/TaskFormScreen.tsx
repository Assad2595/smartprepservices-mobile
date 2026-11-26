import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../config';
import { FormField, PickerField, PrimaryButton, Section } from '../shared/ui';
import { showAlert } from '../shared/alert';

const PRIORITY_LABEL: Record<string, string> = { LOW: 'Low', NORMAL: 'Normal', HIGH: 'High' };
const STATUS_LABEL: Record<string, string> = { PENDING: 'Pending', IN_PROGRESS: 'In progress', DONE: 'Done' };

/**
 * Create or edit a task. One screen for both — the fields are identical.
 * Opened with { id } it edits; without, it creates.
 */
export function TaskFormScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const { user, can } = useAuth();
  const id: number | undefined = route.params?.id;
  const editing = Boolean(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Defaults to whoever is raising it: most tasks are notes to self.
  const [assignedTo, setAssignedTo] = useState<number | null>(user?.id != null ? Number(user.id) : null);
  const [shipmentId, setShipmentId] = useState<number | null>(route.params?.shipmentId ?? null);
  const [priority, setPriority] = useState('NORMAL');
  const [status, setStatus] = useState('PENDING');
  const [dueAt, setDueAt] = useState('');

  const [assignees, setAssignees] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<string[]>(['LOW', 'NORMAL', 'HIGH']);
  const [statuses, setStatuses] = useState<string[]>(['PENDING', 'IN_PROGRESS', 'DONE']);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useLayoutEffect(() => {
    nav.setOptions({ title: editing ? 'Edit task' : 'New task' });
  }, [nav, editing]);

  useEffect(() => {
    (async () => {
      try {
        const [opts, task] = await Promise.all([
          api.get('/tasks/options'),
          editing ? api.get(`/tasks/${id}`) : Promise.resolve(null),
        ]);
        setAssignees(opts.data.assignees || []);
        setShipments(opts.data.shipments || []);
        if (opts.data.priorities) setPriorities(opts.data.priorities);
        if (opts.data.statuses) setStatuses(opts.data.statuses);

        if (task) {
          const t = task.data.data;
          setTitle(t.title || '');
          setDescription(t.description || '');
          setAssignedTo(t.assigned_to_id ?? null);
          setShipmentId(t.shipment_id ?? null);
          setPriority(t.priority || 'NORMAL');
          setStatus(t.status || 'PENDING');
          setDueAt(t.due_at ? String(t.due_at).slice(0, 10) : '');
        }
      } catch (e: any) {
        showAlert('Could not load', errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, editing]);

  const save = async () => {
    if (!title.trim()) {
      showAlert('Missing title', 'Give the task a name.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        assigned_to_id: assignedTo,
        shipment_id: shipmentId,
        priority,
        status,
        due_at: dueAt || null,
      };

      if (editing) await api.post(`/tasks/${id}`, payload);
      else await api.post('/tasks', payload);

      nav.goBack();
    } catch (e: any) {
      showAlert('Could not save', errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/tasks/${id}`);
      nav.goBack();
    } catch (e: any) {
      showAlert('Could not delete', errorMessage(e));
      setBusy(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><Text style={{ color: colors.muted }}>Loading…</Text></View>;
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Section title="Task">
        <FormField label="Task" value={title} onChangeText={setTitle} placeholder="e.g. Label the boxes on SP1004" autoFocus={!editing} />
        <FormField
          label="Details"
          value={description}
          onChangeText={setDescription}
          placeholder="Anything the person doing it needs to know"
          multiline
          numberOfLines={4}
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />
      </Section>

      <Section title="Who and when">
        <PickerField
          label="Assigned to"
          value={assignedTo}
          options={[
            { value: '', label: 'Unassigned' },
            ...assignees.map((a) => ({ value: a.id, label: a.id === user?.id ? `${a.name} (you)` : a.name })),
          ]}
          onChange={(v) => setAssignedTo(v === '' || v === null ? null : Number(v))}
        />
        <PickerField
          label="Shipment"
          value={shipmentId}
          options={[{ value: '', label: 'Not about a shipment' }, ...shipments.map((s) => ({ value: s.id, label: s.label }))]}
          onChange={(v) => setShipmentId(v === '' || v === null ? null : Number(v))}
          scannable
        />
        <PickerField
          label="Priority"
          value={priority}
          options={priorities.map((p) => ({ value: p, label: PRIORITY_LABEL[p] || p }))}
          onChange={(v) => setPriority(String(v))}
        />
        {/* Typed rather than a date picker: nothing in the app pulls in a
            native picker dependency, and a due date is short enough to type. */}
        <FormField label="Due (YYYY-MM-DD)" value={dueAt} onChangeText={setDueAt} placeholder="2026-09-30" autoCapitalize="none" />
        {editing && (
          <PickerField
            label="Status"
            value={status}
            options={statuses.map((s) => ({ value: s, label: STATUS_LABEL[s] || s }))}
            onChange={(v) => setStatus(String(v))}
          />
        )}
      </Section>

      <PrimaryButton title={editing ? 'Save task' : 'Create task'} onPress={save} busy={busy} />
      {editing && can('tasks.delete') && (
        <PrimaryButton title="Delete task" onPress={remove} busy={busy} variant="danger" />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
