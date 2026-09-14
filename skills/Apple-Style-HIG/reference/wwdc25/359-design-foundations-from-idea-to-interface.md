# Design foundations from idea to interface (WWDC25)

Great apps feel clear, intuitive, and effortless to use. In this session, you'll discover how app design can elevate functionality, communicate purpose, guide people through your content, and use components thoughtfully to keep the experience simple without losing impact. This session is for designers and developers of all skill levels — as well as anyone curious about design.

## Chapters
- 0:00 Introduction
- 1:11 Structure
- 4:55 Navigation
- 8:19 Content
- 13:28 Visual Design

## Transcript

Hi, I’m Majo, from the Design Evangelism Team. If you’re wondering what Evangelism does, basically I get to spend my time helping designers and developers create better apps for Apple platforms. And what I’ve learned, is that we all know that feeling when an app just works, and when it doesn’t. Spotting the difference as a user? Easy.

But building that seamless experience as a designer? A bit trickier. So that’s exactly what we’re doing today — together. I’ll walk you through how I think, the questions I ask, and how I deal with the messy middle when things don't feel quite right. We’ll start with structure:

how to organize information and define what the app is and what it does. Then, we’ll explore navigation — how to design clear ways for people to move through the app so they feel confident and in control. Next, we’ll focus on content and how to organize it to enhance its meaning, present it clearly and guide action. Finally, in visual design, we’ll see how the right styling

can shape your app’s personality and tone — while supporting usability. Let’s begin with structure. Every app is built on a foundation that shapes everything else: how people navigate, what stands out, and how the experience comes across. When it’s done well, everything clicks into place. If not, well, we’ve all been there.

To ground this, I’ll show you a fictional app I created. It helps music lovers keep track of their growing vinyl collections. People can scroll through their collection and get inspired on what to play next. They can group records in crates, add new ones, track their swaps, and save records they might want later. So what’s your first impression?

Is anything confusing? What works — and what feels a little off? When I look at an app, I want to find clarity — this makes the experience inviting and helps me use it confidently. That starts with knowing where I am. The app should make that clear right away —

so I’m not left wondering where I am or how I got there. The next question is: “What can I do?” I shouldn’t have to guess — actions should be clear and easy to understand. And finally, I ask: “Where can I go from here?” A clear sense of next steps keeps the flow going and helps me avoid hesitation or second-guessing.

When those questions are easy to answer, the app feels inviting and fluid. That’s usually the sign of a solid foundation. At first glance, this app looks pretty good. And sometimes, that can be misleading because I’d assume it works just as well. Let’s see how it answers those questions — starting from the top. I expect to know where I am — but the first thing I find is a menu.

That’s not ideal. Menus can be vague and unpredictable, and what I really need first is some context. Next, there’s a title — but it feels more like branding. Looks nice, but doesn’t help much. I almost want to skip right past it… And that could make me easily miss the recommended content from the app

— even though it seems useful. As I keep scrolling, I find some albums — but there’s nothing to do besides browse, so I still don’t really know where I am or what I’m supposed to do here. At the very bottom, I see that the tab name is named Records, answering to where I am, but it comes a bit too late. The result?

The screen didn’t guide me — I had to work to piece it together. We experienced what happens when the structure isn't crystal clear, people feel it: as hesitation, confusion, sometimes even giving up. Maybe if there was less going on, the app would feel simpler right when I open it. That is the goal of information architecture. It’s the process of organizing and prioritizing information

so people can easily find what they need, when they need it — without friction. The first thing I do is write down everything the app does — features, workflows, even nice-to-haves. At this point, I’m not trying to judge or cut anything out Then I try to imagine how someone else might use the app. When and where would they be using it?

How does it fit into their routine? What actually helps them, and what feels like it gets in the way? And I add these answers to my list. Once I get that, I start cleaning things up — removing features that aren’t essential, renaming things that aren’t clear, and grouping those that naturally belong together.

After going through this, it’s clear to me that if I don’t have clarity on what’s essential, then I won’t be able to communicate it in the app. Simplifying helps me sharpen the app’s purpose. It also gives me a clear starting point for how people will find the features, and when they’ll use them.

Let’s explore this further in navigation. This is how people move through the app — and it’s should be more than just tapping around. I want them to feel oriented and confident. To do that, I’ll use what I learned from the information architecture to access the main features,

in iOS that happens with the Tab bar component. It supports navigation among different sections of an app, and it’s always visible, so it’s easy to access them at any time. Simplifying it matters because each extra tab means one more decision for people to make and might present the app as much more complex that what it really is.

So I pause and ask: What’s truly essential? What deserves a tab? One example of what doesn't? Crates. It’s just a screen to group Records. So I merge them.

