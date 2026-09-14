# Landmarks: Extending horizontal scrolling under a sidebar or inspector

Improve your horizontal scrollbar’s appearance by extending it under a sidebar or inspector.

## Overview

The Landmarks app lets people explore interesting sites around the world. Whether it’s a national park near their home or a far-flung location on a different continent, the app provides a way for people to organize and mark their adventures and receive custom activity badges along the way.

This sample demonstrates how to extend horizontal scrolling under a sidebar or inspector. Within each continent section in `LandmarksView`, an instance of `LandmarkHorizontalListView` shows a horizontally scrolling list of landmark views. When open, the landmark views can scroll underneath the sidebar or inspector.

![An image of the landmarks view on an iPad, with the sidebar visible and some landmarks visible under the sidebar.]

## Configure the scroll view

To achieve this effect, the sample configures the `LandmarkHorizontalListView` so it touches the leading and trailing edges. When a scroll view touches the sidebar or inspector, the system automatically adjusts it to scroll under the sidebar or inspector and then off the edge of the screen.

The sample adds a [Spacer](https://developer.apple.com/documentation/swiftui/spacer) at the beginning of the [ScrollView](https://developer.apple.com/documentation/swiftui/scrollview) to inset the content so it aligns with the title padding:

```swift
ScrollView(.horizontal, showsIndicators: false) {
    LazyHStack(spacing: Constants.standardPadding) {
        Spacer()
            .frame(width: Constants.standardPadding)
        ForEach(landmarkList) { landmark in
            //...
        }
    }
}
```

## See also: App features

- [Landmarks: Applying a background extension effect](https://developer.apple.com/documentation/swiftui/landmarks-applying-a-background-extension-effect)
- [Landmarks: Refining the system provided Liquid Glass effect in toolbars](https://developer.apple.com/documentation/swiftui/landmarks-refining-the-system-provided-glass-effect-in-toolbars)
- [Landmarks: Displaying custom activity badges](https://developer.apple.com/documentation/swiftui/landmarks-displaying-custom-activity-badges)
