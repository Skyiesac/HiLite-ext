
class BackgroundManager {
  constructor() {
    this.defaultColors = [
      '#ffff00', // Yellow
      '#ff6b6b', // Red
      '#4ecdc4', // Teal
      '#45b7d1', // Blue
      '#96ceb4', // Green
      '#feca57', // Orange
      '#ff9ff3', // Pink
      '#a8e6cf', // Mint
      '#dda0dd', // Lavender
      '#f4a460', // Sandy Brown
      '#98fb98', // Pale Green
      '#87ceeb', // Sky Blue
      '#dda0dd', // Plum
      '#f0e68c', // Khaki
      '#ffb6c1', // Light Pink
      '#20b2aa', // Light Sea Green
      '#87cefa', // Light Sky Blue
      '#d8bfd8', // Thistle
      '#f5deb3', // Wheat
      '#b0e0e6'  // Powder Blue
    ];
    this.init();
  }

  /**
   * Initialize the background script
   */
  init() {
    console.log('Web Highlighter background script initialized');
    this.setupContextMenu();
    this.setupMessageListener();
    this.setupInstallListener();
    
    // Test message to confirm script is running
    console.log('Background script setup completed');
  }

  /**
   * Set up context menu for right-click highlighting
   */
  setupContextMenu() {
    try {
      console.log('Setting up context menus...');
      
      // Create context menu item for highlighting
      browser.contextMenus.create({
        id: 'highlight-with-web-highlighter',
        title: 'Highlight with HiLite',
        contexts: ['selection']
      }, () => {
        if (browser.runtime.lastError) {
          console.error('Error creating main context menu:', browser.runtime.lastError);
        } else {
          console.log('Main context menu created successfully');
        }
      });

      // Create submenu for quick color selection
      browser.contextMenus.create({
        id: 'highlight-quick-colors',
        title: 'Quick Highlight Colors',
        contexts: ['selection']
      }, () => {
        if (browser.runtime.lastError) {
          console.error('Error creating color submenu:', browser.runtime.lastError);
        } else {
          console.log('Color submenu created successfully');
        }
      });

      // Add color submenu items
      this.defaultColors.forEach((color, index) => {
        const colorName = this.getColorName(color);
        browser.contextMenus.create({
          id: `highlight-color-${index}`,
          title: colorName,
          contexts: ['selection'],
          parentId: 'highlight-quick-colors'
        }, () => {
          if (browser.runtime.lastError) {
            console.error(`Error creating color menu item ${index}:`, browser.runtime.lastError);
          }
        });
      });

      // Handle context menu clicks
      browser.contextMenus.onClicked.addListener((info, tab) => {
        console.log('Context menu clicked:', info.menuItemId, info, tab);
        
        if (info.menuItemId === 'highlight-with-web-highlighter') {
          this.handleContextMenuHighlight(info, tab);
        } else if (info.menuItemId.startsWith('highlight-color-')) {
          const colorIndex = parseInt(info.menuItemId.split('-').pop());
          const color = this.defaultColors[colorIndex];
          this.handleContextMenuHighlight(info, tab, color);
        }
      });
      
      console.log('Context menu setup completed');
    } catch (error) {
      console.error('Error setting up context menus:', error);
    }
  }

  /**
   * Get a human-readable name for a color
   */
  getColorName(color) {
    const colorNames = {
      '#ffff00': 'Yellow',
      '#ff6b6b': 'Red',
      '#4ecdc4': 'Teal',
      '#45b7d1': 'Blue',
      '#96ceb4': 'Green',
      '#feca57': 'Orange',
      '#ff9ff3': 'Pink',
      '#a8e6cf': 'Mint',
      '#dda0dd': 'Lavender',
      '#f4a460': 'Sandy Brown',
      '#98fb98': 'Pale Green',
      '#87ceeb': 'Sky Blue',
      '#dda0dd': 'Plum',
      '#f0e68c': 'Khaki',
      '#ffb6c1': 'Light Pink',
      '#20b2aa': 'Light Sea Green',
      '#87cefa': 'Light Sky Blue',
      '#d8bfd8': 'Thistle',
      '#f5deb3': 'Wheat',
      '#b0e0e6': 'Powder Blue'
    };
    return colorNames[color] || color;
  }

