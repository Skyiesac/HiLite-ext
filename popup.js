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

    // Manage highlights button click
    document.getElementById('manageHighlightsBtn').addEventListener('click', () => {
      this.manageHighlights();
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
   * Manage highlights on the current page
   */
  async manageHighlights() {
    try {
      // Get all stored highlights from all websites
      const result = await browser.storage.local.get();
      const urlHighlights = {};
      
      // Group highlights by URL
      Object.keys(result).forEach(key => {
        if (key !== 'defaultHighlightColor' && key.startsWith('http')) {
          if (Array.isArray(result[key]) && result[key].length > 0) {
            urlHighlights[key] = result[key];
          }
        }
      });
      
      if (Object.keys(urlHighlights).length > 0) {
        this.showWebsitesManager(urlHighlights);
      } else {
        this.updateStatus('No highlights found on any website');
      }
    } catch (error) {
      console.error('Error managing highlights:', error);
      this.updateStatus('Error: ' + error.message);
    }
  }

  /**
   * Show the websites manager interface
   */
  showWebsitesManager(urlHighlights) {
    const totalHighlights = Object.values(urlHighlights).reduce((sum, highlights) => sum + highlights.length, 0);
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'highlights-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Manage Highlights (${Object.keys(urlHighlights).length} websites, ${totalHighlights} total highlights)</h3>
          <button class="close-btn" id="closeModal">×</button>
        </div>
        <div class="modal-body">
          <div class="websites-list">
            ${Object.entries(urlHighlights).map(([url, highlights]) => `
              <div class="website-item" data-url="${url}">
                <div class="website-info">
                  <div class="website-url">${this.getDomainFromUrl(url)}</div>
                  <div class="website-details">
                    <span class="highlight-count">${highlights.length} highlight${highlights.length !== 1 ? 's' : ''}</span>
                    <span class="website-full-url">${url}</span>
                  </div>
                </div>
                <div class="website-actions">
                  <button class="view-highlights-btn" data-url="${url}" data-count="${highlights.length}">👁️ View</button>
                  <button class="delete-website-btn" data-url="${url}">🗑️ Delete All</button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="closeModalBtn">Close</button>
        </div>
      </div>
    `;

    // Add modal to page
    document.body.appendChild(modal);

    // Add event listeners
    modal.querySelector('#closeModal').addEventListener('click', () => this.closeModal(modal));
    modal.querySelector('#closeModalBtn').addEventListener('click', () => this.closeModal(modal));
    
    // Add view highlights button listeners
    modal.querySelectorAll('.view-highlights-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.target.dataset.url;
        const count = parseInt(e.target.dataset.count);
        this.viewHighlightsForWebsite(url, count, modal);
      });
    });
    
    // Add delete website button listeners
    modal.querySelectorAll('.delete-website-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const url = e.target.dataset.url;
        this.deleteAllHighlightsForWebsite(url, modal);
      });
    });

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal(modal);
      }
    });
  }

  /**
   * View highlights for a specific website
   */
  async viewHighlightsForWebsite(url, count, modal) {
    try {
      const result = await browser.storage.local.get(url);
      const highlights = result[url] || [];
      
      // Replace modal content with highlights view
      const modalBody = modal.querySelector('.modal-body');
      modalBody.innerHTML = `
        <div class="highlights-view">
          <div class="view-header">
            <button class="back-btn" id="backToWebsites">← Back to Websites</button>
            <h4>${this.getDomainFromUrl(url)} (${count} highlights)</h4>
          </div>
          <div class="highlights-list">
            ${highlights.map((highlight, index) => `
              <div class="highlight-item" data-id="${highlight.id}">
                <div class="highlight-preview" style="background-color: ${highlight.color}"></div>
                <div class="highlight-text">${this.truncateText(highlight.text, 60)}</div>
                <div class="highlight-color" style="background-color: ${highlight.color}"></div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // Add back button listener
      modalBody.querySelector('#backToWebsites').addEventListener('click', async () => {
        const websites = await this.getAllWebsitesWithHighlights();
        this.showWebsitesManager(websites);
      });

    } catch (error) {
      console.error('Error viewing highlights:', error);
      this.updateStatus('Error viewing highlights');
    }
  }

  /**
   * Delete all highlights for a specific website
   */
  async deleteAllHighlightsForWebsite(url, modal) {
    try {
      // Confirm deletion
      if (!confirm(`Are you sure you want to delete ALL ${urlHighlights[url].length} highlights from ${this.getDomainFromUrl(url)}?`)) {
        return;
      }

      // Delete from storage
      await browser.storage.local.remove(url);
      
      // Also delete from backup storage
      const backupKey = `backup_${url}`;
      await browser.storage.local.remove(backupKey);
      
      // Remove the website item from the UI
      const websiteItem = modal.querySelector(`[data-url="${url}"]`);
      if (websiteItem) {
        websiteItem.remove();
      }
      
      // Update the count
      const header = modal.querySelector('.modal-header h3');
      const currentWebsiteCount = parseInt(header.textContent.match(/\((\d+) websites/)[1]);
      const currentTotalCount = parseInt(header.textContent.match(/, (\d+) total/)[1]);
      const deletedCount = urlHighlights[url].length;
      
      header.textContent = `Manage Highlights (${currentWebsiteCount - 1} websites, ${currentTotalCount - deletedCount} total highlights)`;
      
      this.updateStatus(`Deleted all highlights from ${this.getDomainFromUrl(url)}`);
      
      // If no more websites, close the modal
      if (currentWebsiteCount - 1 === 0) {
        setTimeout(() => this.closeModal(modal), 1000);
      }
      
    } catch (error) {
      console.error('Error deleting website highlights:', error);
      this.updateStatus('Error: ' + error.message);
    }
  }

  /**
   * Get all websites with highlights
   */
  async getAllWebsitesWithHighlights() {
    const result = await browser.storage.local.get();
    const urlHighlights = {};
    
    Object.keys(result).forEach(key => {
      if (key !== 'defaultHighlightColor' && key.startsWith('http')) {
        if (Array.isArray(result[key]) && result[key].length > 0) {
          urlHighlights[key] = result[key];
        }
      }
    });
    
    return urlHighlights;
  }

  /**
   * Get domain from URL
   */
  getDomainFromUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch (e) {
      return url.substring(0, 50) + (url.length > 50 ? '...' : '');
    }
  }

  /**
   * Close the highlights modal
   */
  closeModal(modal) {
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
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

  /**
   * Truncate text to specified length
   */
  truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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