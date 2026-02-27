// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const {
  resolver: { sourceExts, assetExts },
} = config;

// Add .mjs for Solana libraries that rely on ESM modules
config.resolver.sourceExts = [...sourceExts, "mjs"];

// Disable package-exports resolution — several Solana dependencies
// (rpc-websockets, @noble/hashes) don't declare Android-compatible
// "exports" conditions and emit noisy WARNs. The .mjs extension above
// already handles ESM files correctly without this flag.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
