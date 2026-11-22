import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppState,
  BackHandler,
  Keyboard,
  Platform,
  StyleSheet,
  View,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
import { readingProgressStore } from './src/services/storage/readingProgressStore';
import { offlineCatalogCache } from './src/services/storage/offlineCatalogCache';
import { catalogService } from './src/services/catalog/catalogService';

export type ScreenState =
  | 'SPLASH'
  | 'WELCOME'
  | 'PIN_LOCK'
  | 'HOME'
  | 'GRADE_DETAIL'
  | 'READER'
  | 'REQUESTS'
  | 'SETTINGS';

const AUTO_LOCK_MS = 3 * 60 * 1000; // 3 minutes

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
      if (now - lastPersistedActivityRef.current >= 60000) {
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
      // Warm up catalog disk cache and fetch freshness in parallel during splash
      offlineCatalogCache.preload().then(() => {
        catalogService.getGrades().catch(() => {});
        catalogService.getSubjects().catch(() => {});
        catalogService.getBooks().catch(() => {});
      }).catch(() => {});

      try {
        const [token, profile, hasPin, lastActiveAt] = await Promise.all([
          secureStorage.getAccessToken(),
          secureStorage.getUserProfile(),
          secureStorage.hasPinCode(),
          secureStorage.getLastActivityAt(),
        ]);

        if (token && profile?.email) {
          const resolvedName = profile.fullName || profile.name || profile.email.split('@')[0];
          const resolvedPhoto = profile.avatarUrl || profile.photoUrl;

          if (!mounted) return;

          setUserProfile({
            name: resolvedName,
            email: profile.email,
            photoUrl: resolvedPhoto,
          });

          const elapsedSinceExit = lastActiveAt ? Date.now() - lastActiveAt : 0;
          const shouldLockOnBoot = Boolean(hasPin && (!lastActiveAt || elapsedSinceExit >= AUTO_LOCK_MS));
          if (!shouldLockOnBoot) {
            const now = Date.now();
            lastActivityAtRef.current = now;
            secureStorage.saveLastActivityAt(now).catch(() => {});
          }

          setCurrentScreen(shouldLockOnBoot ? 'PIN_LOCK' : 'HOME');

          // Non-blocking background sync and initialization
          refreshSubscriptionSummary().catch(() => {});
          DownloadsManager.init().catch(() => {});
          readingProgressStore.getAllProgress(profile.email).catch(() => {});
          offlineCatalogCache.preload().catch(() => {});
          mobileApi.getProfile().then(async (remote) => {
            const remoteUser = remote?.user || remote;
            if (remoteUser?.email && mounted) {
              const updatedName = remoteUser.fullName || resolvedName;
              const updatedPhoto = remoteUser.avatarUrl || resolvedPhoto;
              setUserProfile((prev) => ({
                ...prev,
                name: updatedName,
                photoUrl: updatedPhoto,
              }));
              await secureStorage.saveUserProfile({
                ...profile,
                ...remoteUser,
                name: updatedName,
              });
            }
          }).catch(() => {});

          return;
        }
      } catch {}

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
    readingProgressStore.getAllProgress(user.email).catch(() => {});
    offlineCatalogCache.preload().catch(() => {});
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
    const savedProgress = readingProgressStore.getBookProgressSync(userProfile.email, book.id);
    const resolvedInitial = book.initialPage || savedProgress?.lastPageNumber || 1;
    setActiveBook({
      id: book.id,
      title: book.title,
      gradeId: book.gradeId,
      subjectId: book.subjectId,
      totalPages: book.totalPages || 6,
      contentStartPdfPage: book.contentStartPdfPage,
      type: book.type,
      initialPage: resolvedInitial,
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

  const tabFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (showBottomDock) {
      tabFadeAnim.setValue(0.72);
      Animated.timing(tabFadeAnim, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }).start();
    }
  }, [currentScreen, showBottomDock]);

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
    >
      <StatusBar
        barStyle={isSplash ? 'light-content' : colors.statusBarStyle}
        backgroundColor={isSplash ? '#070B19' : colors.background}
      />

      <Animated.View
        style={{
          flex: 1,
          opacity: showBottomDock ? tabFadeAnim : 1,
        }}
      >
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
            const targetScreen =
              preLockScreenRef.current &&
              preLockScreenRef.current !== 'PIN_LOCK' &&
              preLockScreenRef.current !== 'SPLASH'
                ? preLockScreenRef.current
                : 'HOME';
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
          userEmail={userProfile.email}
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
      </Animated.View>

      {showBottomDock && (
        <BottomNavigationDock
          currentTab={activeNavTab}
          onSelectTab={(tab) => {
            if (tab === 'HOME') navigateTo('HOME', { reset: true });
            if (tab === 'GRADE_DETAIL') navigateTo('GRADE_DETAIL');
            if (tab === 'REQUESTS') navigateTo('REQUESTS');
            if (tab === 'SETTINGS') navigateTo('SETTINGS');
            refreshSubscriptionSummary().then((resolvedActiveGrade) => {
              if (tab === 'GRADE_DETAIL' && resolvedActiveGrade) {
                setActiveGrade(resolvedActiveGrade);
              }
            }).catch(() => {});
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
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <AppShell />
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
