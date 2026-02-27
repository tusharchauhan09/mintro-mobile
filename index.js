// Polyfills MUST load before anything else — Solana crypto needs Buffer + crypto globals.
import './polyfills';

// Hand off to Expo Router's default entry.
import 'expo-router/entry';
