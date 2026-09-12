class Product {
  const Product({
    required this.id,
    required this.sku,
    required this.title,
    this.asin,
    this.fnsku,
    this.companyName,
  });

  final String id;
  final String sku;
  final String title;
  final String? asin;
  final String? fnsku;
  final String? companyName;

  factory Product.fromJson(Map<String, dynamic> json) {
    final company = json['company'] as Map<String, dynamic>?;
    return Product(
      id: json['id'] as String,
      sku: (json['sku'] as String?) ?? '',
      title: (json['title'] as String?) ?? (json['name'] as String?) ?? '',
      asin: json['asin'] as String?,
      fnsku: json['fnsku'] as String?,
      companyName: company?['name'] as String?,
    );
  }
}