  /**
   * Handle context menu highlight action
   */
  async handleContextMenuHighlight(info, tab, specificColor = null) {
    try {
      if (info.selectionText && tab.url && tab.url.startsWith('http')) {
        // Get the highlight color
        let color = specificColor;
        if (!color) {
          const result = await browser.storage.local.get('defaultHighlightColor');
          color = result.defaultHighlightColor || '#ffff00';
        }
        
        // Send message to content script to highlight the selection
        const response = await browser.tabs.sendMessage(tab.id, {
          action: 'highlightSelection',
          color: color
        });
        
        if (response && response.success) {
          // Show notification of success
          this.showNotification(`Text highlighted with ${this.getColorName(color)}!`, 'success');
        } else {
          this.showNotification('Failed to highlight text', 'error');
        }
      }
    } catch (error) {
      console.error('Error handling context menu highlight:', error);
      this.showNotification('Error highlighting text', 'error');
    }
  }

  /**
   * Set up message listener for communication with other parts of the extension
   */
  setupMessageListener() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'getDefaultColor':
          this.getDefaultColor().then(sendResponse);
          break;
        case 'setDefaultColor':
          this.setDefaultColor(message.color).then(sendResponse);
          break;
        case 'getHighlightStats':
          this.getHighlightStats().then(sendResponse);
          break;
        case 'clearAllData':
          this.clearAllData().then(sendResponse);
          break;
        case 'getAvailableColors':
          sendResponse(this.defaultColors);
          break;
        case 'getColorName':
          sendResponse(this.getColorName(message.color));
          break;
      }
      return true; // Keep message channel open for async response
    });
  }

  /**
   * Set up install listener for first-time setup
   */
  setupInstallListener() {
    browser.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        this.handleFirstInstall();
      } else if (details.reason === 'update') {
        this.handleUpdate(details.previousVersion);
      }
    });
  }

  /**
   * Handle first-time installation
   */
  async handleFirstInstall() {
    try {
      // Set default highlight color
      await browser.storage.local.set({ defaultHighlightColor: '#ffff00' });
      
      // Show welcome message
      this.showNotification('HiLite installed! Select text and right-click to highlight.', 'info');
      
      console.log('HiLite extension installed successfully');
    } catch (error) {
      console.error('Error during first install:', error);
    }
  }

  /**
   * Handle extension updates
   */
  async handleUpdate(previousVersion) {
    try {
      console.log(`HiLite updated from ${previousVersion} to ${browser.runtime.getManifest().version}`);
      
      // Perform any necessary migration tasks here
      await this.migrateData(previousVersion);
      
    } catch (error) {
      console.error('Error during update:', error);
    }
  }

  /**
   * Migrate data between versions if needed
   */
  async migrateData(previousVersion) {
    // Add migration logic here when needed
    // For now, just log the migration
    console.log('Data migration completed');
  }

  /**
   * Get the default highlight color
   */
  async getDefaultColor() {
    try {
      const result = await browser.storage.local.get('defaultHighlightColor');
      return result.defaultHighlightColor || '#ffff00';
    } catch (error) {
      console.error('Error getting default color:', error);
      return '#ffff00';
    }
  }

  /**
   * Set the default highlight color
   */
  async setDefaultColor(color) {
    try {
      await browser.storage.local.set({ defaultHighlightColor: color });
      return { success: true };
    } catch (error) {
      console.error('Error setting default color:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get statistics about stored highlights
   */
  async getHighlightStats() {
    try {
      const result = await browser.storage.local.get();
      const stats = {
        totalPages: 0,
        totalHighlights: 0,
        totalStorageSize: 0
      };
      
      Object.keys(result).forEach(key => {
        if (key !== 'defaultHighlightColor') {
          stats.totalPages++;
          if (Array.isArray(result[key])) {
            stats.totalHighlights += result[key].length;
          }
        }
      });
      
      // Estimate storage size (rough calculation)
      stats.totalStorageSize = JSON.stringify(result).length;
      
      return stats;
    } catch (error) {
      console.error('Error getting highlight stats:', error);
      return { error: error.message };
    }
  }

 
  async clearAllData() {
    try {
      await browser.storage.local.clear();
      
      // Reset default color
      await browser.storage.local.set({ defaultHighlightColor: '#ffff00' });
      
      return { success: true };
    } catch (error) {
      console.error('Error clearing all data:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Show a notification to the user
   */
  showNotification(message, type = 'info') {
    // For Firefox, we'll use console logging as a fallback
    // In a real extension, you might want to use browser.notifications API
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // You can also send a message to the active tab to show a custom notification
    this.showTabNotification(message, type);
  }

  /**
   * Show notification in the active tab
   */
  async showTabNotification(message, type) {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.url && tab.url.startsWith('http')) {
        await browser.tabs.sendMessage(tab.id, {
          action: 'showNotification',
          message: message,
          type: type
        });
      }
    } catch (error) {
      console.error('Error showing tab notification:', error);
    }
  }
}

// Initialize the background manager
new BackgroundManager(); 