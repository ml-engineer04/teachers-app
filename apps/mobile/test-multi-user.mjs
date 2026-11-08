const API_URL = 'http://localhost:4000/api/v1';

async function testMultiUser() {
  console.log('🧪 Testing Multi-User Independent Google Sign-In...');

  const toBase64Url = (str) => Buffer.from(str).toString('base64url');

  const createDevIdToken = (email, name) => {
    const header = toBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'google-key' }));
    const now = Math.floor(Date.now() / 1000);
    const payload = toBase64Url(JSON.stringify({
      iss: 'https://accounts.google.com',
      sub: 'google_sub_' + Buffer.from(email).toString('hex').slice(0, 16),
      aud: '541312544893-favcmb2v7c257r2n7mlslu0e37dilrm1.apps.googleusercontent.com',
      email: email,
      email_verified: true,
      name: name,
      picture: 'https://lh3.googleusercontent.com/a/avatar',
      iat: now,
      exp: now + 3600,
    }));
    return `${header}.${payload}.sig`;
  };

  // User 1: Dilnoza Karimova
  console.log('\n--- 1. User 1: Dilnoza Karimova (dilnoza@gmail.com) logs in ---');
  const token1 = createDevIdToken('dilnoza@gmail.com', 'Dilnoza Karimova');
  const res1 = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: token1,
      deviceId: 'dilnoza_phone_1',
      deviceModel: 'Samsung Galaxy A54',
      osVersion: 'Android 14',
      appVersion: '1.0.0',
      platform: 'ANDROID',
    }),
  });
  const data1 = await res1.json();
  console.log('Status:', res1.status);
  console.log('Logged in user:', data1.user.fullName, `(${data1.user.email})`);
  if (data1.user.email !== 'dilnoza@gmail.com' || data1.user.fullName !== 'Dilnoza Karimova') {
    throw new Error('User 1 identity mismatch!');
  }
  console.log('✅ User 1 successfully created & logged in under their own account.');

  // User 2: Anvar Toshmatov
  console.log('\n--- 2. User 2: Anvar Toshmatov (anvar@gmail.com) logs in ---');
  const token2 = createDevIdToken('anvar@gmail.com', 'Anvar Toshmatov');
  const res2 = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: token2,
      deviceId: 'anvar_tablet_1',
      deviceModel: 'Xiaomi Pad 6',
      osVersion: 'Android 13',
      appVersion: '1.0.0',
      platform: 'ANDROID',
    }),
  });
  const data2 = await res2.json();
  console.log('Status:', res2.status);
  console.log('Logged in user:', data2.user.fullName, `(${data2.user.email})`);
  if (data2.user.email !== 'anvar@gmail.com' || data2.user.fullName !== 'Anvar Toshmatov') {
    throw new Error('User 2 identity mismatch!');
  }
  console.log('✅ User 2 successfully created & logged in under their own account completely independently.');

  // Verify User 2 has their own device list
  const devRes2 = await fetch(`${API_URL}/auth/devices/user/${data2.user.id}`);
  const devData2 = await devRes2.json();
  console.log('User 2 Devices:', devData2.devices.map(d => `${d.deviceModel} (${d.deviceId})`));
  if (devData2.devices.length !== 1 || devData2.devices[0].deviceId !== 'anvar_tablet_1') {
    throw new Error('User 2 device list contaminated!');
  }
  console.log('✅ Device isolation verified: User 2 has only their own device.');

  console.log('\n======================================================');
  console.log('🎉 MULTI-USER ISOLATION & DYNAMIC GOOGLE AUTH VERIFIED 100%!');
  console.log('======================================================\n');
}

testMultiUser().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
