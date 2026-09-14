# backgroundExtensionEffect()

Adds the background extension effect to the view. The view will be duplicated into mirrored copies which will be placed around the view on any edge with available safe area. Additionally, a blur effect will be applied on top to blur out the copies.

## Discussion

Use this modifier when you want to extend the view beyond its bounds so the copies can function as backgrounds for other elements on top. The most common use case is to apply this to a view in the detail column of a navigation split view so it can extend under the sidebar or inspector region to provide seamless immersive visuals.

```swift
NavigationSplitView {
    // sidebar content
} detail: {
    ZStack {
        BannerView()
            .backgroundExtensionEffect()
    }
}
.inspector(isPresented: $showInspector) {
    // inspector content
}
```

Apply this modifier with discretion. This should often be used with only a single instance of background content with consideration of visual clarity and performance.

> **Note:** This modifier will clip the view to prevent copies from overlapping with each other.

## See also: Background elements

- [background(alignment:content:)](https://developer.apple.com/documentation/swiftui/view/background(alignment:content:))
- [background(_:ignoresSafeAreaEdges:)](https://developer.apple.com/documentation/swiftui/view/background(_:ignoressafeareaedges:))
- [background(ignoresSafeAreaEdges:)](https://developer.apple.com/documentation/swiftui/view/background(ignoressafeareaedges:))
- [background(_:in:fillStyle:)](https://developer.apple.com/documentation/swiftui/view/background(_:in:fillstyle:))
- [background(in:fillStyle:)](https://developer.apple.com/documentation/swiftui/view/background(in:fillstyle:))
- [alternatingRowBackgrounds(_:)](https://developer.apple.com/documentation/swiftui/view/alternatingrowbackgrounds(_:))
- [listRowBackground(_:)](https://developer.apple.com/documentation/swiftui/view/listrowbackground(_:))
- [scrollContentBackground(_:)](https://developer.apple.com/documentation/swiftui/view/scrollcontentbackground(_:))
- [containerBackground(_:for:)](https://developer.apple.com/documentation/swiftui/view/containerbackground(_:for:))
- [containerBackground(for:alignment:content:)](https://developer.apple.com/documentation/swiftui/view/containerbackground(for:alignment:content:))
- [glassBackgroundEffect(displayMode:)](https://developer.apple.com/documentation/swiftui/view/glassbackgroundeffect(displaymode:))
- [glassBackgroundEffect(_:displayMode:)](https://developer.apple.com/documentation/swiftui/view/glassbackgroundeffect(_:displaymode:))
- [glassBackgroundEffect(in:displayMode:)](https://developer.apple.com/documentation/swiftui/view/glassbackgroundeffect(in:displaymode:))
- [glassBackgroundEffect(_:in:displayMode:)](https://developer.apple.com/documentation/swiftui/view/glassbackgroundeffect(_:in:displaymode:))
- [backgroundExtensionEffect(isEnabled:)](https://developer.apple.com/documentation/swiftui/view/backgroundextensioneffect(isenabled:))
