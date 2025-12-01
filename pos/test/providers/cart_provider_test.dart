import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pos/pos/presentation/cart_provider.dart';
import 'package:pos/pos/models/product.dart';
import 'package:pos/pos/data/sales_repository.dart';

void main() {
  group('CartNotifier', () {
    late ProviderContainer container;
    late SalesRepository salesRepository;

    setUp(() {
      salesRepository = SalesRepository();
      container = ProviderContainer(
        overrides: [
          salesRepositoryProvider.overrideWithValue(salesRepository),
        ],
      );
    });

    tearDown(() {
      container.dispose();
    });

    test('initial state is empty', () {
      final cartState = container.read(cartProvider);
      
      expect(cartState.items, isEmpty);
      expect(cartState.itemCount, 0);
      expect(cartState.subtotal, 0.0);
      expect(cartState.totalTax, 0.0);
      expect(cartState.grandTotal, 0.0);
    });

    test('addProduct adds new product to cart', () {
      final product = Product(
        id: 1,
        sku: 'PROD001',
        name: 'Test Product',
        price: 10.0,
        taxRate: 0.10,
        stockQty: 100.0,
      );

      container.read(cartProvider.notifier).addProduct(product);
      final cartState = container.read(cartProvider);

      expect(cartState.items.length, 1);
      expect(cartState.items[0].product.id, 1);
      expect(cartState.items[0].quantity, 1.0);
    });

    test('addProduct increases quantity for existing product', () {
      final product = Product(
        id: 1,
        sku: 'PROD001',
        name: 'Test Product',
        price: 10.0,
        taxRate: 0.10,
        stockQty: 100.0,
      );

      final notifier = container.read(cartProvider.notifier);
      notifier.addProduct(product);
      notifier.addProduct(product);
      
      final cartState = container.read(cartProvider);

      expect(cartState.items.length, 1);
      expect(cartState.items[0].quantity, 2.0);
    });

    test('updateQuantity updates product quantity', () {
      final product = Product(
        id: 1,
        sku: 'PROD001',
        name: 'Test Product',
        price: 10.0,
        taxRate: 0.10,
        stockQty: 100.0,
      );

      final notifier = container.read(cartProvider.notifier);
      notifier.addProduct(product);
      notifier.updateQuantity(1, 5.0);
      
      final cartState = container.read(cartProvider);

      expect(cartState.items[0].quantity, 5.0);
    });

    test('removeProduct removes product from cart', () {
      final product = Product(
        id: 1,
        sku: 'PROD001',
        name: 'Test Product',
        price: 10.0,
        taxRate: 0.10,
        stockQty: 100.0,
      );

      final notifier = container.read(cartProvider.notifier);
      notifier.addProduct(product);
      notifier.removeProduct(1);
      
      final cartState = container.read(cartProvider);

      expect(cartState.items, isEmpty);
    });

    test('cart calculates totals correctly', () {
      final product1 = Product(
        id: 1,
        sku: 'PROD001',
        name: 'Product 1',
        price: 10.0,
        taxRate: 0.10,
        stockQty: 100.0,
      );

      final product2 = Product(
        id: 2,
        sku: 'PROD002',
        name: 'Product 2',
        price: 20.0,
        taxRate: 0.15,
        stockQty: 100.0,
      );

      final notifier = container.read(cartProvider.notifier);
      notifier.addProduct(product1, quantity: 2); // 2 * 10 = 20, tax = 2
      notifier.addProduct(product2, quantity: 1); // 1 * 20 = 20, tax = 3
      
      final cartState = container.read(cartProvider);

      expect(cartState.subtotal, 40.0);
      expect(cartState.totalTax, 5.0);
      expect(cartState.grandTotal, 45.0);
    });

    test('clear empties the cart', () {
      final product = Product(
        id: 1,
        sku: 'PROD001',
        name: 'Test Product',
        price: 10.0,
        taxRate: 0.10,
        stockQty: 100.0,
      );

      final notifier = container.read(cartProvider.notifier);
      notifier.addProduct(product);
      notifier.clear();
      
      final cartState = container.read(cartProvider);

      expect(cartState.items, isEmpty);
    });
  });
}

