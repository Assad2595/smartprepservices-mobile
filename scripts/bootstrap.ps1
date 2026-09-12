# Requires Flutter SDK on PATH.
# Generates Android/iOS platform folders without overwriting lib/ or pubspec.yaml.

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Get-Command flutter -ErrorAction SilentlyContinue)) {
  Write-Error "Flutter is not on PATH. Install from https://docs.flutter.dev/get-started/install then re-run."
}

flutter create . --project-name sps_mobile --org com.smartprepservices --platforms=android,ios
flutter pub get
Write-Host "Done. Run: flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3001/api/v1"
