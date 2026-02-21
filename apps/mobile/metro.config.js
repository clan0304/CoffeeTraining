const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Only watch the shared packages folder — NOT the entire monorepo root.
// Watching the full root causes Metro to find duplicate native modules
// (e.g. react-native-safe-area-context in root vs app node_modules).
config.watchFolders = [
  path.resolve(monorepoRoot, 'packages'),
];

// Disable hierarchical lookup so Metro doesn't walk up directories
config.resolver.disableHierarchicalLookup = true;

// Explicitly set module resolution paths.
// App-local node_modules takes priority over root (for hoisted deps).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
