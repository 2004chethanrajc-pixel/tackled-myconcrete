import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  Alert, Animated, RefreshControl, ScrollView, Modal, ActivityIndicator, Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome5, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useUsers } from '../hooks';
import { usersApi } from '../api';
import { useAuth } from '../../../hooks/useAuth';
import { theme } from '../../../theme/theme';
import { useScrollPosition } from '../../../hooks/useScrollPosition';
import { Card, PrimaryButton, DangerButton, LoadingState, EmptyState } from '../../../components/common';
import AppHeader from '../../../components/common/AppHeader';
import BottomNavigation from '../../../components/common/BottomNavigation';
import { makeCall, sendEmail } from '../../../utils/contactUtils';
import { useTheme } from '../../../context/ThemeContext';

const { width } = Dimensions.get('window');

const UsersListScreen = ({ navigation, route }) => {
  const { user: currentUser } = useAuth();
  const { users, loading, refetch } = useUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [deactivating, setDeactivating] = useState(null);
  const [activating, setActivating] = useState(null);
  const [roleFilterValue, setRoleFilterValue] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [insightModalVisible, setInsightModalVisible] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const { scrollY, onScroll } = useScrollPosition();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const roleFilter = route.params?.role;
  const activeOnly = route.params?.activeOnly;
  const inactiveOnly = route.params?.inactiveOnly;

  const availableRoles = [
    { label: 'All Roles', value: '' },
    { label: 'Admins', value: 'admin' },
    { label: 'Project Managers', value: 'project_manager' },
    { label: 'Site Incharge', value: 'site_incharge' },
    { label: 'Finance', value: 'finance' },
    { label: 'Customers', value: 'customer' },
  ];

  const filteredUsers = users.filter((user) => {
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesRoleFilter = !roleFilterValue || user.role === roleFilterValue;
    const matchesActiveStatus =
      (!activeOnly && !inactiveOnly) ||
      (activeOnly && user.is_active) ||
      (inactiveOnly && !user.is_active);
    const matchesSearch =
      !searchQuery.trim() ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);
    return matchesRole && matchesRoleFilter && matchesActiveStatus && matchesSearch;
  });

  const canDeactivateUser = (user) => {
    if (user.role === 'super_admin') return false;
    if (user.role === 'admin' && currentUser?.role !== 'super_admin') return false;
    if (user.id === currentUser?.id) return false;
    if (!user.is_active) return false;
    return true;
  };

  const canActivateUser = (user) => {
    if (user.role === 'admin' && currentUser?.role !== 'super_admin') return false;
    if (user.is_active) return false;
    return true;
  };

  const handleDeactivateUser = (user) => {
    Alert.alert('Deactivate User', `Are you sure you want to deactivate ${user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate', style: 'destructive',
        onPress: async () => {
          try {
            setDeactivating(user.id);
            await usersApi.deactivateUser(user.id, 'Deactivated by admin');
            Alert.alert('Success', 'User deactivated successfully');
            refetch();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to deactivate user');
          } finally { setDeactivating(null); }
        },
      },
    ]);
  };

  const handleActivateUser = (user) => {
    Alert.alert('Activate User', `Are you sure you want to activate ${user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Activate', style: 'default',
        onPress: async () => {
          try {
            setActivating(user.id);
            await usersApi.activateUser(user.id);
            Alert.alert('Success', 'User activated successfully');
            refetch();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to activate user');
          } finally { setActivating(null); }
        },
      },
    ]);
  };

  const canEditUser = (user) => {
    if (currentUser?.role === 'super_admin' && user.role !== 'super_admin') return true;
    if (currentUser?.role === 'admin' && !['admin', 'super_admin'].includes(user.role)) return true;
    return false;
  };

  const openEditModal = (user) => {
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      date_of_joining: user.date_of_joining ? user.date_of_joining.split('T')[0] : '',
      date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '',
      city: user.city || '',
      current_address: user.current_address || '',
      permanent_address: user.permanent_address || '',
    });
    setInsightModalVisible(false);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.name?.trim()) { Alert.alert('Error', 'Name is required'); return; }
    try {
      setSavingEdit(true);
      const res = await usersApi.updateUserDetails(selectedUser.id, editForm);
      const updated = res.data?.user || res.user;
      setSelectedUser({ ...selectedUser, ...updated });
      setShowEditModal(false);
      setInsightModalVisible(true);
      refetch();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refetch(); } catch (e) { console.error(e); } finally { setRefreshing(false); }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: '#FF6B6B', 
      super_admin: '#4ECDC4', 
      project_manager: '#FFD93D',
      site_incharge: '#6BCB77', 
      finance: '#9B59B6', 
      customer: '#95A5A6',
    };
    return colors[role] || '#95A5A6';
  };

  const formatRole = (role) => role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const formatDate = (d) => {
    if (!d) return 'Not provided';
    try { 
      const date = new Date(d);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch {
      return 'Not provided';
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getValue = (value, defaultValue = 'Not provided') => {
    if (value === null || value === undefined || value === '') return defaultValue;
    if (typeof value === 'string' && value.trim() === '') return defaultValue;
    return String(value);
  };

  const handleViewUserInsights = (user) => { 
    console.log('Selected user data:', JSON.stringify(user, null, 2));
    setSelectedUser(user); 
    setInsightModalVisible(true); 
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity onPress={() => handleViewUserInsights(item)} activeOpacity={0.7}>
      <Card variant="elevated" style={styles.userCard}>
        <View style={styles.userHeader}>
          <View style={styles.userNameContainer}>
            <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
            {!item.is_active && (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            )}
          </View>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleBadgeText}>{formatRole(item.role)}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.cardDetailRow}>
            <FontAwesome5 name="envelope" size={14} color={colors.subText} style={styles.cardDetailIcon} />
            <TouchableOpacity onPress={() => sendEmail(item.email)}>
              <Text style={[styles.cardDetailText, styles.linkText, { color: colors.textSecondary }]} numberOfLines={1}>{item.email}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardDetailRow}>
            <FontAwesome5 name="phone" size={14} color={colors.subText} style={styles.cardDetailIcon} />
            <TouchableOpacity onPress={() => item.phone && makeCall(item.phone)}>
              <Text style={[styles.cardDetailText, item.phone && styles.linkText, { color: colors.textSecondary }]}>{getValue(item.phone)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardDetailRow}>
            <FontAwesome5 name="map-marker-alt" size={14} color={colors.subText} style={styles.cardDetailIcon} />
            <Text style={[styles.cardDetailText, { color: colors.textSecondary }]} numberOfLines={1}>{getValue(item.city)}</Text>
          </View>
        </View>

        <Text style={[styles.cardTapHint, { color: colors.textLight }]}>👆 Tap for profile insights</Text>

        {(canDeactivateUser(item) || canActivateUser(item)) && (
          <View style={styles.userActions}>
            {canDeactivateUser(item) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deactivateButton]}
                onPress={() => handleDeactivateUser(item)}
                disabled={deactivating === item.id}
              >
                {deactivating === item.id ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <FontAwesome5 name="user-slash" size={14} color="#FFF" />
                    <Text style={styles.actionButtonText}>Deactivate</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {canActivateUser(item) && (
              <TouchableOpacity
                style={[styles.actionButton, styles.activateButton]}
                onPress={() => handleActivateUser(item)}
                disabled={activating === item.id}
              >
                {activating === item.id ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <FontAwesome5 name="user-check" size={14} color="#FFF" />
                    <Text style={styles.actionButtonText}>Activate</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader navigation={navigation} />
        <LoadingState message="Loading users..." />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader navigation={navigation} />
      <View style={styles.content}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <FontAwesome5 name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Search users..."
              placeholderTextColor={colors.placeholderText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <FontAwesome5 name="times-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity style={styles.createUserButton} onPress={() => navigation.navigate('CreateUser')}>
            <FontAwesome5 name="user-plus" size={16} color="#FFFFFF" />
            <Text style={styles.createUserButtonText}>Create User</Text>
          </TouchableOpacity>
        </View>

        {filteredUsers.length === 0 ? (
          <EmptyState
            icon="users"
            title={searchQuery ? 'No Results' : inactiveOnly ? 'No Deactivated Users' : 'No Users'}
            message={searchQuery ? 'Try a different search term' : inactiveOnly ? 'No deactivated users found' : 'No users found'}
          />
        ) : (
          <Animated.FlatList
            data={filteredUsers}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh} 
                colors={[theme.colors.primary]} 
                tintColor={theme.colors.primary} 
              />
            }
          />
        )}
      </View>

      {/* ✨ PROFILE INSIGHT MODAL - Full Details Layout ✨ */}
      <Modal 
        animationType="fade" 
        transparent 
        visible={insightModalVisible} 
        onRequestClose={() => setInsightModalVisible(false)}
      >
        <View style={styles.insightOverlay}>
          <View style={[styles.insightContainer, { backgroundColor: colors.modalBg }]}>
            {/* Decorative Header Strip */}
            <View style={[styles.insightHeaderStrip, { 
              backgroundColor: selectedUser ? getRoleColor(selectedUser.role) : '#FF6B6B' 
            }]}>
              <View style={styles.insightHeaderPattern} />
            </View>

            {/* Close Button */}
            <TouchableOpacity 
              style={styles.insightCloseBtn} 
              onPress={() => setInsightModalVisible(false)}
            >
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>

            {/* Content Container */}
            <ScrollView 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.insightContent}
            >
              {selectedUser && (
                <>
                  {/* Profile Avatar with Initials */}
                  <View style={styles.insightAvatarContainer}>
                    <View style={[styles.insightAvatar, { 
                      backgroundColor: getRoleColor(selectedUser.role),
                      shadowColor: getRoleColor(selectedUser.role)
                    }]}>
                      <Text style={styles.insightAvatarText}>
                        {getInitials(selectedUser.name)}
                      </Text>
                    </View>
                    
                    {/* Status Indicator */}
                    <View style={[styles.insightStatus, {
                      backgroundColor: selectedUser.is_active ? '#4CAF50' : '#F44336'
                    }]}>
                      <Text style={styles.insightStatusText}>
                        {selectedUser.is_active ? 'ACTIVE' : 'INACTIVE'}
                      </Text>
                    </View>
                  </View>

                  {/* User Name and Role */}
                  <Text style={[styles.insightName, { color: colors.textPrimary }]}>{selectedUser.name}</Text>
                  <View style={[styles.insightRolePill, { 
                    backgroundColor: getRoleColor(selectedUser.role) + '20' 
                  }]}>
                    <Text style={[styles.insightRoleText, { 
                      color: getRoleColor(selectedUser.role) 
                    }]}>
                      {formatRole(selectedUser.role)}
                    </Text>
                  </View>

                  {/* Combined Information Card - All in One Section with Full Details */}
                  <View style={[styles.insightCombinedCard, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
                    {/* Email - Full */}
                    <View style={[styles.insightFullRow, { borderBottomColor: colors.divider }]}>
                      <View style={styles.insightIconContainer}>
                        <FontAwesome5 name="envelope" size={16} color={getRoleColor(selectedUser.role)} />
                      </View>
                      <View style={styles.insightTextContainer}>
                        <Text style={[styles.insightFieldLabel, { color: colors.textSecondary }]}>Email</Text>
                        <TouchableOpacity onPress={() => sendEmail(selectedUser.email)}>
                          <Text style={[styles.insightFieldValue, styles.linkText]} selectable>{selectedUser.email}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Phone - Full */}
                    <View style={[styles.insightFullRow, { borderBottomColor: colors.divider }]}>
                      <View style={styles.insightIconContainer}>
                        <FontAwesome5 name="phone" size={16} color={getRoleColor(selectedUser.role)} />
                      </View>
                      <View style={styles.insightTextContainer}>
                        <Text style={[styles.insightFieldLabel, { color: colors.textSecondary }]}>Phone</Text>
                        <TouchableOpacity onPress={() => selectedUser.phone && makeCall(selectedUser.phone)}>
                          <Text style={[styles.insightFieldValue, { color: colors.textPrimary }, selectedUser.phone && styles.linkText]}>{getValue(selectedUser.phone)}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Date of Birth - Full */}
                    <View style={[styles.insightFullRow, { borderBottomColor: colors.divider }]}>
                      <View style={styles.insightIconContainer}>
                        <FontAwesome5 name="birthday-cake" size={16} color={getRoleColor(selectedUser.role)} />
                      </View>
                      <View style={styles.insightTextContainer}>
                        <Text style={[styles.insightFieldLabel, { color: colors.textSecondary }]}>Date of Birth</Text>
                        <Text style={[styles.insightFieldValue, { color: colors.textPrimary }]}>{formatDate(selectedUser.date_of_birth)}</Text>
                      </View>
                    </View>

                    {/* Date of Joining - Full */}
                    <View style={[styles.insightFullRow, { borderBottomColor: colors.divider }]}>
                      <View style={styles.insightIconContainer}>
                        <FontAwesome5 name="calendar-alt" size={16} color={getRoleColor(selectedUser.role)} />
                      </View>
                      <View style={styles.insightTextContainer}>
                        <Text style={[styles.insightFieldLabel, { color: colors.textSecondary }]}>Date of Joining</Text>
                        <Text style={[styles.insightFieldValue, { color: colors.textPrimary }]}>{formatDate(selectedUser.date_of_joining)}</Text>
                      </View>
                    </View>

                    {/* City - Full */}
                    <View style={[styles.insightFullRow, { borderBottomColor: colors.divider }]}>
                      <View style={styles.insightIconContainer}>
                        <FontAwesome5 name="map-marker-alt" size={16} color={getRoleColor(selectedUser.role)} />
                      </View>
                      <View style={styles.insightTextContainer}>
                        <Text style={[styles.insightFieldLabel, { color: colors.textSecondary }]}>City</Text>
                        <Text style={[styles.insightFieldValue, { color: colors.textPrimary }]}>{getValue(selectedUser.city)}</Text>
                      </View>
                    </View>

                    {/* Current Address - Full (multi-line) */}
                    <View style={[styles.insightFullRow, { borderBottomColor: colors.divider }]}>
                      <View style={styles.insightIconContainer}>
                        <FontAwesome5 name="home" size={16} color={getRoleColor(selectedUser.role)} />
                      </View>
                      <View style={styles.insightTextContainer}>
                        <Text style={[styles.insightFieldLabel, { color: colors.textSecondary }]}>Current Address</Text>
                        <Text style={[styles.insightFieldValueMulti, { color: colors.textPrimary }]}>
                          {getValue(selectedUser.current_address)}
                        </Text>
                      </View>
                    </View>

                    {/* Permanent Address - Full (multi-line) */}
                    <View style={[styles.insightFullRow, { borderBottomColor: colors.divider }]}>
                      <View style={styles.insightIconContainer}>
                        <FontAwesome5 name="building" size={16} color={getRoleColor(selectedUser.role)} />
                      </View>
                      <View style={styles.insightTextContainer}>
                        <Text style={[styles.insightFieldLabel, { color: colors.textSecondary }]}>Permanent Address</Text>
                        <Text style={[styles.insightFieldValueMulti, { color: colors.textPrimary }]}>
                          {getValue(selectedUser.permanent_address)}
                        </Text>
                      </View>
                    </View>

                    {/* Account Created - Full */}
                    <View style={[styles.insightFullRow, { borderBottomColor: colors.divider }]}>
                      <View style={styles.insightIconContainer}>
                        <FontAwesome5 name="calendar" size={16} color={getRoleColor(selectedUser.role)} />
                      </View>
                      <View style={styles.insightTextContainer}>
                        <Text style={[styles.insightFieldLabel, { color: colors.textSecondary }]}>Account Created</Text>
                        <Text style={[styles.insightFieldValue, { color: colors.textPrimary }]}>{formatDate(selectedUser.created_at)}</Text>
                      </View>
                    </View>

                    {/* Active Projects - Full */}
                    <View style={[styles.insightFullRow, { borderBottomColor: colors.divider }]}>
                      <View style={styles.insightIconContainer}>
                        <FontAwesome5 name="project-diagram" size={16} color={getRoleColor(selectedUser.role)} />
                      </View>
                      <View style={styles.insightTextContainer}>
                        <Text style={[styles.insightFieldLabel, { color: colors.textSecondary }]}>Active Projects</Text>
                        <Text style={[styles.insightFieldValue, { color: colors.textPrimary }]}>{selectedUser.active_projects || 0}</Text>
                      </View>
                    </View>

                    {/* User ID - Full (with copy ability) */}
                    <View style={[styles.insightFullRow, { borderBottomColor: colors.divider }]}>
                      <View style={styles.insightIconContainer}>
                        <FontAwesome5 name="fingerprint" size={16} color={getRoleColor(selectedUser.role)} />
                      </View>
                      <View style={styles.insightTextContainer}>
                        <Text style={[styles.insightFieldLabel, { color: colors.textSecondary }]}>User ID</Text>
                        <Text style={[styles.insightFieldValue, { color: colors.textPrimary }]} selectable>{selectedUser.id}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  {(canDeactivateUser(selectedUser) || canActivateUser(selectedUser) || canEditUser(selectedUser)) && (
                    <View style={styles.insightActionContainer}>
                      {canEditUser(selectedUser) && (
                        <TouchableOpacity
                          style={[styles.insightActionBtn, { backgroundColor: '#2563EB' }]}
                          onPress={() => openEditModal(selectedUser)}
                        >
                          <FontAwesome5 name="edit" size={14} color="#FFF" />
                          <Text style={styles.insightActionBtnText}>Edit</Text>
                        </TouchableOpacity>
                      )}
                      {canDeactivateUser(selectedUser) && (
                        <TouchableOpacity 
                          style={[styles.insightActionBtn, styles.insightDeactivateBtn]}
                          onPress={() => { 
                            setInsightModalVisible(false); 
                            handleDeactivateUser(selectedUser); 
                          }}
                          disabled={deactivating === selectedUser.id}
                        >
                          {deactivating === selectedUser.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <FontAwesome5 name="user-slash" size={14} color="#FFF" />
                              <Text style={styles.insightActionBtnText}>Deactivate</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                      {canActivateUser(selectedUser) && (
                        <TouchableOpacity 
                          style={[styles.insightActionBtn, styles.insightActivateBtn]}
                          onPress={() => { 
                            setInsightModalVisible(false); 
                            handleActivateUser(selectedUser); 
                          }}
                          disabled={activating === selectedUser.id}
                        >
                          {activating === selectedUser.id ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <FontAwesome5 name="user-check" size={14} color="#FFF" />
                              <Text style={styles.insightActionBtnText}>Activate</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Close Button at Bottom */}
                  <TouchableOpacity 
                    style={styles.insightBottomClose}
                    onPress={() => setInsightModalVisible(false)}
                  >
                    <Text style={styles.insightBottomCloseText}>Close Profile</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal animationType="slide" transparent visible={showEditModal} onRequestClose={() => { setShowEditModal(false); setInsightModalVisible(true); }}>
        <View style={styles.insightOverlay}>
          <View style={[styles.insightContainer, { maxHeight: '90%', backgroundColor: colors.modalBg }]}>
            <View style={[styles.insightHeaderStrip, { backgroundColor: selectedUser ? getRoleColor(selectedUser.role) : '#4361EE' }]} />
            <TouchableOpacity style={styles.insightCloseBtn} onPress={() => { setShowEditModal(false); setInsightModalVisible(true); }}>
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
            <ScrollView contentContainerStyle={[styles.insightContent, { paddingTop: 20 }]} keyboardShouldPersistTaps="handled">
              <Text style={[styles.insightName, { fontSize: 20, marginTop: 8 }]}>Edit User</Text>
              <Text style={[styles.insightRoleText, { textAlign: 'center', color: '#6C757D', marginBottom: 16 }]}>{selectedUser?.name}</Text>

              {[
                { label: 'Name *', key: 'name', placeholder: 'Full name' },
                { label: 'Phone', key: 'phone', placeholder: 'Phone number', keyboardType: 'phone-pad' },
                { label: 'Email', key: 'email', placeholder: 'Email address', keyboardType: 'email-address' },
                { label: 'City', key: 'city', placeholder: 'City' },
                { label: 'Date of Joining (YYYY-MM-DD)', key: 'date_of_joining', placeholder: 'e.g. 2024-01-15' },
                { label: 'Date of Birth (YYYY-MM-DD)', key: 'date_of_birth', placeholder: 'e.g. 1990-05-20' },
                { label: 'Current Address', key: 'current_address', placeholder: 'Current address', multiline: true },
                { label: 'Permanent Address', key: 'permanent_address', placeholder: 'Permanent address', multiline: true },
              ].map(field => (
                <View key={field.key} style={styles.editFieldGroup}>
                  <Text style={styles.editFieldLabel}>{field.label}</Text>
                  <TextInput
                    style={[styles.editFieldInput, field.multiline && { height: 80, textAlignVertical: 'top' }]}
                    value={editForm[field.key] || ''}
                    onChangeText={v => setEditForm(f => ({ ...f, [field.key]: v }))}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9CA3AF"
                    keyboardType={field.keyboardType || 'default'}
                    multiline={field.multiline}
                    autoCapitalize={field.key === 'email' ? 'none' : 'sentences'}
                  />
                </View>
              ))}

              <View style={{ flexDirection: 'row', marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.insightActionBtn, { flex: 1, marginRight: 8, backgroundColor: '#F1F3F5' }]}
                  onPress={() => { setShowEditModal(false); setInsightModalVisible(true); }}
                >
                  <Text style={[styles.insightActionBtnText, { color: '#6C757D' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.insightActionBtn, { flex: 1, backgroundColor: '#2563EB' }]}
                  onPress={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit
                    ? <ActivityIndicator color="#FFF" />
                    : <Text style={styles.insightActionBtnText}>Save</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BottomNavigation navigation={navigation} activeRoute="UsersList" scrollY={scrollY} />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  content: { 
    flex: 1 
  },
  searchContainer: { 
    padding: 16, 
    backgroundColor: colors.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E9ECEF' 
  },
  searchInputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F8F9FA', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderWidth: 1, 
    borderColor: '#E9ECEF' 
  },
  searchIcon: { 
    marginRight: 12 
  },
  searchInput: { 
    flex: 1, 
    fontSize: 15, 
    color: '#212529' 
  },
  createUserButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#4361EE', 
    borderRadius: 12, 
    paddingVertical: 14, 
    paddingHorizontal: 20, 
    marginTop: 16, 
    gap: 10, 
    elevation: 2,
    shadowColor: '#4361EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  createUserButtonText: { 
    color: '#FFF', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  listContent: { 
    padding: 16, 
    paddingBottom: 100 
  },

  // Card Styles
  userCard: { 
    marginBottom: 16, 
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  userHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 12 
  },
  userNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginRight: 8,
  },
  userName: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#212529' 
  },
  inactiveBadge: { 
    backgroundColor: '#FEE2E2', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  inactiveBadgeText: { 
    color: '#DC2626', 
    fontWeight: '600', 
    fontSize: 10 
  },
  roleBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
    elevation: 1,
  },
  roleBadgeText: { 
    fontSize: 11, 
    fontWeight: '700',
    color: '#FFF',
  },
  cardDetails: { 
    gap: 10,
    marginBottom: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  cardDetailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12 
  },
  cardDetailIcon: { 
    width: 18 
  },
  cardDetailText: { 
    fontSize: 14, 
    color: '#495057', 
    flex: 1 
  },
  linkText: {
    color: '#2563EB',
    textDecorationLine: 'underline',
  },
  cardTapHint: { 
    fontSize: 12, 
    color: '#4361EE', 
    textAlign: 'right', 
    marginTop: 8, 
    fontStyle: 'italic',
    fontWeight: '500',
  },
  userActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: 10, 
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
    paddingTop: 12
  },
  actionButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    minWidth: 100,
    elevation: 1,
  },
  deactivateButton: {
    backgroundColor: '#DC2626',
  },
  activateButton: {
    backgroundColor: '#059669',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // ✨ PROFILE INSIGHT MODAL - Full Details Styles ✨
  insightOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  insightContainer: { 
    width: '96%', // Increased width
    maxWidth: 550, // Increased max width
    maxHeight: '92%', // Slightly increased height
    backgroundColor: colors.surface, 
    borderRadius: 28, // Slightly reduced for modern look
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  insightHeaderStrip: {
    height: 10, // Slightly reduced
    width: '100%',
    position: 'relative',
  },
  insightHeaderPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  insightCloseBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  insightContent: {
    padding: 16, // Reduced padding
    paddingTop: 12, // Reduced top padding
  },
  insightAvatarContainer: {
    alignItems: 'center',
    marginTop: -25, // Adjusted for smaller header
    marginBottom: 12, // Reduced
  },
  insightAvatar: {
    width: 80, // Slightly smaller
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  insightAvatarText: {
    fontSize: 28, // Slightly smaller
    fontWeight: '700',
    color: '#FFF',
  },
  insightStatus: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 16,
    elevation: 1,
  },
  insightStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  insightName: {
    fontSize: 24, // Slightly smaller
    fontWeight: '700',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 6,
  },
  insightRolePill: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 25,
    marginBottom: 16, // Reduced
  },
  insightRoleText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Combined Card - All in One Section with Full Details
  insightCombinedCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16, // Slightly reduced
    marginBottom: 16, // Reduced
    borderWidth: 1,
    borderColor: '#E9ECEF',
    elevation: 1,
  },
  insightFullRow: {
    flexDirection: 'row',
    paddingVertical: 10, // Slightly reduced
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  insightIconContainer: {
    width: 36, // Slightly reduced
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginRight: 8,
  },
  insightTextContainer: {
    flex: 1,
  },
  insightFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  insightFieldValue: {
    fontSize: 15,
    color: '#212529',
    fontWeight: '500',
    lineHeight: 22,
  },
  insightFieldValueMulti: {
    fontSize: 15,
    color: '#212529',
    fontWeight: '500',
    lineHeight: 22,
    flexWrap: 'wrap',
  },

  insightActionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12, // Reduced
  },
  insightActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12, // Slightly reduced
    borderRadius: 25,
    gap: 8,
    elevation: 1,
  },
  insightDeactivateBtn: {
    backgroundColor: '#DC2626',
  },
  insightActivateBtn: {
    backgroundColor: '#059669',
  },
  insightActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  insightBottomClose: {
    paddingVertical: 14, // Slightly reduced
    borderRadius: 25,
    backgroundColor: '#F1F3F5',
    alignItems: 'center',
    marginTop: 4,
  },
  insightBottomCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C757D',
  },
  editFieldGroup: {
    marginBottom: 14,
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C757D',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  editFieldInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#212529',
  },
});

export default UsersListScreen;