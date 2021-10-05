# Layout Ea
Most of the popular HTML layout frameworks in use, including Bootstrap, require that the layout instructions be specified as class names within the HTML source.
This is a violation of the principle of separation of concerns whereby layout minutiae must not clutter the HTML.
Such a separation becomes even more imperative with application frameworks like Angular, React and Vue where the HTML template becomes an unreadable
hodgepodge of disparate concerns, with functionally different teams all working on the same code base.
Alternatively, it forces one developer to become jack of all trades, and we all know how that aphorism continues.
Both alternatives produce sub-optimal results.

The layout managers in this package have the guiding principle that the layout specification must be fully external to the HTML.
The only connection between tbe HTML and the layout specification is a CSS selector, which may be an ID attribute, an HTML tag name, a child ordinal index, or, if so desired, a semantic class name.
In that respect, these layout managers are closer to using straight CSS itself but offer advantages:
1. The layout specification for a semantically related snippet of HTML is grouped compactly in one place.
2. This allows for better documentation and maintenance as well as reusability.
3. The reusability, in turn, allows for hierarchical layout specifications.
4. This allows for highly customizable layouts for different media queries.

Using the selectors, these layout managers can be freely intermixed with other layout strategies to manage only some parts of the HTML.

A current limitation of these layout managers is that they do not cater for dynamic HTML structure.
In other words, these layout managers are a one-shot affair.
They will not handle child HTML elements added or removed post-layout.
Please note that changing the text content or value of an HTML element only modifies the text node(s) and does not add a child HTML element.

This limitation is not a problem for most web applications which follow the familiar deskop application paradigm of a fixed UI layout.
Any variable content can be placed inside a DIV whose content is then managed separately using straight CSS or an alternative strategy.

This collection of layout managers currently consists of only one layout manager:

[Layout Grid](README_Grid.md)
