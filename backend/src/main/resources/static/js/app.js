/**
 * Google Form Clone - Main Application
 * Header Navigation Controller & Builder UI
 *
 * ============================================================
 * DATA SCHEMA DEFINITION
 * ============================================================
 *
 * Form Schema (JSON Example):
 * {
 *   "id": "form-uuid-123",           // Unique form identifier
 *   "title": "설문지 제목",            // Form title (Korean UI)
 *   "description": "설문지 설명",      // Form description (optional)
 *   "createdAt": "2024-01-01T00:00:00.000Z",  // Creation timestamp
 *   "updatedAt": "2024-01-01T00:00:00.000Z",  // Last update timestamp
 *   "questions": [                    // Questions array
 *     {
 *       "id": "q-uuid-1",             // Unique question ID
 *       "type": "short-text",         // Question type
 *       "title": "질문 제목",          // Question title
 *       "description": "",            // Question description (optional)
 *       "required": true,             // Required field flag
 *       "order": 0,                   // Display order
 *       "options": []                 // Options array (for choice types)
 *     }
 *   ],
 *   "settings": {                     // Form settings
 *     "collectEmail": false,
 *     "allowResponseEdit": false,
 *     "showProgressBar": true
 *   },
 *   "responses": []                   // Collected responses
 * }
 *
 * Question Types:
 * - short-text: 단답형 (Single line text input)
 * - long-text: 장문형 (Multi-line text input)
 * - multiple-choice: 객관식 (Radio buttons - single selection)
 * - checkbox: 체크박스 (Checkboxes - multiple selection)
 * - dropdown: 드롭다운 (Dropdown select)
 * - file-upload: 파일 업로드 (File upload)
 * - linear-scale: 선형 배율 (Linear scale 1-5, 1-10, etc.)
 * - date: 날짜 (Date picker)
 *
 * Option Schema (for choice-based questions):
 * {
 *   "id": "opt-uuid-1",               // Unique option ID
 *   "label": "옵션 텍스트",             // Option display text
 *   "order": 0                        // Option display order
 * }
 *
 * Linear Scale Config:
 * {
 *   "min": 1,                         // Minimum value
 *   "max": 5,                         // Maximum value
 *   "minLabel": "전혀 아니다",          // Min label (optional)
 *   "maxLabel": "매우 그렇다"           // Max label (optional)
 * }
 *
 * ============================================================
 * STATE MANAGEMENT EXPLANATION
 * ============================================================
 *
 * This application uses localStorage for persistence with a
 * centralized state management pattern:
 *
 * 1. SINGLE SOURCE OF TRUTH:
 *    All state is stored in localStorage under 'formAppState' key.
 *    The state object contains:
 *    - form: Complete form data including questions
 *    - ui: UI-specific state (activeTab, previewMode, etc.)
 *
 * 2. STATE OPERATIONS:
 *    - getState(): Retrieves entire state from localStorage
 *    - saveState(updates): Merges updates into existing state
 *    - getForm(): Gets form data specifically
 *    - saveForm(form): Saves form data
 *    - getQuestions(): Gets questions array
 *    - saveQuestions(questions): Saves questions array
 *
 * 3. DATA FLOW:
 *    User Action -> Update State -> Save to localStorage -> Re-render UI
 *
 * 4. INITIALIZATION:
 *    On page load, state is restored from localStorage.
 *    If no state exists, default state is created.
 *
 * 5. AUTO-SAVE:
 *    All changes are automatically persisted to localStorage
 *    immediately when they occur.
 *
 * ============================================================
 */