No need for both. Then there’s Add, it’s here in the tab bar because it’s the primary action of the app. But I start wondering — is this the best place for it? When I’m not sure when or how to properly use a component, I always go back to the Human Interface Guidelines. And sure enough: tabs are for navigation, not for taking action.

So I’ll move Add inside Records where someone is most likely to use it. Now the Tab Bar has three very distinct sections. And since I’m working on making it more predictable, I think I can improve how I’m naming those tabs. I want the labels and icons to help people get a sense of what each tab is for — so they don’t have to interact just to find out,

or end up skipping it because they’re unsure what it leads to. I’ll rename Swaps and Saves to more direct labels. And change their icons to reinforce the meaning of each tab. I want these to be visually consistent, so instead of designing my own (which I find really hard) I’ll use SF Symbols, Apple’s library of iconography.

These symbols are already familiar to people on any Apple platform, helping the tabs being recognizable. Thanks to a simplified architecture, familiar icons and explicit labels the full scope and purpose of the app is evident, and the tab bar feels more approachable. Because of the work in the information architecture, some things moved around,

making the content a bit confusing. So let’s start clarifying that with a toolbar. It’s a great way to orient people in your interface. Notice how it solves both problems I had at the beginning: where I am and what can I do. That’s because the tool bar includes: a title with the name of the screen,

instead of a menu, or branding as before. It sets expectations about the content of the screen and helps people stay oriented as they navigate and scroll. It also offers a great place for screen-specific actions that people are most likely to want, instead of using the tab bar. Since space is limited, I’d only include what’s essential using SF Symbols

to make each action easy to recognize. Now I can clearly answer to where am I what can I do and what’s possible in the app. Setting people up for a more confident experience from the start. All thanks to the work done on its structure and the intentional use of navigation components.

Looking back, I realize I didn’t get it right the first time. But that’s part of the process. Each round of iteration gets the design closer to something that feels supportive, predictable and easy to move through. Now the foundation to explore is settled, let’s zoom into what’s actually on the screen.

The content of your app should be organized to guide people to what matters most and what they expect to find first. So far, I’ve worked on getting to the right parts of the app, but what about the content? It feels messy because there are two types of content mixed together: Groups and Records.

So I’ll try something simple: like splitting both sections. I think that’s a good start, at least there’s a title clarifying what the content is, but unless I scroll, I don’t get to see what else the screen has to offer. So what if now I show only a few groups, and let people uncover more as they go? That concept is called progressive disclosure.

It’s about showing only what’s necessary upfront — just enough to help people get started then revealing more as they interact. You’ll see it anywhere an interface begins simple and gradually offers more detail or advanced options. So the rest of the content, is not missing,

it’s just behind a tap on the disclosure control next to the title, waiting for the moment it becomes relevant. And when that screen opens I want the content to be arranged in the same way. It feels connected to the previous screen, like it’s expanding. As I explained in navigation, every screen should provide orientation, so let’s not forget the tool bar this time.

It has actions related to the screen and the back button, so it’s easy to understand how people got here and how to move around. In my initial design, there were elements for decoration or without concrete purpose, making it difficult to discover features that mattered. So now, I want to make smarter design choices by finding the clearest way to show content in the layout.

Let’s unpack a few examples. Progressive disclosure was a step in the right direction, but the grid layout doesn’t feel quite right. It takes up too much space for just two items. And it doesn’t handle longer text well, making the content unclear. Let me work on that.

A List works way better, it’s a flexible, highly usable and familiar way to show structured information and facilitates quick scanning. It also takes up less vertical space than images, which means more items can fit on the screen at once. And so you know, I didn’t design it from scratch, I learned from components like the tab bar and toolbar

that designing to prioritize function really pays off. So I’m using the list template from the Apple Design Resources, which was easy to adapt to my content. It’s starting to feel like the design is much more intentional and supports more functionalities, like a real app. Time to see how the last section is working.

Once I scroll, I find all the records someone has uploaded to the app. My goal was to make everything available upfront so people could explore freely. But as the number of choices grows, so does the effort it takes to process. I worry that instead of browsing, people might feel overwhelmed and leave the app altogether. Before figuring out how to display a large amount content, I needed to organize it.

Grouping things into themes — like in information architecture helped me cut through the noise and focus on what matters. There are a few themes that apps use to stay organized. Grouping content by time is one of the most frequent ways: think about how helpful is to find your Recent files, or continue watching when streaming a show.

Grouping considering seasonality and current events also make the experience feel more alive and relevant. Grouping by progress helps people pick up where they left off like draft emails, or an ongoing class. It’s a great way to make an app feel responsive to real life because people rarely finish everything in one go.

