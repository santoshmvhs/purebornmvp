import 'package:dio/dio.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'env.dart';

/// API client for making HTTP requests to the backend
class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  late final Dio dio;

  ApiClient._internal() {
    print('[ApiClient] Initializing with base URL: ${Env.apiBaseUrl}');
    dio = Dio(BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: Env.apiTimeout,
      receiveTimeout: Env.apiTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add interceptors
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: _onRequest,
      onError: _onError,
    ));
  }

  /// Interceptor to add auth token to requests
  Future<void> _onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Get token from Supabase session
    String? token;
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session != null) {
        token = session.accessToken;
      }
    } catch (e) {
      print('[ApiClient] Error getting Supabase token: $e');
    }
    
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    
    handler.next(options);
  }
  
  /// Interceptor to handle errors
  void _onError(DioException error, ErrorInterceptorHandler handler) {
    final statusCode = error.response?.statusCode;
    final message = error.response?.data?['detail'] ?? 
                    error.response?.data?['message'] ?? 
                    error.message ?? 
                    'Unknown error';
    
    final fullUrl = '${error.requestOptions.baseUrl}${error.requestOptions.path}';
    
    print('[ApiClient] Error $statusCode on ${error.requestOptions.path}: $message');
    print('[ApiClient] Full URL: $fullUrl');
    print('[ApiClient] Base URL: ${error.requestOptions.baseUrl}');
    
    // Log connection errors with more detail
    if (error.type == DioExceptionType.connectionError || 
        error.type == DioExceptionType.connectionTimeout ||
        error.message?.contains('Connection refused') == true) {
      print('[ApiClient] Connection Error Details:');
      print('  - Type: ${error.type}');
      print('  - Message: ${error.message}');
      print('  - Base URL: ${Env.apiBaseUrl}');
      print('  - Check: 1) Backend is running, 2) URL is correct, 3) Network connectivity');
    }
    
    handler.next(error);
  }
}

