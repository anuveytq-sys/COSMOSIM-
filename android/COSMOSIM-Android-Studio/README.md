# COSMOSIM Android Studio wrapper

This folder describes a minimal Android Studio wrapper for the published COSMOSIM website. It is designed to show the existing web experience, including the 3D graphics and controls, without rewriting them.

Website: https://anuveytq-sys.github.io/COSMOSIM-/

## Build
1. Create/open an Android Studio project using an Empty Views Activity.
2. Set the activity orientation to landscape in AndroidManifest.xml.
3. Add the INTERNET permission.
4. Use a fullscreen WebView with JavaScript enabled and load the website URL above.

The website currently loads Three.js modules from a CDN, so an internet connection is required. This is a source project guide, not a prebuilt APK or a complete ZIP archive.