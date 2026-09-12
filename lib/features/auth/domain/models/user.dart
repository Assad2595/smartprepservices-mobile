enum Role {
  superAdmin,
  admin,
  warehouseManager,
  operator,
  customer,
  unknown;

  static Role fromApi(String? value) {
    switch (value) {
      case 'SUPER_ADMIN':
        return Role.superAdmin;
      case 'ADMIN':
        return Role.admin;
      case 'WAREHOUSE_MANAGER':
        return Role.warehouseManager;
      case 'OPERATOR':
        return Role.operator;
      case 'CUSTOMER':
        return Role.customer;
      default:
        return Role.unknown;
    }
  }

  String get apiValue {
    switch (this) {
      case Role.superAdmin:
        return 'SUPER_ADMIN';
      case Role.admin:
        return 'ADMIN';
      case Role.warehouseManager:
        return 'WAREHOUSE_MANAGER';
      case Role.operator:
        return 'OPERATOR';
      case Role.customer:
        return 'CUSTOMER';
      case Role.unknown:
        return 'UNKNOWN';
    }
  }

  bool get isStaff =>
      this == Role.superAdmin ||
      this == Role.admin ||
      this == Role.warehouseManager ||
      this == Role.operator;

  bool get isAdmin =>
      this == Role.superAdmin ||
      this == Role.admin ||
      this == Role.warehouseManager;

  String get label {
    switch (this) {
      case Role.superAdmin:
        return 'Super Admin';
      case Role.admin:
        return 'Admin';
      case Role.warehouseManager:
        return 'Warehouse Manager';
      case Role.operator:
        return 'Operator';
      case Role.customer:
        return 'Customer';
      case Role.unknown:
        return 'User';
    }
  }
}

class AuthUser {
  const AuthUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.companyId,
  });

  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final Role role;
  final String? companyId;

  String get displayName => '$firstName $lastName'.trim();

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: (json['firstName'] as String?) ?? '',
      lastName: (json['lastName'] as String?) ?? '',
      role: Role.fromApi(json['role'] as String?),
      companyId: json['companyId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'firstName': firstName,
        'lastName': lastName,
        'role': role.apiValue,
        'companyId': companyId,
      };
}

class LoginResult {
  const LoginResult({
    required this.user,
    required this.accessToken,
    required this.refreshToken,
  });

  final AuthUser user;
  final String accessToken;
  final String refreshToken;

  factory LoginResult.fromJson(Map<String, dynamic> json) {
    return LoginResult(
      user: AuthUser.fromJson(json['user'] as Map<String, dynamic>),
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
    );
  }
}
