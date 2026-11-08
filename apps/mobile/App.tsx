import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { PinLockScreen } from './src/screens/PinLockScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { GradeDetailScreen } from './src/screens/GradeDetailScreen';
import { ReaderScreen } from './src/screens/ReaderScreen';
import { RequestsScreen } from './src/screens/RequestsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BottomNavigationDock, BottomNavTab } from './src/components/BottomNavigationDock';
import { SideMenuDrawer } from './src/components/SideMenuDrawer';
import { secureStorage } from './src/services/storage/secureStorage';
import { googleAuthService } from './src/services/auth/googleAuthService';

type ScreenState =
  | 'WELCOME'
  | 'PIN_LOCK'
  | 'HOME'
  | 'GRADE_DETAIL'
  | 'READER'
  | 'REQUESTS'
  | 'SETTINGS';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenState>('WELCOME');
  const [menuVisible, setMenuVisible] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<{ email: string; name: string; avatar: string }>({
    email: '',
    name: '',
    avatar: '👩‍🏫',
  });
  const [activeGrade, setActiveGrade] = useState<number>(11);
  const [activeSubject, setActiveSubject] = useState<string>('ENG');

  // Auto-restore authenticated session or prompt for 4-digit PIN unlock
  useEffect(() => {
    (async () => {
      try {
        const token = await secureStorage.getAccessToken();
        const profile = await secureStorage.getUserProfile();
        const hasPin = await secureStorage.hasPinCode();

        if (token && profile && profile.email) {
          setUserProfile({
            email: profile.email,
            name: profile.fullName || profile.name || (profile.email ? profile.email.split('@')[0] : 'O‘qituvchi'),
            avatar: '👨‍🏫',
          });

          // If a 4-digit PIN is configured, show fast PIN Lock screen!
          if (hasPin) {
            setCurrentScreen('PIN_LOCK');
          } else {
            setCurrentScreen('HOME');
          }
        }
      } catch {}
    })();
  }, []);

  const handleLogout = async () => {
    await googleAuthService.signOut();
    await secureStorage.clearPinCode();
    setUserProfile({ email: '', name: '', avatar: '👩‍🏫' });
    setCurrentScreen('WELCOME');
  };

  const handleResetPinAndRelogin = async () => {
    await secureStorage.clearPinCode();
    await secureStorage.clearAuthTokens();
    setUserProfile({ email: '', name: '', avatar: '👩‍🏫' });
    setCurrentScreen('WELCOME');
  };

  const showBottomDock = currentScreen !== 'WELCOME' && currentScreen !== 'PIN_LOCK';

  return (
    <View style={[styles.root, currentScreen === 'READER' && { backgroundColor: '#0F172A' }]}>
      <StatusBar style={currentScreen === 'READER' ? 'light' : 'dark'} />

      {/* Screen 1: Welcome (Email + OTP + Set PIN / Google Sign-In) */}
      {currentScreen === 'WELCOME' && (
        <WelcomeScreen
          onGoogleSignIn={(user) => {
            setUserProfile(user);
            setCurrentScreen('HOME');
          }}
        />
      )}

      {/* Screen 1B: Fast 4-Digit PIN Unlock (For returning users) */}
      {currentScreen === 'PIN_LOCK' && (
        <PinLockScreen
          userEmail={userProfile.email}
          userName={userProfile.name}
          onUnlockSuccess={() => setCurrentScreen('HOME')}
          onResetPin={handleResetPinAndRelogin}
        />
      )}

      {/* Screen 2: Home Dashboard */}
      {currentScreen === 'HOME' && (
        <HomeScreen
          userEmail={userProfile.email}
          userName={userProfile.name}
          onOpenMenu={() => setMenuVisible(true)}
          onOpenReader={(grade, subjectCode, bookType) => {
            setActiveGrade(grade);
            setActiveSubject(subjectCode);
            setCurrentScreen('READER');
          }}
          onOpenGradeDetail={(grade, subjectCode) => {
            setActiveGrade(grade);
            setActiveSubject(subjectCode);
            setCurrentScreen('GRADE_DETAIL');
          }}
          onOpenRequests={() => setCurrentScreen('REQUESTS')}
          onOpenSettings={() => setCurrentScreen('SETTINGS')}
        />
      )}

      {/* Screen 3: Grade Detail & Subjects */}
      {currentScreen === 'GRADE_DETAIL' && (
        <GradeDetailScreen
          grade={activeGrade}
          userName={userProfile.name || 'O‘qituvchi'}
          initialSubjectCode={activeSubject}
          onBack={() => setCurrentScreen('HOME')}
          onOpenReader={(grade, subjectCode, bookType) => {
            setActiveGrade(grade);
            setActiveSubject(subjectCode);
            setCurrentScreen('READER');
          }}
          onRequestAccess={(grade, subjectCode, plan) => {
            setActiveGrade(grade);
            setActiveSubject(subjectCode);
            setCurrentScreen('REQUESTS');
          }}
        />
      )}

      {/* Digital Book Reader (Page Curl, Hotspots, Teacher's Answers Modal) */}
      {currentScreen === 'READER' && (
        <ReaderScreen
          userEmail={userProfile.email}
          onExit={() => setCurrentScreen('HOME')}
        />
      )}

      {/* Requests Screen (Monthly, 3-Month, Yearly Plans + Phone Input) */}
      {currentScreen === 'REQUESTS' && (
        <RequestsScreen
          initialGrade={activeGrade}
          initialSubject={activeSubject}
          onBack={() => setCurrentScreen('HOME')}
          onGradeGranted={(grade, subjectCode, plan) => {
            setActiveGrade(grade);
            setActiveSubject(subjectCode);
            setCurrentScreen('HOME');
          }}
        />
      )}

      {/* Settings Screen */}
      {currentScreen === 'SETTINGS' && (
        <SettingsScreen
          userEmail={userProfile.email}
          userName={userProfile.name || 'O‘qituvchi'}
          onBack={() => setCurrentScreen('HOME')}
          onLogout={handleLogout}
        />
      )}

      {/* Persistent Floating Bottom Navigation Dock across all main screens */}
      {showBottomDock && (
        <BottomNavigationDock
          currentTab={currentScreen === 'READER' ? 'GRADE_DETAIL' : (currentScreen as BottomNavTab)}
          onSelectTab={(tab) => setCurrentScreen(tab)}
        />
      )}

      {/* Sliding Side Navigation Menu Drawer */}
      <SideMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        userName={userProfile.name}
        userEmail={userProfile.email}
        activeGrade={activeGrade}
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
        onLogout={handleLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    minWidth: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
});
