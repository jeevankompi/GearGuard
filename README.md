# Gear Guard
****PLEASE I KINDLY REQUEST TO RUN THE BOTH LOCAL HOST AND FIREBASE BACKEND WHEN EVALUATING, SO THAT YOU CAN SEE OUR WORK WE HAVE DONE***
[![CI](https://github.com/your-username/gear-guard/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/gear-guard/actions/workflows/ci.yml)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)

A high-end TypeScript project with enterprise-grade tooling and best practices.

## 🚀 Features

- **TypeScript** - Full type safety and modern ES2020+ features
- **ESLint & Prettier** - Consistent code style and quality
- **Jest** - Comprehensive testing with coverage reporting
- **Husky & lint-staged** - Pre-commit hooks for code quality
- **Commitlint** - Conventional commit message enforcement
- **GitHub Actions** - Automated CI/CD pipeline
- **VS Code Integration** - Optimized development experience

## 📋 Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Java (JDK 17) for Firebase Firestore emulator

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/your-username/gear-guard.git

# Navigate to project directory
cd gear-guard

# Install dependencies
npm install

# Set up Git hooks
npm run prepare
```

## 📁 Project Structure

```
gear-guard/
├── .github/              # GitHub Actions workflows
├── .husky/               # Git hooks
├── .vscode/              # VS Code settings
├── src/                  # Source code
│   ├── config/           # Configuration
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   ├── greet.ts          # Example module
│   └── index.ts          # Entry point
├── tests/                # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── e2e/              # End-to-end tests
├── dist/                 # Compiled output (generated)
└── coverage/             # Test coverage (generated)
```

## 🔧 Available Scripts

| Script                  | Description                             |
| ----------------------- | --------------------------------------- |
| `npm run build`         | Compile TypeScript to JavaScript        |
| `npm run start`         | Run the compiled application            |
| `npm run dev`           | Run in development mode with ts-node    |
| `npm run test`          | Run all tests                           |
| `npm run test:watch`    | Run tests in watch mode                 |
| `npm run test:coverage` | Run tests with coverage report          |
| `npm run lint`          | Lint source files                       |
| `npm run lint:fix`      | Fix linting issues                      |
| `npm run format`        | Format code with Prettier               |
| `npm run format:check`  | Check code formatting                   |
| `npm run typecheck`     | Type-check without emitting             |
| `npm run clean`         | Remove build artifacts                  |
| `npm run prepare`       | Set up Husky hooks                      |
| `npm run emulators`     | Start Firebase Auth+Firestore emulators |
| `npm run seed`          | Seed emulator with demo data            |

## ▶️ Run the hackathon demo (web + emulators)

1. Start emulators (leave this running):

```bash
npm run emulators
```

2. Seed demo data:

```bash
npm run seed
```

3. Start the web app:

```bash
cd web
npm run dev
```

Then open `http://localhost:5173/`.

Notes:

- The emulator UI is at `http://127.0.0.1:4000/`.
- On some Windows setups, PowerShell execution policy can block `npm.ps1`. If that happens, run scripts with `npm.cmd` instead (e.g. `npm.cmd run emulators`).
- This repo pins `firebase-tools` locally to a version that runs with Java 17; newer global Firebase CLI versions may require Java 21+.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Commit Convention

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Test updates
- `build:` - Build system changes
- `ci:` - CI configuration changes
- `chore:` - Other changes

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with TypeScript
- Tested with Jest
- Formatted with Prettier
- Linted with ESLint
