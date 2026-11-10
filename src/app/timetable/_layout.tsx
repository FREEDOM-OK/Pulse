import React from 'react';
import { Stack } from 'expo-router';
import { TimetableProvider } from '@/features/timetable/TimetableContext';

export default function TimetableLayout() {
  return (
    <TimetableProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </TimetableProvider>
  );
}
