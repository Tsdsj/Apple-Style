# UIDesignRequiresCompatibility

A Boolean value that indicates whether the system runs the app using a compatibility mode for UI.

## Discussion

> **Warning:** Temporarily use this key while reviewing and refining your app’s UI for the design in the latest SDKs.

If `YES`, the system runs the app using a compatibility mode for UI elements. The compatibility mode displays the app as it looks when built against previous versions of the SDKs.

If `NO`, the system uses the UI design of the running OS, with no compatibility mode. Absence of the key, or `NO`, is the default value for apps linking against the latest SDKs.

The system ignores this key when you build for iOS 27 or later, iPadOS 27 or later, Mac Catalyst 27 or later, macOS 27 or later, or tvOS 27 or later.

## See also: Styling

- [UIUserInterfaceStyle](https://developer.apple.com/documentation/bundleresources/information-property-list/uiuserinterfacestyle)
- [UIViewEdgeAntialiasing](https://developer.apple.com/documentation/bundleresources/information-property-list/uiviewedgeantialiasing)
- [UIWhitePointAdaptivityStyle](https://developer.apple.com/documentation/bundleresources/information-property-list/uiwhitepointadaptivitystyle)
- [UIViewGroupOpacity](https://developer.apple.com/documentation/bundleresources/information-property-list/uiviewgroupopacity)
- [UIRequiresFullScreenIgnoredStartingWithVersion](https://developer.apple.com/documentation/bundleresources/information-property-list/uirequiresfullscreenignoredstartingwithversion)
- [UISupportsAssistiveAccess](https://developer.apple.com/documentation/bundleresources/information-property-list/uisupportsassistiveaccess)
- [UISupportsFullScreenInAssistiveAccess](https://developer.apple.com/documentation/bundleresources/information-property-list/uisupportsfullscreeninassistiveaccess)
- [NSPrefersDisplaySafeAreaCompatibilityMode](https://developer.apple.com/documentation/bundleresources/information-property-list/nsprefersdisplaysafeareacompatibilitymode)
- [NSAccentColorName](https://developer.apple.com/documentation/bundleresources/information-property-list/nsaccentcolorname)
- [NSWidgetBackgroundColorName](https://developer.apple.com/documentation/bundleresources/information-property-list/nswidgetbackgroundcolorname)
