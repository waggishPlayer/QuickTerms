# QuickTerms Chrome Extension

A Chrome extension for quick access to terms and definitions.

## Project Structure

```
quickterms/
├── src/                    # Source code directory
│   ├── core/              # Core extension functionality
│   │   └── background.js  # Background service worker
│   ├── content/           # Content-related functionality
│   │   └── content.js     # Content script for page analysis
│   ├── ui/                # User interface components
│   │   ├── popup.html     # Popup interface
│   │   ├── popup.js       # Popup logic
│   │   └── styles/        # UI stylesheets
│   └── assets/            # Static assets
│       ├── icons/         # Extension icons
│       └── images/        # Other images
├── docs/                  # Documentation
├── manifest.json          # Extension manifest
└── README.md              # This file
```

## Development Setup

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the project directory

## Features

- Quick access to terms and definitions
- User-friendly interface
- Efficient content scanning

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
