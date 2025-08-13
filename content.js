/**
 * HiLite - Content Script
 * Handles text selection, highlighting, and restoring highlights on web pages
 */

class WebHighlighter {
  constructor() {
    this.highlightClass = 'web-highlighter-highlight';
    this.highlightCounter = 0;
    this.init();
  }

  /**
   * Initialize the highlighter
   */
  init() {
    this.setupMessageListener();
    this.setupContextMenu();
    this.setupStorageListener();
    this.setupHighlightClickListeners();
    
    // Handle different page load scenarios
    if (document.readyState === 'loading') {
      // Page is still loading
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => this.restoreHighlights(), 100);
      });
    } else if (document.readyState === 'interactive') {
      // DOM is ready but resources may still be loading
      setTimeout(() => this.restoreHighlights(), 50);
    } else {
      // Page is fully loaded
      setTimeout(() => this.restoreHighlights(), 50);
    }
    
    // Also listen for when the page becomes fully loaded
    window.addEventListener('load', () => {
      setTimeout(() => this.restoreHighlights(), 100);
    });
    
    // Listen for page visibility changes (tab switching, page focus)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('Page became visible, checking for highlights...');
        setTimeout(() => this.restoreHighlights(), 100);
      }
    });
    
    // Listen for page focus (when user returns to the tab)
    window.addEventListener('focus', () => {
      console.log('Page focused, checking for highlights...');
      setTimeout(() => this.restoreHighlights(), 100);
    });
    
    this.observeDOMChanges();
  }

  /**
   * Debug function to check storage status
   */
  async debugStorage() {
    try {
      const url = window.location.href;
      console.log('=== STORAGE DEBUG ===');
      console.log('Current URL:', url);
      
      const result = await browser.storage.local.get(url);
      const highlights = result[url] || [];
      console.log('Highlights in main storage:', highlights);
      
      console.log('Total highlights found:', highlights.length);
      console.log('=== END DEBUG ===');
      
      return { main: highlights };
    } catch (error) {
      console.error('Error in debug storage:', error);
      return null;
    }
  }

  /**
   * Set up message listener for communication with popup
   */
  setupMessageListener() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'highlightSelection':
          const result = this.highlightSelection(message.color);
          sendResponse(result);
          break;
        case 'clearAllHighlights':
          const clearResult = this.clearAllHighlights();
          sendResponse(clearResult);
          break;
        case 'getHighlights':
          sendResponse(this.getCurrentHighlights());
          break;
        case 'deleteHighlight':
          this.deleteHighlight(message.highlightId).then(sendResponse);
          break;
        case 'refreshHighlights':
          this.refreshHighlightsFromStorage();
          sendResponse({ success: true });
          break;
        case 'debugStorage':
          this.debugStorage().then(sendResponse);
          break;
      }
      return true; // Keep message channel open for async response
    });
  }

  /**
   * Set up context menu for right-click highlighting
   */
  setupContextMenu() {
    document.addEventListener('contextmenu', (e) => {
      const selection = window.getSelection();
      if (selection.toString().trim()) {
        // Store selection info for context menu
        this.storeSelectionInfo(selection, e.target);
      }
    });
  }

  /**
   * Store information about the current selection
   */
  storeSelectionInfo(selection, target) {
    this.currentSelection = {
      text: selection.toString(),
      range: selection.getRangeAt(0),
      target: target
    };
  }

  /**
   * Highlight the currently selected text
   */
  highlightSelection(color = '#ffff00') {
    const selection = window.getSelection();
    
    if (!selection.toString().trim()) {
      return { success: false, message: 'No text selected' };
    }

    try {
      const range = selection.getRangeAt(0);
      const { id, text } = this.createHighlight(range, color);
      
      // Save highlight to storage
      this.saveHighlight(id, text, color);
      
      // Clear selection
      selection.removeAllRanges();
      
      return { success: true, highlightId: id };
    } catch (error) {
      console.error('Error highlighting text:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Create a highlight element around the selected text
   */
  createHighlight(range, color) {
    const highlightId = `highlight-${Date.now()}-${++this.highlightCounter}`;
    
    // Get the text content
    const textContent = range.toString();
    
    // Create a simple highlight span
    const highlightSpan = document.createElement('span');
    highlightSpan.className = this.highlightClass;
    highlightSpan.id = highlightId;
    highlightSpan.style.backgroundColor = color;
    highlightSpan.textContent = textContent;
    
    // Replace the range content with the highlight
    range.deleteContents();
    range.insertNode(highlightSpan);
    
    return { id: highlightId, text: textContent };
  }

  /**
   * Save highlight information to browser storage
   */
  async saveHighlight(highlightId, textContent, color) {
    try {
      const url = window.location.href;
      const highlightData = {
        id: highlightId,
        text: textContent,
        color: color,
        url: url,
        timestamp: Date.now()
      };

      console.log('Saving highlight:', highlightData);

      // Get existing highlights for this URL
      const result = await browser.storage.local.get(url);
      const highlights = result[url] || [];
      highlights.push(highlightData);
      
      // Save back to storage
      await browser.storage.local.set({ [url]: highlights });
      console.log('Highlight saved successfully');
      
    } catch (error) {
      console.error('Error saving highlight:', error);
    }
  }

  /**
   * Restore highlights when the page loads
   */
  async restoreHighlights() {
    try {
      const url = window.location.href;
      console.log('Attempting to restore highlights for URL:', url);
      
      // Try to get highlights from main storage
      let result = await browser.storage.local.get(url);
      let highlights = result[url] || [];
      
      console.log('Final highlights to restore:', highlights);
      
      if (highlights.length > 0) {
        console.log(`Restoring ${highlights.length} highlights for ${url}`);
        
        // For immediate page reloads, try to restore immediately
        if (document.readyState === 'complete') {
          setTimeout(() => this.applyHighlights(highlights), 100);
        } else if (document.readyState === 'interactive') {
          setTimeout(() => this.applyHighlights(highlights), 150);
        } else {
          // Page is still loading
          document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => this.applyHighlights(highlights), 200);
          });
        }
        
        // Also try to restore when page becomes fully loaded
        window.addEventListener('load', () => {
          setTimeout(() => this.applyHighlights(highlights), 100);
        });
      } else {
        console.log('No highlights found for this URL');
      }
    } catch (error) {
      console.error('Error restoring highlights:', error);
    }
  }

  /**
   * Apply saved highlights to the page
   */
  applyHighlights(highlights) {
    console.log('Applying highlights:', highlights);
    
    highlights.forEach((highlight, index) => {
      try {
        console.log(`Restoring highlight ${index + 1}/${highlights.length}:`, highlight);
        this.restoreHighlight(highlight);
      } catch (error) {
        console.error(`Error restoring highlight ${highlight.id}:`, error);
      }
    });
  }

  /**
   * Restore a single highlight
   */
  restoreHighlight(highlight) {
    try {
      // Simple approach: search for the text and highlight it
      const textToFind = highlight.text;
      if (!textToFind || textToFind.trim() === '') {
        return;
      }
      
      // Search the entire document for the text
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let textNode;
      while (textNode = walker.nextNode()) {
        const text = textNode.textContent;
        if (text.includes(textToFind)) {
          // Found the text, create a highlight
          const highlightSpan = document.createElement('span');
          highlightSpan.className = this.highlightClass;
          highlightSpan.id = highlight.id;
          highlightSpan.style.backgroundColor = highlight.color;
          highlightSpan.textContent = textToFind;
          
          // Replace the text with the highlight
          const beforeText = text.substring(0, text.indexOf(textToFind));
          const afterText = text.substring(text.indexOf(textToFind) + textToFind.length);
          
          const fragment = document.createDocumentFragment();
          if (beforeText) fragment.appendChild(document.createTextNode(beforeText));
          fragment.appendChild(highlightSpan);
          if (afterText) fragment.appendChild(document.createTextNode(afterText));
          
          textNode.parentNode.replaceChild(fragment, textNode);
          break; // Only highlight the first occurrence
        }
      }
    } catch (error) {
      console.error('Error restoring highlight:', error);
    }
  }

  /**
   * Clear all highlights from the current page
   */
  clearAllHighlights() {
    try {
      // Find all highlight elements
      const highlights = document.querySelectorAll(`.${this.highlightClass}`);
      const count = highlights.length;
      
      console.log(`Found ${count} highlights to clear`);
      
      if (count === 0) {
        return { success: true, count: 0, message: 'No highlights found' };
      }
      
      // Clear each highlight
      highlights.forEach((highlight, index) => {
        try {
          // Get the text content
          const text = highlight.textContent;
          
          // Replace the highlight with a text node
          const textNode = document.createTextNode(text);
          highlight.parentNode.replaceChild(textNode, highlight);
          
          console.log(`Cleared highlight ${index + 1}/${count}`);
        } catch (error) {
          console.error(`Error clearing highlight ${index + 1}:`, error);
        }
      });
      
      // Clear from storage
      this.clearHighlightsFromStorage();
      
      console.log(`Successfully cleared ${count} highlights`);
      return { success: true, count: count, message: `Cleared ${count} highlights` };
      
    } catch (error) {
      console.error('Error in clearAllHighlights:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Clear highlights from browser storage for current page
   */
  async clearHighlightsFromStorage() {
    try {
      const url = window.location.href;
      await browser.storage.local.remove(url);
      console.log('Highlights cleared from storage for:', url);
    } catch (error) {
      console.error('Error clearing highlights from storage:', error);
    }
  }

  /**
   * Get current highlights on the page
   */
  getCurrentHighlights() {
    const highlights = document.querySelectorAll(`.${this.highlightClass}`);
    return Array.from(highlights).map(h => ({
      id: h.id,
      text: h.textContent,
      color: h.style.backgroundColor
    }));
  }

  /**
   * Observe DOM changes to handle dynamic content
   */
  observeDOMChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if new nodes contain any of our highlights
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.checkForLostHighlights(node);
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Check for and restore lost highlights in new content
   */
  async checkForLostHighlights(element) {
    try {
      const url = window.location.href;
      const result = await browser.storage.local.get(url);
      const highlights = result[url] || [];
      
      highlights.forEach(highlight => {
        if (element.textContent.includes(highlight.text)) {
          // Check if highlight is already applied
          if (!document.getElementById(highlight.id)) {
            this.restoreHighlight(highlight);
          }
        }
      });
    } catch (error) {
      console.error('Error checking for lost highlights:', error);
    }
  }

  /**
   * Set up storage change listener
   */
  setupStorageListener() {
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        const currentUrl = window.location.href;
        
        // Check if our URL's highlights were changed
        if (changes[currentUrl]) {
          console.log('Storage changed for current URL, updating highlights...');
          setTimeout(() => this.restoreHighlights(), 50);
        }
      }
    });
  }

  /**
   * Delete a specific highlight by its ID
   */
  async deleteHighlight(highlightId) {
    try {
      const url = window.location.href;
      const result = await browser.storage.local.get(url);
      const highlights = result[url] || [];

      const initialCount = highlights.length;

      // Filter out the highlight to be deleted
      const updatedHighlights = highlights.filter(highlight => highlight.id !== highlightId);

      // Save back to storage
      await browser.storage.local.set({ [url]: updatedHighlights });

      console.log(`Highlight with ID ${highlightId} deleted from storage for URL: ${url}`);
      return { success: true, count: initialCount - updatedHighlights.length };
    } catch (error) {
      console.error('Error deleting highlight:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Set up click event listeners for highlights
   */
  setupHighlightClickListeners() {
    // Handle clicks on the dustbin icon specifically
    document.addEventListener('click', (e) => {
      // Check if click is on the dustbin icon (pseudo-element)
      const highlightElement = e.target.closest(`.${this.highlightClass}`);
      if (highlightElement) {
        // Calculate if click is within the dustbin icon area
        const rect = highlightElement.getBoundingClientRect();
        const clickX = e.clientX;
        const clickY = e.clientY;
        
        // Dustbin icon is positioned at top-right of highlight
        const dustbinLeft = rect.right - 8; // 8px from right edge
        const dustbinTop = rect.top - 8;    // 8px from top edge
        const dustbinSize = 20;             // 20x20px size
        
        // Check if click is within dustbin bounds
        if (clickX >= dustbinLeft && clickX <= dustbinLeft + dustbinSize &&
            clickY >= dustbinTop && clickY <= dustbinTop + dustbinSize) {
          
          const highlightId = highlightElement.id;
          
          // Show a simple confirmation and delete
          if (confirm('Delete this highlight?')) {
            this.deleteHighlight(highlightId).then(response => {
              if (response.success) {
                console.log(`Highlight with ID ${highlightId} deleted. ${response.count} highlights remaining.`);
                // Remove the highlight element from the page
                const highlightElement = document.getElementById(highlightId);
                if (highlightElement) {
                  highlightElement.parentNode.replaceChild(document.createTextNode(highlightElement.textContent), highlightElement);
                }
              } else {
                console.error(`Failed to delete highlight with ID ${highlightId}:`, response.message);
              }
            });
          }
        }
      }
    });

    // Handle right-click on highlights - show context menu
    document.addEventListener('contextmenu', (e) => {
      const highlightElement = e.target.closest(`.${this.highlightClass}`);
      if (highlightElement) {
        e.preventDefault(); // Prevent default context menu
        const highlightId = highlightElement.id;
        const highlightText = highlightElement.textContent;
        const highlightColor = highlightElement.style.backgroundColor;

        // Open a context menu for deletion
        this.showContextMenu(e.clientX, e.clientY, highlightId, highlightText, highlightColor);
      }
    });
  }

  /**
   * Show a context menu for highlighting
   */
  showContextMenu(x, y, highlightId, highlightText, highlightColor) {
    // Remove any existing menus
    const existingMenus = document.querySelectorAll('.highlight-context-menu');
    existingMenus.forEach(menu => menu.remove());

    const menu = document.createElement('div');
    menu.className = 'highlight-context-menu';
    
    // Ensure menu stays within viewport
    const menuWidth = 150;
    const menuHeight = 50;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let left = x;
    let top = y;
    
    // Adjust horizontal position if menu would go off-screen
    if (x + menuWidth > viewportWidth) {
      left = x - menuWidth;
    }
    
    // Adjust vertical position if menu would go off-screen
    if (y + menuHeight > viewportHeight) {
      top = y - menuHeight;
    }
    
    menu.style.position = 'fixed';
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.style.backgroundColor = '#fff';
    menu.style.border = '1px solid #ccc';
    menu.style.borderRadius = '4px';
    menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    menu.style.zIndex = '9999';
    menu.style.padding = '8px 0';
    menu.style.fontSize = '14px';
    menu.style.cursor = 'pointer';
    menu.style.whiteSpace = 'nowrap';
    menu.style.minWidth = '150px';

    const deleteItem = document.createElement('div');
    deleteItem.textContent = '🗑️ Delete Highlight';
    deleteItem.style.color = '#dc3545';
    deleteItem.style.padding = '8px 16px';
    deleteItem.style.cursor = 'pointer';
    deleteItem.style.transition = 'background-color 0.2s';

    deleteItem.addEventListener('mouseenter', () => {
      deleteItem.style.backgroundColor = '#f8f9fa';
    });

    deleteItem.addEventListener('mouseleave', () => {
      deleteItem.style.backgroundColor = 'transparent';
    });

    deleteItem.addEventListener('click', () => {
      this.deleteHighlight(highlightId).then(response => {
        if (response.success) {
          console.log(`Highlight with ID ${highlightId} deleted. ${response.count} highlights remaining.`);
          // Remove the highlight element from the page
          const highlightElement = document.getElementById(highlightId);
          if (highlightElement) {
            highlightElement.parentNode.replaceChild(document.createTextNode(highlightElement.textContent), highlightElement);
          }
        } else {
          console.error(`Failed to delete highlight with ID ${highlightId}:`, response.message);
        }
      });
      menu.remove();
    });

    menu.appendChild(deleteItem);
    document.body.appendChild(menu);

    // Add click outside handler
    const clickOutsideHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', clickOutsideHandler);
      }
    };

    // Delay adding the click outside handler to avoid immediate closure
    setTimeout(() => {
      document.addEventListener('click', clickOutsideHandler);
    }, 100);
  }

  /**
   * Refresh highlights from storage (useful when highlights are deleted externally)
   */
  async refreshHighlightsFromStorage() {
    try {
      const url = window.location.href;
      const result = await browser.storage.local.get(url);
      const highlights = result[url] || [];
      
      // Clear all current highlights from the page
      const currentHighlights = document.querySelectorAll(`.${this.highlightClass}`);
      currentHighlights.forEach(highlight => {
        try {
          const textContent = highlight.textContent;
          const textNode = document.createTextNode(textContent);
          highlight.parentNode.replaceChild(textNode, highlight);
        } catch (error) {
          console.error('Error clearing highlight:', error);
        }
      });
      
      // Restore highlights from storage (if any remain)
      if (highlights.length > 0) {
        console.log(`Restoring ${highlights.length} highlights after refresh`);
        highlights.forEach(highlight => {
          this.restoreHighlight(highlight);
        });
      } else {
        console.log('No highlights to restore after refresh');
      }
      
    } catch (error) {
      console.error('Error refreshing highlights from storage:', error);
    }
  }
}

// Initialize the highlighter when the content script loads
new WebHighlighter(); 