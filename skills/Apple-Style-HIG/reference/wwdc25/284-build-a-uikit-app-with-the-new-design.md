# Build a UIKit app with the new design (WWDC25)

Update your UIKit app to take full advantage of the new design system. We'll dive into key changes to tab views, split views, bars, presentations, search, and controls, and show you how to use Liquid Glass in your custom UI. To get the most out of this video, we recommend first watching “Get to know the new design system” for general design guidance.

## Chapters
- 0:00 Introduction
- 1:55 Tab views and split views
- 7:19 Navigation and toolbars
- 13:31 Presentations
- 15:18 Search
- 17:24 Controls
- 19:15 Custom elements
- 25:01 Next steps

## Transcript

Hi, welcome to “Build a UIKit app with the new design”. I’m Sanaa, an engineer on the UIKit team. In this video, I will show you how to adopt the new design, and bring Liquid Glass to your apps! iOS 26 introduces a beautiful new design, updating the look and feel

of materials and controls across the system. Central to this design is a new material called Liquid Glass. It is translucent, dynamic and alive. Throughout the system, UIKit’s components and materials have been updated with Liquid Glass. Your apps get this new appearance

as soon as you recompile with the new SDK. If you haven’t already, I highly recommend watching the design videos “Meet Liquid Glass” and “Design with the Liquid Glass design system” to gain an overview, and learn the best practices of the new design system.

I will start with how tab views and split views adopt the new design system, and float above the content. Then, I will cover the new look and behavior of navigation bars and toolbars, which are now transparent, contain liquid glass buttons, and give more space to your content.

After that, I will go over the new updates to presentations, including an updated zoom transition, and new behavior for alerts and action sheets. Then, I will describe how the Search experience has been updated, with more options for the search bar positioning.

I will go over Controls, like buttons, switches, and sliders, and finish with how to adopt the Liquid Glass look and feel in your custom UI elements. I will start with Tab views and split views. UITabBarController and UISplitViewController have been updated with the new liquid glass appearance.

Tab bars provide persistent, top-level navigation within your app. They provide an overview of your app at a glance, and help people quickly switch from section to section. With the new design, the tab bar on iPhone floats above the content, and can be configured to minimize on scroll,

keeping the focus on your content. To allow the tab bar to minimize on scroll set tabBarMinimizeBehavior to the desired direction. Here, the TV app is setting it to .onScrollDown. The tab bar re-expands when scrolling in the opposite direction. Above the tab bar, you can have an accessory view

like the mini player in the Music app. UITabBarController displays the accessoryView above the tab bar, matching its appearance. When the tab bar is minimized, the accessory view animates down to display inline with the tab bar. To set a bottom accessory,

create a UITabAccessory with your contentView. Then, set the bottomAccessory property on UITabBarController. When the accessory is inline with the tab bar, there is less space available to display it. Here, the Music app is accommodating

the reduced space by hiding some of the media controls in the Mini player. To adjust the accessory view, register to observe changes to the tabAccessoryEnvironment trait. Check if the accessory view is inline with the tab bar, and update the view if needed.

You can also use updateProperties to update your accessory view with the automatic trait tracking behavior. To learn more about automatic trait tracking and the new updateProperties method, check out “What’s new in UIKit”. On iPad, the tab bar and sidebar are also lifted into Liquid Glass.

They float above your app’s content when using UITabBarController. By adopting UITab and UITabGroup, you get automatic adaptivity for your app, allowing people to switch between tab bar and sidebar on iPad. To learn more, check out the videos “Elevate your tab and sidebar experience in iPadOS”

from WWDC24, and "Make your UIKit app more flexible” from WWDC25. With the new design, Sidebars look best when there is vibrant content underneath matching the main scroll view.

The TV app on iOS 26 is a great example of this. The artwork appears to extend across the entire screen and underneath the sidebar. It remains centered, and fully visible. This effect is used across many apps in iOS 26, and your app will also look great using the new UIBackgroundExtensionView!

The ExtensionView should cover the entire width, including the leading safe area inset for the sidebar. The input of the effect is a content view you provide. For example, an image view. It is placed in the view hierarchy and seamlessly extended to fill the empty space.

