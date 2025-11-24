// Main Application Logic
import { FileUploadHandler } from './fileUpload.js';
import { ChatInterface } from './chatInterface.js';
import { TableDisplay } from './tableDisplay.js';

class AnalyticsGPTApp {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8000/api';
        this.currentTable = null;
        this.tables = [];

        // Initialize modules
        this.fileUpload = new FileUploadHandler(this);
        this.chat = new ChatInterface(this);
        this.tableDisplay = new TableDisplay(this);

        // Initialize app
        this.init();
    }

    async init() {
        console.log('🚀 Analytics GPT App Initializing...');

        // Load existing tables
        await this.loadTables();

        // Setup event listeners
        this.setupEventListeners();

        console.log('✅ Analytics GPT App Ready');
    }

    setupEventListeners() {
        // Clear chat button
        const clearChatBtn = document.getElementById('clearChatBtn');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => this.chat.clearChat());
        }
    }

    async loadTables() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/tables`);

            if (!response.ok) {
                throw new Error('Failed to load tables');
            }

            const data = await response.json();

            this.tables = data.tables || [];
            this.updateTablesList();

            // Select first table if available
            if (this.tables.length > 0 && !this.currentTable) {
                this.selectTable(this.tables[0].name);
            }

        } catch (error) {
            console.error('Error loading tables:', error);
        }
    }

    updateTablesList() {
        const tablesList = document.getElementById('tablesList');

        if (this.tables.length === 0) {
            tablesList.innerHTML = '<p class="empty-message">No tables uploaded yet</p>';
            return;
        }

        tablesList.innerHTML = this.tables.map(table => `
            <div class="table-item ${table.name === this.currentTable ? 'active' : ''}"
                 data-table-name="${table.name}">
                <div class="table-name">${table.name}</div>
                <div class="table-meta">${table.row_count} rows • ${table.columns.length} columns</div>
            </div>
        `).join('');

        // Add click handlers
        tablesList.querySelectorAll('.table-item').forEach(item => {
            item.addEventListener('click', () => {
                const tableName = item.dataset.tableName;
                this.selectTable(tableName);
            });
        });
    }

    async selectTable(tableName) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/schema/${tableName}`);

            if (!response.ok) {
                throw new Error('Failed to load table schema');
            }

            const data = await response.json();

            this.currentTable = tableName;
            this.updateCurrentTableInfo(data);
            this.updateTablesList();

            // Enable chat input
            const chatInput = document.getElementById('chatInput');
            const sendBtn = document.getElementById('sendBtn');
            if (chatInput) chatInput.disabled = false;
            if (sendBtn) sendBtn.disabled = false;

            this.showToast('success', `Switched to table: ${tableName}`);

        } catch (error) {
            console.error('Error selecting table:', error);
            this.showToast('error', 'Failed to load table information');
        }
    }

    updateCurrentTableInfo(schema) {
        const currentTableInfo = document.getElementById('currentTableInfo');

        currentTableInfo.innerHTML = `
            <div class="table-info-item">
                <div class="table-info-label">Table Name</div>
                <div class="table-info-value">${schema.table_name}</div>
            </div>
            <div class="table-info-item">
                <div class="table-info-label">Columns</div>
                <div class="table-info-value">${schema.columns.length} columns</div>
            </div>
            <div class="table-info-item">
                <div class="table-info-label">Column Names</div>
                <div class="table-info-value" style="font-size: 0.85rem;">
                    ${schema.columns.map(col => col.name).join(', ')}
                </div>
            </div>
        `;
    }

    showToast(type, message) {
        const toast = document.getElementById('toast');
        const toastIcon = document.getElementById('toastIcon');
        const toastMessage = document.getElementById('toastMessage');

        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };

        toast.className = `toast ${type}`;
        toastIcon.textContent = icons[type] || icons.info;
        toastMessage.textContent = message;

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    showLoading(text = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = overlay.querySelector('.loading-text');
        if (loadingText) loadingText.textContent = text;
        overlay.style.display = 'flex';
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        overlay.style.display = 'none';
    }

    async handleFileUpload(file) {
        try {
            this.showLoading('Uploading and processing file...');

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${this.apiBaseUrl}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Upload failed');
            }

            const data = await response.json();

            // Reload tables list
            await this.loadTables();

            // Select the newly uploaded table
            this.selectTable(data.table_name);

            // Hide welcome message
            const welcomeMessage = document.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.style.display = 'none';
            }

            this.hideLoading();
            this.showToast('success', `Successfully uploaded: ${data.table_name}`);

            return data;

        } catch (error) {
            this.hideLoading();
            this.showToast('error', error.message);
            throw error;
        }
    }

    async sendQuery(question) {
        if (!this.currentTable) {
            this.showToast('error', 'Please upload a file first');
            return null;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: question,
                    table_name: this.currentTable
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Query failed');
            }

            const data = await response.json();
            return data;

        } catch (error) {
            this.showToast('error', error.message);
            throw error;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.analyticsGPT = new AnalyticsGPTApp();
});

export default AnalyticsGPTApp;
