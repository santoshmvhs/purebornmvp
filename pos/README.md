# Augment POS - Flutter Frontend

Production-ready Flutter application for the Augment POS system with JWT authentication, state management using Riverpod, and comprehensive testing.

## Features

- 🔐 **JWT Authentication** - Secure login with token storage
- 🛒 **Shopping Cart** - Add products, adjust quantities, and checkout
- 📦 **Product Management** - Browse and search products
- 💰 **Sales Processing** - Complete transactions with automatic tax calculation
- �� **Modern UI** - Clean, responsive Material Design interface
- 🧪 **Comprehensive Testing** - Widget and unit tests
- 📱 **Cross-Platform** - Runs on Android, iOS, Web, and Desktop

## Prerequisites

- Flutter SDK 3.10.0 or higher
- Dart SDK 3.10.0 or higher
- Running backend API (see `../backend/README.md`)

## Quick Start

### 1. Install Dependencies

```bash
flutter pub get
```

### 2. Generate Code

Generate JSON serialization code:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

### 3. Configure API Endpoint

Edit `lib/core/env.dart` and set the correct API base URL:

```dart
// For Android emulator
static const String apiBaseUrl = 'http://10.0.2.2:8000';

// For iOS simulator
static const String apiBaseUrl = 'http://localhost:8000';

// For physical device (replace with your computer's IP)
static const String apiBaseUrl = 'http://192.168.1.100:8000';
```

### 4. Run the App

```bash
# Run on connected device/emulator
flutter run

# Run on specific device
flutter devices
flutter run -d <device_id>

# Run on Chrome (web)
flutter run -d chrome
```

## Project Structure

```
pos/
├── lib/
│   ├── core/
│   │   ├── api_client.dart       # HTTP client with Dio
│   │   ├── env.dart               # Environment configuration
│   │   └── exceptions.dart        # Custom exceptions
│   ├── auth/
│   │   ├── data/
│   │   │   └── auth_repository.dart
│   │   └── presentation/
│   │       ├── auth_provider.dart
│   │       └── login_screen.dart
│   ├── pos/
│   │   ├── data/
│   │   │   ├── product_repository.dart
│   │   │   └── sales_repository.dart
│   │   ├── models/
│   │   │   ├── product.dart
│   │   │   ├── sale.dart
│   │   │   └── sale_item.dart
│   │   └── presentation/
│   │       ├── cart_provider.dart
│   │       ├── product_provider.dart
│   │       └── pos_home_screen.dart
│   ├── widgets/
│   │   ├── cart_panel.dart
│   │   └── product_grid.dart
│   └── main.dart
├── test/
│   ├── models/
│   │   └── product_test.dart
│   ├── providers/
│   │   └── cart_provider_test.dart
│   └── widget_test.dart
├── pubspec.yaml
└── README.md
```

## Architecture

The app follows a clean architecture pattern with clear separation of concerns:

- **Data Layer**: Repositories handle API communication
- **Domain Layer**: Models represent business entities
- **Presentation Layer**: Providers (Riverpod) manage state, Screens handle UI

### State Management

The app uses **Riverpod** for state management:

- `authProvider` - Authentication state
- `productProvider` - Product list and search
- `cartProvider` - Shopping cart state

### API Client

The `ApiClient` class (using Dio) handles:
- Automatic token injection
- Error handling and transformation
- Request/response interceptors

## Running Tests

```bash
# Run all tests
flutter test

# Run with coverage
flutter test --coverage

# Run specific test file
flutter test test/models/product_test.dart

# Run widget tests only
flutter test test/widget_test.dart
```

## Building for Production

### Android

```bash
# Build APK
flutter build apk --release

# Build App Bundle (for Play Store)
flutter build appbundle --release
```

### iOS

```bash
# Build for iOS
flutter build ios --release
```

### Web

```bash
# Build for web
flutter build web --release
```

## Usage

### Login

1. Launch the app
2. Enter credentials (default: `admin` / `admin123`)
3. Tap "Login"

### Browse Products

- Products are displayed in a grid
- Use the search bar to filter products
- Tap "Refresh" to reload products

### Add to Cart

- Tap any product to add it to the cart
- Cart appears on the right side (or bottom on mobile)
- Adjust quantities using +/- buttons
- Remove items with the X button

### Checkout

1. Review cart items and total
2. Tap "Checkout" button
3. Sale is processed and confirmation is shown
4. Cart is automatically cleared

## Configuration

### API Timeout

Edit `lib/core/env.dart`:

```dart
static const Duration apiTimeout = Duration(seconds: 30);
```

### Theme

Edit `lib/main.dart`:

```dart
theme: ThemeData(
  colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
  useMaterial3: true,
),
```

## Troubleshooting

### Cannot connect to backend

- **Android Emulator**: Use `http://10.0.2.2:8000`
- **iOS Simulator**: Use `http://localhost:8000`
- **Physical Device**: Use your computer's IP address (e.g., `http://192.168.1.100:8000`)
- Ensure backend is running and accessible

### Build runner fails

```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

### Tests failing

```bash
# Ensure dependencies are installed
flutter pub get

# Run tests with verbose output
flutter test --verbose
```

### Token expired

- Tokens expire after 60 minutes by default
- Simply log out and log back in

## Dependencies

### Production

- **flutter_riverpod** - State management
- **dio** - HTTP client
- **flutter_secure_storage** - Secure token storage
- **json_annotation** - JSON serialization
- **intl** - Internationalization and formatting

### Development

- **build_runner** - Code generation
- **json_serializable** - JSON code generation
- **flutter_test** - Testing framework
- **mockito** - Mocking for tests

## License

MIT License - feel free to use this project for your own purposes.

## Support

For issues or questions, please refer to the main project documentation or open an issue on the GitHub repository.
