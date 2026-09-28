/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // @wagmi/connectors pulls in Coinbase's baseAccount connector, which in turn pulls
    // in optional @x402/* payment packages we don't install (only the `injected`
    // connector is used here). Stub them out rather than adding unused dependencies.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/evm/upto/client": false,
      "@x402/evm/exact/client": false,
      "@x402/core/client": false,
      "@x402/svm/exact/client": false,
      "@x402/evm": false,
      // Same story: metaMask/walletConnect connectors (unused — we only wire up `injected`)
      // pull in React Native storage and a pretty-printer that don't apply in a web build.
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
};

module.exports = nextConfig;
