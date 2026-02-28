# Mintro Mobile 🕹️

A **Solana Mobile dApp** hackathon project featuring a retro arcade gaming universe. Immerse yourself in a pixel-art-inspired UI with neon glow effects, dynamic characters, and seamless Web3 integrations on the Solana blockchain.

## ✨ Features

- **Retro Arcade Aesthetic**: A distinct pixelated design with CRT/scanline textures, chunky icons, and glowing neon palettes that evoke pure nostalgia.
- **Solana Web3 Integration**: Built-in support for the Solana ecosystem utilizing the Mobile Wallet Adapter protocol for swift wallet connections and transactions.
- **Dynamic Character Roster**: View and interact with your retro game characters (e.g., Neon Drifters, Cyber Punks) complete with rarity levels, classes, and roles.
- **State Management**: Fluid, lightweight state handled by `zustand` focusing entirely on a snappy, lag-free user experience.
- **Local Persistence**: Secured and efficient local data storage using `@react-native-async-storage/async-storage`.

## 🛠️ Tech Stack

- **Framework**: [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/) (File-based routing with Expo Router)
- **Blockchain**: `@solana/web3.js` & Mobile Wallet Adapter Protocol
- **State Management**: Zustand
- **Local Storage**: `AsyncStorage`
- **Navigation**: `React Navigation` / `expo-router`
- **Typing**: TypeScript

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm or yarn or bun
- Expo CLI
- Android Studio / Android Emulator (Designed specifically for Android Mobile)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/TusharChauhan09/Mintro-Mobile.git
   cd Mintro-Mobile/project
   ```

2. **Install all dependencies:**

   ```bash
   npm install
   ```

3. **Start the development server:**

   ```bash
   npx expo start
   ```

4. **Run on Android Emulator:**
   Press `a` in the Expo server terminal or directly run:
   ```bash
   npx expo run:android
   ```

## 📂 Project Structure

- **/app**: Contains file-based routing logic (`_layout.tsx`, screens, onboard flows).
- **/components**: Reusable UI elements (e.g., `Header.tsx`, `RosterSection.tsx`) showcasing the retro pixel style.
- **/constants**: Holds theme layouts, neon color tokens, and font definitions.
- **/lib**: Core libraries including local storage functions and other utility helpers.
- **/stores**: Zustand state management stores (e.g., `wallet-store.ts`).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📜 License

[MIT License](LICENSE)
