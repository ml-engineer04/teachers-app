interface DeviceRecord {
  id: string;
  userId: string;
  deviceId: string;
  deviceModel: string;
  isActive: boolean;
}

class DeviceLimitManager {
  private devices: DeviceRecord[] = [];
  private readonly MAX_DEVICES = 2;

  registerDevice(userId: string, deviceId: string, deviceModel: string): { success: boolean; error?: string } {
    // Check if this specific device is already registered
    const existing = this.devices.find((d) => d.userId === userId && d.deviceId === deviceId);
    if (existing) {
      existing.isActive = true;
      return { success: true };
    }

    // Count currently active devices for this user
    const activeCount = this.devices.filter((d) => d.userId === userId && d.isActive).length;

    if (activeCount >= this.MAX_DEVICES) {
      return {
        success: false,
        error: `DEVICE_LIMIT_EXCEEDED: Maksimal ${this.MAX_DEVICES} ta qurilma chegarasiga yetildi. Yangi qurilmani ulash uchun eskisini uzing.`,
      };
    }

    this.devices.push({
      id: `dev_${Date.now()}_${Math.random()}`,
      userId,
      deviceId,
      deviceModel,
      isActive: true,
    });

    return { success: true };
  }

  disconnectDevice(userId: string, deviceId: string): boolean {
    const dev = this.devices.find((d) => d.userId === userId && d.deviceId === deviceId);
    if (!dev) return false;
    dev.isActive = false;
    return true;
  }

  getActiveDevicesCount(userId: string): number {
    return this.devices.filter((d) => d.userId === userId && d.isActive).length;
  }
}

export function runDeviceLimitTests(): { name: string; passed: boolean; details: string }[] {
  const results: { name: string; passed: boolean; details: string }[] = [];
  const manager = new DeviceLimitManager();
  const userId = 'teacher_nodira_123';

  // Test 1: Register primary device (Phone)
  const r1 = manager.registerDevice(userId, 'sec_samsung_s23', 'Samsung Galaxy S23');
  results.push({
    name: 'Primary Device Registration (Device 1/2)',
    passed: r1.success && manager.getActiveDevicesCount(userId) === 1,
    details: `Active devices: ${manager.getActiveDevicesCount(userId)}/2`,
  });

  // Test 2: Register secondary device (Tablet)
  const r2 = manager.registerDevice(userId, 'sec_galaxy_tab_s7', 'Samsung Galaxy Tab S7');
  results.push({
    name: 'Secondary Device Registration (Device 2/2)',
    passed: r2.success && manager.getActiveDevicesCount(userId) === 2,
    details: `Active devices: ${manager.getActiveDevicesCount(userId)}/2`,
  });

  // Test 3: Attempt to register third device (Should be BLOCKED)
  const r3 = manager.registerDevice(userId, 'sec_redmi_note_13', 'Xiaomi Redmi Note 13');
  results.push({
    name: 'Third Device Rejection (2-Device Limit Enforced)',
    passed: !r3.success && r3.error?.includes('DEVICE_LIMIT_EXCEEDED') === true,
    details: `Success: ${r3.success}, Error: ${r3.error}`,
  });

  // Test 4: Disconnect older phone to free up slot
  const disconnected = manager.disconnectDevice(userId, 'sec_samsung_s23');
  results.push({
    name: 'Remote Device Revocation / Disconnect',
    passed: disconnected && manager.getActiveDevicesCount(userId) === 1,
    details: `Slot freed. Active devices: ${manager.getActiveDevicesCount(userId)}/2`,
  });

  // Test 5: Re-attempt registering new phone after freeing slot (Should SUCCEED)
  const r5 = manager.registerDevice(userId, 'sec_redmi_note_13', 'Xiaomi Redmi Note 13');
  results.push({
    name: 'New Device Registration into Freed Slot',
    passed: r5.success && manager.getActiveDevicesCount(userId) === 2,
    details: `Successfully registered. Active devices: ${manager.getActiveDevicesCount(userId)}/2`,
  });

  return results;
}
