# Landmarks: Refining the system provided Liquid Glass effect in toolbars

Organize toolbars into related groupings to improve their appearance and utility.

## Overview

The Landmarks app lets people explore interesting sites around the world. Whether it’s a national park near their home or a far-flung location on a different continent, the app provides a way for people to organize and mark their adventures and receive custom activity badges along the way.

This sample demonstrates how to refine the system provided glass effect in toolbars. In `LandmarkDetailView`, the sample adds toolbar items for:

- sharing a landmark
- adding or removing a landmark from a list of Favorites
- adding or removing a landmark from Collections
- showing or hiding the inspector

The system applies Liquid Glass to the toolbar items automatically.

![An image of the landmark detail view for Mount Fuji on an iPad, with the toolbar and a portion of the sidebar visible. The toolbar items show the Liquid Glass effect. From the leading to trailing edge, there is a back button, share button, favorite button, collections button, info button, and a search bar.]

## Organize the toolbar items into logical groupings

To organize the toolbar items into logical groupings, the sample adds [ToolbarSpacer](https://developer.apple.com/documentation/swiftui/toolbarspacer) items and passes [fixed](https://developer.apple.com/documentation/swiftui/spacersizing/fixed) as the `sizing` parameter to divide the toolbar into sections:

```swift
.toolbar {
    ToolbarSpacer(.flexible)

    ToolbarItem {
        ShareLink(item: landmark, preview: landmark.sharePreview)
    }

    ToolbarSpacer(.fixed)
    
    ToolbarItemGroup {
        LandmarkFavoriteButton(landmark: landmark)
        LandmarkCollectionsMenu(landmark: landmark)
    }
    
    ToolbarSpacer(.fixed)

    ToolbarItem {
        Button("Info", systemImage: "info") {
            modelData.selectedLandmark = landmark
            modelData.isLandmarkInspectorPresented.toggle()
        }
    }
}
```

## See also: App features

- [Landmarks: Applying a background extension effect](https://developer.apple.com/documentation/swiftui/landmarks-applying-a-background-extension-effect)
- [Landmarks: Extending horizontal scrolling under a sidebar or inspector](https://developer.apple.com/documentation/swiftui/landmarks-extending-horizontal-scrolling-under-a-sidebar-or-inspector)
- [Landmarks: Displaying custom activity badges](https://developer.apple.com/documentation/swiftui/landmarks-displaying-custom-activity-badges)