This is a special effect that should be used with purpose. Sections like the list of episodes at the bottom naturally scroll underneath the sidebar and don't need to be extended. Elements on top of the artwork, like the show name and description, also shouldn't be extended.

Make sure to add these as siblings of the extension view, not as subviews. The show view controller already has an image view for the poster artwork. To add the effect, create a BackgroundExtensionView, and assign the image view to its contentView property.

Add the extensionView to your hierarchy. And finally, add the detailsView as a sibling of the extensionView. By default, the content view fills the safe area of the extension view. All edges with a positive safe area inset get extended to fill the empty space. In this example, these are the top edge for the navigation and status bar,

and the leading edge for the sidebar. Because the TV app has very little content in the navigation bar that could cover the artwork, it doesn't need the extension effect at the top. Instead, the content view is manually positioned outside the safe area at the top.

I will go back to the code example to manually adjust the effect layout. First, set automaticallyPlacesContentView to false on the extensionView. Use AutoLayout constraints to position the image view at the top of the screen. And to extend the image view underneath the sidebar, add a constraint for the leadingAnchor

equal to the extensionView's safeAreaLayoutGuide. And don't forget to add constraints for the trailing and bottom anchors as well. Now I’ll go over how navigation bars and toolbars look and behave in the new design. In iOS 26, navigation bars and toolbars

also adopt the new glass appearance and float above the content. When you specify toolbar or navigation barButton items, the system automatically separates them into visual groups of items. Each group shares a glass background. By default, bar button items using images share the background with other image buttons.

Button groups with multiple items, also share their backgrounds. Text buttons, the system “Done” and “Close” buttons, and prominent style buttons have separate glass backgrounds . This example shows these rules in action, where the “Select” button at the beginning, and the “Done” button at the end

don’t share the glass background with the 4 image buttons in the middle. To set up the navigationBar, assign all BarButtonItems directly to the navigationItem’s rightBarButtonItems. This gets the default system behavior that I described previously. To further break items into separate groups,

use a fixedSpace item. In this example, I want to separate the “Share” button, so I insert a fixedSpace between the share and info buttons. Bar buttons use labelColor by default to improve legibility. If color is needed to communicate information

about the action, you can specify a different tint color. For example, here I’m going to update the flag button to use systemOrange as the tintColor. Only the Flag symbol will get colored. To tint the button background,

set the style to prominent. Previously, you might have used flexible spaces to evenly distribute the items in your toolbar. With Liquid Glass, by default, each flexibleSpace item separates the background between items. To evenly distribute the items,

and group them in a single background use flexible spaces with hidesSharedBackground set to false. In iOS 26, UINavigationItem provides more control over the title and large title areas in the navigationBar. This includes the addition of a new subtitle

that is rendered below the title. Use attributed strings for fine grained adjustments to both the title and subtitle. Specify custom views to add interactive elements Large titles are now placed at the top of the content scroll view, and scroll with the content underneath the bar.

To keep the large title visible, extend the scroll view fully under the navigationBar. In this example, Mail places the search field in the toolbar, and shows the number of unread emails in the navigation bar using the new subtitle API. When filtering emails, Mail shows the current filter

in a button below the large title. The button is set as the largeSubtitleView on the navigationItem, appearing below the large title in the navigationBar. As part of the new design system in iOS 26, the bar background is now transparent by default.

Remove any background customization from your navigation and toolbars. Using UIBarAppearance or backgroundColor interferes with the glass appearance. Bar buttons use a glass background. Lay out your customView contents using the layout margins to get the correct spacing.

All scroll views underneath navigation or toolbars automatically apply a visual treatment. This ensures legibility of overlapping content in the bars. This is called an edge effect. This new edge effect isn’t just for system bars. You can also use it with custom containers of views

that overlay an edge of a scroll view! This example shows two buttons overlaying the bottom edge of the scroll view. To insert an edge effect behind this stack of buttons, create a ScrollEdgeElementContainerInteraction, assign the contentScrollView and the edge, then add it to the buttonsContainerView.

For denser UIs with a lot of floating elements, opt in to a hard edge style on any edge of a scroll view. This has a similar appearance to the standard bar backgrounds in iOS 18. Enable it by setting the style of the edge effect to .hard iOS 18 introduced an always-interactive, interruptible zoom transition. iOS 26 brings the same fluidity to the standard navigation slide transition.

