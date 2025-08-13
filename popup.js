/**
 * Universal Web Highlighter - Popup Script
 * Handles the popup UI interactions and communicates with content scripts
 */

class PopupManager {
  constructor() {
    this.currentColor = '#ffff00';
    this.colorSwatches = [];
    this.init();
  }

  /**
   * Initialize the popup
   */
  init() {
    this.bindEvents();
    this.updateColorPreview();
    this.checkCurrentPage();
    this.setupColorSwatches();
  }

  /**
   * Set up color swatches and their interactions
   */
  setupColorSwatches() {
    this.colorSwatches = document.querySelectorAll('.color-swatch');
    
    // Set initial active state for default color
    this.updateActiveSwatch(this.currentColor);
    
    // Add click handlers for color swatches
    this.colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        const color = e.target.dataset.color;
        this.selectColorSwatch(color);
      });
    });
  }

  /**
   * Select a color from the swatches
   */
  selectColorSwatch(color) {
    this.currentColor = color;
    this.updateColorPreview();
    this.updateActiveSwatch(color);
    
    // Update the color picker to match
    document.getElementById('colorPicker').value = color;
    
    // Save as default color
    this.saveDefaultColor(color);
  }

  /**
   * Update the active state of color swatches
   */
  updateActiveSwatch(color) {
    this.colorSwatches.forEach(swatch => {
      if (swatch.dataset.color === color) {
        swatch.classList.add('active');
      } else {
        swatch.classList.remove('active');
      }
    });
  }

  /**
   * Save the selected color as default
   */
  async saveDefaultColor(color) {
    try {
      await browser.storage.local.set({ defaultHighlightColor: color });
      console.log('Default color saved:', color);
    } catch (error) {
      console.error('Error saving default color:', error);
    }
  }

  /**
   * Load the default color from storage
   */
  async loadDefaultColor() {
    try {
      const result = await browser.storage.local.get('defaultHighlightColor');
      const defaultColor = result.defaultHighlightColor || '#ffff00';
      this.currentColor = defaultColor;
      this.updateColorPreview();
      this.updateActiveSwatch(defaultColor);
      document.getElementById('colorPicker').value = defaultColor;
    } catch (error) {
      console.error('Error loading default color:', error);
    }
  }

  /**
   * Bind event listeners to UI elements
   */
  bindEvents() {
    // Color picker change
    document.getElementById('colorPicker').addEventListener('change', (e) => {
      this.currentColor = e.target.value;
      this.updateColorPreview();
      this.updateActiveSwatch(this.currentColor);
      this.saveDefaultColor(this.currentColor);
    });

    // Color picker input (for live preview)
    document.getElementById('colorPicker').addEventListener('input', (e) => {
      this.currentColor = e.target.value;
      this.updateColorPreview();
      this.updateActiveSwatch(this.currentColor);
    });

    // Highlight button click
    document.getElementById('highlightBtn').addEventListener('click', () => {
      this.highlightSelection();
    });

    // Clear highlights button click
    document.getElementById('clearBtn').addEventListener('click', () => {
      this.clearAllHighlights();
    });
  }

  /**
   * Update the color preview display
   */
  updateColorPreview() {
    const preview = document.getElementById('colorPreview');
    preview.style.backgroundColor = this.currentColor;
    
    // Update button colors to show current selection
    const highlightBtn = document.getElementById('highlightBtn');
    highlightBtn.style.borderLeft = `4px solid ${this.currentColor}`;
  }

  /**
   * Check if we're on a page where highlighting is possible
   */
  async checkCurrentPage() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      
      if (tab.url && tab.url.startsWith('http')) {
        this.updateStatus('Ready to highlight text on this page');
        document.getElementById('highlightBtn').disabled = false;
      } else {
        this.updateStatus('Highlighting not available on this page');
        document.getElementById('highlightBtn').disabled = true;
      }
    } catch (error) {
      console.error('Error checking current page:', error);
      this.updateStatus('Error checking page status');
    }
  }

  /**
   * Highlight the currently selected text
   */
  async highlightSelection() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !tab.url.startsWith('http')) {
        this.updateStatus('Cannot highlight on this page type');
        return;
      }

      // Send message to content script to highlight selection
      const response = await browser.tabs.sendMessage(tab.id, {
        action: 'highlightSelection',
        color: this.currentColor
      });

      if (response && response.success) {
        this.updateStatus(`Highlighted text with ${this.currentColor}`);
        
        // Close popup after successful highlight
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        this.updateStatus('No text selected or highlighting failed');
      }
    } catch (error) {
      console.error('Error highlighting selection:', error);
      this.updateStatus('Error: ' + error.message);
    }
  }

  /**
   * Clear all highlights on the current page
   */
  async clearAllHighlights() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url || !tab.url.startsWith('http')) {
        this.updateStatus('Cannot clear highlights on this page type');
        return;
      }

      // Send message to content script to clear highlights
      const response = await browser.tabs.sendMessage(tab.id, {
        action: 'clearAllHighlights'
      });

      if (response && response.success) {
        this.updateStatus('All highlights cleared successfully');
      } else {
        this.updateStatus('No highlights to clear or operation failed');
      }
    } catch (error) {
      console.error('Error clearing highlights:', error);
      this.updateStatus('Error: ' + error.message);
    }
  }

  /**
   * Update the status message in the popup
   */
  updateStatus(message) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    
    // Add visual feedback
    statusElement.style.background = '#d4edda';
    statusElement.style.color = '#155724';
    
    // Reset to default style after 3 seconds
    setTimeout(() => {
      statusElement.style.background = '#e3f2fd';
      statusElement.style.color = '#1976d2';
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupManager();
  
  // Load default color after initialization
  setTimeout(() => {
    popup.loadDefaultColor();
  }, 100);
}); 