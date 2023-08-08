# Cursor column highlight

Adds cursor position indication with column highlighting.

## Features

Uses `editor.lineHighlightBackground` color as vertical line in cursor position.
Improves cursor visibility, especially on big displays.

\!\[Preview 1\]\(images/preview-1.png\)
\!\[Preview 2\]\(images/preview-2.png\)
\!\[Preview 3\]\(images/preview-3.png\)

## Extension Settings

Introduces `cursorColumnColor` color variable for setting up custom highlight color.

## Known Issues

### Flickering
Makes short flickering on start and theme change. It caused by webview hack used for reading actual values of current color theme.

If somebody will ask me - I can add option to skip theme reading. It means only custom color should be used.

## Release Notes
First beta release