Here, I’m using the Notes app. I can open a note and the app stays responsive during the transition. I can immediately swipe back if I selected the wrong note, or start scrolling while the transition is still settling. Similarly, I can immediately tap the back button multiple times

to go even further back quickly. This is great because people can interact with your app at any time. But of course, that also means that your app needs to be ready to interact at any time. To learn how to correctly handle interruptible transitions, check out the video

“Enhance your UI animations and transitions”. I can now also swipe back anywhere within the content area, not just the leading edge. The new content backswipe gesture automatically checks for other competing interactions. For example, Swipe actions prevent content backswipe.

However, non-interactive areas would allow it. To gain priority over content backswipe, custom gestures need to set failure requirements on interactiveContentPopGestureRecognizer. The new design extends to presentations as well,

including the new dynamic zoom transition. When a presentation, like a menu or a popover is originated from a glass button, the button morphs into the overlay. This maintains visual continuity between the source and the presentation throughout the animation.

Menus get this behavior automatically. Popovers also get this new animation when their source is a barButtonItem. Sheets can adopt this effect by using the updated Zoom Transition Set the preferred transition on the presented viewController to .zoom and return the source barButtonItem in the closure.

Sheets have an updated design in iOS 26. They adapt their appearance from smaller to larger heights. To take advantage of their new glass appearance, remove any custom backgrounds. ActionSheets on iPad are anchored to their source views. Starting in iOS 26, they behave the same on iPhone,

appearing directly over the originating view. On the alertController, make sure to set the sourceItem or the sourceView on popoverPresentationController, regardless of which device it’s displayed on. Assigning the source view automatically applies the new transitions to action sheets as well!

Action sheets presented inline don’t have a cancel button because the cancel action is implicit by tapping anywhere else. If you don’t specify a source, the action sheet will be centered, and you will have a cancel button.

iOS 26 provides a new, more integrated search experience, letting you position the search field where it best suits the needs of your app. On iPhone, the search bar moves automatically to the toolbar, this keeps the search field easily accessible. If you already have a toolbar,

include a searchBarPlacementBarButtonItem along with other bar buttons. This will position search exactly where you want. It will appear either as an expanded field or a toolbar button, depending on available space. On iPad, for universally accessible search,

follow the macOS toolbar pattern. Place search at the trailing edge of the navigationBar. This is ideal for split views. To enable this behavior, set searchBarPlacementAllowsExternalIntegration on the navigation item to true.

To have search available while switching between views, use a UITabBarController. It can now include a distinct tab for Search on the trailing side. When tapped, the search button expands into a search field, and the other buttons collapse. This search tabView is a great place for placing search suggestions.

By default, one of these suggestions can be selected, or the search field can be tapped to start searching. To have the search field activate automatically when the search tab is tapped, set automaticallyActivateSearch to true on that tab.

For dedicated search views, consider including search as a section in the sidebar or tab bar. The search bar can be integrated in the trailing edge of the navigation bar, stacked, or placed centered in the regular width on iPad. To center the searchBar, use integratedCentered

as the preferredSearchBarPlacement. When the tab bar is visible, the search bar is placed below it Now I’ll talk about the updated look of controls. Controls on iOS are redesigned with a new look and feel, while remaining completely familiar. Sizes are updated slightly for controls like UISwitch.

Check that your layouts are set up to accommodate size updates. Control thumbs, like those on switch and segmentedControl, automatically have a new liquid glass appearance for interactions. In addition to the existing button styles, two new glass appearances are available with UIButtonConfiguration.

Use the .glass() configuration to get standard glass. And .prominentGlass() to get glass tinted with your app’s tint color. And with sliders, in addition to the liquid glass effects on the thumb, they now preserve momentum and stretch when they are moved. On iOS 26, sliders now support tick marks with a TrackConfiguration.

This configuration is used to set up the look and behavior for the slider. For example, to limit this speed slider to only 5 values, set a track configuration with allowsTickValuesOnly and 5 tick marks. Sliders can also be configured to use a neutral value, to anchor the slider fill at any location along the track,

