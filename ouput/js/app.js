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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        questions: [],
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

        // Add linear scale config
        if (type === 'linear-scale') {
            question.scaleConfig = {
                min: 1,
                max: 5,
                minLabel: '',
                maxLabel: ''
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
        setupTabNavigation();
        setupTitleEditing();
        setupBuilder();
        setupSettings();
        restoreState();
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
            updateResponseCount();
        }

        // Save current tab to UI state
        saveUIState({ activeTab: tabName });
    }

    /**
     * Update the response count display
     */
    function updateResponseCount() {
        const form = getForm();
        const responses = form.responses || [];
        const countElement = document.querySelector('.response-count');
        if (countElement) {
            countElement.textContent = responses.length;
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
    function enableTitleEditing() {
        const currentTitle = getFormTitle();

        // Create input element
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-title-input';
        input.value = currentTitle;

        // Replace span with input
        formTitleElement.style.display = 'none';
        formTitleElement.parentNode.insertBefore(input, formTitleElement.nextSibling);

        input.focus();
        input.select();

        // Handle blur and enter key
        const finishEditing = () => {
            const newTitle = input.value.trim() || '새 설문지';
            saveFormTitle(newTitle);
            formTitleElement.textContent = newTitle;
            formTitleElement.style.display = '';
            input.remove();
        };

        input.addEventListener('blur', finishEditing);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEditing();
            }
            if (e.key === 'Escape') {
                formTitleElement.style.display = '';
                input.remove();
            }
        });
    }

    /**
     * Setup Builder UI
     */
    function setupBuilder() {
        if (addQuestionBtn) {
            addQuestionBtn.addEventListener('click', addQuestion);
        }

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
     * Delete a question
     * @param {string} questionId - ID of the question to delete
     */
    function deleteQuestion(questionId) {
        const questions = getQuestions().filter(q => q.id !== questionId);
        // Reorder remaining questions
        questions.forEach((q, idx) => {
            q.order = idx;
        });
        saveQuestions(questions);
        renderQuestions();
    }

    /**
     * Duplicate a question
     * @param {string} questionId - ID of the question to duplicate
     */
    function duplicateQuestion(questionId) {
        const questions = getQuestions();
        const questionToDuplicate = questions.find(q => q.id === questionId);

        if (questionToDuplicate) {
            // Deep clone the question
            const duplicatedQuestion = JSON.parse(JSON.stringify(questionToDuplicate));

            // Generate new IDs
            duplicatedQuestion.id = generateUUID();
            duplicatedQuestion.order = questions.length;

            // Generate new IDs for options if they exist
            if (duplicatedQuestion.options && duplicatedQuestion.options.length > 0) {
                duplicatedQuestion.options = duplicatedQuestion.options.map((opt, idx) => ({
                    ...opt,
                    id: generateUUID(),
                    order: idx
                }));
            }

            questions.push(duplicatedQuestion);
            saveQuestions(questions);
            renderQuestions();
        }
    }

    /**
     * Update a question
     * @param {string} questionId - ID of the question to update
     * @param {Object} updates - Object with fields to update
     */
    function updateQuestion(questionId, updates) {
        const questions = getQuestions();
        const question = questions.find(q => q.id === questionId);

        if (question) {
            Object.assign(question, updates);
            saveQuestions(questions);
            // Only re-render if type changed (to show/hide options UI)
            // For other fields, the input value is already updated
            if (updates.type) {
                renderQuestions();
            }
        }
    }

    /**
     * Render all questions
     */
    function renderQuestions() {
        const questions = getQuestions();

        if (questions.length === 0) {
            questionsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">+</div><h2>질문이 없습니다</h2><p>+ 버튼을 클릭하여 질문을 추가하세요.</p></div>';
            return;
        }

        questionsList.innerHTML = questions.map((question, index) => `
            <div class="question-card" data-question-id="${question.id}">
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
                        <button class="icon-button duplicate-btn" title="복제" data-question-id="${question.id}">
                            =
                        </button>
                        <button class="icon-button delete delete-btn" title="삭제" data-question-id="${question.id}">
                            X
                        </button>
                    </div>
                </div>

                ${renderQuestionOptions(question)}

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

        // Attach event listeners
        attachQuestionEventListeners();
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

        // Linear scale configuration
        if (type === 'linear-scale') {
            const config = question.scaleConfig || { min: 1, max: 5, minLabel: '', maxLabel: '' };
            return `
                <div class="scale-config" data-question-id="${question.id}">
                    <div class="scale-range">
                        <select class="scale-select" data-field="scaleMin" data-question-id="${question.id}">
                            ${[1, 0].map(v => `<option value="${v}" ${config.min === v ? 'selected' : ''}>${v}</option>`).join('')}
                        </select>
                        <span>~</span>
                        <select class="scale-select" data-field="scaleMax" data-question-id="${question.id}">
                            ${[2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => `<option value="${v}" ${config.max === v ? 'selected' : ''}>${v}</option>`).join('')}
                        </select>
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
            return '<div class="answer-preview"><span class="answer-placeholder">파일 업로드 버튼</span></div>';
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

        const questions = getQuestions();
        const question = questions.find(q => q.id === questionId);

        if (question && question.options) {
            const option = question.options.find(o => o.id === optionId);
            if (option) {
                option.label = value;
                saveQuestions(questions);
            }
        }
    }

    /**
     * Add a new option to a question
     * @param {string} questionId - Question ID
     */
    function addOptionToQuestion(questionId) {
        const questions = getQuestions();
        const question = questions.find(q => q.id === questionId);

        if (question) {
            if (!question.options) {
                question.options = [];
            }
            const newOption = createDefaultOption(question.options.length);
            question.options.push(newOption);
            saveQuestions(questions);
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
        const questions = getQuestions();
        const question = questions.find(q => q.id === questionId);

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
            saveQuestions(questions);
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
        const questions = getQuestions();
        const question = questions.find(q => q.id === questionId);

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

            saveQuestions(questions);
        }
    }

    /**
     * Handle question type change
     * @param {string} questionId - Question ID
     * @param {string} newType - New question type
     */
    function handleTypeChange(questionId, newType) {
        const questions = getQuestions();
        const question = questions.find(q => q.id === questionId);

        if (question) {
            const oldType = question.type;
            question.type = newType;

            // If changing to an option-based type, ensure options exist
            if (OPTION_BASED_TYPES.includes(newType) && (!question.options || question.options.length === 0)) {
                question.options = [createDefaultOption(0)];
            }

            // If changing to linear scale, ensure scaleConfig exists
            if (newType === 'linear-scale' && !question.scaleConfig) {
                question.scaleConfig = { min: 1, max: 5, minLabel: '', maxLabel: '' };
            }

            saveQuestions(questions);
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

    /**
     * Render Preview
     */
    function renderPreview() {
        const form = getForm();
        const questions = form.questions || [];

        if (questions.length === 0) {
            previewContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">+</div><h2>질문이 없습니다</h2><p>질문을 추가한 후 미리보기를 확인하세요.</p></div>';
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
                <div class="preview-question-card">
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
                return `
                    <div class="preview-file-upload">
                        <button class="btn btn-secondary" type="button">파일 추가</button>
                        <span class="file-upload-hint">최대 10MB</span>
                    </div>
                `;

            case 'linear-scale':
                const min = scaleConfig.min || 1;
                const max = scaleConfig.max || 5;
                const scaleItems = [];
                for (let i = min; i <= max; i++) {
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
        updateResponseCount,

        // Schema Factories (for creating new items)
        createDefaultForm,
        createDefaultQuestion,
        createDefaultOption,

        // Constants
        QUESTION_TYPES,
        OPTION_BASED_TYPES
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
