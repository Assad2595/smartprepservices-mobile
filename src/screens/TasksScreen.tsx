import React, { useCallback, useLayoutEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api, errorMessage } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { colors } from '../config';
import { dateLabel } from '../shared/format';
import { Card, FilterChips, HeaderAction, SearchInput, StatusBadge } from '../shared/ui';
import { showAlert } from '../shared/alert';

type Filter = 'MINE' | 'OPEN' | 'PENDING' | 'IN_PROGRESS' | 'DONE';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'MINE', label: 'Mine' },
  { key: 'OPEN', label: 'All open' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'DONE', label: 'Done' },
];

const PRIORITY_COLOR: Record<string, string> = {
  HIGH: colors.danger,
  NORMAL: colors.muted,
  LOW: '#94A3B8',
};

/**
 * The to-do list. Opens on "Mine" — what am I supposed to be doing — since
 * that is the question a phone in the warehouse is answering. The whole
 * point is marking things done, so that is a single tap on the row rather
 * than a form.
 */
export function TasksScreen() {
  const nav = useNavigation<any>();
  const { can, user } = useAuth();
  // Compared numerically: the session may carry the id as a string.
  const myId = user?.id != null ? Number(user.id) : null;
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>('MINE');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [moving, setMoving] = useState<number | null>(null);

  useLayoutEffect(() => {
    nav.setOptions({
      headerRight: () => (can('tasks.create') ? <HeaderAction title="+ Add" onPress={() => nav.navigate('TaskForm')} /> : null),
    });
  }, [nav, can]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const params: Record<string, string> = { search: search || '' };
      if (filter === 'MINE') params.mine = '1';
      else params.status = filter;
      const res = await api.get('/tasks', { params });
      setItems(res.data.data || []);
    } catch (e: any) {
      showAlert('Could not load tasks', errorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [filter, search]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Editors may move any task; the assignee may move their own. Mirrors the
  // server, which refuses everyone else.
  const mayMove = (task: any) => Number(task.assigned_to_id) === myId || can('tasks.edit');

  const setStatus = async (task: any, status: string) => {
    setMoving(task.id);
    try {
      const res = await api.post(`/tasks/${task.id}/status`, { status });
      // Replace in place rather than reloading, so the list does not jump
      // under the thumb that just tapped it.
      setItems((current) => current.map((t) => (t.id === task.id ? res.data.data : t)));
    } catch (e: any) {
      showAlert('Could not update task', errorMessage(e));
    } finally {
      setMoving(null);
    }
  };

  const today = new Date(new Date().toDateString());

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <SearchInput value={search} onChangeText={setSearch} onSubmit={load} placeholder="Search tasks…" />
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      <FlatList
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        data={items}
        keyExtractor={(i) => String(i.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filter === 'MINE' ? 'Nothing assigned to you. Nice.' : 'No tasks here.'}
          </Text>
        }
        renderItem={({ item }) => {
          const done = item.status === 'DONE';
          const overdue = !done && item.due_at && new Date(item.due_at) < today;
          const mine = Number(item.assigned_to_id) === myId;

          return (
            <Card onPress={() => nav.navigate('TaskForm', { id: item.id })}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, done && styles.titleDone]}>{item.title}</Text>
                  <Text style={styles.meta}>
                    {item.assignee ? (mine ? 'You' : item.assignee.name) : 'Unassigned'}
                    {item.shipment?.reference_code ? ` · ${item.shipment.reference_code}` : ''}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              {item.description ? (
                <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
              ) : null}

              <View style={styles.rowBottom}>
                <Text style={[styles.metaSmall, { color: PRIORITY_COLOR[item.priority] || colors.muted }]}>
                  {item.priority}
                  {item.due_at ? ` · due ${dateLabel(item.due_at)}` : ''}
                  {overdue ? ' · OVERDUE' : ''}
                </Text>

                {mayMove(item) && (
                  <View style={styles.actions}>
                    {item.status === 'PENDING' && (
                      <Pressable style={[styles.btn, styles.btnStart]} disabled={moving === item.id} onPress={() => setStatus(item, 'IN_PROGRESS')}>
                        <Text style={styles.btnStartText}>Start</Text>
                      </Pressable>
                    )}
                    {!done && (
                      <Pressable style={[styles.btn, styles.btnDone]} disabled={moving === item.id} onPress={() => setStatus(item, 'DONE')}>
                        <Text style={styles.btnDoneText}>Done</Text>
                      </Pressable>
                    )}
                    {done && (
                      <Pressable style={[styles.btn, styles.btnReopen]} disabled={moving === item.id} onPress={() => setStatus(item, 'PENDING')}>
                        <Text style={styles.btnReopenText}>Reopen</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 },
  title: { fontWeight: '700', color: colors.navy },
  titleDone: { textDecorationLine: 'line-through', color: colors.muted },
  meta: { color: '#64748b', marginTop: 4, fontSize: 13 },
  description: { color: '#475569', marginTop: 6, fontSize: 13 },
  metaSmall: { fontSize: 12, fontWeight: '600', flex: 1 },
  actions: { flexDirection: 'row', gap: 6 },
  btn: { borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1 },
  btnStart: { borderColor: '#D97706', backgroundColor: '#FFFBEB' },
  btnStartText: { color: '#B45309', fontWeight: '700', fontSize: 12 },
  btnDone: { borderColor: '#15803D', backgroundColor: '#F0FDF4' },
  btnDoneText: { color: '#15803D', fontWeight: '700', fontSize: 12 },
  btnReopen: { borderColor: colors.border, backgroundColor: '#fff' },
  btnReopenText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
});
