# glassEffectUnion(id:namespace:)

Associates any Liquid Glass effects defined within this view to a union with the provided identifier.

## Discussion

You may want the geometries of multiple views to contribute to a single Liquid Glass effect shape. In these cases, you can use a [glassEffectUnion(id:namespace:)](https://developer.apple.com/documentation/swiftui/view/glasseffectunion(id:namespace:)) to specify that a view should contribute to a union of Liquid Glass effects with a particular identifier. All Liquid Glass effects with the same shape and Liquid Glass variant will be combined into a single shape.

## See also: Styling views with Liquid Glass

- [Applying Liquid Glass to custom views](https://developer.apple.com/documentation/swiftui/applying-liquid-glass-to-custom-views)
- [Landmarks: Building an app with Liquid Glass](https://developer.apple.com/documentation/swiftui/landmarks-building-an-app-with-liquid-glass)
- [glassEffect(_:in:)](https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:))
- [glassEffectID(_:in:)](https://developer.apple.com/documentation/swiftui/view/glasseffectid(_:in:))
- [glassEffectTransition(_:)](https://developer.apple.com/documentation/swiftui/view/glasseffecttransition(_:))
- [interactive(_:)](https://developer.apple.com/documentation/swiftui/glass/interactive(_:))
- [GlassEffectContainer](https://developer.apple.com/documentation/swiftui/glasseffectcontainer)
- [GlassEffectTransition](https://developer.apple.com/documentation/swiftui/glasseffecttransition)
- [GlassButtonStyle](https://developer.apple.com/documentation/swiftui/glassbuttonstyle)
- [GlassProminentButtonStyle](https://developer.apple.com/documentation/swiftui/glassprominentbuttonstyle)
- [DefaultGlassEffectShape](https://developer.apple.com/documentation/swiftui/defaultglasseffectshape)
