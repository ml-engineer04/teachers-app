// Mobile Welcome Screen & Google Auth Flow Complete Suite
const API_URL = 'http://localhost:4000/api/v1';

async function runTest() {
  console.log('🧪 Testing Complete Welcome Screen Google Auth Pipeline...');

  const toBase64Url = (str) => Buffer.from(str).toString('base64url');

  const createDevIdToken = (email, name) => {
    const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'google-dev-key' }));
    const now = Math.floor(Date.now() / 1000);
    const payload = toBase64Url(JSON.stringify({
      iss: 'https://accounts.google.com',
      sub: 'google_sub_' + Buffer.from(email).toString('hex').slice(0, 16),
      aud: '541312544893-favcmb2v7c257r2n7mlslu0e37dilrm1.apps.googleusercontent.com',
      email: email,
      email_verified: true,
      name: name,
      picture: 'https://lh3.googleusercontent.com/a/default-avatar',
      iat: now,
      exp: now + 3600,
    }));
    return `${header}.${payload}.dev_sig`;
  };

  const idToken = createDevIdToken('mlrahmonjon@gmail.com', 'Rahmonjon Qosimov');

  // Test 1: First device sign in
  console.log('\n--- Test 1: Device 1 Direct Google Sign-In ---');
  const res1 = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken,
      deviceId: 'device_alpha_1',
      deviceModel: 'Samsung Galaxy Tab S7',
      osVersion: 'Android 14',
      appVersion: '1.0.0',
      platform: 'ANDROID',
    }),
  });
  const data1 = await res1.json();
  console.log('Status:', res1.status);
  if (res1.status === 200) {
    console.log('✅ Device 1 authenticated successfully.');
  }

  // Test 2: Second device sign in
  console.log('\n--- Test 2: Device 2 Direct Google Sign-In ---');
  const res2 = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken,
      deviceId: 'device_beta_2',
      deviceModel: 'Google Pixel 8',
      osVersion: 'Android 14',
      appVersion: '1.0.0',
      platform: 'ANDROID',
    }),
  });
  const data2 = await res2.json();
  console.log('Status:', res2.status);
  if (res2.status === 200) {
    console.log('✅ Device 2 authenticated successfully (2/2 active slots filled).');
  }

  // Test 3: Third device sign in -> MUST return 403 DEVICE_LIMIT_EXCEEDED
  console.log('\n--- Test 3: Device 3 Attempt -> Expect 403 DEVICE_LIMIT_EXCEEDED ---');
  const res3 = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken,
      deviceId: 'device_gamma_3',
      deviceModel: 'Apple iPad Pro',
      osVersion: 'iOS 17.5',
      appVersion: '1.0.0',
      platform: 'IOS',
    }),
  });
  const data3 = await res3.json();
  console.log('Status:', res3.status);
  console.log('Code:', data3.code);
  console.log('Active Devices reported:', data3.devices?.length);
  if (res3.status !== 403 || data3.code !== 'DEVICE_LIMIT_EXCEEDED') {
    throw new Error('Device 3 was not blocked by 2-device limit!');
  }
  console.log('✅ 2-Device limit successfully triggered modal data!');

  // Test 4: Evict device 1 via the modal's endpoint
  const deviceToDisconnect = data3.devices[0].deviceId;
  console.log(`\n--- Test 4: Disconnecting device ${deviceToDisconnect} via DELETE /auth/devices/user/${data3.userId}/${deviceToDisconnect} ---`);
  const delRes = await fetch(`${API_URL}/auth/devices/user/${data3.userId}/${deviceToDisconnect}`, {
    method: 'DELETE',
  });
  const delData = await delRes.json();
  console.log('Eviction Status:', delRes.status, '| Success:', delData.success);
  if (delRes.status !== 200 || !delData.success) {
    throw new Error('Device disconnection failed');
  }
  console.log('✅ Old device evicted, slot available.');

  // Test 5: Retry Device 3 sign in -> MUST SUCCEED now
  console.log('\n--- Test 5: Retrying Device 3 Sign-In ---');
  const res3Retry = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken,
      deviceId: 'device_gamma_3',
      deviceModel: 'Apple iPad Pro',
      osVersion: 'iOS 17.5',
      appVersion: '1.0.0',
      platform: 'IOS',
    }),
  });
  const data3Retry = await res3Retry.json();
  console.log('Retry Status:', res3Retry.status);
  if (res3Retry.status !== 200 || !data3Retry.accessToken) {
    throw new Error('Retry sign in failed: ' + JSON.stringify(data3Retry));
  }
  console.log('✅ Device 3 authenticated successfully! User:', data3Retry.user.fullName);

  console.log('\n======================================================');
  console.log('🎉 100% COMPLETE: ALL WELCOME SCREEN & AUTH FLOWS PASSED!');
  console.log('======================================================\n');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