And grouping by patterns is about surfacing relationships things that belong together, like related products. Surfacing patterns turns a quick browse into a longer exploration because it shows people connections they didn’t know to look for. These grouping ideas aren’t limited to one type of app. Even if the content isn’t very visual or doesn’t change often,

they help reduce choice overload and make the app feel one step ahead like it understands what we’ll need next. I know I’ll definitely be using them. And for displaying a large number of images — as I need — it’s best to consider using a collection. It’s ideal to show groups of items like photos, videos, or products

that can be scrolled on and off the screen. I love how dynamic it feels. To achieve that, I have consistent spacing between items and I’m avoiding too much text on them. I created collections using the grouping ideas from before. Here, by time: showcasing records that are ideal for summer time,

by progress: featuring complete sets or discographies, and by patterns: like style or genre. When content is thoughtfully organized and laid out using familiar platform components, it helps people find what matters, effortlessly — creating a space that feels intuitive and inviting to return to again and again.

Lastly, when I open an app and it just feels right, visual design is a huge part of that. It communicates the personality of the app and shapes how people feel. It’s the thoughtful use of hierarchy, typography, images and color, all while supporting function. To take the app’s visual design further, I need to figure out

what’s working—and what can be improved. I’m paying attention to how type, color, and imagery are coming together. When I squint, my eyes go straight down to the first collection, because it’s visually heavier and colorful. Missing half of the content, and sense of place. What’s missing here is visual hierarchy.

It’s about guiding the eye through the screen, so it notices the different design elements in order of importance. To improve it, I’m going to turn this suggestion into a visual anchor by making what’s most important larger or higher in contrast, so it naturally draws attention first. And it works—visually, it does the job.

But will it hold up? What if the text gets longer, the language changes, or someone’s using a larger text size? I realize I need to design with more flexibility, especially when it comes to type. That’s where system text styles come in handy.

These make it easy to create clear hierarchy and strong legibility even under different screen conditions They offer a consistent way to style everything from titles to captions, so I have range to communicate the different levels of importance of my content — without needing to eyeball text sizes or creating custom styles from scratch. I’ll maintain the full-bleed design, moving the album cover to the background.

That gives the text a persistent space while the three different text styles provide helpful variations of size and contrast, successfully guiding the eye. Text styles also support Dynamic Type, allowing people to choose a text size that’s comfortable for them making the app more inclusive and easier for everyone to use.

But when text overlays an image, legibility can quickly become a problem especially with busy or high-contrast visuals. In those cases, clarity has to come first. One simple way to fix this is by adding a subtle background behind the text like a gradient or blur. It improves readability, while adding some dimension without disrupting the design.

The last thing I want to focus on is how images and color can help convey the personality of the app. Starting on the list. I think I simplified it a little too much and it’s getting lost in between components. So I’ll add images to represent each group and make the list easier to scan.

But not every image seems to work. They are all very different — in color, style. I start to see that what I really need is a cohesive visual style. To get there, I’m choosing a color palette and setting some simple rules to use it. Hopefully, this will establish a consistent aesthetic and evoke the right feeling. I choose four colors, a few retro shapes and then I mix and match.

For those groups that show a title, I went with a bolder, expanded font, so they look different from text in the list. I really like how this is looking, I think these choices sharpen the app’s personality and make it easier to stay consistent as it grows. And since I’m working with color, I’m curious — where else in the app can I use it?

Maybe backgrounds, text, icons, but those already have color, just not the kind I pick from a palette. They’re not black or purple they have names like label or secondarySystemBackground. These are semantic colors, and are named after their purpose, not their appearance — because they’re dynamic.

They automatically change according to contrast settings, screen environments and modes like dark and light. I can use an accent color here and there — on buttons, controls, maybe to show what’s selected. But I have to be careful it doesn’t get in the way of dynamic changes, overall legibility, or people’s comfort.

So I’d say that for anything dynamic, this is basically my color palette of system colors. They’re also part of the Apple Design Resources, and they give me a flexible set of options to build visual hierarchy that seamlessly adapt to people’s preferred appearance, without extra work. This is a great way to practice knowing when to lean on the system,

and where to add personality. It might be tempting to treat each of these design elements as its own little project, and in some ways, they are; they deserve thought and attention. But the real impact comes when they work together contributing to the overall meaning of the interface. The design I started with, it’s long gone.

I simplified its structure and navigation, presented its content with meaning helping people take action, all in a space everybody can use and enjoy. Every element of this design, builds on our past decisions, from the first tap to the last scroll. Design is never really finished, and there’s no single right answer. Today we explored the foundations and you can take your app even further

with typography, UX writing, and animation. There are endless possibilities. If you’re ready to keep going, check out these sessions from previous years and get to know the new design system. There’s so much more to explore and learn—so stay curious and keep creating. I’m excited to see where your ideas take you!
