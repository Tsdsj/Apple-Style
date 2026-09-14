# scrollEdgeEffectStyle(_:for:)

Configures the scroll edge effect style for scroll views within this hierarchy.

## Discussion

By default, a scroll view renders an automatic edge effect. Use this modifier to change the scroll edge effect style.

```swift
ScrollView {
    LazyVStack {
        ForEach(data) { item in
            RowView(item)
        }
    }
}
.scrollEdgeEffectStyle(.hard, for: .all)
```

## See also: Configuring scroll edge effects

- [scrollEdgeEffectHidden(_:for:)](https://developer.apple.com/documentation/swiftui/view/scrolledgeeffecthidden(_:for:))
- [ScrollEdgeEffectStyle](https://developer.apple.com/documentation/swiftui/scrolledgeeffectstyle)
- [safeAreaBar(edge:alignment:spacing:content:)](https://developer.apple.com/documentation/swiftui/view/safeareabar(edge:alignment:spacing:content:))
