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
      setTimeout(() => this.restoreHighlights(), 50);
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
      
      const backupKey = `backup_${url}`;
      const backupResult = await browser.storage.local.get(backupKey);
      const backupHighlights = backupResult[backupKey] || [];
      console.log('Highlights in backup storage:', backupHighlights);
      
      console.log('Total highlights found:', highlights.length + backupHighlights.length);
      console.log('=== END DEBUG ===');
      
      return { main: highlights, backup: backupHighlights };
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
    
    // IMPORTANT: Get the text content BEFORE extracting contents
    const textContent = range.toString();
    
    // Create highlight span
    const highlightSpan = document.createElement('span');
    highlightSpan.className = this.highlightClass;
    highlightSpan.id = highlightId;
    highlightSpan.style.backgroundColor = color;
    highlightSpan.style.borderRadius = '2px';
    highlightSpan.style.padding = '1px 2px';
    highlightSpan.style.margin = '0 1px';
    
    // Extract and wrap the selected content
    const contents = range.extractContents();
    highlightSpan.appendChild(contents);
    range.insertNode(highlightSpan);
    
    // Return both the ID and the text content
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
        timestamp: Date.now(),
        selector: this.generateSelector(document.getElementById(highlightId)),
        xpath: this.generateXPath(document.getElementById(highlightId))
      };

      console.log('Saving highlight:', highlightData);

      // Get existing highlights for this URL
      const result = await browser.storage.local.get(url);
      const highlights = result[url] || [];
      highlights.push(highlightData);
      
      // Save back to storage and wait for completion
      await browser.storage.local.set({ [url]: highlights });
      
      // Verify the save was successful
      const verifyResult = await browser.storage.local.get(url);
      if (verifyResult[url] && verifyResult[url].length === highlights.length) {
        console.log('Highlight saved successfully and verified');
      } else {
        console.error('Highlight save verification failed');
      }
      
      // Also save to a backup key for immediate access
      const backupKey = `backup_${url}`;
      await browser.storage.local.set({ [backupKey]: highlights });
      
    } catch (error) {
      console.error('Error saving highlight:', error);
    }
  }

  /**
   * Generate a CSS selector for an element
   */
  generateSelector(element) {
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentNode;
    }
    
    if (element.id) {
      return `#${element.id}`;
    }
    
    let selector = element.tagName.toLowerCase();
    if (element.className) {
      selector += '.' + element.className.split(' ').join('.');
    }
    
    let parent = element.parentNode;
    let index = 0;
    let sibling = element.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    
    if (index > 0) {
      selector += `:nth-of-type(${index + 1})`;
    }
    
    return selector;
  }

  /**
   * Generate an XPath for an element
   */
  generateXPath(element) {
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentNode;
    }
    
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    
    let path = '';
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = element.previousSibling;
      
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      
      const tagName = element.tagName.toLowerCase();
      const pathIndex = index > 1 ? `[${index}]` : '';
      path = `/${tagName}${pathIndex}${path}`;
      
      element = element.parentNode;
    }
    
    return path;
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
      
      // If no highlights found, try backup storage
      if (highlights.length === 0) {
        const backupKey = `backup_${url}`;
        const backupResult = await browser.storage.local.get(backupKey);
        if (backupResult[backupKey]) {
          highlights = backupResult[backupKey];
          console.log('Found highlights in backup storage:', highlights);
          
          // Restore from backup to main storage
          await browser.storage.local.set({ [url]: highlights });
          console.log('Restored highlights from backup to main storage');
        }
      }
      
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
    // Try to find the element using the stored selector or XPath
    let targetElement = null;
    
    // First try CSS selector
    if (highlight.selector) {
      try {
        targetElement = document.querySelector(highlight.selector);
      } catch (e) {
        console.warn('Invalid selector:', highlight.selector);
      }
    }
    
    // Fallback to XPath
    if (!targetElement && highlight.xpath) {
      try {
        const xpathResult = document.evaluate(
          highlight.xpath,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        targetElement = xpathResult.singleNodeValue;
      } catch (e) {
        console.warn('Invalid XPath:', highlight.xpath);
      }
    }
    
    if (targetElement) {
      // Find and highlight the text within the element
      this.findAndHighlightText(targetElement, highlight);
    } else {
      // Fallback: search the entire document for the text
      this.searchAndHighlightText(highlight);
    }
  }

  /**
   * Find and highlight text within a specific element
   */
  findAndHighlightText(element, highlight) {
    const textNodes = this.getTextNodes(element);
    
    for (let i = 0; i < textNodes.length; i++) {
      const textNode = textNodes[i];
      const text = textNode.textContent;
      
      if (text.includes(highlight.text)) {
        this.highlightTextNode(textNode, highlight);
        break;
      }
    }
  }

  /**
   * Search the entire document for text and highlight it
   */
  searchAndHighlightText(highlight) {
    console.log('Searching entire document for text:', highlight.text);
    
    // First try to find exact text matches
    const textNodes = this.getTextNodes(document.body);
    let found = false;
    
    for (let i = 0; i < textNodes.length && !found; i++) {
      const textNode = textNodes[i];
      const text = textNode.textContent;
      
      if (text.includes(highlight.text)) {
        console.log('Found text in node:', textNode, 'Text:', text);
        this.highlightTextNode(textNode, highlight);
        found = true;
        break;
      }
    }
    
    // If not found, try partial matches
    if (!found) {
      console.log('Trying partial text matches...');
      for (let i = 0; i < textNodes.length && !found; i++) {
        const textNode = textNodes[i];
        const text = textNode.textContent;
        
        // Try to find partial matches (at least 50% of the text)
        const minLength = Math.max(3, Math.floor(highlight.text.length * 0.5));
        if (text.length >= minLength) {
          // Check if any substring of the text contains a significant portion of the highlight
          for (let j = 0; j <= text.length - minLength; j++) {
            for (let k = minLength; k <= Math.min(text.length - j, highlight.text.length); k++) {
              const substring = text.substring(j, j + k);
              if (highlight.text.includes(substring) && substring.length >= minLength) {
                console.log('Found partial match:', substring, 'in text:', text);
                // Create a new highlight for the partial match
                const partialHighlight = { ...highlight, text: substring };
                this.highlightTextNode(textNode, partialHighlight);
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }
      }
    }
    
    if (!found) {
      console.warn('Could not find text to highlight:', highlight.text);
    }
  }

  /**
   * Get all text nodes within an element
   */
  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    return textNodes;
  }

  /**
   * Highlight a specific text node
   */
  highlightTextNode(textNode, highlight) {
    const text = textNode.textContent;
    const regex = new RegExp(this.escapeRegex(highlight.text), 'g');
    
    if (regex.test(text)) {
      // Create a new element to hold the highlighted text
      const container = document.createElement('span');
      container.innerHTML = text.replace(regex, (match) => {
        return `<span class="${this.highlightClass}" id="${highlight.id}" style="background-color: ${highlight.color}; border-radius: 2px; padding: 1px 2px; margin: 0 1px;">${match}</span>`;
      });
      
      // Replace the text node with the highlighted version
      textNode.parentNode.replaceChild(container, textNode);
    }
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Clear all highlights from the current page
   */
  clearAllHighlights() {
    try {
      const highlights = document.querySelectorAll(`.${this.highlightClass}`);
      highlights.forEach(highlight => {
        // Replace highlight with its text content
        const textContent = highlight.textContent;
        const textNode = document.createTextNode(textContent);
        highlight.parentNode.replaceChild(textNode, highlight);
      });
      
      // Clear from storage
      this.clearHighlightsFromStorage();
      
      return { success: true, count: highlights.length };
    } catch (error) {
      console.error('Error clearing highlights:', error);
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
            this.findAndHighlightText(element, highlight);
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
        
        // Check if backup storage was changed
        const backupKey = `backup_${currentUrl}`;
        if (changes[backupKey]) {
          console.log('Backup storage changed, updating highlights...');
          setTimeout(() => this.restoreHighlights(), 50);
        }
      }
    });
  }
}

// Initialize the highlighter when the content script loads
new WebHighlighter(); 