# UICornerConfiguration

A configuration that defines how corner radii are mapped to the corners of a rectangle.

## Overview

Create a `UICornerConfiguration` that expresses how you want the corners of your view to appear. Your configuration can apply to corners independently or uniformly, and can form the following types of corners:

- A squared corner
- A rounded corner
- A rounded corner that’s concentric relative to the containing view
- Corners that are rounded to form a capsule

Select a method to create a configuration that describes which corners of your view you want to be uniform and which corners you want to be independent, then provide instances of [UICornerRadius](https://developer.apple.com/documentation/uikit/uicornerradius-swift.struct) as parameters to indicate which type you want each corner to be.

The system uses squared corners by default, so you don’t need to set a configuration to get squared corners.

### Configure a rounded corner

To configure a rounded corner with a fixed radius, provide [fixed(_:)](https://developer.apple.com/documentation/uikit/uicornerradius-swift.struct/fixed(_:)) with a value greater than zero for the radius. Since `UICornerRadius` conforms to `ExpressibleByFloatLiteral` and `ExpressibleByIntegerLiteral`, you can also provide a float or integer value for the radius:

```swift
myView.cornerConfiguration = .corners(radius: 12.0)
```

### Configure a concentric rounded corner

To configure a rounded corner that’s concentric relative to the containing view, use [containerConcentric(minimum:)](https://developer.apple.com/documentation/uikit/uicornerradius-swift.struct/containerconcentric(minimum:)):

```swift
myView.cornerConfiguration = .corners(radius: .containerConcentric())
```

Set the `minimum` parameter to indicate a minimum radius for the rounded corner.

### Configure a corner as a capsule

To configure rounded corners that form a capsule, use [capsule(maximumRadius:)](https://developer.apple.com/documentation/uikit/uicornerconfiguration-swift.struct/capsule(maximumradius:)):

```swift
myView.cornerConfiguration = .capsule()
```

Set the `maximumRadius` parameter to allow your view to break the capsule paradigm and stretch vertically with an edge if the radius necessary to form a capsule exceeds what you provide.

## Configuring independent corners

- [corners(radius:)](https://developer.apple.com/documentation/uikit/uicornerconfiguration-swift.struct/corners(radius:)) — A configuration that applies the given radius independently to all corners.
- [corners(topLeftRadius:topRightRadius:bottomLeftRadius:bottomRightRadius:)](https://developer.apple.com/documentation/uikit/uicornerconfiguration-swift.struct/corners(topleftradius:toprightradius:bottomleftradius:bottomrightradius:)) — A configuration with independent radii for each corner.

## Configuring corners as a capsule

- [capsule(maximumRadius:)](https://developer.apple.com/documentation/uikit/uicornerconfiguration-swift.struct/capsule(maximumradius:)) — A configuration that rounds the corners into a capsule shape, scaling with the view’s size up to the maximum radius you provide.

## Configuring uniform corners

- [uniformCorners(radius:)](https://developer.apple.com/documentation/uikit/uicornerconfiguration-swift.struct/uniformcorners(radius:)) — A configuration that applies the given radius uniformly to all corners.
- [uniformEdges(leftRadius:rightRadius:)](https://developer.apple.com/documentation/uikit/uicornerconfiguration-swift.struct/uniformedges(leftradius:rightradius:)) — A configuration that applies the left radius you provide to the left corners, and the right radius you provide to the right corners.
- [uniformEdges(topRadius:bottomRadius:)](https://developer.apple.com/documentation/uikit/uicornerconfiguration-swift.struct/uniformedges(topradius:bottomradius:)) — A configuration that applies the top radius to the top corners, and the bottom radius you provide to the bottom corners.
- [uniformBottomRadius(_:topLeftRadius:topRightRadius:)](https://developer.apple.com/documentation/uikit/uicornerconfiguration-swift.struct/uniformbottomradius(_:topleftradius:toprightradius:)) — A configuration that applies the radius you provide to the bottom corners, with optional independent radii for the top corners.
- [uniformLeftRadius(_:topRightRadius:bottomRightRadius:)](https://developer.apple.com/documentation/uikit/uicornerconfiguration-swift.struct/uniformleftradius(_:toprightradius:bottomrightradius:)) — A configuration that applies the left radius to the left corners, with optional independent radii for the right corners.
- [uniformRightRadius(_:topLeftRadius:bottomLeftRadius:)](https://developer.apple.com/documentation/uikit/uicornerconfiguration-swift.struct/uniformrightradius(_:topleftradius:bottomleftradius:)) — A configuration that applies the right radius you provide to the right corners, with optional independent radii for the left corners.
- [uniformTopRadius(_:bottomLeftRadius:bottomRightRadius:)](https://developer.apple.com/documentation/uikit/uicornerconfiguration-swift.struct/uniformtopradius(_:bottomleftradius:bottomrightradius:)) — A configuration that applies the top radius you provide to the top corners, with optional independent radii for the bottom corners.

## See also: Configuring a view’s corners

- [cornerConfiguration](https://developer.apple.com/documentation/uikit/uiview/cornerconfiguration-7l0ja)
- [UICornerRadius](https://developer.apple.com/documentation/uikit/uicornerradius-swift.struct)
- [effectiveRadius(corner:)](https://developer.apple.com/documentation/uikit/uiview/effectiveradius(corner:))
