import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, BackHandler, Keyboard, Platform, StyleSheet, View, StatusBar } from 'react-native';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { I18nProvider, useI18n } from './src/i18n/I18nContext';
import { SplashScreen } from './src/screens/SplashScreen';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { PinLockScreen } from './src/screens/PinLockScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { GradeDetailScreen } from './src/screens/GradeDetailScreen';
import { ReaderScreen, ReaderBookParam } from './src/screens/ReaderScreen';
import { RequestsScreen } from './src/screens/RequestsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import {
  BottomNavigationDock,
  BottomNavTab,
} from './src/components/BottomNavigationDock';
import { SideMenuDrawer } from './src/components/SideMenuDrawer';
import { secureStorage } from './src/services/storage/secureStorage';
import { mobileApi } from './src/services/api/mobileApi';
import { SubscriptionManager } from './src/services/subscription/subscriptionManager';
import { NotificationBanner } from './src/components/common/NotificationBanner';
import { DownloadsManager } from './src/services/storage/downloadsManager';

export type ScreenState =
  | 'SPLASH'
  | 'WELCOME'
  | 'PIN_LOCK'
  | 'HOME'
  | 'GRADE_DETAIL'
  | 'READER'
  | 'REQUESTS'
  | 'SETTINGS';

const AUTO_LOCK_MS = 60 * 1000;

function isUnlockedAppScreen(screen: ScreenState): boolean {
  return (
    screen === 'HOME' ||
    screen === 'GRADE_DETAIL' ||
    screen === 'READER' ||
    screen === 'REQUESTS' ||
    screen === 'SETTINGS'
  );
}

