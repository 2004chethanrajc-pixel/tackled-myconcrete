import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { typography } from '../../theme/typography';
import { useTheme } from '../../context/ThemeContext';

export const SimpleDatePicker = ({ value, onChange, label, error, yearRange }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value || '');

  const currentYear = new Date().getFullYear();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const currentDay = new Date().getDate().toString().padStart(2, '0');

  // yearRange: { start, end } — defaults to current year ± 5 future years
  const yearStart = yearRange?.start ?? currentYear;
  const yearEnd = yearRange?.end ?? currentYear + 5;
  const years = Array.from(
    { length: Math.abs(yearEnd - yearStart) + 1 },
    (_, i) => Math.min(yearStart, yearEnd) + i
  );
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const [tempYear, setTempYear] = useState(currentYear.toString());
  const [tempMonth, setTempMonth] = useState(currentMonth);
  const [tempDay, setTempDay] = useState(currentDay);

  const getDaysInMonth = (year, month) => {
    return new Date(year, month, 0).getDate();
  };

  const days = Array.from(
    { length: getDaysInMonth(parseInt(tempYear), parseInt(tempMonth)) },
    (_, i) => (i + 1).toString().padStart(2, '0')
  );

  const handleConfirm = () => {
    // Ensure proper YYYY-MM-DD format
    const dateString = `${tempYear}-${tempMonth}-${tempDay}`;
    console.log('SimpleDatePicker - Selected date:', dateString);
    setSelectedDate(dateString);
    onChange(dateString);
    setShowPicker(false);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return 'Select Date';
    const [year, month, day] = dateStr.split('-');
    const monthName = months.find(m => m.value === month)?.label || month;
    return `${day} ${monthName} ${year}`;
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, error && styles.inputError]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[styles.inputText, !selectedDate && styles.placeholder]}>
          {formatDisplayDate(selectedDate)}
        </Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            
            <View style={styles.pickerRow}>
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Day</Text>
                <ScrollView style={styles.scrollPicker}>
                  {days.map(day => (
                    <TouchableOpacity
                      key={day}
                      style={[styles.pickerItem, tempDay === day && styles.pickerItemSelected]}
                      onPress={() => setTempDay(day)}
                    >
                      <Text style={[styles.pickerText, tempDay === day && styles.pickerTextSelected]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Month</Text>
                <ScrollView style={styles.scrollPicker}>
                  {months.map(month => (
                    <TouchableOpacity
                      key={month.value}
                      style={[styles.pickerItem, tempMonth === month.value && styles.pickerItemSelected]}
                      onPress={() => setTempMonth(month.value)}
                    >
                      <Text style={[styles.pickerText, tempMonth === month.value && styles.pickerTextSelected]}>
                        {month.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Year</Text>
                <ScrollView style={styles.scrollPicker}>
                  {years.map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.pickerItem, tempYear === year.toString() && styles.pickerItemSelected]}
                      onPress={() => setTempYear(year.toString())}
                    >
                      <Text style={[styles.pickerText, tempYear === year.toString() && styles.pickerTextSelected]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export const SimpleTimePicker = ({ value, onChange, label, error }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState(value || '');

  const currentHour = new Date().getHours().toString().padStart(2, '0');
  const currentMinute = new Date().getMinutes().toString().padStart(2, '0');

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const [tempHour, setTempHour] = useState(currentHour);
  const [tempMinute, setTempMinute] = useState(currentMinute);

  const handleConfirm = () => {
    // Ensure proper HH:MM:SS format
    const timeString = `${tempHour}:${tempMinute}:00`;
    console.log('SimpleTimePicker - Selected time:', timeString);
    setSelectedTime(timeString);
    onChange(timeString);
    setShowPicker(false);
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return 'Select Time';
    const [hour, minute] = timeStr.split(':');
    const hourNum = parseInt(hour);
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 || 12;
    return `${displayHour}:${minute} ${ampm}`;
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, error && styles.inputError]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[styles.inputText, !selectedTime && styles.placeholder]}>
          {formatDisplayTime(selectedTime)}
        </Text>
        <Text style={styles.icon}>🕐</Text>
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time</Text>
            
            <View style={styles.pickerRow}>
              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Hour</Text>
                <ScrollView style={styles.scrollPicker}>
                  {hours.map(hour => (
                    <TouchableOpacity
                      key={hour}
                      style={[styles.pickerItem, tempHour === hour && styles.pickerItemSelected]}
                      onPress={() => setTempHour(hour)}
                    >
                      <Text style={[styles.pickerText, tempHour === hour && styles.pickerTextSelected]}>
                        {hour}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.pickerColumn}>
                <Text style={styles.columnLabel}>Minute</Text>
                <ScrollView style={styles.scrollPicker}>
                  {minutes.map(minute => (
                    <TouchableOpacity
                      key={minute}
                      style={[styles.pickerItem, tempMinute === minute && styles.pickerItemSelected]}
                      onPress={() => setTempMinute(minute)}
                    >
                      <Text style={[styles.pickerText, tempMinute === minute && styles.pickerTextSelected]}>
                        {minute}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...typography.body,
    color: colors.text,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputError: {
    borderColor: colors.danger,
  },
  inputText: {
    ...typography.body,
    color: colors.text,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  icon: {
    fontSize: 20,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '70%',
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  columnLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  scrollPicker: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pickerItemSelected: {
    backgroundColor: colors.primary,
  },
  pickerText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  pickerTextSelected: {
    color: colors.surface,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  confirmButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});
