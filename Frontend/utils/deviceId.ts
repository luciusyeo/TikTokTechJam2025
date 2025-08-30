import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'device_id';

/**
 * Get the unique device ID. Generates a new UUID if one doesn't exist.
 * The same ID will persist across app sessions.
 * 
 * @returns {Promise<string>} The device's unique identifier
 */
export async function getDeviceId(): Promise<string> {
  try {
    // Try to get existing device ID from storage
    const existingId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (existingId) {
      return existingId;
    }
    
    // Generate new UUID if none exists
    const newDeviceId = Crypto.randomUUID();
    
    // Store for future use
    await AsyncStorage.setItem(DEVICE_ID_KEY, newDeviceId);
    
    console.log(`Generated new device ID: ${newDeviceId}`);
    return newDeviceId;
    
  } catch (error) {
    console.error('Failed to get/generate device ID:', error);
    // Fallback to timestamp-based ID if crypto fails
    const fallbackId = `device_${Date.now()}`;
    try {
      await AsyncStorage.setItem(DEVICE_ID_KEY, fallbackId);
    } catch (storageError) {
      console.error('Failed to store fallback device ID:', storageError);
    }
    return fallbackId;
  }
}

/**
 * Reset the device ID (generates a new one)
 * Useful for testing or if user wants a fresh identity
 * 
 * @returns {Promise<string>} The new device ID
 */
export async function resetDeviceId(): Promise<string> {
  try {
    await AsyncStorage.removeItem(DEVICE_ID_KEY);
    return await getDeviceId(); // This will generate a new one
  } catch (error) {
    console.error('Failed to reset device ID:', error);
    return await getDeviceId(); // Fallback to normal flow
  }
}