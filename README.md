# Universal Web Highlighter

A powerful Firefox WebExtension that allows you to highlight text on any webpage with custom colors and persist highlights across browser sessions.

## Features

- **Universal Highlighting**: Highlight text on any webpage with custom colors
- **Persistent Storage**: Highlights are saved in browser storage and restored when you revisit pages
- **Smart Positioning**: Uses CSS selectors and XPath to accurately restore highlights
- **Multiple Methods**: Highlight via popup, context menu, or keyboard shortcuts
- **Clean UI**: Modern, intuitive popup interface with color picker
- **Cross-Session**: Highlights persist until you clear extension data

## Installation

### Method 1: Load as Temporary Extension (Development)

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Select the `manifest.json` file from this directory
6. The extension will be loaded and appear in your toolbar

### Method 2: Package and Install

1. Create a ZIP file containing all the extension files
2. Rename the ZIP file to have a `.xpi` extension
3. Drag and drop the `.xpi` file into Firefox
4. Click "Add" when prompted

## Usage

### Basic Highlighting

1. **Select Text**: Select any text on a webpage
2. **Open Popup**: Click the highlighter icon in your toolbar
3. **Choose Color**: Use the color picker to select your preferred highlight color
4. **Apply Highlight**: Click "Highlight Selection" button

### Context Menu Highlighting

1. **Select Text**: Select any text on a webpage
2. **Right-Click**: Right-click on the selected text
3. **Choose Option**: Select "Highlight with Web Highlighter" from the context menu
4. **Automatic Highlight**: Text will be highlighted with the default color

### Managing Highlights

- **View Highlights**: Highlights are automatically restored when you revisit pages
- **Clear Highlights**: Use the "Clear All Highlights" button in the popup
- **Persistent Storage**: Highlights are stored locally and persist across browser sessions

## File Structure

```
highlighter/
├── manifest.json          # Extension manifest and configuration
├── popup.html            # Popup interface HTML
├── popup.css             # Popup interface styles
├── popup.js              # Popup functionality
├── content.js            # Content script for webpage interaction
├── content.css           # Styles for highlighted text
├── background.js         # Background script for context menu and storage
├── icons/                # Extension icons
│   └── icon.svg         # SVG icon source
└── README.md            # This file
```

## Technical Details

### Architecture

- **Popup**: User interface for color selection and highlighting
- **Content Script**: Runs on web pages to handle text selection and highlighting
- **Background Script**: Manages context menu, storage, and extension lifecycle
- **Storage**: Uses `browser.storage.local` for persistent highlight storage

### Highlight Persistence

The extension uses multiple strategies to ensure highlights are accurately restored:

1. **CSS Selectors**: Primary method for element identification
2. **XPath Fallback**: Secondary method when CSS selectors fail
3. **Text Content Matching**: Fallback for dynamic content
4. **DOM Observation**: Monitors page changes to restore lost highlights

### Browser Compatibility

- **Firefox**: Full support (primary target)
- **Chrome/Edge**: May work with minor modifications
- **Safari**: Not supported (different extension API)

## Development

### Prerequisites

- Firefox browser
- Basic knowledge of WebExtensions API
- Text editor or IDE

### Local Development

1. Clone the repository
2. Load as temporary extension in Firefox
3. Make changes to files
4. Reload the extension in `about:debugging`
5. Test on web pages

### Building for Distribution

1. Ensure all files are properly structured
2. Create a ZIP archive of the extension
3. Rename to `.xpi` extension
4. Test installation in a clean Firefox profile

## Customization

### Adding New Features

The code is designed to be modular and extensible:

- **New Highlight Types**: Extend the `WebHighlighter` class
- **Additional Storage**: Modify storage methods in background script
- **UI Enhancements**: Update popup HTML/CSS/JS
- **Keyboard Shortcuts**: Add event listeners in content script

### Styling Highlights

Modify `content.css` to customize highlight appearance:

```css
.web-highlighter-highlight {
  /* Custom highlight styles */
  background-color: your-color;
  border-radius: your-radius;
  /* Add more custom properties */
}
```

## Troubleshooting

### Common Issues

1. **Highlights Not Appearing**
   - Check browser console for errors
   - Ensure extension has proper permissions
   - Verify content script is running

2. **Highlights Not Persisting**
   - Check storage permissions
   - Verify storage quota isn't exceeded
   - Check for storage errors in console

3. **Performance Issues**
   - Reduce number of highlights per page
   - Check for excessive DOM observations
   - Monitor storage usage

### Debug Mode

Enable debug logging by checking the browser console:

1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for messages from "Web Highlighter"
4. Report any errors or warnings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or contributions:

1. Check the troubleshooting section
2. Review browser console for errors
3. Open an issue on the repository
4. Provide detailed information about the problem

## Changelog

### Version 1.0.0
- Initial release
- Basic highlighting functionality
- Persistent storage
- Context menu integration
- Popup interface
- Cross-session persistence 