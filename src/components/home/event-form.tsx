import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/app-button';
import { ModalSheet, modalStyles } from '@/components/ui/modal-sheet';
import { MonthPicker } from '@/components/ui/month-picker';
import { TextField } from '@/components/ui/text-field';
import type { TabIcon } from '@/constants/tabs';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createEvent } from '@/db/repositories/events';
import type { EventType } from '@/db/types';
import { formatDay, todayStr } from '@/lib/date';
import { parseAmount } from '@/lib/format';

interface EventFormProps {
  visible: boolean;
  /** 打开时默认选中的事件类型。 */
  initialType?: EventType | null;
  /** 打开时默认日期；不传则取今天。 */
  date?: string;
  onClose: () => void;
  onSaved: () => void;
}

interface EventOption {
  type: EventType;
  label: string;
  icon: TabIcon;
  placeholder: string;
}

const EVENT_OPTIONS: EventOption[] = [
  {
    type: 'expense',
    label: '记消费',
    icon: { ios: 'dollarsign', android: 'attach_money', web: 'attach_money' },
    placeholder: '填写消费内容',
  },
  {
    type: 'shopping',
    label: '记购物',
    icon: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
    placeholder: '填写购买物品',
  },
  {
    type: 'meal',
    label: '记好饭',
    icon: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
    placeholder: '填写吃了什么',
  },
];

const CIRCLE_SIZE = 68;

function optionOf(type: EventType): EventOption {
  return EVENT_OPTIONS.find((option) => option.type === type) ?? EVENT_OPTIONS[0];
}

/**
 * 记录事件的综合弹窗：顶部三个黑白圆形图标切换消费 / 购物 / 好饭。
 * 只有内容必填；金额可留空、可以带小数；日期默认今天，可点日期行修改。
 */
export function EventForm({ visible, initialType, date, onClose, onSaved }: EventFormProps) {
  const theme = useTheme();
  const [selectedType, setSelectedType] = useState<EventType>(initialType ?? 'expense');
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [formDate, setFormDate] = useState(date ?? todayStr());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedType(initialType ?? 'expense');
    setTitle('');
    setAmountText('');
    setNote('');
    setFormDate(date ?? todayStr());
    setPickerOpen(false);
    setError(null);
    setBusy(false);
  }, [visible, initialType, date]);

  const selected = optionOf(selectedType);

  const handleSave = async () => {
    setError(null);
    if (title.trim().length === 0) {
      setError('请填写事件内容');
      return;
    }
    const amount = parseAmount(amountText);
    if (amount === null && amountText.trim().length > 0) {
      setError('金额只能填数字，可以用小数点');
      return;
    }
    setBusy(true);
    try {
      await createEvent({
        type: selectedType,
        title,
        note,
        amount,
        date: formDate,
      });
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ModalSheet
        visible={visible}
        title="记事件"
        onClose={onClose}
        footer={
          <View style={modalStyles.actionsRow}>
            <AppButton label="取消" variant="secondary" onPress={onClose} />
            <AppButton
              label={busy ? '保存中…' : '保存'}
              accessibilityLabel="保存事件"
              onPress={handleSave}
              disabled={busy}
            />
          </View>
        }>
        <View style={modalStyles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            类型
          </ThemedText>
          <View style={styles.typeRow}>
            {EVENT_OPTIONS.map((option) => {
              const active = option.type === selectedType;
              return (
                <Pressable
                  key={option.type}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setSelectedType(option.type);
                    setError(null);
                  }}
                  style={({ pressed }) => [
                    styles.typeCircle,
                    { backgroundColor: active ? theme.text : theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <SymbolView
                    name={option.icon}
                    size={22}
                    tintColor={active ? theme.background : theme.text}
                  />
                  <ThemedText
                    style={[
                      styles.typeLabel,
                      { color: active ? theme.background : theme.text },
                    ]}>
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={modalStyles.field}>
          <TextField
            label="内容"
            value={title}
            onChangeText={setTitle}
            placeholder={selected.placeholder}
            accessibilityLabel="内容"
            autoFocus
            maxLength={120}
          />
        </View>

        <View style={modalStyles.field}>
          <ThemedText type="small" themeColor="textSecondary">
            日期
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`选择日期 ${formDate}`}
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => [
              styles.dateRow,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small">{formatDay(formDate)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              修改 ›
            </ThemedText>
          </Pressable>
        </View>

        <View style={modalStyles.field}>
          <TextField
            label="金额（选填）"
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="decimal-pad"
            placeholder="例如：12.5"
            accessibilityLabel="金额"
          />
        </View>

        <View style={modalStyles.field}>
          <TextField
            label="备注（选填）"
            value={note}
            onChangeText={setNote}
            placeholder="补充说明"
            accessibilityLabel="备注"
            maxLength={200}
          />
        </View>

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </ModalSheet>

      <MonthPicker
        visible={pickerOpen}
        value={formDate}
        onClose={() => setPickerOpen(false)}
        onSelect={(selectedDate) => {
          setFormDate(selectedDate);
          setPickerOpen(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  typeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  typeCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    minHeight: 42,
  },
  error: {
    color: '#D64545',
    fontSize: 12,
  },
  pressed: {
    opacity: 0.7,
  },
});