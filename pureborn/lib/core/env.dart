/// Environment configuration for the Pureborn app
class Env {
  /// API base URL
  /// Production: http://dk8o4k0cwkw404wws4woogok.192.168.68.113.sslip.io
  /// For Android emulator: http://10.0.2.2:9000
  /// For iOS simulator: http://localhost:9000
  /// For macOS desktop: http://localhost:9000
  /// For physical device: http://YOUR_COMPUTER_IP:9000
  static const String apiBaseUrl = 'http://dk8o4k0cwkw404wws4woogok.192.168.68.113.sslip.io';
  
  /// Supabase URL
  static const String supabaseUrl = 'https://nbptjmzakxgwpoidtxfo.supabase.co';
  
  /// Supabase Anon Key
  static const String supabaseAnonKey = 'sb_publishable_NVZ6IzS2vybrX8e_54Y1hw_HTaokqSn';
  
  /// API timeout duration
  static const Duration apiTimeout = Duration(seconds: 30);
  
  /// Token storage key
  static const String tokenKey = 'access_token';
}

