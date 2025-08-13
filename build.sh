
echo "🌟 Building Universal Web Highlighter Extension..."

# Check if we're in the right directory
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found. Please run this script from the extension directory."
    exit 1
fi

# Clean up any existing XPI file
if [ -f "web-highlighter.xpi" ]; then
    echo "🗑️  Removing existing web-highlighter.xpi..."
    rm web-highlighter.xpi
fi

# Create the XPI package
echo "📦 Creating XPI package..."
zip -r web-highlighter.xpi . \
    -x "*.git*" \
    -x "*.DS_Store" \
    -x "node_modules/*" \
    -x "*.md" \
    -x "package.json" \
    -x "package-lock.json" \
    -x "build.sh" \
    -x "test.html" \
    -x "*.log"

# Check if the XPI was created successfully
if [ -f "web-highlighter.xpi" ]; then
    echo "✅ Extension built successfully!"
    echo "📁 Output file: web-highlighter.xpi"
    echo "📏 File size: $(du -h web-highlighter.xpi | cut -f1)"
    echo ""
    echo "🚀 To install the extension:"
    echo "   1. Open Firefox"
    echo "   2. Navigate to about:debugging"
    echo "   3. Click 'This Firefox'"
    echo "   4. Click 'Load Temporary Add-on'"
    echo "   5. Select the web-highlighter.xpi file"
    echo ""
    echo "💡 For permanent installation, drag the .xpi file into Firefox"
else
    echo "❌ Error: Failed to create XPI package"
    exit 1
fi 