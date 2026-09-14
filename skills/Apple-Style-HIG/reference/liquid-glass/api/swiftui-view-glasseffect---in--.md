# glassEffect(_:in:)

Applies the Liquid Glass effect to a view.

## Discussion

When you use this effect, the system:

- Renders a shape anchored behind a view with the Liquid Glass material.
- Applies the foreground effects of Liquid Glass over a view.

For example, to add this effect to a [Text](https://developer.apple.com/documentation/swiftui/text):

```swift
Text("Hello, World!")
    .font(.title)
    .padding()
    .glassEffect()
```

SwiftUI uses the [regular](https://developer.apple.com/documentation/swiftui/glass/regular) variant by default along with a [Capsule](https://developer.apple.com/documentation/swiftui/capsule) shape.

SwiftUI anchors the Liquid Glass to a view’s bounds. For the example above, the material fills the entirety of the `Text` frame, which includes the padding.

You typically use this modifier with a [GlassEffectContainer](https://developer.apple.com/documentation/swiftui/glasseffectcontainer) to combine multiple Liquid Glass shapes into a single shape that can morph into one another.

## See also: Styling views with Liquid Glass

- [Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
- [Landmarks: Building an app with Liquid Glass](https://developer.apple.com/documentation/swiftui/landmarks-building-an-app-with-liquid-glass)
- [glassEffectID(_:in:)](https://developer.apple.com/documentation/swiftui/view/glasseffectid(_:in:))
- [glassEffectTransition(_:)](https://developer.apple.com/documentation/swiftui/view/glasseffecttransition(_:))
- [glassEffectUnion(id:namespace:)](https://developer.apple.com/documentation/swiftui/view/glasseffectunion(id:namespace:))
- [interactive(_:)](https://developer.apple.com/documentation/swiftui/glass/interactive(_:))
- [GlassEffectContainer](https://developer.apple.com/documentation/swiftui/glasseffectcontainer)
- [GlassEffectTransition](https://developer.apple.com/documentation/swiftui/glasseffecttransition)
- [GlassButtonStyle](https://developer.apple.com/documentation/swiftui/glassbuttonstyle)
- [GlassProminentButtonStyle](https://developer.apple.com/documentation/swiftui/glassprominentbuttonstyle)
- [DefaultGlassEffectShape](https://developer.apple.com/documentation/swiftui/defaultglasseffectshape)
