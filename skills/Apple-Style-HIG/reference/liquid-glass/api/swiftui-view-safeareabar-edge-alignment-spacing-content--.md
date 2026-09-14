# safeAreaBar(edge:alignment:spacing:content:)

Shows the specified content as a custom bar beside the modified view.

## Return Value

A new view that displays `content` beside the modified view, making space for the `content` view by horizontally insetting the modified view, adjusting the safe area and scroll edge effects to match.

## Discussion

Similar to the [safeAreaInset(edge:alignment:spacing:content:)](https://developer.apple.com/documentation/swiftui/view/safeareainset(edge:alignment:spacing:content:)-6gwby) modifier, the `content` view is anchored to the specified horizontal edge of the parent view and its width insets the safe area.

Additionally, it extends the edge effect of any scroll views affected by the inset safe area.

## See also: Configuring scroll edge effects

- [scrollEdgeEffectStyle(_:for:)](https://developer.apple.com/documentation/swiftui/view/scrolledgeeffectstyle(_:for:))
- [scrollEdgeEffectHidden(_:for:)](https://developer.apple.com/documentation/swiftui/view/scrolledgeeffecthidden(_:for:))
- [ScrollEdgeEffectStyle](https://developer.apple.com/documentation/swiftui/scrolledgeeffectstyle)