(function() {
    'use strict';

    // ========================================================
    // STORAGE KEY CONSTANTS
    // ========================================================
    const STORAGE_KEY = 'formAppState';
    const DRAFT_FORMS_KEY = 'draftForms';  // 로컬 Draft 폼 목록 저장

    // ========================================================
    // FORM LIFECYCLE STATES
    // ========================================================
    const FORM_STATUS = {
        DRAFT: 'draft',
        PUBLISHED: 'published',
        ARCHIVED: 'archived'
    };

    // ========================================================
    // DEFAULT SCHEMA DEFINITIONS
    // ========================================================

    /**
     * Default Form Schema
     * Creates a new empty form with default values
     */
    const createDefaultForm = () => ({
        id: generateUUID(),
        title: '새 설문지',
        description: '',
        status: FORM_STATUS.DRAFT,  // Form lifecycle status
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedId: null,          // Server-side ID when published
        publishedAt: null,          // Publish timestamp
        originalFormId: null,       // Reference to original published form (for draft copies)
        questions: [],
        sections: [],              // Sections array
        settings: {
            collectEmail: false,
            allowResponseEdit: false,
            showProgressBar: true
        },
        responses: []
    });

    /**
     * Default Question Schema
     * Creates a new question with the specified type
     * @param {string} type - Question type
     * @param {number} order - Display order
     */
    const createDefaultQuestion = (type = 'short-text', order = 0) => {
        const question = {
            id: generateUUID(),
            type: type,
            title: '',
            description: '',
            required: false,
            order: order,
            options: []
        };

        // Add default options for choice-based questions
        if (['multiple-choice', 'checkbox', 'dropdown'].includes(type)) {
            question.options = [
                createDefaultOption(0)
            ];
        }

        // Add linear scale config (fixed to 1-10)
        if (type === 'linear-scale') {
            question.scaleConfig = {
                min: 1,
                max: 10,
                minLabel: '',
                maxLabel: ''
            };
        }

        // Add file upload config
        if (type === 'file-upload') {
            question.config = {
                allowedExtensions: [],
                maxFileSize: 10,
                allowMultiple: false
            };
        }

        return question;
    };

    /**
     * Default Option Schema
     * Creates a new option for choice-based questions
     * @param {number} order - Display order
     */
    const createDefaultOption = (order = 0) => ({
        id: generateUUID(),
        label: `옵션 ${order + 1}`,
        order: order
    });

    /**
     * Default Section Schema
     * Creates a new section for organizing questions
     * @param {number} orderIndex - Display order
     */
    const createDefaultSection = (orderIndex = 0) => ({
        id: generateUUID(),
        title: '섹션 제목',
        description: '',
        orderIndex: orderIndex,
        questions: []
    });

    /**
     * Default UI State
     */
    const createDefaultUIState = () => ({
        activeTab: 'questions',
        isPreviewMode: false,
        activeQuestionId: null
    });

    /**
     * Default Application State
     */
    const createDefaultState = () => ({
        form: createDefaultForm(),
        ui: createDefaultUIState()
    });

    // ========================================================
    // UTILITY FUNCTIONS
    // ========================================================

    /**
     * Generate a UUID-like unique identifier
     * @returns {string} Unique ID
     */
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ========================================================
    // DOM ELEMENTS
    // ========================================================
    const tabButtons = document.querySelectorAll('.tab-button');
    const views = document.querySelectorAll('.view');
    const formTitleElement = document.querySelector('.form-title-text');
    const questionsList = document.getElementById('questions-list');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const previewToggle = document.getElementById('preview-toggle');
    const previewMode = document.getElementById('preview-mode');
    const previewContent = document.getElementById('preview-content');
    const previewContainer = document.getElementById('preview-container');
    const questionTypeSelector = document.getElementById('question-type-selector');
    const questionTypeBtns = document.querySelectorAll('.question-type-btn');

    // ========================================================
    // QUESTION TYPES CONFIGURATION (Korean UI)
    // ========================================================
    const QUESTION_TYPES = {
        'short-text': '단답형',
        'long-text': '장문형',
        'multiple-choice': '객관식',
        'checkbox': '체크박스',
        'dropdown': '드롭다운',
        'file-upload': '파일 업로드',
        'linear-scale': '선형 배율',
        'date': '날짜'
    };

    // Types that require options
    const OPTION_BASED_TYPES = ['multiple-choice', 'checkbox', 'dropdown'];

    let isPreviewMode = false;

    /**
     * Initialize the application
     */
    function init() {
        console.log('[FormApp] Initializing...');

        setupTabNavigation();
        setupTitleEditing();
        setupBuilder();
        setupSettings();
        setupResponsesTab();
        setupPublish();
        setupFormListModal();
        restoreState();
        updateReadOnlyBanner();

        console.log('[FormApp] Initialization complete');
        console.log('[FormApp] questions-list element:', questionsList);
        console.log('[FormApp] Current questions:', getQuestions());
    }

    // ========================================================
    // PUBLISH & SYNC FUNCTIONS
    // ========================================================

    const syncStatusEl = document.getElementById('sync-status');
    const publishBtn = document.getElementById('publish-btn');

    /**
     * Setup publish button
     */
    function setupPublish() {
        if (publishBtn) {
            publishBtn.addEventListener('click', handlePublish);
        }
        updateSyncStatus();
    }

    /**
     * Get total question count (from both root and sections)
     */
    function getTotalQuestionCount() {
        const form = getForm();

        // 섹션에 포함된 질문 수 계산
        let sectionQuestionsCount = 0;
        if (form.sections && form.sections.length > 0) {
            sectionQuestionsCount = form.sections.reduce((sum, section) => {
                return sum + (section.questions ? section.questions.length : 0);
            }, 0);
        }

        // 루트 레벨 질문 수
        const rootQuestionsCount = form.questions ? form.questions.length : 0;

        return sectionQuestionsCount + rootQuestionsCount;
    }

    /**
     * Handle publish button click
     */
    async function handlePublish() {
        if (!window.PersistenceManager) {
            alert('API 모듈이 로드되지 않았습니다.');
            return;
        }

        const form = getForm();
        const totalQuestions = getTotalQuestionCount();

        if (totalQuestions === 0) {
            alert('최소 1개의 질문이 필요합니다.');
            return;
        }

        setSyncStatus('syncing', '게시 중...');
        publishBtn.disabled = true;
        publishBtn.classList.add('publishing');
        publishBtn.textContent = '게시 중...';

        try {
            await window.PersistenceManager.publish();
            setSyncStatus('published', '게시됨');
            publishBtn.textContent = '업데이트';
            alert('폼이 성공적으로 게시되었습니다!');
        } catch (error) {
            console.error('Publish error:', error);
            setSyncStatus('error', '게시 실패');
            alert('게시 중 오류가 발생했습니다: ' + error.message);
        } finally {
            publishBtn.disabled = false;
            publishBtn.classList.remove('publishing');
        }
    }

    /**
     * Set sync status indicator
     * @param {string} status - 'draft' | 'published' | 'syncing' | 'error'
     * @param {string} text - Display text
     */
    function setSyncStatus(status, text) {
        if (!syncStatusEl) return;

        const iconEl = syncStatusEl.querySelector('.sync-icon');
        const textEl = syncStatusEl.querySelector('.sync-text');

        if (iconEl) {
            iconEl.className = 'sync-icon ' + status;
        }
        if (textEl) {
            textEl.textContent = text;
        }
    }

    /**
     * Update sync status based on current form state
     */
    function updateSyncStatus() {
        const form = getForm();
        if (form.publishedId) {
            setSyncStatus('published', '게시됨');
            if (publishBtn) publishBtn.textContent = '업데이트';
        } else {
            setSyncStatus('draft', '임시저장');
            if (publishBtn) publishBtn.textContent = '게시';
        }
    }

    // ========================================================
    // FORM MANAGEMENT FUNCTIONS
    // ========================================================

    /**
     * Setup Form List Modal
     */
    function setupFormListModal() {
        const myFormsBtn = document.getElementById('my-forms-btn');
        const modal = document.getElementById('form-list-modal');
        const closeBtn = document.getElementById('modal-close-btn');
        const createNewBtn = document.getElementById('create-new-form-btn');

        if (myFormsBtn) {
            myFormsBtn.addEventListener('click', () => {
                openFormListModal();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeFormListModal();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeFormListModal();
                }
            });
        }

        if (createNewBtn) {
            createNewBtn.addEventListener('click', () => {
                createNewForm();
                closeFormListModal();
            });
        }

        // Keyboard accessibility
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.classList.contains('visible')) {
                closeFormListModal();
            }
        });
    }

    /**
     * Open Form List Modal
     */
    function openFormListModal() {
        const modal = document.getElementById('form-list-modal');
        if (modal) {
            modal.classList.add('visible');
            modal.setAttribute('aria-hidden', 'false');
            loadFormList();
        }
    }

    /**
     * Close Form List Modal
     */
    function closeFormListModal() {
        const modal = document.getElementById('form-list-modal');
        if (modal) {
            modal.classList.remove('visible');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    /**
     * Load Form List from server and local drafts
     */
    async function loadFormList() {
        const container = document.getElementById('form-list-container');
        if (!container) return;

        // Show loading state
        container.innerHTML = `
            <div class="form-list-loading">
                <div class="loading-spinner"></div>
                <span>설문 목록을 불러오는 중...</span>
            </div>
        `;

        try {
            // Get local drafts
            const localDrafts = getDraftForms();

            // Get published forms from server
            let publishedForms = [];
            if (window.FormAPI) {
                try {
                    publishedForms = await window.FormAPI.list();
                } catch (err) {
                    console.warn('서버에서 폼 목록을 가져오지 못했습니다:', err);
                }
            }

            // Combine and render
            renderFormList(localDrafts, publishedForms);
        } catch (error) {
            console.error('Error loading form list:', error);
            container.innerHTML = `
                <div class="form-list-empty">
                    <div class="form-list-empty-icon">!</div>
                    <h3>목록을 불러올 수 없습니다</h3>
                    <p>잠시 후 다시 시도해주세요.</p>
                </div>
            `;
        }
    }

    /**
     * Render Form List
     * @param {Array} localDrafts - Local draft forms
     * @param {Array} publishedForms - Published forms from server
     */
    function renderFormList(localDrafts, publishedForms) {
        const container = document.getElementById('form-list-container');
        if (!container) return;

        // Get current form ID
        const currentForm = getForm();
        const currentFormId = currentForm.id;

        // Combine forms
        const allForms = [];

        // Add local drafts
        localDrafts.forEach(draft => {
            allForms.push({
                ...draft,
                source: 'local',
                status: FORM_STATUS.DRAFT
            });
        });

        // Add published forms (avoid duplicates)
        publishedForms.forEach(published => {
            // Check if we already have a local draft for this published form
            const hasDraft = localDrafts.some(d => d.publishedId === published.id || d.originalFormId === published.id);

            allForms.push({
                id: published.id,
                title: published.title,
                description: published.description,
                createdAt: published.createdAt,
                updatedAt: published.updatedAt,
                source: 'server',
                status: FORM_STATUS.PUBLISHED,
                hasDraft: hasDraft,
                questionCount: published.questions ? published.questions.length : 0
            });
        });

        // Sort by updatedAt descending
        allForms.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        if (allForms.length === 0) {
            container.innerHTML = `
                <div class="form-list-empty">
                    <div class="form-list-empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                        </svg>
                    </div>
                    <h3>설문이 없습니다</h3>
                    <p>새 설문을 만들어 시작하세요.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <ul class="form-list">
                ${allForms.map(form => `
                    <li class="form-list-item ${form.id === currentFormId ? 'current' : ''}"
                        data-form-id="${form.id}"
                        data-source="${form.source}">
                        <div class="form-list-item-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                            </svg>
                        </div>
                        <div class="form-list-item-content">
                            <h3 class="form-list-item-title">${escapeHtml(form.title || '제목 없음')}</h3>
                            <div class="form-list-item-meta">
                                <span class="form-status-badge ${form.status}">${getStatusLabel(form.status)}</span>
                                <span>${formatDate(form.updatedAt)}</span>
                                ${form.hasDraft ? '<span class="draft-indicator">수정 중</span>' : ''}
                            </div>
                        </div>
                        <div class="form-list-item-actions">
                            <button class="form-list-item-btn delete" data-action="delete" data-form-id="${form.id}" data-source="${form.source}" title="삭제">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                            </button>
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;

        // Attach event listeners
        attachFormListEventListeners();
    }

    /**
     * Attach Form List Event Listeners
     */
    function attachFormListEventListeners() {
        const container = document.getElementById('form-list-container');
        if (!container) return;

        // Click on form item to load
        container.querySelectorAll('.form-list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Ignore if clicking on action buttons
                if (e.target.closest('.form-list-item-actions')) return;

                const formId = item.dataset.formId;
                const source = item.dataset.source;
                loadFormById(formId, source);
                closeFormListModal();
            });
        });

        // Delete button
        container.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const formId = btn.dataset.formId;
                const source = btn.dataset.source;

                if (!confirm('이 설문을 삭제하시겠습니까?\n관련된 모든 응답도 함께 삭제됩니다.')) {
                    return;
                }

                try {
                    if (source === 'local') {
                        // Delete local draft
                        deleteDraftForm(formId);
                    } else if (source === 'server' && window.FormAPI) {
                        // Delete from server
                        await window.FormAPI.delete(formId);
                    }
                    loadFormList(); // Refresh list
                } catch (error) {
                    console.error('설문 삭제 실패:', error);
                    alert('설문 삭제에 실패했습니다: ' + error.message);
                }
            });
        });
    }

    /**
     * Get status label in Korean
     * @param {string} status - Form status
     * @returns {string} Korean label
     */
    function getStatusLabel(status) {
        switch (status) {
            case FORM_STATUS.DRAFT:
                return '임시저장';
            case FORM_STATUS.PUBLISHED:
                return '게시됨';
            case FORM_STATUS.ARCHIVED:
                return '보관됨';
            default:
                return '알 수 없음';
        }
    }

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        // Less than 1 minute
        if (diff < 60000) {
            return '방금 전';
        }
        // Less than 1 hour
        if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}분 전`;
        }
        // Less than 24 hours
        if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}시간 전`;
        }
        // Less than 7 days
        if (diff < 604800000) {
            return `${Math.floor(diff / 86400000)}일 전`;
        }

        // Format as date
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    /**
     * Create a new form
     */
    function createNewForm() {
        // Save current form to drafts if it has content
        const currentForm = getForm();
        if (currentForm.questions && currentForm.questions.length > 0) {
            saveToDraftForms(currentForm);
        }

        // Create new form
        const newForm = createDefaultForm();

        // Save to state
        saveForm(newForm);

        // Update UI
        if (formTitleElement) {
            formTitleElement.textContent = newForm.title;
        }
        renderQuestions();
        updateSyncStatus();
        updateReadOnlyBanner();
    }

    /**
     * Load a form by ID
     * @param {string} formId - Form ID
     * @param {string} source - 'local' or 'server'
     */
    async function loadFormById(formId, source) {
        if (source === 'local') {
            // Load from local drafts
            const drafts = getDraftForms();
            const draft = drafts.find(d => d.id === formId);
            if (draft) {
                // Save current form if has content
                const currentForm = getForm();
                if (currentForm.id !== formId && currentForm.questions && currentForm.questions.length > 0) {
                    saveToDraftForms(currentForm);
                }

                saveForm(draft);
                if (formTitleElement) {
                    formTitleElement.textContent = draft.title;
                }
                renderQuestions();
                updateSyncStatus();
                updateReadOnlyBanner();
            }
        } else if (source === 'server') {
            // Load from server
            await loadPublishedForm(formId);
        }
    }

    /**
     * Load a published form from server
     * @param {string} formId - Server form ID
     */
    async function loadPublishedForm(formId) {
        if (!window.PersistenceManager) {
            alert('API 모듈이 로드되지 않았습니다.');
            return;
        }

        try {
            // Save current form if has content
            const currentForm = getForm();
            if (currentForm.questions && currentForm.questions.length > 0) {
                saveToDraftForms(currentForm);
            }

            // Load from server
            const loadedForm = await window.PersistenceManager.load(formId);

            // Mark as published (read-only)
            loadedForm.status = FORM_STATUS.PUBLISHED;

            saveForm(loadedForm);
            if (formTitleElement) {
                formTitleElement.textContent = loadedForm.title;
            }
            renderQuestions();
            updateSyncStatus();
            updateReadOnlyBanner();
        } catch (error) {
            console.error('Error loading published form:', error);
            alert('설문을 불러오는데 실패했습니다: ' + error.message);
        }
    }

    /**
     * Get form status
     * @returns {string} Form status (draft/published/archived)
     */
    function getFormStatus() {
        const form = getForm();
        return form.status || FORM_STATUS.DRAFT;
    }

    /**
     * Check if current form is read-only (published)
     * @returns {boolean}
     */
    function isFormReadOnly() {
        const form = getForm();
        return form.status === FORM_STATUS.PUBLISHED && !form.originalFormId;
    }

    /**
     * Create a draft copy of a published form for editing
     * @returns {Object} New draft form
     */
    function createDraftCopyForEdit() {
        const currentForm = getForm();

        if (currentForm.status !== FORM_STATUS.PUBLISHED) {
            return currentForm;
        }

        // Create a new draft copy
        const draftCopy = {
            ...JSON.parse(JSON.stringify(currentForm)),
            id: generateUUID(),
            status: FORM_STATUS.DRAFT,
            originalFormId: currentForm.publishedId || currentForm.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Generate new IDs for questions and options
        draftCopy.questions = draftCopy.questions.map(q => ({
            ...q,
            id: generateUUID(),
            options: (q.options || []).map(opt => ({
                ...opt,
                id: generateUUID()
            }))
        }));

        // Save and switch to the draft
        saveForm(draftCopy);
        saveToDraftForms(draftCopy);

        if (formTitleElement) {
            formTitleElement.textContent = draftCopy.title;
        }
        renderQuestions();
        updateSyncStatus();
        updateReadOnlyBanner();

        return draftCopy;
    }

    /**
     * Update read-only banner visibility
     */
    function updateReadOnlyBanner() {
        let banner = document.querySelector('.readonly-banner');

        if (isFormReadOnly()) {
            if (!banner) {
                // Create banner if it doesn't exist
                banner = document.createElement('div');
                banner.className = 'readonly-banner';
                banner.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <span class="readonly-banner-text">이 설문은 게시된 상태입니다. 수정하려면 복사본을 만들어 편집하세요.</span>
                    <button class="readonly-banner-btn" id="create-draft-copy-btn">복사본 만들기</button>
                `;

                // Insert after header
                const header = document.querySelector('.header');
                if (header) {
                    header.insertAdjacentElement('afterend', banner);
                }
            }

            banner.classList.add('visible');

            // Attach event listener
            const copyBtn = banner.querySelector('#create-draft-copy-btn');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    createDraftCopyForEdit();
                };
            }

            // Disable editing UI
            disableEditingUI();
        } else {
            if (banner) {
                banner.classList.remove('visible');
            }
            // Enable editing UI
            enableEditingUI();
        }
    }

    /**
     * Disable editing UI for published forms
     */
    function disableEditingUI() {
        // Disable add question button
        if (addQuestionBtn) {
            addQuestionBtn.style.display = 'none';
        }

        // Disable question inputs
        document.querySelectorAll('.question-input, .description-input, .option-input').forEach(el => {
            el.setAttribute('readonly', 'true');
        });

        // Hide action buttons
        document.querySelectorAll('.delete-btn, .duplicate-btn, .add-option-btn, .delete-option-btn').forEach(el => {
            el.style.display = 'none';
        });

        // Disable dropdowns
        document.querySelectorAll('.question-type-dropdown, .scale-select').forEach(el => {
            el.setAttribute('disabled', 'true');
        });

        // Disable required toggle
        document.querySelectorAll('.toggle-checkbox').forEach(el => {
            el.setAttribute('disabled', 'true');
        });
    }

    /**
     * Enable editing UI
     */
    function enableEditingUI() {
        // Enable add question button
        if (addQuestionBtn) {
            addQuestionBtn.style.display = '';
        }

        // Enable question inputs
        document.querySelectorAll('.question-input, .description-input, .option-input').forEach(el => {
            el.removeAttribute('readonly');
        });

        // Show action buttons
        document.querySelectorAll('.delete-btn, .duplicate-btn, .add-option-btn, .delete-option-btn').forEach(el => {
            el.style.display = '';
        });

        // Enable dropdowns
        document.querySelectorAll('.question-type-dropdown, .scale-select').forEach(el => {
            el.removeAttribute('disabled');
        });

        // Enable required toggle
        document.querySelectorAll('.toggle-checkbox').forEach(el => {
            el.removeAttribute('disabled');
        });
    }

    // ========================================================
    // DRAFT FORMS STORAGE
    // ========================================================

    /**
     * Get draft forms from localStorage
     * @returns {Array} Array of draft forms
     */
    function getDraftForms() {
        try {
            const stored = localStorage.getItem(DRAFT_FORMS_KEY);
            if (!stored) return [];
            return JSON.parse(stored);
        } catch (error) {
            console.error('Failed to get draft forms:', error);
            return [];
        }
    }

    /**
     * Save form to draft forms list
     * @param {Object} form - Form to save
     */
    function saveToDraftForms(form) {
        try {
            const drafts = getDraftForms();

            // Find and update existing draft or add new
            const existingIndex = drafts.findIndex(d => d.id === form.id);
            if (existingIndex >= 0) {
                drafts[existingIndex] = form;
            } else {
                drafts.push(form);
            }

            localStorage.setItem(DRAFT_FORMS_KEY, JSON.stringify(drafts));
        } catch (error) {
            console.error('Failed to save draft form:', error);
        }
    }

    /**
     * Remove form from draft forms list
     * @param {string} formId - Form ID to remove
     */
    function deleteDraftForm(formId) {
        try {
            const drafts = getDraftForms();
            const filtered = drafts.filter(d => d.id !== formId);
            localStorage.setItem(DRAFT_FORMS_KEY, JSON.stringify(filtered));

            // If deleting current form, create new
            const currentForm = getForm();
            if (currentForm.id === formId) {
                createNewForm();
            }
        } catch (error) {
            console.error('Failed to delete draft form:', error);
        }
    }

    /**
     * Setup tab navigation click handlers
     */
    function setupTabNavigation() {
        tabButtons.forEach(button => {
            button.addEventListener('click', handleTabClick);
            // Keyboard navigation support
            button.addEventListener('keydown', handleTabKeydown);
        });
    }

    /**
     * Handle keyboard navigation for tabs
     * @param {KeyboardEvent} event - Keyboard event
     */
    function handleTabKeydown(event) {
        const tabs = Array.from(tabButtons);
        const currentIndex = tabs.indexOf(event.currentTarget);
        let nextIndex;

        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                nextIndex = (currentIndex + 1) % tabs.length;
                tabs[nextIndex].focus();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                tabs[nextIndex].focus();
                break;
            case 'Home':
                event.preventDefault();
                tabs[0].focus();
                break;
            case 'End':
                event.preventDefault();
                tabs[tabs.length - 1].focus();
                break;
        }
    }

    /**
     * Handle tab button click
     * @param {Event} event - Click event
     */
    function handleTabClick(event) {
        const targetTab = event.currentTarget.dataset.tab;
        switchTab(targetTab);
    }

    /**
     * Switch to the specified tab
     * @param {string} tabName - Name of the tab to switch to
     */
    function switchTab(tabName) {
        // Update tab buttons with ARIA attributes
        tabButtons.forEach(button => {
            if (button.dataset.tab === tabName) {
                button.classList.add('active');
                button.setAttribute('aria-selected', 'true');
            } else {
                button.classList.remove('active');
                button.setAttribute('aria-selected', 'false');
            }
        });

        // Update views
        views.forEach(view => {
            const viewId = view.id.replace('view-', '');
            if (viewId === tabName) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        // Update response count when switching to responses tab
        if (tabName === 'responses') {
            loadAndRenderResponses();
        }

        // Save current tab to UI state
        saveUIState({ activeTab: tabName });
    }

    /**
     * 서버에서 응답 목록을 가져와 렌더링
     */
    async function loadAndRenderResponses() {
        const form = getForm();
        const shareUrlSection = document.getElementById('share-url-section');
        const notPublished = document.getElementById('responses-not-published');
        const emptyState = document.getElementById('responses-empty');
        const tableContainer = document.getElementById('responses-table-container');
        const countElement = document.querySelector('.response-count');

        console.log('[Response Tab] Form data:', { id: form.id, publishedId: form.publishedId, title: form.title });

        // 서버에서 유효한 폼 ID 확인
        let formId = null;
        try {
            const serverForms = await window.FormAPI.list();
            if (serverForms && serverForms.length > 0) {
                // publishedId가 있으면 해당 폼이 서버에 있는지 확인
                if (form.publishedId) {
                    const existingForm = serverForms.find(f => f.id === form.publishedId);
                    if (existingForm) {
                        formId = form.publishedId;
                    } else {
                        console.log('[Response Tab] publishedId not found on server, searching...');
                    }
                }
                // formId가 없으면 제목으로 매칭 또는 첫 번째 폼 사용
                if (!formId) {
                    const matchingForm = serverForms.find(f => f.title === form.title) || serverForms[0];
                    formId = matchingForm.id;
                    console.log('[Response Tab] Using server form:', formId);
                    form.publishedId = formId;
                    saveForm(form);
                }
            }
        } catch (e) {
            console.warn('[Response Tab] Failed to fetch server forms:', e);
        }

        // 여전히 formId가 없으면 게시되지 않은 상태 표시
        if (!formId) {
            console.log('[Response Tab] Form not published');
            if (shareUrlSection) shareUrlSection.style.display = 'none';
            if (notPublished) notPublished.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'none';
            if (countElement) countElement.textContent = '0';
            return;
        }

        // 공유 URL 표시
        if (shareUrlSection) {
            shareUrlSection.style.display = 'block';
            const urlInput = document.getElementById('share-url-input');
            if (urlInput) {
                const respondUrl = `${window.location.origin}/respond.html?formId=${formId}`;
                urlInput.value = respondUrl;
            }
        }

        // 서버에서 응답 및 폼 데이터 가져오기
        try {
            const refreshBtn = document.getElementById('refresh-responses-btn');
            if (refreshBtn) refreshBtn.classList.add('loading');

            // 서버에서 폼과 응답 모두 가져오기 (질문 ID 매칭을 위해)
            console.log('[Response Tab] Fetching from server, formId:', formId);
            const [responses, serverForm] = await Promise.all([
                window.ResponseAPI.list(formId),
                window.FormAPI.get(formId)
            ]);

            console.log('[Response Tab] Loaded:', {
                responsesCount: responses.length,
                questionsCount: serverForm.questions?.length || 0
            });

            if (refreshBtn) refreshBtn.classList.remove('loading');

            // 응답 개수 업데이트
            if (countElement) countElement.textContent = responses.length;

            if (responses.length === 0) {
                if (notPublished) notPublished.style.display = 'none';
                if (emptyState) emptyState.style.display = 'block';
                if (tableContainer) tableContainer.style.display = 'none';
            } else {
                if (notPublished) notPublished.style.display = 'none';
                if (emptyState) emptyState.style.display = 'none';
                if (tableContainer) tableContainer.style.display = 'block';
                // 서버 폼 데이터 사용 (정확한 질문 ID 매칭)
                renderResponsesTable(responses, serverForm);
            }
        } catch (error) {
            console.error('[Response Tab] 응답 로딩 실패:', error);
            if (countElement) countElement.textContent = '0';
            if (notPublished) notPublished.style.display = 'none';
            if (emptyState) {
                emptyState.style.display = 'block';
                emptyState.innerHTML = `<p>응답을 불러오는 중 오류가 발생했습니다.</p><p style="color: #999; font-size: 12px;">${error.message}</p>`;
            }
            if (tableContainer) tableContainer.style.display = 'none';
        }
    }

    /**
     * 응답 테이블 렌더링
     */
    function renderResponsesTable(responses, form) {
        console.log('[renderResponsesTable] Called with:', {
            responsesCount: responses?.length,
            questionsCount: form?.questions?.length,
            formId: form?.id
        });

        const thead = document.getElementById('responses-table-head');
        const tbody = document.getElementById('responses-table-body');

        console.log('[renderResponsesTable] DOM elements:', { thead: !!thead, tbody: !!tbody });

        if (!thead || !tbody) {
            console.error('[renderResponsesTable] Missing DOM elements!');
            return;
        }

        // Sort questions by orderIndex (or order) in ascending order
        let questions = form.questions || [];
        questions = questions.sort((a, b) => {
            const orderA = a.orderIndex !== undefined ? a.orderIndex : (a.order !== undefined ? a.order : 0);
            const orderB = b.orderIndex !== undefined ? b.orderIndex : (b.order !== undefined ? b.order : 0);
            return orderA - orderB;
        });

        // 이메일 수집 여부 확인
        let collectEmail = false;
        if (form.settings) {
            try {
                const settings = typeof form.settings === 'string'
                    ? JSON.parse(form.settings)
                    : form.settings;
                collectEmail = settings.collectEmail === true;
            } catch (e) {
                console.warn('Failed to parse form settings:', e);
            }
        }

        // 테이블 헤더 (Email FIRST if enabled, then timestamp, then questions)
        thead.innerHTML = `
            <tr>
                ${collectEmail ? '<th>이메일</th>' : ''}
                <th>제출 시간</th>
                ${questions.map(q => `<th>${escapeHtml(q.title || '질문')}</th>`).join('')}
            </tr>
        `;

        // 테이블 본문
        console.log('[renderResponsesTable] Building table body...');
        tbody.innerHTML = responses.map(response => {
            const submittedAt = new Date(response.submittedAt).toLocaleString('ko-KR');
            const answers = response.answers || [];
            console.log('[renderResponsesTable] Response:', response.id, 'Answers:', answers.length);

            return `
                <tr data-response-id="${response.id}">
                    ${collectEmail ? `<td>${escapeHtml(response.email || '-')}</td>` : ''}
                    <td class="response-timestamp">${submittedAt}</td>
                    ${questions.map(q => {
                        // 숫자로 변환하여 비교 (타입 불일치 방지)
                        const answer = answers.find(a => Number(a.questionId) === Number(q.id));
                        let displayValue = '-';

                        if (answer && answer.value != null && answer.value !== '') {
                            // 파일 업로드 질문 처리
                            if (q.type === 'file-upload') {
                                try {
                                    const fileMetadata = JSON.parse(answer.value);
                                    if (Array.isArray(fileMetadata)) {
                                        displayValue = fileMetadata.map((file, idx) =>
                                            `<a href="javascript:downloadFileById(${file.id}, '${escapeHtml(file.originalFilename)}')" class="file-download-link">${escapeHtml(file.originalFilename)}</a>`
                                        ).join('<br>');
                                    } else if (fileMetadata.id) {
                                        displayValue = `<a href="javascript:downloadFileById(${fileMetadata.id}, '${escapeHtml(fileMetadata.originalFilename)}')" class="file-download-link">${escapeHtml(fileMetadata.originalFilename)}</a>`;
                                    } else {
                                        displayValue = String(answer.value);
                                    }
                                } catch (e) {
                                    displayValue = String(answer.value);
                                }
                            } else {
                                // 다른 질문 타입 처리
                                try {
                                    const parsed = JSON.parse(answer.value);
                                    if (Array.isArray(parsed)) {
                                        displayValue = parsed.join(', ');
                                    } else {
                                        displayValue = String(answer.value);
                                    }
                                } catch (e) {
                                    displayValue = String(answer.value);
                                }
                            }
                        }
                        return `<td>${displayValue}</td>`;
                    }).join('')}
                </tr>
            `;
        }).join('');

        console.log('[renderResponsesTable] Rendered:', {
            theadHTML: thead.innerHTML.substring(0, 200),
            tbodyRows: tbody.querySelectorAll('tr').length
        });
    }

    /**
     * HTML 이스케이프 처리
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 파일 다운로드 (ID 기반)
     */
    window.downloadFileById = async function(fileId, originalFilename) {
        try {
            const response = await fetch(`/api/files/${fileId}`);
            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = originalFilename || 'download';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('File download error:', error);
            alert('파일 다운로드에 실패했습니다.');
        }
    };

    /**
     * 응답 탭 이벤트 설정
     */
    function setupResponsesTab() {
        // 새로고침 버튼
        const refreshBtn = document.getElementById('refresh-responses-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadAndRenderResponses);
        }

        // URL 복사 버튼
        const copyBtn = document.getElementById('copy-url-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const urlInput = document.getElementById('share-url-input');
                if (urlInput) {
                    try {
                        await navigator.clipboard.writeText(urlInput.value);
                        copyBtn.classList.add('copied');
                        copyBtn.innerHTML = `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                            복사됨
                        `;
                        setTimeout(() => {
                            copyBtn.classList.remove('copied');
                            copyBtn.innerHTML = `
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                                복사
                            `;
                        }, 2000);
                    } catch (err) {
                        console.error('클립보드 복사 실패:', err);
                    }
                }
            });
        }
    }

    /**
     * Setup title click for editing functionality
     */
    function setupTitleEditing() {
        const titleContainer = document.getElementById('tab-title');
        if (titleContainer && formTitleElement) {
            titleContainer.addEventListener('click', () => {
                enableTitleEditing();
            });
            // Keyboard accessibility
            titleContainer.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    enableTitleEditing();
                }
            });
        }
    }

    /**
     * Setup settings view toggles
     */
    function setupSettings() {
        const settingsMap = {
            'setting-collect-email': 'collectEmail',
            'setting-allow-edit': 'allowResponseEdit',
            'setting-show-progress': 'showProgressBar',
            'setting-shuffle-questions': 'shuffleQuestions'
        };

        Object.entries(settingsMap).forEach(([elementId, settingKey]) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.addEventListener('change', (e) => {
                    updateFormSetting(settingKey, e.target.checked);
                });
            }
        });
    }

    /**
     * Update a form setting
     * @param {string} key - Setting key
     * @param {*} value - Setting value
     */
    function updateFormSetting(key, value) {
        const form = getForm();
        if (!form.settings) {
            form.settings = {};
        }
        form.settings[key] = value;
        saveForm(form);
    }

    /**
     * Restore settings toggles from saved state
     */
    function restoreSettings() {
        const form = getForm();
        const settings = form.settings || {};

        const settingsMap = {
            'setting-collect-email': 'collectEmail',
            'setting-allow-edit': 'allowResponseEdit',
            'setting-show-progress': 'showProgressBar',
            'setting-shuffle-questions': 'shuffleQuestions'
        };

        Object.entries(settingsMap).forEach(([elementId, settingKey]) => {
            const element = document.getElementById(elementId);
            if (element && settings[settingKey] !== undefined) {
                element.checked = settings[settingKey];
            }
        });
    }

    /**
     * Enable inline title editing
     */
    let isEditingTitle = false;

    function enableTitleEditing() {
        // Prevent multiple edit sessions
        if (isEditingTitle) return;

        // Check if an input already exists and remove it
        const existingInput = document.querySelector('.form-title-input');
        if (existingInput) {
            existingInput.remove();
        }

        isEditingTitle = true;
        const currentTitle = getFormTitle();

        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-title-input';
        input.value = currentTitle;

        // Replace span with input
        formTitleElement.style.display = 'none';
        formTitleElement.parentNode.insertBefore(input, formTitleElement.nextSibling);

        // Prevent click events from bubbling
        input.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        input.focus();
        input.select();

        // Handle blur and enter key
        let isFinished = false;
        const finishEditing = () => {
            if (isFinished) return;
            isFinished = true;

            const newTitle = input.value.trim() || '새 설문지';
            saveFormTitle(newTitle);
            formTitleElement.textContent = newTitle;
            formTitleElement.style.display = '';
            input.remove();
            isEditingTitle = false;
        };

        const cancelEditing = () => {
            if (isFinished) return;
            isFinished = true;

            formTitleElement.style.display = '';
            input.remove();
            isEditingTitle = false;
        };

        input.addEventListener('blur', finishEditing);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur(); // This triggers finishEditing via blur
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelEditing();
            }
        });
    }

    /**
     * Setup Builder UI
     */
    function setupBuilder() {
        if (previewToggle) {
            previewToggle.addEventListener('click', togglePreview);
        }

        questionTypeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                addQuestion(type);
            });
        });

        renderQuestions();
    }

    /**
     * Add a new question using the schema definition
     * @param {string} type - Question type (optional, defaults to 'short-text')
     */
    function addQuestion(type = 'short-text') {
        const questions = getQuestions();
        const newQuestion = createDefaultQuestion(type, questions.length);

        questions.push(newQuestion);
        saveQuestions(questions);
        renderQuestions();

        // Scroll to the new question
        setTimeout(() => {
            const newCard = document.querySelector(`[data-question-id="${newQuestion.id}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    /**
     * Delete a question (from root or section)
     * @param {string} questionId - ID of the question to delete
     */
    function deleteQuestion(questionId) {
        const sections = getSections();
        const questions = getQuestions();
        let found = false;

        // Try to find in sections first
        for (let section of sections) {
            if (section.questions) {
                const index = section.questions.findIndex(q => q.id === questionId);
                if (index > -1) {
                    section.questions.splice(index, 1);
                    saveSections(sections);
                    found = true;
                    break;
                }
            }
        }

        // If not found in sections, delete from root questions
        if (!found) {
            const filtered = questions.filter(q => q.id !== questionId);
            filtered.forEach((q, idx) => {
                q.order = idx;
            });
            saveQuestions(filtered);
        }

        renderQuestions();
    }

    /**
     * Duplicate a question
     * @param {string} questionId - ID of the question to duplicate
     */
    function duplicateQuestion(questionId) {
        const sections = getSections();
        const questions = getQuestions();
        let questionToDuplicate = null;
        let isInSection = false;
        let sectionIndex = -1;

        // Try to find in sections first
        for (let i = 0; i < sections.length; i++) {
            if (sections[i].questions) {
                const found = sections[i].questions.find(q => q.id === questionId);
                if (found) {
                    questionToDuplicate = found;
                    isInSection = true;
                    sectionIndex = i;
                    break;
                }
            }
        }

        // If not found in sections, find in root questions
        if (!questionToDuplicate) {
            questionToDuplicate = questions.find(q => q.id === questionId);
        }

        if (questionToDuplicate) {
            // Deep clone the question
            const duplicatedQuestion = JSON.parse(JSON.stringify(questionToDuplicate));

            // Generate new IDs
            duplicatedQuestion.id = generateUUID();

            // Generate new IDs for options if they exist
            if (duplicatedQuestion.options && duplicatedQuestion.options.length > 0) {
                duplicatedQuestion.options = duplicatedQuestion.options.map((opt, idx) => ({
                    ...opt,
                    id: generateUUID(),
                    order: idx
                }));
            }

            if (isInSection && sectionIndex > -1) {
                // Add to section
                duplicatedQuestion.order = sections[sectionIndex].questions.length;
                sections[sectionIndex].questions.push(duplicatedQuestion);
                saveSections(sections);
            } else {
                // Add to root
                duplicatedQuestion.order = questions.length;
                questions.push(duplicatedQuestion);
                saveQuestions(questions);
            }

            renderQuestions();
        }
    }

    /**
     * Update a question (from root or section)
     * @param {string} questionId - ID of the question to update
     * @param {Object} updates - Object with fields to update
     */
    function updateQuestion(questionId, updates) {
        const sections = getSections();
        const questions = getQuestions();
        let question = null;
        let isInSection = false;

        // Try to find in sections first
        for (let section of sections) {
            if (section.questions) {
                question = section.questions.find(q => q.id === questionId);
                if (question) {
                    isInSection = true;
                    break;
                }
            }
        }

        // If not found in sections, find in root questions
        if (!question) {
            question = questions.find(q => q.id === questionId);
        }

        if (question) {
            Object.assign(question, updates);

            if (isInSection) {
                saveSections(sections);
            } else {
                saveQuestions(questions);
            }

            // Only re-render if type changed
            if (updates.type) {
                renderQuestions();
            }
        }
    }

    // ========================================================
    // SECTION MANAGEMENT FUNCTIONS
    // ========================================================

    /**
     * Add a new section
     * @param {string} title - Section title (optional)
     * @returns {Object} New section object
     */
    function addSection(title = '새 섹션') {
        const sections = getSections();
        const newSection = createDefaultSection(sections.length);
        newSection.title = title;
        sections.push(newSection);
        saveSections(sections);
        renderQuestions();
        return newSection;
    }

    /**
     * Delete a section and its questions
     * @param {string} sectionId - ID of the section to delete
     */
    function deleteSection(sectionId) {
        const sections = getSections();
        const sectionIndex = sections.findIndex(s => s.id === sectionId);

        if (sectionIndex !== -1) {
            // 섹션 삭제 (섹션 내 질문도 함께 삭제)
            const newSections = sections.filter(s => s.id !== sectionId);

            // 섹션 orderIndex 재정렬
            newSections.forEach((s, idx) => {
                s.orderIndex = idx;
            });

            saveSections(newSections);
            renderQuestions();

            console.log(`[Section Delete] Deleted section "${sections[sectionIndex].title}" and ${(sections[sectionIndex].questions || []).length} questions`);
        }
    }

    /**
     * Update section title/description
     * @param {string} sectionId - ID of the section
     * @param {Object} updates - Updates object
     */
    function updateSection(sectionId, updates) {
        const sections = getSections();
        const section = sections.find(s => s.id === sectionId);

        if (section) {
            Object.assign(section, updates);
            saveSections(sections);
        }
    }

    /**
     * Reorder sections
     * @param {Array} sectionIds - Array of section IDs in new order
     */
    function reorderSections(sectionIds) {
        const sections = getSections();
        const newSections = [];

        sectionIds.forEach((id, idx) => {
            const section = sections.find(s => s.id === id);
            if (section) {
                section.orderIndex = idx;
                newSections.push(section);
            }
        });

        saveSections(newSections);
    }

    /**
     * Render all questions
     */
    function renderQuestions() {
        console.log('[FormApp] renderQuestions called');

        if (!questionsList) {
            console.error('[FormApp] questions-list element not found');
            return;
        }

        const questions = getQuestions();
        const sections = getSections();
        const readOnly = isFormReadOnly();

        console.log('[FormApp] Rendering', questions.length, 'questions,', sections.length, 'sections, readOnly:', readOnly);

        if (questions.length === 0 && sections.length === 0) {
            const emptyMessage = readOnly
                ? '<div class="empty-state"><h2>질문이 없습니다</h2><p>이 게시된 설문에는 질문이 없습니다.</p></div>'
                : '<div class="empty-state"><h2>질문을 추가하세요</h2><p>아래 버튼을 클릭하여 첫 번째 질문을 시작하세요.</p><button class="btn btn-primary add-first-question-btn">첫 질문 추가</button></div>';
            questionsList.innerHTML = emptyMessage;
            console.log('[FormApp] Rendered empty state');

            // Attach event listener for first question button
            if (!readOnly) {
                const firstQBtn = questionsList.querySelector('.add-first-question-btn');
                if (firstQBtn) {
                    firstQBtn.addEventListener('click', () => addQuestion());
                }
            }
            return;
        }

        // Render sections and questions within sections
        let html = '';

        // Render sections if they exist
        if (sections.length > 0) {
            html = sections.map((section, sectionIndex) => {
                const sectionQuestions = section.questions || [];
                return `
                    <div class="section-card" data-section-id="${section.id}" data-section-index="${sectionIndex}" draggable="true">
                        <div class="section-header">
                            <div class="section-title-container">
                                <input
                                    type="text"
                                    class="section-title-input"
                                    placeholder="섹션 제목"
                                    value="${escapeHtml(section.title || '')}"
                                    data-section-id="${section.id}"
                                    data-field="title"
                                />
                            </div>
                            ${!readOnly ? `
                                <button class="icon-button delete delete-section-btn" title="섹션 삭제" data-section-id="${section.id}">
                                    ×
                                </button>
                            ` : ''}
                        </div>

                        <textarea
                            class="section-description-input"
                            placeholder="섹션 설명 (선택사항)"
                            data-section-id="${section.id}"
                            data-field="description"
                        >${escapeHtml(section.description || '')}</textarea>

                        <div class="section-questions">
                            ${sectionQuestions.length > 0 ? sectionQuestions.map((question, qIndex) => `
                                <div class="question-card" data-question-id="${question.id}" data-section-id="${section.id}" draggable="true">
                                    <div class="question-card-header">
                                        <div class="question-number">${qIndex + 1}</div>
                                        <div class="question-card-content">
                                            <input
                                                type="text"
                                                class="question-input"
                                                placeholder="질문을 입력하세요"
                                                value="${escapeHtml(question.title || '')}"
                                                data-field="title"
                                                data-question-id="${question.id}"
                                            />
                                            <textarea
                                                class="description-input"
                                                placeholder="설명 (선택사항)"
                                                data-field="description"
                                                data-question-id="${question.id}"
                                            >${escapeHtml(question.description || '')}</textarea>
                                        </div>
                                        <div class="question-card-actions">
                                            <button class="icon-button attachment-icon" title="첨부파일 추가" data-question-id="${question.id}">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                                                </svg>
                                            </button>
                                            <button class="icon-button delete delete-btn" title="삭제" data-question-id="${question.id}">
                                                ×
                                            </button>
                                        </div>
                                    </div>

                                    ${renderQuestionOptions(question)}

                                    ${(question.attachmentStoredName || question.pendingAttachment) ? `
                                        <div class="question-attachment-preview" data-question-id="${question.id}">
                                            <div class="attachment-item ${question.pendingAttachment ? 'pending' : ''}">
                                                ${question.pendingAttachment ? '<span class="attachment-badge">임시저장</span>' : ''}
                                                <span class="attachment-label">첨부파일:</span>
                                                <span class="attachment-name">${escapeHtml(question.attachmentFilename || question.attachmentStoredName || '')}</span>
                                                <button class="btn-remove-attachment" data-question-id="${question.id}" title="첨부파일 삭제">×</button>
                                            </div>
                                            ${question.attachmentPreviewUrl && question.attachmentContentType?.startsWith('image/') ? `
                                                <div class="attachment-image-preview">
                                                    <img src="${question.attachmentPreviewUrl}" alt="첨부 이미지 미리보기" />
                                                </div>
                                            ` : ''}
                                        </div>
                                    ` : ''}

                                    <div class="question-card-footer">
                                        <div class="option-group">
                                            <select class="question-type-dropdown" data-field="type" data-question-id="${question.id}">
                                                ${Object.entries(QUESTION_TYPES).map(([key, label]) => `
                                                    <option value="${key}" ${question.type === key ? 'selected' : ''}>${label}</option>
                                                `).join('')}
                                            </select>
                                        </div>
                                        <label class="toggle-required">
                                            <input
                                                type="checkbox"
                                                class="toggle-checkbox"
                                                ${question.required ? 'checked' : ''}
                                                data-field="required"
                                                data-question-id="${question.id}"
                                            />
                                            필수
                                        </label>
                                    </div>
                                </div>
                            `).join('') : ''}
                        </div>

                        ${!readOnly ? `
                            <div class="section-add-question">
                                <button class="btn-add-question-in-section" data-section-id="${section.id}">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                                    </svg>
                                    질문 추가
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        }

        // Render non-sectioned questions
        if (questions.length > 0 && sections.length === 0) {
            html += questions.map((question, index) => `
                <div class="question-card" data-question-id="${question.id}" data-index="${index}" draggable="true">
                    <div class="question-card-header">
                        <div class="question-number">${index + 1}</div>
                        <div class="question-card-content">
                            <input
                                type="text"
                                class="question-input"
                                placeholder="질문을 입력하세요"
                                value="${escapeHtml(question.title || '')}"
                                data-field="title"
                                data-question-id="${question.id}"
                            />
                            <textarea
                                class="description-input"
                                placeholder="설명 (선택사항)"
                                data-field="description"
                                data-question-id="${question.id}"
                            >${escapeHtml(question.description || '')}</textarea>
                        </div>
                        <div class="question-card-actions">
                            <button class="icon-button attachment-icon" title="첨부파일 추가" data-question-id="${question.id}">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                                </svg>
                            </button>
                            <button class="icon-button delete delete-btn" title="삭제" data-question-id="${question.id}">
                                ×
                            </button>
                        </div>
                    </div>

                    ${renderQuestionOptions(question)}

                    ${(question.attachmentStoredName || question.pendingAttachment) ? `
                        <div class="question-attachment-preview" data-question-id="${question.id}">
                            <div class="attachment-item ${question.pendingAttachment ? 'pending' : ''}">
                                ${question.pendingAttachment ? '<span class="attachment-badge">임시저장</span>' : ''}
                                <span class="attachment-label">첨부파일:</span>
                                <span class="attachment-name">${escapeHtml(question.attachmentFilename || question.attachmentStoredName || '')}</span>
                                <button class="btn-remove-attachment" data-question-id="${question.id}" title="첨부파일 삭제">×</button>
                            </div>
                            ${question.attachmentPreviewUrl && question.attachmentContentType?.startsWith('image/') ? `
                                <div class="attachment-image-preview">
                                    <img src="${question.attachmentPreviewUrl}" alt="첨부 이미지 미리보기" />
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}

                    <div class="question-card-footer">
                        <div class="option-group">
                            <select class="question-type-dropdown" data-field="type" data-question-id="${question.id}">
                                ${Object.entries(QUESTION_TYPES).map(([key, label]) => `
                                    <option value="${key}" ${question.type === key ? 'selected' : ''}>${label}</option>
                                `).join('')}
                            </select>
                        </div>
                        <label class="toggle-required">
                            <input
                                type="checkbox"
                                class="toggle-checkbox"
                                ${question.required ? 'checked' : ''}
                                data-field="required"
                                data-question-id="${question.id}"
                            />
                            필수
                        </label>
                    </div>
                </div>
            `).join('');
        }

        questionsList.innerHTML = html;

        // Add buttons at the bottom
        if (!readOnly) {
            questionsList.innerHTML += `
                <div class="add-section-container">
                    <button class="btn btn-add-section" id="add-section-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        섹션 추가
                    </button>
                </div>
                <div class="add-question-container">
                    <button class="btn btn-add-question-full" id="add-question-bottom-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                        </svg>
                        질문 추가
                    </button>
                </div>
            `;
        }

        // Attach event listeners
        attachQuestionEventListeners();
        attachSectionEventListeners();
        attachAddQuestionButtonListener();
        attachAddSectionButtonListener();

        // Update read-only state if needed
        if (readOnly) {
            disableEditingUI();
        }
    }

    /**
     * Attach event listener for the bottom "Add Question" button
     */
    function attachAddQuestionButtonListener() {
        const addBtn = document.getElementById('add-question-bottom-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                addQuestion();
            });
        }
    }

    /**
     * Attach event listener for the bottom "Add Section" button
     */
    function attachAddSectionButtonListener() {
        const addSectionBtn = document.getElementById('add-section-btn');
        if (addSectionBtn) {
            addSectionBtn.addEventListener('click', () => {
                addSection();
            });
        }
    }

    /**
     * Attach event listeners for sections
     */
    function attachSectionEventListeners() {
        // Delete section buttons
        document.querySelectorAll('.delete-section-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sectionId = e.currentTarget.dataset.sectionId;
                if (confirm('이 섹션을 삭제하시겠습니까? 섹션의 질문들은 유지됩니다.')) {
                    deleteSection(sectionId);
                }
            });
        });

        // Section title inputs
        document.querySelectorAll('.section-title-input').forEach(input => {
            input.addEventListener('blur', (e) => {
                const sectionId = e.target.dataset.sectionId;
                const title = e.target.value.trim();
                updateSection(sectionId, { title: title || '새 섹션' });
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.target.blur();
                }
            });
        });

        // Section description inputs
        document.querySelectorAll('.section-description-input').forEach(input => {
            input.addEventListener('blur', (e) => {
                const sectionId = e.target.dataset.sectionId;
                const description = e.target.value.trim();
                updateSection(sectionId, { description });
            });
        });

        // Add question in section buttons
        document.querySelectorAll('.btn-add-question-in-section').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const sectionId = e.currentTarget.dataset.sectionId;
                addQuestionToSection(sectionId);
            });
        });
    }

    /**
     * Add a question to a specific section
     * @param {string} sectionId - ID of the section
     * @param {string} type - Question type (optional)
     */
    function addQuestionToSection(sectionId, type = 'short-text') {
        const sections = getSections();
        const section = sections.find(s => s.id === sectionId);

        if (section) {
            const newQuestion = createDefaultQuestion(type, section.questions.length);
            section.questions.push(newQuestion);
            saveSections(sections);
            renderQuestions();

            // Scroll to new question
            setTimeout(() => {
                const newCard = document.querySelector(`[data-question-id="${newQuestion.id}"]`);
                if (newCard) {
                    newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }

    /**
     * Add a new question at a specific index
     * @param {number} index - Insert position
     * @param {string} type - Question type (optional, defaults to 'short-text')
     */
    function addQuestionAt(index, type = 'short-text') {
        const questions = getQuestions();
        const newQuestion = createDefaultQuestion(type, index);

        // Insert at specified position
        questions.splice(index, 0, newQuestion);

        // Reorder remaining questions
        questions.forEach((q, idx) => {
            q.order = idx;
        });

        saveQuestions(questions);
        renderQuestions();

        // Scroll to the new question
        setTimeout(() => {
            const newCard = document.querySelector(`[data-question-id="${newQuestion.id}"]`);
            if (newCard) {
                newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }

    /**
     * Render question-specific options based on type
     * @param {Object} question - Question object
     * @returns {string} HTML string for question options
     */
    function renderQuestionOptions(question) {
        const type = question.type;

        // Options for choice-based questions (multiple-choice, checkbox, dropdown)
        if (OPTION_BASED_TYPES.includes(type)) {
            const options = question.options || [];
            return `
                <div class="question-options-list" data-question-id="${question.id}">
                    ${options.map((option, idx) => `
                        <div class="option-item" data-option-id="${option.id}">
                            <span class="option-indicator">${type === 'checkbox' ? '[ ]' : type === 'dropdown' ? (idx + 1) + '.' : 'O'}</span>
                            <input
                                type="text"
                                class="option-input"
                                placeholder="옵션 ${idx + 1}"
                                value="${escapeHtml(option.label || '')}"
                                data-option-id="${option.id}"
                                data-question-id="${question.id}"
                            />
                            <button class="icon-button delete-option-btn" title="옵션 삭제" data-option-id="${option.id}" data-question-id="${question.id}">
                                X
                            </button>
                        </div>
                    `).join('')}
                    <div class="add-option-row">
                        <span class="option-indicator">${type === 'checkbox' ? '[ ]' : type === 'dropdown' ? (options.length + 1) + '.' : 'O'}</span>
                        <button class="add-option-btn" data-question-id="${question.id}">옵션 추가</button>
                    </div>
                </div>
            `;
        }

        // Linear scale configuration (fixed 1-10 scale with optional labels)
        if (type === 'linear-scale') {
            const config = question.scaleConfig || { min: 1, max: 10, minLabel: '', maxLabel: '' };
            return `
                <div class="scale-config" data-question-id="${question.id}">
                    <div class="scale-info">
                        <span class="scale-range-label">배율: 1 ~ 10</span>
                    </div>
                    <div class="scale-labels">
                        <input
                            type="text"
                            class="scale-label-input"
                            placeholder="최소값 라벨 (선택)"
                            value="${escapeHtml(config.minLabel || '')}"
                            data-field="scaleMinLabel"
                            data-question-id="${question.id}"
                        />
                        <input
                            type="text"
                            class="scale-label-input"
                            placeholder="최대값 라벨 (선택)"
                            value="${escapeHtml(config.maxLabel || '')}"
                            data-field="scaleMaxLabel"
                            data-question-id="${question.id}"
                        />
                    </div>
                </div>
            `;
        }

        // Text input placeholder for short-text and long-text
        if (type === 'short-text') {
            return '<div class="answer-preview"><span class="answer-placeholder">단답형 텍스트</span></div>';
        }

        if (type === 'long-text') {
            return '<div class="answer-preview"><span class="answer-placeholder">장문형 텍스트</span></div>';
        }

        if (type === 'date') {
            return '<div class="answer-preview"><span class="answer-placeholder">년. 월. 일.</span></div>';
        }

        if (type === 'file-upload') {
            return '<div class="answer-preview"><span class="answer-placeholder">파일 첨부</span></div>';
        }

        return '';
    }

    /**
     * Attach event listeners to question elements
     */
    function attachQuestionEventListeners() {
        // Input and select handlers for question fields
        document.querySelectorAll('[data-field][data-question-id]').forEach(element => {
            element.addEventListener('change', handleFieldChange);
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.addEventListener('input', debounce(handleFieldChange, 300));
            }
            if (element.tagName === 'TEXTAREA') {
                element.addEventListener('input', debounce(handleFieldChange, 300));
            }
        });

        // Option input handlers
        document.querySelectorAll('.option-input').forEach(element => {
            element.addEventListener('input', debounce(handleOptionChange, 300));
        });

        // Delete button handlers
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionId = e.currentTarget.dataset.questionId;
                deleteQuestion(questionId);
            });
        });

        // Duplicate button handlers
        document.querySelectorAll('.duplicate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionId = e.currentTarget.dataset.questionId;
                duplicateQuestion(questionId);
            });
        });

        // Add option button handlers
        document.querySelectorAll('.add-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionId = e.currentTarget.dataset.questionId;
                addOptionToQuestion(questionId);
            });
        });

        // Delete option button handlers
        document.querySelectorAll('.delete-option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionId = e.currentTarget.dataset.questionId;
                const optionId = e.currentTarget.dataset.optionId;
                deleteOptionFromQuestion(questionId, optionId);
            });
        });

        // Question Attachment upload icon handlers
        document.querySelectorAll('.attachment-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionId = e.currentTarget.dataset.questionId;
                handleAttachmentUploadClick(questionId);
            });
        });

        // Question Attachment remove button handlers
        document.querySelectorAll('.btn-remove-attachment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionId = e.currentTarget.dataset.questionId;
                handleRemoveAttachment(questionId);
            });
        });

        // Drag & Drop handlers for question reordering
        setupDragAndDrop();
    }

    /**
     * Setup drag and drop for question reordering
     */
    let draggedElement = null;
    let draggedIndex = null;

    function setupDragAndDrop() {
        const cards = document.querySelectorAll('.question-card[draggable="true"]');

        cards.forEach(card => {
            // Click to select/highlight card
            card.addEventListener('click', (e) => {
                // Don't select if clicking on input, button, select, or textarea
                if (e.target.closest('input, button, select, textarea')) {
                    return;
                }
                // Remove selected class from all cards
                document.querySelectorAll('.question-card').forEach(c => {
                    c.classList.remove('selected');
                });
                // Add selected class to clicked card
                card.classList.add('selected');
            });

            // Drag start (for question reordering) - entire card is draggable
            card.addEventListener('dragstart', (e) => {
                // Prevent drag from input/textarea elements
                if (e.target.closest('input, textarea, select')) {
                    e.preventDefault();
                    return;
                }
                draggedElement = card;
                draggedIndex = parseInt(card.dataset.index);
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', card.dataset.questionId);
            });

            // Drag end (for question reordering)
            card.addEventListener('dragend', (e) => {
                card.classList.remove('dragging');
                document.querySelectorAll('.question-card').forEach(c => {
                    c.classList.remove('drag-over');
                });
                draggedElement = null;
                draggedIndex = null;
            });

            // Drag over (for question reordering)
            card.addEventListener('dragover', (e) => {
                // Check if this is a file drag or question reordering
                if (draggedElement) {
                    // Question reordering
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (card !== draggedElement) {
                        card.classList.add('drag-over');
                    }
                } else if (e.dataTransfer.types.includes('Files')) {
                    // File upload
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    card.classList.add('file-drag-over');
                }
            });

            // Drag leave (for both reordering and file upload)
            card.addEventListener('dragleave', (e) => {
                card.classList.remove('drag-over');
                card.classList.remove('file-drag-over');
            });

            // Drop (for both reordering and file upload)
            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');
                card.classList.remove('file-drag-over');

                // Check if files are dropped
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    // File upload to question attachment
                    const questionId = card.dataset.questionId;
                    handleFileDropOnQuestion(questionId, e.dataTransfer.files);
                } else if (draggedElement && card !== draggedElement) {
                    // Question reordering
                    const draggedSectionId = draggedElement.dataset.sectionId;
                    const targetSectionId = card.dataset.sectionId;
                    const targetIndex = parseInt(card.dataset.index);

                    if (draggedSectionId === targetSectionId && draggedSectionId) {
                        // Reordering within same section
                        reorderQuestionsInSection(draggedSectionId, draggedIndex, targetIndex);
                    } else {
                        // Reordering in root questions or cross-section (use only root)
                        reorderQuestions(draggedIndex, targetIndex);
                    }
                }
            });
        });
    }

    /**
     * Reorder questions by moving from one index to another
     * @param {number} fromIndex - Source index
     * @param {number} toIndex - Target index
     */
    function reorderQuestions(fromIndex, toIndex) {
        const questions = getQuestions();
        if (fromIndex === toIndex) return;

        // Remove the question from its original position
        const [movedQuestion] = questions.splice(fromIndex, 1);

        // Insert at new position
        questions.splice(toIndex, 0, movedQuestion);

        // Update order for all questions
        questions.forEach((q, idx) => {
            q.order = idx;
            q.orderIndex = idx;
        });

        saveQuestions(questions);
        renderQuestions();

        console.log('[DragDrop] Reordered questions:', fromIndex, '->', toIndex);
    }

    /**
     * Reorder questions within a section
     * @param {string} sectionId - Section ID
     * @param {number} fromIndex - Source index within section
     * @param {number} toIndex - Target index within section
     */
    function reorderQuestionsInSection(sectionId, fromIndex, toIndex) {
        const sections = getSections();
        const sectionIndex = sections.findIndex(s => s.id === sectionId);

        if (sectionIndex === -1) return;

        const section = sections[sectionIndex];
        const questions = section.questions || [];

        if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= questions.length || toIndex >= questions.length) {
            return;
        }

        // Remove the question from its original position
        const [movedQuestion] = questions.splice(fromIndex, 1);

        // Insert at new position
        questions.splice(toIndex, 0, movedQuestion);

        // Update order for all questions in the section
        questions.forEach((q, idx) => {
            q.order = idx;
            q.orderIndex = idx;
        });

        saveSections(sections);
        renderQuestions();

        console.log('[DragDrop] Reordered questions in section:', sectionId, fromIndex, '->', toIndex);
    }

    /**
     * Debounce utility function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Handle option input changes
     * @param {Event} event - Input event
     */
    function handleOptionChange(event) {
        const questionId = event.target.dataset.questionId;
        const optionId = event.target.dataset.optionId;
        const value = event.target.value;

        const sections = getSections();
        const questions = getQuestions();
        let question = null;
        let isInSection = false;

        // Try to find in sections first
        for (let section of sections) {
            if (section.questions) {
                question = section.questions.find(q => q.id === questionId);
                if (question) {
                    isInSection = true;
                    break;
                }
            }
        }

        // If not found in sections, find in root questions
        if (!question) {
            question = questions.find(q => q.id === questionId);
        }

        if (question && question.options) {
            const option = question.options.find(o => o.id === optionId);
            if (option) {
                option.label = value;
                if (isInSection) {
                    saveSections(sections);
                } else {
                    saveQuestions(questions);
                }
            }
        }
    }

    /**
     * Add a new option to a question
     * @param {string} questionId - Question ID
     */
    function addOptionToQuestion(questionId) {
        const sections = getSections();
        const questions = getQuestions();
        let question = null;
        let isInSection = false;

        // Try to find in sections first
        for (let section of sections) {
            if (section.questions) {
                question = section.questions.find(q => q.id === questionId);
                if (question) {
                    isInSection = true;
                    break;
                }
            }
        }

        // If not found in sections, find in root questions
        if (!question) {
            question = questions.find(q => q.id === questionId);
        }

        if (question) {
            if (!question.options) {
                question.options = [];
            }
            const newOption = createDefaultOption(question.options.length);
            question.options.push(newOption);

            if (isInSection) {
                saveSections(sections);
            } else {
                saveQuestions(questions);
            }

            renderQuestions();

            // Focus on the new option input
            setTimeout(() => {
                const newInput = document.querySelector(`[data-option-id="${newOption.id}"]`);
                if (newInput) {
                    newInput.focus();
                }
            }, 50);
        }
    }

    /**
     * Delete an option from a question
     * @param {string} questionId - Question ID
     * @param {string} optionId - Option ID
     */
    function deleteOptionFromQuestion(questionId, optionId) {
        const sections = getSections();
        const questions = getQuestions();
        let question = null;
        let isInSection = false;

        // Try to find in sections first
        for (let section of sections) {
            if (section.questions) {
                question = section.questions.find(q => q.id === questionId);
                if (question) {
                    isInSection = true;
                    break;
                }
            }
        }

        // If not found in sections, find in root questions
        if (!question) {
            question = questions.find(q => q.id === questionId);
        }

        if (question && question.options) {
            // Prevent deleting if only one option remains
            if (question.options.length <= 1) {
                alert('최소 1개의 옵션이 필요합니다.');
                return;
            }
            question.options = question.options.filter(o => o.id !== optionId);
            // Reorder remaining options
            question.options.forEach((opt, idx) => {
                opt.order = idx;
            });

            if (isInSection) {
                saveSections(sections);
            } else {
                saveQuestions(questions);
            }

            renderQuestions();
        }
    }

    /**
     * Handle file drop on question card
     * Allows creator to attach a file via drag and drop
     * @param {string} questionId - Question ID
     * @param {FileList} files - Files dropped on the card
     */
    function handleFileDropOnQuestion(questionId, files) {
        if (files.length === 0) return;

        // Use the first file dropped
        const file = files[0];
        handleAttachmentFile(questionId, file);
    }

    /**
     * Upload a file as question attachment to server
     * @param {string} questionId - Question ID (frontend UUID)
     * @param {File} file - File to upload
     */
    async function uploadQuestionAttachment(questionId, file) {
        const form = getForm();
        const sections = getSections();
        const questions = getQuestions();
        let question = null;
        let questionIndex = -1;
        let isInSection = false;

        // Try to find in sections first
        for (let i = 0; i < sections.length; i++) {
            if (sections[i].questions) {
                questionIndex = sections[i].questions.findIndex(q => String(q.id) === String(questionId));
                if (questionIndex > -1) {
                    question = sections[i].questions[questionIndex];
                    isInSection = true;
                    break;
                }
            }
        }

        // If not found in sections, find in root questions
        if (!question) {
            questionIndex = questions.findIndex(q => String(q.id) === String(questionId));
            if (questionIndex > -1) {
                question = questions[questionIndex];
            }
        }

        if (!question) {
            alert('질문 정보를 찾을 수 없습니다.');
            return;
        }

        // Use serverId for API call (set when form is published)
        const serverQuestionId = question.serverId || question.id;

        if (!form.publishedId || !serverQuestionId) {
            alert('설문지가 게시되지 않았습니다.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            // POST to /api/forms/{formId}/questions/{questionId}/attachment
            const response = await fetch(`/api/forms/${form.publishedId}/questions/${serverQuestionId}/attachment`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const updatedQuestion = await response.json();

            // Update question in state with attachment data, clear pending
            const updatedData = {
                ...question,
                pendingAttachment: null,
                attachmentFilename: updatedQuestion.attachmentFilename,
                attachmentStoredName: updatedQuestion.attachmentStoredName,
                attachmentContentType: updatedQuestion.attachmentContentType,
                attachmentPreviewUrl: null
            };

            if (isInSection) {
                // Find the section again and update
                for (let section of sections) {
                    if (section.questions) {
                        const idx = section.questions.findIndex(q => String(q.id) === String(questionId));
                        if (idx > -1) {
                            section.questions[idx] = updatedData;
                            break;
                        }
                    }
                }
                saveSections(sections);
            } else {
                questions[questionIndex] = updatedData;
                saveQuestions(questions);
            }

            renderQuestions();
            console.log('[Attachment] Uploaded to server for question:', questionId);
        } catch (error) {
            console.error('Attachment upload failed:', error);
            alert('첨부파일 업로드에 실패했습니다: ' + error.message);
        }
    }

    /**
     * Handle question attachment upload icon click
     * Opens file picker for attaching a file to a question
     * @param {string} questionId - Question ID (frontend UUID)
     */
    function handleAttachmentUploadClick(questionId) {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', async (event) => {
            const files = Array.from(event.target.files);
            if (files.length === 0) return;

            const file = files[0];
            await handleAttachmentFile(questionId, file);
        });

        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    /**
     * Handle attachment file - store locally or upload to server
     * @param {string} questionId - Question ID
     * @param {File} file - File to attach
     */
    async function handleAttachmentFile(questionId, file) {
        const form = getForm();
        const sections = getSections();
        const questions = getQuestions();
        let question = null;
        let questionIndex = -1;
        let isInSection = false;

        // Try to find in sections first
        for (let i = 0; i < sections.length; i++) {
            if (sections[i].questions) {
                questionIndex = sections[i].questions.findIndex(q => String(q.id) === String(questionId));
                if (questionIndex > -1) {
                    question = sections[i].questions[questionIndex];
                    isInSection = true;
                    break;
                }
            }
        }

        // If not found in sections, find in root questions
        if (!question) {
            questionIndex = questions.findIndex(q => String(q.id) === String(questionId));
            if (questionIndex > -1) {
                question = questions[questionIndex];
            }
        }

        if (!question) {
            alert('질문 정보를 찾을 수 없습니다.');
            return;
        }

        // If form is published, upload directly to server
        if (form.publishedId && question.serverId) {
            await uploadQuestionAttachment(questionId, file);
            return;
        }

        // If not published, store file as base64 locally
        try {
            const base64Data = await fileToBase64(file);
            const updatedData = {
                ...question,
                pendingAttachment: {
                    filename: file.name,
                    contentType: file.type,
                    base64Data: base64Data
                },
                // Show preview in UI
                attachmentFilename: file.name,
                attachmentContentType: file.type,
                attachmentPreviewUrl: base64Data
            };

            if (isInSection) {
                // Find the section again and update
                for (let section of sections) {
                    if (section.questions) {
                        const idx = section.questions.findIndex(q => String(q.id) === String(questionId));
                        if (idx > -1) {
                            section.questions[idx] = updatedData;
                            break;
                        }
                    }
                }
                saveSections(sections);
            } else {
                questions[questionIndex] = updatedData;
                saveQuestions(questions);
            }

            renderQuestions();
            console.log('[Attachment] File stored locally for question:', questionId);
        } catch (error) {
            console.error('Failed to store attachment locally:', error);
            alert('첨부파일 저장에 실패했습니다.');
        }
    }

    /**
     * Convert file to base64 string
     * @param {File} file - File to convert
     * @returns {Promise<string>} Base64 data URL
     */
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Handle remove attachment button click
     * @param {string} questionId - Question ID (frontend UUID or real Long ID)
     */
    async function handleRemoveAttachment(questionId) {
        if (!confirm('첨부파일을 삭제하시겠습니까?')) {
            return;
        }

        const form = getForm();
        const sections = getSections();
        const questions = getQuestions();
        let question = null;
        let questionIndex = -1;
        let isInSection = false;

        // Try to find in sections first
        for (let i = 0; i < sections.length; i++) {
            if (sections[i].questions) {
                questionIndex = sections[i].questions.findIndex(q => String(q.id) === String(questionId));
                if (questionIndex > -1) {
                    question = sections[i].questions[questionIndex];
                    isInSection = true;
                    break;
                }
            }
        }

        // If not found in sections, find in root questions
        if (!question) {
            questionIndex = questions.findIndex(q => String(q.id) === String(questionId));
            if (questionIndex > -1) {
                question = questions[questionIndex];
            }
        }

        if (!question) {
            alert('질문 정보를 찾을 수 없습니다.');
            return;
        }

        // If has pending attachment (not uploaded to server yet), just remove locally
        if (question.pendingAttachment) {
            const updatedData = {
                ...question,
                pendingAttachment: null,
                attachmentFilename: null,
                attachmentContentType: null,
                attachmentPreviewUrl: null
            };

            if (isInSection) {
                for (let section of sections) {
                    if (section.questions) {
                        const idx = section.questions.findIndex(q => String(q.id) === String(questionId));
                        if (idx > -1) {
                            section.questions[idx] = updatedData;
                            break;
                        }
                    }
                }
                saveSections(sections);
            } else {
                questions[questionIndex] = updatedData;
                saveQuestions(questions);
            }

            renderQuestions();
            console.log('[Attachment] Pending attachment removed for question:', questionId);
            return;
        }

        // If form is published and has server attachment, delete from server
        if (form.publishedId && question.serverId && question.attachmentStoredName) {
            try {
                const response = await fetch(`/api/forms/${form.publishedId}/questions/${question.serverId}/attachment`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                // Clear attachment fields from question in state
                const updatedData = {
                    ...question,
                    attachmentFilename: null,
                    attachmentStoredName: null,
                    attachmentContentType: null,
                    attachmentPreviewUrl: null
                };

                if (isInSection) {
                    for (let section of sections) {
                        if (section.questions) {
                            const idx = section.questions.findIndex(q => String(q.id) === String(questionId));
                            if (idx > -1) {
                                section.questions[idx] = updatedData;
                                break;
                            }
                        }
                    }
                    saveSections(sections);
                } else {
                    questions[questionIndex] = updatedData;
                    saveQuestions(questions);
                }

                renderQuestions();
                console.log('[Attachment] Server attachment deleted for question:', questionId);
            } catch (error) {
                console.error('Attachment deletion failed:', error);
                alert('첨부파일 삭제에 실패했습니다: ' + error.message);
            }
        } else {
            // No server attachment, just clear local state
            const updatedData = {
                ...question,
                attachmentFilename: null,
                attachmentStoredName: null,
                attachmentContentType: null,
                attachmentPreviewUrl: null
            };

            if (isInSection) {
                for (let section of sections) {
                    if (section.questions) {
                        const idx = section.questions.findIndex(q => String(q.id) === String(questionId));
                        if (idx > -1) {
                            section.questions[idx] = updatedData;
                            break;
                        }
                    }
                }
                saveSections(sections);
            } else {
                questions[questionIndex] = updatedData;
                saveQuestions(questions);
            }

            renderQuestions();
        }
    }

    /**
     * Handle field changes
     * @param {Event} event - Change/input event
     */
    function handleFieldChange(event) {
        const field = event.target.dataset.field;
        const questionId = event.target.dataset.questionId;
        let value = event.target.value;

        if (field === 'required') {
            value = event.target.checked;
        }

        // Handle scale config fields
        if (field.startsWith('scale')) {
            handleScaleConfigChange(questionId, field, value);
            return;
        }

        // Handle type change - need to reset options appropriately
        if (field === 'type') {
            handleTypeChange(questionId, value);
            return;
        }

        updateQuestion(questionId, { [field]: value });
    }

    /**
     * Handle scale configuration changes
     * @param {string} questionId - Question ID
     * @param {string} field - Scale field name
     * @param {string} value - New value
     */
    function handleScaleConfigChange(questionId, field, value) {
        const sections = getSections();
        const questions = getQuestions();
        let question = null;
        let isInSection = false;

        // Try to find in sections first
        for (let section of sections) {
            if (section.questions) {
                question = section.questions.find(q => q.id === questionId);
                if (question) {
                    isInSection = true;
                    break;
                }
            }
        }

        // If not found in sections, find in root questions
        if (!question) {
            question = questions.find(q => q.id === questionId);
        }

        if (question) {
            if (!question.scaleConfig) {
                question.scaleConfig = { min: 1, max: 5, minLabel: '', maxLabel: '' };
            }

            switch (field) {
                case 'scaleMin':
                    question.scaleConfig.min = parseInt(value);
                    break;
                case 'scaleMax':
                    question.scaleConfig.max = parseInt(value);
                    break;
                case 'scaleMinLabel':
                    question.scaleConfig.minLabel = value;
                    break;
                case 'scaleMaxLabel':
                    question.scaleConfig.maxLabel = value;
                    break;
            }

            if (isInSection) {
                saveSections(sections);
            } else {
                saveQuestions(questions);
            }
        }
    }

    /**
     * Handle question type change
     * @param {string} questionId - Question ID
     * @param {string} newType - New question type
     */
    function handleTypeChange(questionId, newType) {
        const sections = getSections();
        const questions = getQuestions();
        let question = null;
        let isInSection = false;

        // Try to find in sections first
        for (let section of sections) {
            if (section.questions) {
                question = section.questions.find(q => q.id === questionId);
                if (question) {
                    isInSection = true;
                    break;
                }
            }
        }

        // If not found in sections, find in root questions
        if (!question) {
            question = questions.find(q => q.id === questionId);
        }

        if (question) {
            const oldType = question.type;
            question.type = newType;

            // If changing to an option-based type, ensure options exist
            if (OPTION_BASED_TYPES.includes(newType) && (!question.options || question.options.length === 0)) {
                question.options = [createDefaultOption(0)];
            }

            // If changing to linear scale, ensure scaleConfig exists (fixed 1-10)
            if (newType === 'linear-scale' && !question.scaleConfig) {
                question.scaleConfig = { min: 1, max: 10, minLabel: '', maxLabel: '' };
            }

            if (isInSection) {
                saveSections(sections);
            } else {
                saveQuestions(questions);
            }

            renderQuestions();
        }
    }

    /**
     * Toggle Preview Mode
     */
    function togglePreview() {
        isPreviewMode = !isPreviewMode;

        if (isPreviewMode) {
            previewMode.classList.add('preview-mode-hidden');
            previewContent.classList.remove('preview-content-hidden');
            previewToggle.querySelector('span').textContent = '편집';
            renderPreview();
        } else {
            previewMode.classList.remove('preview-mode-hidden');
            previewContent.classList.add('preview-content-hidden');
            previewToggle.querySelector('span').textContent = '미리보기';
        }

        saveUIState({ isPreviewMode });
    }

    // ========================================================
    // RESPONSE SUBMISSION FUNCTIONS
    // ========================================================

    /**
     * Collect responses from preview form
     * @returns {Array} Array of answer objects with questionId and value
     */
    function collectResponses() {
        const form = getForm();
        const questions = form.questions || [];
        const answers = [];

        questions.forEach(question => {
            const value = getResponseValue(question);
            answers.push({
                questionId: question.id,
                value: value
            });
        });

        return answers;
    }

    /**
     * Get response value from a question input element
     * @param {Object} question - Question object
     * @returns {*} Response value based on question type
     */
    function getResponseValue(question) {
        const type = question.type;
        const selector = `[name="q_${question.id}"]`;

        switch (type) {
            case 'short-text':
            case 'long-text':
            case 'date':
                const input = previewContainer.querySelector(`input[name="q_${question.id}"]`);
                return input ? input.value : '';

            case 'multiple-choice':
            case 'linear-scale':
                const radioInput = previewContainer.querySelector(`input[type="radio"][name="q_${question.id}"]:checked`);
                return radioInput ? radioInput.value : '';

            case 'checkbox':
                const checkboxes = previewContainer.querySelectorAll(`input[type="checkbox"][name="q_${question.id}"]:checked`);
                return Array.from(checkboxes).map(cb => cb.value);

            case 'dropdown':
                const selectInput = previewContainer.querySelector(`select[name="q_${question.id}"]`);
                return selectInput ? selectInput.value : '';

            case 'file-upload':
                // Placeholder for file upload
                return '';

            default:
                return '';
        }
    }

    /**
     * Validate responses for required questions
     * @param {Array} answers - Array of answer objects
     * @returns {Object} Validation result { valid: boolean, errors: [] }
     */
    function validateResponses(answers) {
        const form = getForm();
        const questions = form.questions || [];
        const errors = [];

        questions.forEach(question => {
            if (question.required) {
                const answer = answers.find(a => a.questionId === question.id);
                const value = answer ? answer.value : '';

                // Check if value is empty
                const isEmpty = Array.isArray(value) ? value.length === 0 : !value || value.trim() === '';

                if (isEmpty) {
                    errors.push({
                        questionId: question.id,
                        message: '이 질문은 필수입니다.'
                    });
                }
            }
        });

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Display validation error messages
     * @param {Array} errors - Array of error objects
     */
    function displayValidationErrors(errors) {
        // Clear previous error messages
        previewContainer.querySelectorAll('.error-message').forEach(el => el.remove());

        errors.forEach(error => {
            const questionCard = previewContainer.querySelector(`[data-question-id="${error.questionId}"]`);
            if (questionCard) {
                const errorEl = document.createElement('div');
                errorEl.className = 'error-message';
                errorEl.textContent = error.message;
                questionCard.appendChild(errorEl);
            }
        });
    }

    /**
     * Clear validation error messages
     */
    function clearValidationErrors() {
        previewContainer.querySelectorAll('.error-message').forEach(el => el.remove());
    }

    /**
     * Handle response input change - clear error messages
     */
    function handleResponseInputChange(event) {
        clearValidationErrors();
    }

    /**
     * Submit responses to server
     * @param {Array} answers - Array of answer objects
     */
    async function submitResponses(answers) {
        const form = getForm();
        const formId = form.publishedId;

        if (!formId) {
            showSubmitError('게시되지 않은 설문입니다.');
            return;
        }

        if (!window.ResponseAPI) {
            showSubmitError('API 모듈이 로드되지 않았습니다.');
            return;
        }

        try {
            // Disable submit button during submission
            const submitBtn = previewContainer.querySelector('.preview-submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '제출 중...';
            }

            // Call API
            const response = await window.ResponseAPI.submit(formId, answers);

            // Show success screen
            showSubmitSuccess();
        } catch (error) {
            console.error('Submit error:', error);
            showSubmitError('제출에 실패했습니다. 다시 시도해주세요.');

            // Re-enable submit button
            const submitBtn = previewContainer.querySelector('.preview-submit-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '제출';
            }
        }
    }

    /**
     * Show submit success screen
     */
    function showSubmitSuccess() {
        previewContainer.innerHTML = `
            <div class="submit-success-screen">
                <div class="success-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </div>
                <h2 class="success-title">응답이 제출되었습니다</h2>
                <p class="success-message">감사합니다. 귀하의 응답이 기록되었습니다.</p>
            </div>
        `;
    }

    /**
     * Show submit error screen
     * @param {string} errorMessage - Error message to display
     */
    function showSubmitError(errorMessage) {
        const form = getForm();
        const questions = form.questions || [];

        // Create error message element
        const errorEl = document.createElement('div');
        errorEl.className = 'submit-error-banner';
        errorEl.innerHTML = `
            <div class="error-banner-content">
                <svg class="error-banner-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
                <span class="error-banner-text">${escapeHtml(errorMessage)}</span>
            </div>
        `;

        // Insert at the top of preview container
        previewContainer.insertBefore(errorEl, previewContainer.firstChild);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            errorEl.classList.add('dismissing');
            setTimeout(() => {
                errorEl.remove();
            }, 300);
        }, 5000);
    }

    /**
     * Attach response submission event listeners
     */
    function attachResponseSubmitListener() {
        const submitBtn = previewContainer.querySelector('.preview-submit-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                clearValidationErrors();
                const answers = collectResponses();
                const validation = validateResponses(answers);

                if (!validation.valid) {
                    displayValidationErrors(validation.errors);
                    return;
                }

                submitResponses(answers);
            });
        }

        // Attach input change listeners to clear errors
        previewContainer.querySelectorAll('input, textarea, select').forEach(element => {
            element.addEventListener('change', handleResponseInputChange);
            element.addEventListener('input', handleResponseInputChange);
        });
    }

    /**
     * Render Preview
     */
    function renderPreview() {
        const form = getForm();
        const questions = form.questions || [];

        if (questions.length === 0) {
            previewContainer.innerHTML = '<div class="empty-state"><h2>질문이 없습니다</h2><p>질문을 추가한 후 미리보기를 확인하세요.</p></div>';
            return;
        }

        // Render form header + questions
        previewContainer.innerHTML = `
            <div class="preview-form-header">
                <h1 class="preview-form-title">${escapeHtml(form.title || '새 설문지')}</h1>
                ${form.description ? `<p class="preview-form-description">${escapeHtml(form.description)}</p>` : ''}
                <p class="preview-required-notice">* 표시는 필수 질문입니다</p>
            </div>
            ${questions.map((question, index) => `
                <div class="preview-question-card" data-question-id="${question.id}">
                    <div class="preview-question-number">질문 ${index + 1}</div>
                    <div class="preview-question-title">
                        ${escapeHtml(question.title || '(제목 없음)')}
                        ${question.required ? '<span class="required-asterisk"> *</span>' : ''}
                    </div>
                    ${question.description ? `<div class="preview-question-description">${escapeHtml(question.description)}</div>` : ''}
                    ${renderPreviewInput(question)}
                </div>
            `).join('')}
            <div class="preview-submit-section">
                <button class="btn btn-primary preview-submit-btn" type="button">제출</button>
            </div>
        `;

        // Attach event listeners for submission
        attachResponseSubmitListener();
    }

    /**
     * Render preview input based on question type
     * @param {Object} question - Question object
     */
    function renderPreviewInput(question) {
        const type = question.type;
        const options = question.options || [];
        const scaleConfig = question.scaleConfig || { min: 1, max: 5, minLabel: '', maxLabel: '' };

        switch (type) {
            case 'short-text':
                return '<input type="text" class="preview-input-field" placeholder="내 답변" />';

            case 'long-text':
                return '<textarea class="preview-input-field preview-textarea" placeholder="내 답변"></textarea>';

            case 'multiple-choice':
                if (options.length === 0) {
                    return '<div class="preview-options"><div class="preview-option-item"><input type="radio" disabled /> <span>옵션 없음</span></div></div>';
                }
                return `
                    <div class="preview-options">
                        ${options.map(opt => `
                            <div class="preview-option-item">
                                <label class="preview-radio-label">
                                    <input type="radio" name="q_${question.id}" value="${opt.id}" />
                                    <span>${escapeHtml(opt.label || '옵션')}</span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                `;

            case 'checkbox':
                if (options.length === 0) {
                    return '<div class="preview-options"><div class="preview-option-item"><input type="checkbox" disabled /> <span>옵션 없음</span></div></div>';
                }
                return `
                    <div class="preview-options">
                        ${options.map(opt => `
                            <div class="preview-option-item">
                                <label class="preview-checkbox-label">
                                    <input type="checkbox" name="q_${question.id}" value="${opt.id}" />
                                    <span>${escapeHtml(opt.label || '옵션')}</span>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                `;

            case 'dropdown':
                return `
                    <select class="preview-input-field preview-select">
                        <option value="">선택</option>
                        ${options.map(opt => `
                            <option value="${opt.id}">${escapeHtml(opt.label || '옵션')}</option>
                        `).join('')}
                    </select>
                `;

            case 'file-upload':
                // For file-upload type, show only settings/configuration, no file input in preview
                return '';

            case 'linear-scale':
                // Fixed 1-10 scale
                const scaleItems = [];
                for (let i = 1; i <= 10; i++) {
                    scaleItems.push(i);
                }
                return `
                    <div class="preview-scale">
                        <div class="scale-labels-row">
                            <span class="scale-label-text">${escapeHtml(scaleConfig.minLabel || '')}</span>
                            <span class="scale-label-text">${escapeHtml(scaleConfig.maxLabel || '')}</span>
                        </div>
                        <div class="scale-items">
                            ${scaleItems.map(num => `
                                <label class="scale-item">
                                    <span class="scale-number">${num}</span>
                                    <input type="radio" name="q_${question.id}" value="${num}" />
                                </label>
                            `).join('')}
                        </div>
                    </div>
                `;

            case 'date':
                return '<input type="date" class="preview-input-field preview-date" />';

            default:
                return '<input type="text" class="preview-input-field" placeholder="내 답변" />';
        }
    }

    /**
     * Escape HTML special characters
     * @param {string} text - Text to escape
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // ========================================================
    // STATE MANAGEMENT FUNCTIONS
    // ========================================================

    /**
     * Get current application state from localStorage
     * If no state exists, creates and returns default state
     * @returns {Object} Current application state
     */
    function getState() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                const defaultState = createDefaultState();
                localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
                return defaultState;
            }
            return JSON.parse(stored);
        } catch (error) {
            console.error('Failed to get state:', error);
            return createDefaultState();
        }
    }

    /**
     * Save/merge state updates to localStorage
     * @param {Object} updates - State updates to merge
     */
    function saveState(updates) {
        try {
            const currentState = getState();
            const newState = deepMerge(currentState, updates);
            newState.form.updatedAt = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

            // Mark as draft if form was modified after publishing
            if (updates.form && newState.form.publishedId) {
                setSyncStatus('draft', '수정됨');
            }
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }

    /**
     * Deep merge utility function
     * @param {Object} target - Target object
     * @param {Object} source - Source object to merge
     * @returns {Object} Merged object
     */
    function deepMerge(target, source) {
        const output = { ...target };
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    output[key] = deepMerge(target[key] || {}, source[key]);
                } else {
                    output[key] = source[key];
                }
            }
        }
        return output;
    }

    /**
     * Get form data from state
     * @returns {Object} Form data
     */
    function getForm() {
        const state = getState();
        return state.form || createDefaultForm();
    }

    /**
     * Save form data to state
     * @param {Object} form - Form data
     */
    function saveForm(form) {
        saveState({ form });
    }

    /**
     * Get questions array from form
     * @returns {Array} Questions array
     */
    function getQuestions() {
        const form = getForm();
        return form.questions || [];
    }

    /**
     * Save questions array to form
     * @param {Array} questions - Questions array
     */
    function saveQuestions(questions) {
        const form = getForm();
        form.questions = questions;
        saveForm(form);
    }

    /**
     * Get sections array from form
     * @returns {Array} Sections array
     */
    function getSections() {
        const form = getForm();
        return form.sections || [];
    }

    /**
     * Save sections array to form
     * @param {Array} sections - Sections array
     */
    function saveSections(sections) {
        const form = getForm();
        form.sections = sections;
        saveForm(form);
    }

    /**
     * Get form title
     * @returns {string} Form title
     */
    function getFormTitle() {
        return getForm().title || '새 설문지';
    }

    /**
     * Save form title
     * @param {string} title - Form title
     */
    function saveFormTitle(title) {
        const form = getForm();
        form.title = title;
        saveForm(form);
    }

    /**
     * Get UI state
     * @returns {Object} UI state
     */
    function getUIState() {
        const state = getState();
        return state.ui || createDefaultUIState();
    }

    /**
     * Save UI state updates
     * @param {Object} updates - UI state updates
     */
    function saveUIState(updates) {
        saveState({ ui: updates });
    }

    /**
     * Restore application state from localStorage on page load
     */
    function restoreState() {
        try {
            const state = getState();

            // Restore current tab
            if (state.ui && state.ui.activeTab) {
                switchTab(state.ui.activeTab);
            }

            // Restore form title
            if (state.form && state.form.title && formTitleElement) {
                formTitleElement.textContent = state.form.title;
            }

            // Restore preview mode
            if (state.ui && state.ui.isPreviewMode) {
                togglePreview();
            }

            // Restore settings toggles
            restoreSettings();
        } catch (error) {
            console.error('Failed to restore state:', error);
        }
    }

    /**
     * Reset state to defaults (for debugging/testing)
     */
    function resetState() {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }

    /**
     * Export form data as JSON string
     * @returns {string} JSON string of form data
     */
    function exportFormData() {
        return JSON.stringify(getForm(), null, 2);
    }

    /**
     * Import form data from JSON string
     * @param {string} jsonString - JSON string of form data
     * @returns {boolean} Success status
     */
    function importFormData(jsonString) {
        try {
            const form = JSON.parse(jsonString);
            if (form && form.id && Array.isArray(form.questions)) {
                saveForm(form);
                renderQuestions();
                if (formTitleElement) {
                    formTitleElement.textContent = form.title;
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to import form data:', error);
            return false;
        }
    }

    // ========================================================
    // PUBLIC API
    // Expose public API for external access and debugging
    // ========================================================
    window.FormApp = {
        // Tab Navigation
        switchTab,

        // State Management
        getState,
        saveState,
        resetState,

        // Form Operations
        getForm,
        saveForm,
        getFormTitle,
        saveFormTitle,
        exportFormData,
        importFormData,

        // Question Operations
        getQuestions,
        saveQuestions,
        addQuestion,
        deleteQuestion,
        duplicateQuestion,
        updateQuestion,
        renderQuestions,

        // Option Operations
        addOptionToQuestion,
        deleteOptionFromQuestion,

        // UI State
        getUIState,
        saveUIState,

        // Settings Operations
        updateFormSetting,
        restoreSettings,

        // Response Operations
        collectResponses,
        validateResponses,
        submitResponses,
        displayValidationErrors,
        clearValidationErrors,

        // Publish Operations
        handlePublish,
        setSyncStatus,
        updateSyncStatus,

        // Form Management Operations
        loadFormList,
        createNewForm,
        loadFormById,
        loadPublishedForm,
        getFormStatus,
        isFormReadOnly,
        createDraftCopyForEdit,
        openFormListModal,
        closeFormListModal,

        // Draft Forms Storage
        getDraftForms,
        saveToDraftForms,
        deleteDraftForm,

        // Schema Factories (for creating new items)
        createDefaultForm,
        createDefaultQuestion,
        createDefaultOption,

        // Constants
        QUESTION_TYPES,
        OPTION_BASED_TYPES,
        FORM_STATUS
    };

    // Initialize when DOM is ready
    console.log('[FormApp] Script loaded, readyState:', document.readyState);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
