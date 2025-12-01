import 'package:flutter_test/flutter_test.dart';
import 'package:pos/pos/models/product.dart';

void main() {
  group('Product Model', () {
    test('fromJson creates Product correctly', () {
      final json = {
        'id': 1,
        'sku': 'PROD001',
        'name': 'Test Product',
        'description': 'A test product',
        'price': 10.99,
        'tax_rate': 0.10,
        'stock_qty': 100.0,
        'is_active': true,
      };

      final product = Product.fromJson(json);

      expect(product.id, 1);
      expect(product.sku, 'PROD001');
      expect(product.name, 'Test Product');
      expect(product.price, 10.99);
      expect(product.taxRate, 0.10);
      expect(product.stockQty, 100.0);
      expect(product.isActive, true);
    });

    test('inStock returns true when stock_qty > 0', () {
      final product = Product(
        id: 1,
        sku: 'PROD001',
        name: 'Test Product',
        price: 10.99,
        taxRate: 0.10,
        stockQty: 10.0,
      );

      expect(product.inStock, true);
    });

    test('inStock returns false when stock_qty = 0', () {
      final product = Product(
        id: 1,
        sku: 'PROD001',
        name: 'Test Product',
        price: 10.99,
        taxRate: 0.10,
        stockQty: 0.0,
      );

      expect(product.inStock, false);
    });

    test('priceWithTax calculates correctly', () {
      final product = Product(
        id: 1,
        sku: 'PROD001',
        name: 'Test Product',
        price: 100.0,
        taxRate: 0.10,
        stockQty: 10.0,
      );

      expect(product.priceWithTax, 110.0);
    });
  });
}

