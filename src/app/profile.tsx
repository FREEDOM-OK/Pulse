import { useEffect, useState } from 'react';
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
          <View style={styles.birthdayRow}>
            <TextInput
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              maxLength={4}
              accessibilityLabel="生日年份"
              placeholder="年"
              placeholderTextColor={theme.textSecondary}
              style={[styles.birthdayInput, { backgroundColor: theme.background, color: theme.text }]}
            />
            <TextInput
              value={month}
              onChangeText={setMonth}
              keyboardType="number-pad"
              maxLength={2}
              accessibilityLabel="生日月份"
              placeholder="月"
              placeholderTextColor={theme.textSecondary}
              style={[styles.birthdayInput, { backgroundColor: theme.background, color: theme.text }]}
            />
            <TextInput
              value={day}
              onChangeText={setDay}
              keyboardType="number-pad"
              maxLength={2}
              accessibilityLabel="生日日期"
              placeholder="日"
              placeholderTextColor={theme.textSecondary}
              style={[styles.birthdayInput, { backgroundColor: theme.background, color: theme.text }]}
            />
          </View>
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