instead of just the minimum end. This lets the slider fill show the difference between the selected value and the neutral value. In this example, the slider fill shows a higher speed selected than the default one. Sliders can also take a thumbless style

to look like a progress bar when not interactive. This is great for media playback, to not distract with a large thumb while the media is playing. Those are places where system controls have adopted liquid glass. For your special use cases, UIKit also offers APIs

to adopt the new Liquid Glass look and feel. When using Liquid Glass in your UI, it is crucial to keep the design intent of liquid glass in mind. Liquid Glass is distinct from other visual effects, like UIBlurEffect. As such, it has specific places where it is appropriate to use.

Liquid Glass is designed to be an interactive layer. It floats above your content, right below your fingertips, and provides the main controls that the user touches. For that reason, limit Liquid Glass to the most important elements of your app. Where possible, use the system views

and controls for the best experience. Maps uses Liquid Glass for custom buttons that are floating above the map. They feel natural as a distinct control layer. This makes them a great candidate, to use the glass effect for a floating illusion.

And when the sheet expands, Maps removes the buttons. This prevents glass elements from overlapping other glass elements, and keeps the illusion of a single floating layer of glass intact. To use glass with custom views,

create a UIVisualEffectView, create a new UIGlassEffect, in an animation block, set the effect. Glass appears using a special materialize animation. By default, the glass is in a capsule shape. To customize the shape,

use the new cornerConfiguration API. Glass has a dark and a light appearance. It adapts to the selected userInterfaceStyle. When adding glass to an existing glass container, it adapts its appearance automatically. To have corners automatically adapt to their container,

use .containerRelative cornerConfiguration. When moving the view closer to the container’s corner, its corner radius adapts automatically. When moving further away the corner radius decreases, to maintain concentricity automatically. Glass adapts the appearance based on its size.

A larger size is more opaque. A smaller size is clearer, and switches between light and dark mode automatically, to increase contrast. To add content, like labels and images, use the visualEffectView’s contentView.

The label automatically becomes vibrant, based on its textColor. This ensures legibility against a wide variety of backgrounds. Depending on the colors behind, the glass and its content will switch to light or dark mode automatically, when using dynamic colors. To highlight prominent views,

set .tintColor on the glass, and animate it alongside any other glass properties. Animate changes to your content, like textColor, here at the same time. To use a custom tint color with glass, create a new UIGlassEffect, assign a custom tintColor,

and animate the effect to the new UIGlassEffect. Tinted glass color, automatically adapts to a vibrant version. To remove content on top of your glass, animate the content’s alpha to zero. Interactive system elements, like buttons, react to user interactions.

When tapping the button, it scales and bounces. To get that same kind of interactivity in your custom views, set isInteractive to true on the glassEffect. And finally, when you no longer need the glass on screen animate it out by setting the effect to nil. Always prefer setting the effect property over the alpha

to ensure that the glass dematerializes or materializes with the appropriate animation. In these examples, there was only a single view using Liquid Glass. Glass has additional, built-in behavior, when multiple elements interact. Liquid Glass can seamlessly blend between different shapes. To dynamically merge glass views,

use a UIGlassContainerEffect configure a UIVisualEffectView with it, create your glass views, and add them as subviews to your containers contentView. As long as there is space between them, they appear as two separate views.

Only if they get closer, they start merging like small droplets of water. To control the distance at which they start affecting each other, use the spacing property on UIGlassContainerEffect. When animating into an overlapping frame, glass views combine into a single shape.

To split glass into multiple elements, first, add them to the same position without animation. Then, animate them out together! UIGlassContainerEffect does more than just enabling animations. It enforces a uniform adaptation! Glass dynamically adapts to its background,

but still gets a consistent appearance. I went over the UIKit components and materials updated in Liquid Glass. UIKit gives you all the tools you need to update your app to the new design. Going from here, start by building your app with Xcode 26. Much of the new design will work in your app immediately.

Audit your app screen by screen, and identify which views stand out. If you have custom controls, decide whether standard UIKit controls may be a better fit. And lastly, determine how you can make your special use cases stand out with Liquid Glass.

I am looking forward to checking out your app after you adopt the new design system. Thank you for watching!
