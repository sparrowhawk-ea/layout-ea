# Layout Ea
Most of the popular HTML layout frameworks, including Bootstrap, require that the layout instructions be specified as class names within the HTML source.
This is a violation of the principle of [separation of concerns](https://en.wikipedia.org/wiki/Separation_of_concerns) whereby layout minutiae must not clutter the HTML.
Such a separation becomes even more imperative with application frameworks like Angular, React and Vue where the HTML template becomes an unreadable
hodgepodge of disparate concerns, with functionally different teams all working on the same code base.
Alternatively, it forces one developer to perform all functions, usually with sub-optimal results.

This library has the guiding principle that the layout specification must be external to the HTML.
The connection linking the HTML to its layout specification is a CSS selector, which may be an ID attribute, an HTML tag name, a child ordinal index, or, if so desired, a semantic class name.
In that respect, this library is closer to using straight CSS itself.
It does, however, offer significant advantages over using straight CSS:
1. The layout for related HTML elements comprising a single semantic unit is specified compactly in one place.
2. This allows for better documentation and maintenance as well as reusability.
3. The reusability, in turn, allows for hierarchical layout specifications.
4. This hierarchy allows for highly customizable layouts for different media queries.

Using the CSS selectors, this libary can be freely intermixed with other layout strategies to manage only some parts of the HTML.

A current limitation of this library is that it does not cater for dynamic HTML structure.
In other words, it will not handle HTML elements added or removed post-layout.
Please note that changing the text content or value of an HTML element only modifies the text node(s) and does not add a child HTML element.

This limitation is not a problem for most web applications which follow the familiar deskop application paradigm of a proportionally fixed layout.
Any variable content can be placed inside a DIV whose content is then managed separately using straight CSS or an alternative strategy.

This library consists of one layout manager [Layout Ea Grid](README_Grid.md) which uses a CSS grid of equaly sized cells with a configurable number of columns and rows.

***
# Getting Started

Please see [Layout Ea Grid](Readme_Grid.md#gettingstarted).

***
# API

## Layout

A layout specification consists of a **Record<string, string>** which maps CSS selectors to [strategy](#layouteastrategy)-specific layout specifications.
Each HTML element in the DOM tree being laid out is tested against the CSS selectors and the layout specification for the first matching selector is applied to lay out its immediate children.
In the case of [media layouts](#lauouiteamedialayout), a fallback specification is searched if no selectors match.
This allows for hierarchical specifications.

***
## LayoutEa

This is the entry point to the library and contains one static method.
This method creates an HTMLStyleElement with a CSS style sheet and appends it within **document.head**.
The style sheet contains rules implementing the layouts supplied.
If an HTML element does not have the id attribute, it is given a generated class name to use as a unique CSS selector.
These class names are of the form **layout-ea--\<integer\>**.

Layout specifications can refer to child HTML elements by their ordinal index.
The index counter can be adjusted by giving an HTML element the integer-valued attribute **data-ea-index**.
That and subsequent HTML elements will be counted from that index.
Any HTML elements to be excluded from this ordinal count may be given the valueless attribute **data-ea-exclude** or be identified by CSS selector in the [ignore](#config-ignore) property of the [LayoutEaConfig](#layouteaconfig) parameter.

Method | Parameter/Return | Description
--- | --- | ---
layout | (
| e: HTMLElement | The root HTML element of the DOM tree to be laid out.
| config: [LayoutEaConfig](#layouteaconfig)
| ): HTMLStyleElement | The HTML style element that was created and added to **document.head**

***
## LayoutEaCallback

An optional callback passed in through the [LayoutEaConfig](#layouteaconfig).
This callback can be used to inspect and modify the CSS style to be applied to an HTML element.
The style string is of the same form as the HTML style attribute  'attribute1:value1;attribute2:value2;' etc.
The callback may add CSS style attributes and values in the return value but should not remove any.

Method | Parameter/Return | Description
--- | --- | ---
eaChild | ( | Intercept the CSS rule for a child HTML element before it is added to the style sheet.
| e: HTMLElement | The child HTML element.
| mediaName: string | The [name](#media-name) of the [LayoutEaMediaLayout](#layouteamedialayout) being processed.
| selector: string | The CSS selector for the child element in the rule being added.
| style: string | The CSS style in the rule being added.
| content?: unknown | Optional context supplied by the [LayoutEaStrategy](#layouteastrategy) used.  For [LayoutEaGrid](README_Grid.md), this is always undefined.
| ): string | Return the, possibly modified, style parameter.
eaParent | ( | Intercept the CSS rule for the parent HTML element before it is added to the style sheet.
| e: HTMLElement | The parent HTML element.
| mediaName: string | The name attribute of the [LayoutEaMediaLayout](#layouteamedialayout) being processed.
| selector: string | The CSS selector for the parent element in the rule being added.
| style: string | The CSS style in the rule being added.
| content?: unknown | Optional context supplied by the [LayoutEaStrategy](#layouteastrategy) used.  For [LayoutEaGrid](README_Grid.md), this is always undefined.
| ): string | Return the, possibly modified, style parameter.

***
## LayoutEaConfig

The configuration passed in to the [LayoutEa.layout](#layoutea-layout) method.
Only one of [layout](#config-layout) or [mediaLayouts](#config-medialayouts) properties below must be specified.

Property | Type | Default | Description
--- | --- | --- | ---
<a name='config-callback'></a>callback | [LayoutEaCallback](#layouteacallback)
<a name='config-dataprefix'></a>dataPrefix | string | 'ea' | Alternative infix for the data-ea-exclude and data-ea-index properties.
<a name='config-debug'></a>debug | boolean | false | Show debug information.
<a name='config-ignore'></a>ignore | string[] | [] | List of CSS selectors for HTML elements to ignore.
<a name='config-layout'></a>layout | Record<string, string> || [Layout](#layout) specification if media query is not needed.
<a name='config-medialayouts'></a>mediaLayouts | [LayoutEaMediaLayout](#layouteamedialayout)[] || Alternatively, responsive layouts for media queries.
<a name='config-sizes'></a>sizes | Record<string, string> || Size aliases used in layout specifications.
<a name='config-strategy'></a>strategy | [LayoutEaStrategy](#layouteastrategy) | **Required** | Must be [LayoutEaGrid](README_Grid.md)

***
## LayoutEaMediaLayout

The layout specification to be applied when a CSS media query matches.

Property | Type | Default | Description
--- | --- | --- | ---
<a name='media-fallback'></a>fallback | string | [mediaLayouts](config-mediaLayouts)[0] .[name](#media-name) | [name](#media-name) of [mediaLayouts](config-mediaLayouts) to use when no layout is given for an HTML element in this specification.
<a name='media-layout'></a>layout | Record<string, string> | **Required** | [Layout](#layout) specification for this media query.
<a name='media-mediaquery'></a>mediaQuery | string | **Required** | CSS media query.
<a name='media-name'></a>name | string | mediaQuery | Unique name for this media layout.

***
## LayoutEaStrategy

The interface implemented by strategies performing the layout.
Currently, [Layout Ea Grid](README_Grid.md) is the only object exported by the library which implements this interface.
