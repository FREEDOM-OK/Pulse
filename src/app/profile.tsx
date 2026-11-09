import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { WheelPicker } from '@/components/ui/wheel-picker';
import { ModuleColors, Spacing } from '@/constants/theme';
import { getProfile, saveProfile } from '@/db/repositories/profile';
import {
  PROFILE_GENDERS,
  PROFILE_GENDER_LABELS,
  type ProfileGender,
} from '@/db/types';
import { persistAvatar, pickAvatarImage } from '@/lib/avatar';
import { composeBirthday, splitBirthday } from '@/lib/profile';
import { useTheme } from '@/hooks/use-theme';

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('用户');
  const [gender, setGender] = useState<ProfileGender>('secret');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // 生日改成三列滚轮（PRDv1.2.2 第 6.2 节）。
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [draftBirthday, setDraftBirthday] = useState({ year: '', month: '', day: '' });

  const nowYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () =>
      Array.from({ length: nowYear - 1939 }, (_, index) => nowYear - index).map((value) => ({
        value: String(value),
        label: `${value} 年`,
      })),
    [nowYear]
  );
  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => index + 1).map((value) => ({
      value: String(value).padStart(2, '0'),
      label: `${value} 月`,
    })),
    []
  );
  const draftDayCount = useMemo(() => {
    const y = Number(draftBirthday.year);
    const m = Number(draftBirthday.month);
    if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1900 || m < 1) return 31;
    return new Date(y, m, 0).getDate();
  }, [draftBirthday.year, draftBirthday.month]);
  const dayOptions = useMemo(
    () =>
      Array.from({ length: draftDayCount }, (_, index) => index + 1).map((value) => ({
        value: String(value).padStart(2, '0'),
        label: `${value} 日`,
      })),
    [draftDayCount]
  );

  const openBirthday = () => {
    const fallbackYear = year || String(nowYear - 20);
    const fallbackMonth = month || '01';
    const fallbackDay = day || '01';
    setDraftBirthday({ year: fallbackYear, month: fallbackMonth, day: fallbackDay });
    setBirthdayOpen(true);
  };

  const confirmBirthday = () => {
    setYear(draftBirthday.year);
    setMonth(draftBirthday.month);
    setDay(draftBirthday.day);
    setBirthdayOpen(false);
  };

  const birthdayLabel = year && month && day ? `${year} 年 ${month} 月 ${day} 日` : '选填';

  useEffect(() => {
    getProfile()
      .then((profile) => {
        setName(profile.name);
        setGender(profile.gender);
        const birthday = splitBirthday(profile.birthday);
        setYear(birthday.year);
        setMonth(birthday.month);
        setDay(birthday.day);
        setAvatarUri(profile.avatarUri);
      })
      .catch(() => setError('读取个人资料失败'))
      .finally(() => setLoading(false));
  }, []);

  const handlePickAvatar = async () => {
    setError(null);
    try {
      const picked = await pickAvatarImage();
      if (!picked) return;
      setAvatarUri(await persistAvatar(picked));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '选择照片失败');
    }
  };

  const handleSave = async () => {
    setError(null);
    const birthday = composeBirthday({ year, month, day });
    if (!birthday.ok) {
      setError(birthday.message);
      return;
    }
    setBusy(true);
    try {
      const result = await saveProfile({
        name,
        gender,
        birthday: birthday.value,
        avatarUri,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.back();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarBlock}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="更换头像"
            onPress={() => {
              handlePickAvatar().catch(() => undefined);
            }}
            style={[styles.avatar, { backgroundColor: theme.backgroundElement }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                选择照片
              </ThemedText>
            )}
          </Pressable>
        </View>

        {error ? (
          <ThemedView type="backgroundElement" style={styles.errorBox}>
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          </ThemedView>
        ) : null}

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          用户名
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.group}>
          <TextInput
            value={name}
            onChangeText={setName}
            maxLength={16}
            accessibilityLabel="用户名"
            placeholder="用户"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text }]}
          />
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          性别
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.group}>
          <View style={styles.chipRow}>
            {PROFILE_GENDERS.map((option) => {
              const active = gender === option;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  accessibilityLabel={PROFILE_GENDER_LABELS[option]}
                  onPress={() => setGender(option)}
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: active ? theme.text : theme.background },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="small"
                    style={{ color: active ? theme.background : theme.text }}>
                    {PROFILE_GENDER_LABELS[option]}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          生日
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.group}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`生日 ${birthdayLabel}`}
            onPress={openBirthday}
            style={({ pressed }) => [styles.birthdayButton, pressed && styles.pressed]}>
            <ThemedText type="small" themeColor={year && month && day ? 'text' : 'textSecondary'}>
              {birthdayLabel}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ›
            </ThemedText>
          </Pressable>
        </ThemedView>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="保存个人资料"
          disabled={busy}
          onPress={() => {
            handleSave().catch(() => undefined);
          }}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.pressed,
            busy && styles.disabled,
          ]}>
          <ThemedText type="small" style={styles.saveText}>
            {busy ? '保存中…' : '保存'}
          </ThemedText>
        </Pressable>
      </ScrollView>

      <BottomSheet visible={birthdayOpen} onClose={() => setBirthdayOpen(false)} heightRatio={0.5}>
        <ThemedText type="smallBold" style={styles.sheetTitle}>
          生日
        </ThemedText>
        <WheelPicker
          columns={[
            { key: 'year', options: yearOptions },
            { key: 'month', options: monthOptions },
            { key: 'day', options: dayOptions },
          ]}
          value={draftBirthday}
          onChange={(next) =>
            setDraftBirthday((current) => {
              const day = next.day ?? current.day;
              const limit = (() => {
                const y = Number(next.year ?? current.year);
                const m = Number(next.month ?? current.month);
                return Number.isFinite(y) && Number.isFinite(m) ? new Date(y, m, 0).getDate() : 31;
              })();
              return {
                year: next.year ?? current.year,
                month: next.month ?? current.month,
                day: Number(day) > limit ? String(limit).padStart(2, '0') : day,
              };
            })
          }
        />
        <View style={styles.sheetActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setBirthdayOpen(false)}
            style={({ pressed }) => [styles.sheetButton, pressed && styles.pressed]}>
            <ThemedText type="small">取消</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={confirmBirthday}
            style={({ pressed }) => [
              styles.sheetButton,
              { backgroundColor: theme.text },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="small" style={{ color: theme.background }}>
              确定
            </ThemedText>
          </Pressable>
        </View>
      </BottomSheet>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
  },
  avatarBlock: {
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  sectionLabel: {
    marginTop: Spacing.three,
    marginBottom: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  group: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  birthdayButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sheetTitle: {
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.two,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  sheetButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    paddingVertical: Spacing.two,
    minHeight: 40,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.five,
  },
  birthdayRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  birthdayInput: {
    flex: 1,
    // Web 上 <input> 默认 size=20，min-content 约 188px，minWidth 必须是 0 才能被 flex 压缩
    minWidth: 0,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: 15,
    textAlign: 'center',
    minHeight: 40,
  },
  saveButton: {
    marginTop: Spacing.four,
    backgroundColor: ModuleColors.events,
    borderRadius: Spacing.three,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  saveText: {
    color: '#ffffff',
    fontWeight: 700,
  },
  errorBox: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  errorText: {
    color: '#D64545',
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});