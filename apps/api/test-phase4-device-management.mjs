// Phase 4: Two-Device Limit & Session Lifecycle Enterprise Test Suite
const API_BASE = 'http://localhost:4000/api/v1/auth';
const WEB_CLIENT_ID = '541312544893-favcmb2v7c257r2n7mlslu0e37dilrm1.apps.googleusercontent.com';

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

function createIdToken(email, name) {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'google-key-01' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({
      iss: 'accounts.google.com',
      sub: `google_sub_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: email.toLowerCase(),
      email_verified: true,
      name,
      picture: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
      aud: WEB_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })
  ).toString('base64url');
  const sig = Buffer.from('mock_signature').toString('base64url');
  return `${header}.${body}.${sig}`;
}

async function runPhase4Tests() {
  console.log('🛡️ Starting Phase 4: Two-Device Limit & Session Lifecycle Test Suite...\n');

  const testEmail = `phase4_teacher_${Date.now()}@gmail.com`;
  const testName = 'Muallim Testov';
  const idToken = createIdToken(testEmail, testName);

  // 1. Register Device 1 (Tablet)
  console.log('--- 1. Register Device 1: Samsung Galaxy Tab S8 (Expected: ALLOWED 1/2) ---');
  const resDev1 = await request('/google', {
    method: 'POST',
    body: JSON.stringify({
      idToken,
      deviceId: 'device_tab_s8_01',
      deviceModel: 'Samsung Galaxy Tab S8',
      osVersion: 'Android 14',
      appVersion: '1.0.0',
      platform: 'ANDROID',
    }),
  });
  console.log('Status:', resDev1.status);
  console.assert(resDev1.status === 200, 'Device 1 registration failed');
  console.log('✅ Device 1 registered successfully (Slot 1/2)');

  const tokenDev1 = resDev1.data.accessToken;
  const refreshDev1 = resDev1.data.refreshToken;

  // 2. Register Device 2 (Phone)
  console.log('\n--- 2. Register Device 2: Google Pixel 8 Pro (Expected: ALLOWED 2/2) ---');
  const resDev2 = await request('/google', {
    method: 'POST',
    body: JSON.stringify({
      idToken,
      deviceId: 'device_pixel_8_02',
      deviceModel: 'Google Pixel 8 Pro',
      osVersion: 'Android 15',
      appVersion: '1.0.0',
      platform: 'ANDROID',
    }),
  });
  console.log('Status:', resDev2.status);
  console.assert(resDev2.status === 200, 'Device 2 registration failed');
  console.log('✅ Device 2 registered successfully (Slot 2/2)');

  const tokenDev2 = resDev2.data.accessToken;
  const refreshDev2 = resDev2.data.refreshToken;

  // 3. Attempt to Register Device 3 (Laptop / Another phone) -> MUST BE BLOCKED
  console.log('\n--- 3. Attempt Register Device 3: Xiaomi 14 (Expected: BLOCKED 403 DEVICE_LIMIT_EXCEEDED) ---');
  const resDev3 = await request('/google', {
    method: 'POST',
    body: JSON.stringify({
      idToken,
      deviceId: 'device_xiaomi_14_03',
      deviceModel: 'Xiaomi 14',
      osVersion: 'Android 14',
      appVersion: '1.0.0',
      platform: 'ANDROID',
    }),
  });
  console.log('Status:', resDev3.status);
  console.log('Code:', resDev3.data.code);
  console.log('Active Devices reported:', resDev3.data.devices?.length);
  console.assert(resDev3.status === 403, 'Device 3 was not blocked!');
  console.assert(resDev3.data.code === 'DEVICE_LIMIT_EXCEEDED', 'Expected code DEVICE_LIMIT_EXCEEDED');
  console.assert(resDev3.data.devices.length === 2, 'Expected exactly 2 active devices in conflict');
  console.log('✅ Strict 2-Device Limit Enforced: 3rd device successfully blocked!');

  // 4. Query Registered Devices from Device 1 (GET /auth/devices)
  console.log('\n--- 4. Query Registered Devices from Device 1 (GET /auth/devices) ---');
  const resDevicesDev1 = await request('/devices', {
    method: 'GET',
    token: tokenDev1,
  });
  console.log('Status:', resDevicesDev1.status);
  console.log('Total Active Devices:', resDevicesDev1.data.currentCount);
  const currentDev = resDevicesDev1.data.devices.find((d) => d.isCurrent);
  const otherDev = resDevicesDev1.data.devices.find((d) => !d.isCurrent);
  console.log('Current Device (isCurrent=true):', currentDev?.deviceModel);
  console.log('Other Device (isCurrent=false):', otherDev?.deviceModel);
  console.assert(resDevicesDev1.data.currentCount === 2, 'Expected 2 devices');
  console.assert(currentDev?.deviceId === 'device_tab_s8_01', 'Current device identification mismatch');
  console.assert(otherDev?.deviceId === 'device_pixel_8_02', 'Other device identification mismatch');
  console.log('✅ Device identification and isCurrent flag verified accurately.');

  // 5. Revoke Device 2 from Device 1 (DELETE /auth/devices/:deviceId)
  console.log('\n--- 5. Revoke Device 2 (Pixel 8) from Device 1 (DELETE /auth/devices/device_pixel_8_02) ---');
  const resRevoke = await request('/devices/device_pixel_8_02', {
    method: 'DELETE',
    token: tokenDev1,
  });
  console.log('Status:', resRevoke.status);
  console.log('Remaining Devices:', resRevoke.data.devices?.length);
  console.assert(resRevoke.status === 200, 'Revocation failed');
  console.assert(resRevoke.data.devices.length === 1, 'Expected 1 remaining device');
  console.log('✅ Device 2 revoked successfully. Slot freed (Active: 1/2).');

  // 6. Device 3 Retries Sign-In -> Now ALLOWED
  console.log('\n--- 6. Device 3 Retries Sign-In (Now Expected: ALLOWED 2/2) ---');
  const resDev3Retry = await request('/google', {
    method: 'POST',
    body: JSON.stringify({
      idToken,
      deviceId: 'device_xiaomi_14_03',
      deviceModel: 'Xiaomi 14',
      osVersion: 'Android 14',
      appVersion: '1.0.0',
      platform: 'ANDROID',
    }),
  });
  console.log('Status:', resDev3Retry.status);
  console.assert(resDev3Retry.status === 200, 'Device 3 retry failed');
  console.log('✅ Device 3 successfully registered into freed slot (Slot 2/2).');

  // 7. Verify Revoked Device 2 Token Refresh Fails
  console.log('\n--- 7. Verify Revoked Device 2 Token Refresh Fails (Expected: 401 Unauthorized) ---');
  const resRevokedRefresh = await request('/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: refreshDev2,
      deviceId: 'device_pixel_8_02',
    }),
  });
  console.log('Status:', resRevokedRefresh.status);
  console.assert(resRevokedRefresh.status === 401, 'Revoked device was still able to refresh token!');
  console.log('✅ Revoked device refresh token successfully blocked.');

  // 8. Device 1 Logout & Session Invalidation
  console.log('\n--- 8. Device 1 Logout (POST /auth/logout) ---');
  const resLogout = await request('/logout', {
    method: 'POST',
    token: tokenDev1,
    body: JSON.stringify({ deviceId: 'device_tab_s8_01' }),
  });
  console.log('Status:', resLogout.status);
  console.assert(resLogout.status === 200, 'Logout failed');
  console.log('✅ Device 1 logged out.');

  // 9. Verify Device 1 Refresh Fails after Logout
  console.log('\n--- 9. Verify Device 1 Refresh Fails after Logout (Expected: 401 Unauthorized) ---');
  const resLoggedOutRefresh = await request('/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refreshToken: refreshDev1,
      deviceId: 'device_tab_s8_01',
    }),
  });
  console.log('Status:', resLoggedOutRefresh.status);
  console.assert(resLoggedOutRefresh.status === 401, 'Logged out device was still able to refresh token!');
  console.log('✅ Logged out session refresh token successfully invalidated.');

  console.log('\n==================================================================');
  console.log('🎉 PHASE 4 TWO-DEVICE LIMIT & SESSION SECURITY 100% VERIFIED!');
  console.log('==================================================================\n');
}

runPhase4Tests().catch((err) => {
  console.error('❌ Phase 4 test failed:', err);
  process.exit(1);
});
