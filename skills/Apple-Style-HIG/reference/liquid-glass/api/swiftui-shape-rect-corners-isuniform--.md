# rect(corners:isUniform:)

Creates a rectangle with the same corner style set on four corners.

## Discussion

When you provide `false` for `isUniform`, the system may calculate a different radius for each corner. This can happen when the rectangle is not centered within the container shape, or the container shape’s corners have different radii. When you provide `true` for `isUniform`, the system calculates the radius for each corner first. Then, it selects the largest radius and applies it to each corner to achieve the symmetric look.

## See also: Creating a rectangle with the same corner style

- [init(corners:isUniform:)](https://developer.apple.com/documentation/swiftui/concentricrectangle/init(corners:isuniform:))
