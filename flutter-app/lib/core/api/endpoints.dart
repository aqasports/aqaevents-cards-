/// API configuration with dev/prod toggle
class ApiConfig {
  // Set to true during local development (points to localhost:3000)
  static const bool useDev = bool.fromEnvironment('USE_DEV', defaultValue: false);

  static const String _prodBase = 'https://aqasports.com';
  static const String _devBase = 'http://localhost:3000';

  static String get baseUrl => useDev ? _devBase : _prodBase;

  // --- Auth ---
  static const String signIn = '/api/auth/callback/credentials';
  static const String signOut = '/api/auth/signout';
  static const String session = '/api/auth/session';

  // --- Dashboard ---
  static const String reportsSummary = '/api/admin/reports/summary';

  // --- Clients ---
  static const String clients = '/api/admin/clients';
  static String clientById(String id) => '/api/admin/clients/$id';
  static String clientCredits(String id) => '/api/admin/clients/$id/credits';
  static String clientReissueCard(String id) => '/api/admin/clients/$id/reissue-card';

  // --- Cards ---
  static const String cardsLookup = '/api/admin/cards/lookup';
  static const String cardsExport = '/api/admin/cards/export';

  // --- Packages ---
  static const String packages = '/api/admin/packages';
  static String packageById(String id) => '/api/admin/packages/$id';

  // --- Activities ---
  static const String activities = '/api/admin/activities';
  static String activityById(String id) => '/api/admin/activities/$id';
  static const String sessions = '/api/admin/sessions';
  static String sessionById(String id) => '/api/admin/sessions/$id';

  // --- Redemptions ---
  static const String redemptions = '/api/admin/redemptions';

  // --- Invoices ---
  static const String invoices = '/api/admin/invoices';
  static String invoiceById(String id) => '/api/admin/invoices/$id';
  static const String invoicesPendingCount = '/api/admin/invoices/pending-count';

  // --- Demands ---
  static const String demands = '/api/admin/demands';
  static String demandById(String id) => '/api/admin/demands/$id';
  static const String demandsPendingCount = '/api/admin/demands/pending-count';

  // --- Proposals ---
  static const String proposals = '/api/admin/proposals';
  static String proposalById(String id) => '/api/admin/proposals/$id';
  static const String proposalsPendingCount = '/api/admin/proposals/pending-count';

  // --- Clubs ---
  static const String clubs = '/api/admin/clubs';
  static String clubById(String id) => '/api/admin/clubs/$id';
  static const String clubsNewCheckInsCount = '/api/admin/clubs/new-checkins-count';

  // --- Products ---
  static const String products = '/api/admin/products';
  static String productById(String id) => '/api/admin/products/$id';

  // --- Reports ---
  static const String reports = '/api/admin/reports/summary';

  // --- Users ---
  static const String users = '/api/admin/users';

  // --- Ledger ---
  static const String ledger = '/api/admin/ledger';

  // --- Public ---
  static String publicCard(String token) => '/api/public/cards/$token';
}
