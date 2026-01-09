# PlanIt 🎯

**PlanIt** is a minimalist, high-performance desktop widget for managing your Notion tasks. Built with [Tauri](https://tauri.app/), [React](https://reactjs.org/), and [Rust](https://www.rust-lang.org/), it bridges the gap between your heavy-duty Notion workspace and your daily quick-access needs.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Tauri](https://img.shields.io/badge/built%20with-Tauri-orange)
[![Test & Build](https://github.com/phuongoliver/planit/actions/workflows/test.yml/badge.svg)](https://github.com/phuongoliver/planit/actions/workflows/test.yml)
[![Release](https://github.com/phuongoliver/planit/actions/workflows/release.yml/badge.svg)](https://github.com/phuongoliver/planit/actions/workflows/release.yml)

## ✨ Features

- **Blazing Fast**: Native performance with a lightweight Rust backend.
- **Minimalist UI**: Clean, distraction-free interface with glassmorphism aesthetics.
- **Two-Way Sync**: Fetches tasks from Notion and syncs completion status back instantly.
- **Dark Mode**: sleek dark mode enabled by default for a premium feel.
- **Objective Alignment**: Displays task relation to higher-level objectives (via Notion Rollups).
- **Secure**: Your Notion API token is stored locally on your device, never sent to third-party servers.

## 📥 Download

You can download the latest version of PlanIt from our **[Releases Page](https://github.com/phuongoliver/planit/releases)**.

**For Windows:**
1. Download the `.msi` or `.exe` file (e.g., `PlanIt_x.x.x_x64_en-US.msi`).
2. Double-click the file to install.
3. PlanIt will launch automatically.

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or newer)
- **Rust** & **Cargo** (v1.70 or newer)
- **Microsoft Visual Studio C++ Build Tools** (Windows only)

### Building from Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/phuongoliver/planit.git
   cd planit
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run tauri dev
   ```

## ⚙️ Configuration

To use PlanIt, you need to connect it to your Notion workspace and follow [this template](https://topaz-enthusiasm-fb5.notion.site/PlanIt-Plan-Template-9eb32f6a62768376ac1481e62890b6ae?source=copy_link):

1. **Create a Notion Integration**:
   - Go to [Notion My Integrations](https://www.notion.so/my-integrations).
   - Create a new integration and copy the `Internal Integration Token`.

2. **Prepare your Databases**:
   - You need a **Tasks Database** and (optionally) an **Objectives Database**.
   - **Share** both databases with your new Integration (click the `...` menu on the database page -> `Connections` -> Add your integration).

3. **In-App Setup**:
   - Launch PlanIt.
   - Go to **Settings**.
   - Paste your **Token** and the **Database IDs** (found in the URL of your Notion databases).

## 🤝 Contributing

Contributions are welcome! We want to make this the best desktop companion for Notion users.

1. **Fork** the repository.
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`).
3. **Commit** your changes (`git commit -m 'Add some amazing feature'`).
4. **Push** to the branch (`git push origin feature/amazing-feature`).
5. **Open** a Pull Request.

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