function AppShell() {
  const { colors } = useTheme();
  const { strings } = useI18n();

  const [currentScreen, setCurrentScreen] = useState<ScreenState>('SPLASH');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const screenHistoryRef = useRef<ScreenState[]>([]);
  const currentScreenRef = useRef<ScreenState>('SPLASH');
  const preLockScreenRef = useRef<ScreenState | null>(null);
  const lastActivityAtRef = useRef<number>(Date.now());
  const lastPersistedActivityRef = useRef<number>(0);
  const backgroundedAtRef = useRef<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  currentScreenRef.current = currentScreen;

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const lockApp = useCallback(() => {
    clearIdleTimer();
    const screenNow = currentScreenRef.current;
    if (!isUnlockedAppScreen(screenNow)) return;
    preLockScreenRef.current = screenNow;
    setIsMenuOpen(false);
    setCurrentScreen('PIN_LOCK');
  }, [clearIdleTimer]);

  const scheduleIdleTimer = useCallback(
    (delayMs = AUTO_LOCK_MS) => {
      clearIdleTimer();
      if (!isUnlockedAppScreen(currentScreenRef.current)) return;
      idleTimerRef.current = setTimeout(() => {
        lockApp();
      }, Math.max(250, delayMs));
    },
    [clearIdleTimer, lockApp],
  );

  const recordUserActivity = useCallback(() => {
    const now = Date.now();
    lastActivityAtRef.current = now;
    if (isUnlockedAppScreen(currentScreenRef.current)) {
      scheduleIdleTimer(AUTO_LOCK_MS);
      if (now - lastPersistedActivityRef.current >= 5000) {
        lastPersistedActivityRef.current = now;
        secureStorage.saveLastActivityAt(now).catch(() => {});
      }
    }
  }, [scheduleIdleTimer]);

  const navigateTo = useCallback(
    (nextScreen: ScreenState, options?: { reset?: boolean }) => {
      recordUserActivity();
      setCurrentScreen((prev) => {
        if (
          options?.reset ||
          nextScreen === 'HOME' ||
          nextScreen === 'WELCOME' ||
          nextScreen === 'SPLASH' ||
          nextScreen === 'PIN_LOCK'
        ) {
          screenHistoryRef.current = [];
        } else if (
          prev !== nextScreen &&
          prev !== 'SPLASH' &&
          prev !== 'PIN_LOCK' &&
          prev !== 'WELCOME'
        ) {
          const hist = screenHistoryRef.current;
          if (hist[hist.length - 1] !== prev) {
            hist.push(prev);
            if (hist.length > 15) hist.shift();
          }
        }
        return nextScreen;
      });
    },
    [],
  );

  const goBackScreen = useCallback(() => {
    const prevScreen = screenHistoryRef.current.pop();
    setCurrentScreen(prevScreen || 'HOME');
  }, []);

  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    photoUrl?: string;
  }>({
    name: '',
    email: '',
    photoUrl: undefined,
  });

  const [activeGrade, setActiveGrade] = useState<number>(4);
  const [activeSubjectCode, setActiveSubjectCode] = useState<string | undefined>(undefined);
  const activeSubjectCodeRef = useRef<string | undefined>(undefined);
  activeSubjectCodeRef.current = activeSubjectCode;
  const bootstrappedRef = useRef<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'THREE_MONTHS' | 'YEARLY'>(
    'THREE_MONTHS',
  );
  const [activeBook, setActiveBook] = useState<ReaderBookParam | undefined>(undefined);
  const [activeDaysRemaining, setActiveDaysRemaining] = useState<number | undefined>(undefined);

  const refreshSubscriptionSummary = useCallback(async (): Promise<number | undefined> => {
    try {
      const accessList = await SubscriptionManager.syncFromBackend();
      const activeList = accessList.filter(
        (a) => a.status === 'ACTIVE' || a.status === 'EXPIRING_SOON',
      );
      const firstActive = activeList[0];
      if (firstActive) {
        setActiveGrade((prev) =>
          activeList.some((a) => a.gradeId === prev) ? prev : firstActive.gradeId,
        );
        if (firstActive.subjectId && !activeSubjectCodeRef.current) {
          setActiveSubjectCode(firstActive.subjectId);
        }
        setActiveDaysRemaining(firstActive.daysRemaining);
        return firstActive.gradeId;
      } else {
        setActiveDaysRemaining(undefined);
      }
    } catch {}
    return undefined;
  }, []);

  useEffect(() => {
    if (isUnlockedAppScreen(currentScreen)) {
      lastActivityAtRef.current = Date.now();
      scheduleIdleTimer(AUTO_LOCK_MS);
    } else {
      clearIdleTimer();
    }
    return () => clearIdleTimer();
  }, [currentScreen, scheduleIdleTimer, clearIdleTimer]);

  useEffect(() => {
    const kbShowSub = Keyboard.addListener('keyboardDidShow', recordUserActivity);
    const kbHideSub = Keyboard.addListener('keyboardDidHide', recordUserActivity);
    let cleanupWeb: (() => void) | undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
      events.forEach((ev) => window.addEventListener(ev, recordUserActivity, { passive: true }));
      cleanupWeb = () => {
        events.forEach((ev) => window.removeEventListener(ev, recordUserActivity));
      };
    }
    return () => {
      kbShowSub.remove();
      kbHideSub.remove();
      cleanupWeb?.();
    };
  }, [recordUserActivity]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        clearIdleTimer();
        if (isUnlockedAppScreen(currentScreenRef.current)) {
          const now = Date.now();
          backgroundedAtRef.current = now;
          lastPersistedActivityRef.current = now;
          secureStorage.saveLastActivityAt(now).catch(() => {});
        }
        return;
      }

      if (next === 'active') {
        const bgAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (isUnlockedAppScreen(currentScreenRef.current)) {
          const now = Date.now();
          const bgElapsed = bgAt ? now - bgAt : 0;
          const idleElapsed = now - lastActivityAtRef.current;
          if (bgElapsed >= AUTO_LOCK_MS || idleElapsed >= AUTO_LOCK_MS) {
            lockApp();
            return;
          }
          lastActivityAtRef.current = now;
          scheduleIdleTimer(AUTO_LOCK_MS);
        }
        refreshSubscriptionSummary();
      }
    });
    return () => sub.remove();
  }, [clearIdleTimer, lockApp, refreshSubscriptionSummary, scheduleIdleTimer]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isMenuOpen) {
        setIsMenuOpen(false);
        return true;
      }
      if (
        currentScreen === 'GRADE_DETAIL' ||
        currentScreen === 'REQUESTS' ||
        currentScreen === 'SETTINGS'
      ) {
        goBackScreen();
        return true;
      }
      if (currentScreen === 'READER') {
        goBackScreen();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [isMenuOpen, currentScreen, goBackScreen]);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    let mounted = true;

    const bootstrapSession = async () => {
      const minSplashDelay = new Promise((res) => setTimeout(res, 750));
      try {
        const [token, profile, hasPin, lastActiveAt] = await Promise.all([
          secureStorage.getAccessToken(),
          secureStorage.getUserProfile(),
          secureStorage.hasPinCode(),
          secureStorage.getLastActivityAt(),
        ]);

        if (token && profile?.email) {
          let resolvedName = profile.fullName || profile.name || profile.email.split('@')[0];
          let resolvedPhoto = profile.avatarUrl || profile.photoUrl;

          try {
            const remote = await mobileApi.getProfile();
            const remoteUser = remote?.user || remote;
            if (remoteUser?.email) {
              resolvedName = remoteUser.fullName || resolvedName;
              resolvedPhoto = remoteUser.avatarUrl || resolvedPhoto;
              await secureStorage.saveUserProfile({
                ...profile,
                ...remoteUser,
                name: resolvedName,
              });
            }
          } catch {}

          await Promise.all([
            refreshSubscriptionSummary(),
            DownloadsManager.init().catch(() => {}),
          ]);
          await minSplashDelay;
          if (!mounted) return;

          setUserProfile({
            name: resolvedName,
            email: profile.email,
            photoUrl: resolvedPhoto,
          });
          const elapsedSinceExit = lastActiveAt ? Date.now() - lastActiveAt : 0;
          const shouldLockOnBoot = hasPin || (lastActiveAt !== null && elapsedSinceExit >= AUTO_LOCK_MS);
          if (!shouldLockOnBoot) {
            const now = Date.now();
            lastActivityAtRef.current = now;
            secureStorage.saveLastActivityAt(now).catch(() => {});
          }
          setCurrentScreen(shouldLockOnBoot ? 'PIN_LOCK' : 'HOME');
          return;
        }
      } catch {}

      await minSplashDelay;
      if (mounted) setCurrentScreen('WELCOME');
    };

    bootstrapSession();
    return () => {
      mounted = false;
    };
    // Run strictly once on app mount; re-running on state changes would re-lock to PIN_LOCK.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignInSuccess = async (user: {
    email: string;
    name: string;
    avatar?: string;
    photoUrl?: string;
  }) => {
    const resolvedPhoto = user.photoUrl || user.avatar;
    setUserProfile({
      name: user.name || user.email.split('@')[0],
      email: user.email,
      photoUrl: resolvedPhoto,
    });
    await refreshSubscriptionSummary();
    const now = Date.now();
    lastActivityAtRef.current = now;
    lastPersistedActivityRef.current = now;
    backgroundedAtRef.current = null;
    preLockScreenRef.current = null;
    secureStorage.saveLastActivityAt(now).catch(() => {});
    setCurrentScreen('HOME');
  };

  const handleLogout = async () => {
    try {
      const deviceId = await secureStorage.getOrCreateDeviceId();
      await mobileApi.logout(deviceId);
    } catch {}
    await secureStorage.clearAuthTokens();
    SubscriptionManager.clearCache();
    setIsMenuOpen(false);
    setActiveBook(undefined);
    setUserProfile({ name: '', email: '', photoUrl: undefined });
    navigateTo('WELCOME', { reset: true });
  };

  const handleResetPinAndRelogin = async () => {
    await secureStorage.clearPinCode();
    await handleLogout();
  };

  const openBookInReader = (book: {
    id: string;
    title: string;
    gradeId: number;
    subjectId: string;
    totalPages: number;
    contentStartPdfPage?: number;
    type?: string;
    initialPage?: number;
  }) => {
    setActiveBook({
      id: book.id,
      title: book.title,
      gradeId: book.gradeId,
      subjectId: book.subjectId,
      totalPages: book.totalPages || 6,
      contentStartPdfPage: book.contentStartPdfPage,
      type: book.type,
      initialPage: book.initialPage,
    });
    navigateTo('READER');
  };

  const effectiveUserName = userProfile.name || strings.common.userFallback;
  const isSplash = currentScreen === 'SPLASH';
  const showBottomDock =
    currentScreen === 'HOME' ||
    currentScreen === 'GRADE_DETAIL' ||
    currentScreen === 'REQUESTS' ||
    currentScreen === 'SETTINGS';

  const activeNavTab: BottomNavTab =
    currentScreen === 'GRADE_DETAIL'
      ? 'GRADE_DETAIL'
      : currentScreen === 'REQUESTS'
      ? 'REQUESTS'
      : currentScreen === 'SETTINGS'
      ? 'SETTINGS'
      : 'HOME';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isSplash ? '#070B19' : colors.background },
      ]}
      onStartShouldSetResponderCapture={() => {
        recordUserActivity();
        return false;
      }}
      onMoveShouldSetResponderCapture={() => {
        recordUserActivity();
        return false;
      }}
    >
      <StatusBar
        barStyle={isSplash ? 'light-content' : colors.statusBarStyle}
        backgroundColor={isSplash ? '#070B19' : colors.background}
      />

      {currentScreen === 'SPLASH' && <SplashScreen />}

      {currentScreen === 'WELCOME' && (
        <WelcomeScreen onGoogleSignIn={handleSignInSuccess} />
      )}

      {currentScreen === 'PIN_LOCK' && (
        <PinLockScreen
          userEmail={userProfile.email}
          userName={effectiveUserName}
          photoUrl={userProfile.photoUrl}
          onUnlockSuccess={() => {
            const now = Date.now();
            lastActivityAtRef.current = now;
            lastPersistedActivityRef.current = now;
            backgroundedAtRef.current = null;
            secureStorage.saveLastActivityAt(now).catch(() => {});
            refreshSubscriptionSummary();
            const targetScreen = preLockScreenRef.current || 'HOME';
            preLockScreenRef.current = null;
            setCurrentScreen(targetScreen);
          }}
          onResetPin={handleResetPinAndRelogin}
        />
      )}

      {currentScreen === 'HOME' && (
        <HomeScreen
          userEmail={userProfile.email}
          userName={effectiveUserName}
          photoUrl={userProfile.photoUrl}
          onOpenMenu={() => setIsMenuOpen(true)}
          onOpenReader={openBookInReader}
          onOpenGradeDetail={(grade, subjectCode) => {
            setActiveGrade(grade);
            setActiveSubjectCode(subjectCode);
            navigateTo('GRADE_DETAIL');
          }}
          onOpenRequests={(grade, subjectCode) => {
            if (grade) setActiveGrade(grade);
            setActiveSubjectCode(subjectCode);
            navigateTo('REQUESTS');
          }}
          onOpenSettings={() => navigateTo('SETTINGS')}
        />
      )}

      {currentScreen === 'GRADE_DETAIL' && (
        <GradeDetailScreen
          grade={activeGrade}
          userName={effectiveUserName}
          initialSubjectCode={activeSubjectCode}
          onBack={goBackScreen}
          onOpenReader={openBookInReader}
          onRequestAccess={(grade, subjectCode, plan) => {
            setActiveGrade(grade);
            setActiveSubjectCode(subjectCode);
            if (plan === 'MONTHLY' || plan === 'THREE_MONTHS' || plan === 'YEARLY') {
              setSelectedPlan(plan);
            }
            navigateTo('REQUESTS');
          }}
        />
      )}

      {currentScreen === 'READER' && (
        <ReaderScreen
          book={activeBook}
          initialPage={activeBook?.initialPage}
          userEmail={userProfile.email}
          userId={userProfile.email || 'teacher_user'}
          onExit={goBackScreen}
          onOpenSettings={() => navigateTo('SETTINGS')}
          onRenewSubscription={() => {
            if (activeBook?.gradeId) setActiveGrade(activeBook.gradeId);
            if (activeBook?.subjectId) setActiveSubjectCode(activeBook.subjectId);
            navigateTo('REQUESTS');
          }}
        />
      )}

      {currentScreen === 'REQUESTS' && (
        <RequestsScreen
          selectedGrade={activeGrade}
          selectedSubjectCode={activeSubjectCode}
          initialPlan={selectedPlan}
          onBack={goBackScreen}
          onRequestSubmittedAndApproved={refreshSubscriptionSummary}
        />
      )}

      {currentScreen === 'SETTINGS' && (
        <SettingsScreen
          userName={effectiveUserName}
          userEmail={userProfile.email}
          photoUrl={userProfile.photoUrl}
          onBack={goBackScreen}
          onOpenReader={(b) => {
            DownloadsManager.init().catch(() => {});
            openBookInReader(b);
          }}
          onOpenRequests={(gradeId, subjectId) => {
            if (gradeId) setActiveGrade(gradeId);
            if (subjectId) setActiveSubjectCode(subjectId);
            navigateTo('REQUESTS');
          }}
          onProfileUpdated={({ name, photoUrl }) =>
            setUserProfile((prev) => ({
              ...prev,
              name,
              ...(photoUrl !== undefined ? { photoUrl } : {}),
            }))
          }
          onResetPin={handleResetPinAndRelogin}
          onLogout={handleLogout}
        />
      )}

      {showBottomDock && (
        <BottomNavigationDock
          currentTab={activeNavTab}
          onSelectTab={async (tab) => {
            const resolvedActiveGrade = await refreshSubscriptionSummary();
            if (tab === 'GRADE_DETAIL' && resolvedActiveGrade) {
              setActiveGrade(resolvedActiveGrade);
            }
            if (tab === 'HOME') navigateTo('HOME', { reset: true });
            if (tab === 'GRADE_DETAIL') navigateTo('GRADE_DETAIL');
            if (tab === 'REQUESTS') navigateTo('REQUESTS');
            if (tab === 'SETTINGS') navigateTo('SETTINGS');
          }}
        />
      )}

      <SideMenuDrawer
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        userName={effectiveUserName}
        userEmail={userProfile.email}
        photoUrl={userProfile.photoUrl}
        activeGrade={activeGrade}
        activeDaysRemaining={activeDaysRemaining}
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          setIsMenuOpen(false);
          navigateTo(screen);
        }}
        onLogout={handleLogout}
      />

      <NotificationBanner />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AppShell />
      </I18nProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
