// Cleaned Verification Suite for Phase 2: Google Sign-In, 2-Device Limit & Session Security
const API_BASE = 'http://localhost:4000/api/v1/auth';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return { status: res.status, ok: res.ok, data: json };
}

function createMockGoogleIdToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'google-key-01' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      iss: 'accounts.google.com',
      sub: payload.sub || 'google_sub_mlrahmonjon_10738',
      email: payload.email || 'mlrahmonjon@gmail.com',
      email_verified: true,
      name: payload.name || 'Rahmonjon Qosimov',
      picture: payload.picture || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
      aud: '541312544893-favcmb2v7c257r2n7mlslu0e37dilrm1.apps.googleusercontent.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      ...payload,
    })
  ).toString('base64url');
  const sig = Buffer.from('mock_signature').toString('base64url');
  return `${header}.${body}.${sig}`;
}

async function runTests() {
  console.log('🧪 Starting Phase 2 Backend Verification Suite...\n');

  const testEmail = 'mlrahmonjon@gmail.com';
  const idToken = createMockGoogleIdToken({
    sub: 'google_user_mlrahmonjon_sub',
    email: testEmail,
    name: 'Rahmonjon Qosimov',
  });

  // Reset/evict old test devices to guarantee clean test state
  const devListRes = await request('/devices/usr_mlrahmonjon_gmail_com');
  if (devListRes.ok && devListRes.data && Array.isArray(devListRes.data.devices)) {
    for (const d of devListRes.data.devices) {
      await request('/devices/usr_mlrahmonjon_gmail_com/disconnect', {
        method: 'POST',
        body: JSON.stringify({ deviceIdToRemove: d.deviceId }),
      });
    }
  }

  // Step 1: Login Device 1 (Slot 1/2)
  console.log('--- 1. Google Sign-In Device 1 (dev_tab_s7_primary) ---');
  const res1 = await request('/google', {
    method: 'POST',
    body: JSON.stringify({
      idToken,
      deviceId: 'dev_tab_s7_primary',
      deviceModel: 'Samsung Galaxy Tab S7',
      osVersion: 'Android 14',
      appVersion: '1.0.0',
      platform: 'ANDROID',
    }),
  });
  console.log('Status:', res1.status);
  if (res1.status !== 200) throw new Error(`Device 1 failed: ${JSON.stringify(res1.data)}`);
  console.log('✅ Device 1 signed in successfully (Active 1/2).');

  const tokenDev1 = res1.data.accessToken;
  const refreshDev1 = res1.data.refreshToken;

  // Step 2: Login Device 2 (Slot 2/2)
  console.log('\n--- 2. Google Sign-In Device 2 (dev_pixel_8_secondary) ---');
  const res2 = await request('/google', {
    method: 'POST',
    body: JSON.stringify({
      idToken,
      deviceId: 'dev_pixel_8_secondary',
      deviceModel: 'Google Pixel 8 Pro',
      osVersion: 'Android 15',
      appVersion: '1.0.0',
      platform: 'ANDROID',
    }),
  });
  console.log('Status:', res2.status);
  if (res2.status !== 200) throw new Error(`Device 2 failed: ${JSON.stringify(res2.data)}`);
  console.log('✅ Device 2 signed in successfully (Active 2/2).');

  // Step 3: Attempt Login Device 3 while 2 devices are already active -> MUST BE BLOCKED
  console.log('\n--- 3. Google Sign-In 3rd Device Attempt -> MUST BE BLOCKED (403) ---');
  const resBlocked = await request('/google', {
    method: 'POST',
    body: JSON.stringify({
      idToken,
      deviceId: 'dev_redmi_note_13_third',
      deviceModel: 'Xiaomi Redmi Note 13',
      osVersion: 'Android 13',
      appVersion: '1.0.0',
      platform: 'ANDROID',
    }),
  });
  console.log('Status:', resBlocked.status);
  console.log('Code:', resBlocked.data.code);
  console.log('Active Devices in Conflict:', resBlocked.data.devices?.length);
  if (resBlocked.status !== 403 || resBlocked.data.code !== 'DEVICE_LIMIT_EXCEEDED') {
    throw new Error('Device limit check failed: expected 403 DEVICE_LIMIT_EXCEEDED');
  }
  console.log('✅ 2-Device limit successfully blocked 3rd device!');

  // Step 4: Check /auth/me for User Profile and Subscription
  console.log('\n--- 4. Check Current User Profile (/auth/me) ---');
  const resMe = await request('/me', {
    method: 'GET',
    token: tokenDev1,
  });
  console.log('Status:', resMe.status);
  console.log('User:', resMe.data.fullName, `(${resMe.data.email})`);
  console.log('Active Devices Count:', resMe.data.activeDevicesCount);
  if (resMe.status !== 200 || resMe.data.activeDevicesCount !== 2) {
    throw new Error(`Profile check failed: ${JSON.stringify(resMe.data)}`);
  }
  console.log('✅ Profile and active device limit status verified.');

  // Step 5: Disconnect Device 2 (dev_pixel_8_secondary) to free a slot
  console.log('\n--- 5. Disconnect Device (dev_pixel_8_secondary) via DELETE /auth/devices/:deviceId ---');
  const resDisconnect = await request('/devices/dev_pixel_8_secondary', {
    method: 'DELETE',
    token: tokenDev1,
  });
  console.log('Status:', resDisconnect.status);
  console.log('Remaining Devices:', resDisconnect.data.devices?.length);
  if (resDisconnect.status !== 200 || resDisconnect.data.devices?.length !== 1) {
    throw new Error(`Device disconnect failed: ${JSON.stringify(resDisconnect.data)}`);
  }
  console.log('✅ Device dev_pixel_8_secondary disconnected. Available slot freed (Active 1/2).');

  // Step 6: Now Login Device 3 (Redmi Note 13) -> Should succeed now!
  console.log('\n--- 6. Device 3 (Redmi Note 13) Signs In Now that Slot is Available ---');
  const resDev3 = await request('/google', {
    method: 'POST',
    body: JSON.stringify({
      idToken,
      deviceId: 'dev_redmi_note_13_third',
      deviceModel: 'Xiaomi Redmi Note 13',
      osVersion: 'Android 13',
      appVersion: '1.0.0',
      platform: 'ANDROID',
    }),
  });
  console.log('Status:', resDev3.status);
  if (resDev3.status !== 200) throw new Error(`Device 3 failed: ${JSON.stringify(resDev3.data)}`);
  console.log('✅ Device 3 successfully authenticated (now 2 active devices).');

  // Step 7: Test Refresh Token Rotation on Device 1
  console.log('\n--- 7. Test Refresh Token Rotation (/auth/refresh) ---');
  const resRefresh = await request('/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: refreshDev1,
      deviceId: 'dev_tab_s7_primary',
    }),
  });
  console.log('Status:', resRefresh.status);
  if (resRefresh.status !== 200 || !resRefresh.data.accessToken || !resRefresh.data.refreshToken) {
    throw new Error(`Token refresh failed: ${JSON.stringify(resRefresh.data)}`);
  }
  console.log('✅ Token successfully refreshed and rotated.');

  // Step 8: Test Refresh Token Reuse Detection (Security Alert)
  console.log('\n--- 8. Test Refresh Token Reuse Detection (Reusing old rotated token) ---');
  const resReuse = await request('/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: refreshDev1, // Old already-rotated token
      deviceId: 'dev_tab_s7_primary',
    }),
  });
  console.log('Status:', resReuse.status);
  console.log('Message:', resReuse.data.message);
  if (resReuse.status !== 401) {
    throw new Error('Security vulnerability: Old refresh token was not rejected!');
  }
  console.log('✅ Token reuse attack prevented! Old token invalidated.');

  // Step 9: Logout from Device 1
  console.log('\n--- 9. Logout from Device 1 (/auth/logout) ---');
  const resLogout = await request('/logout', {
    method: 'POST',
    token: resRefresh.data.accessToken,
    body: JSON.stringify({ deviceId: 'dev_tab_s7_primary' }),
  });
  console.log('Status:', resLogout.status);
  if (resLogout.status !== 200) throw new Error(`Logout failed: ${JSON.stringify(resLogout.data)}`);
  console.log('✅ Logout successful. Device session revoked.');

  console.log('\n======================================================');
  console.log('🎉 100% SUCCESS: ALL 9 VERIFICATION TESTS PASSED CLEANLY!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Suite failed:', err.message);
  process.exit(1);
});
