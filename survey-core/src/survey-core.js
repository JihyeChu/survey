/**
 * SurveyCore - Independent Survey Module
 * Google Form Clone - Survey Core Library
 *
 * A standalone, framework-agnostic survey builder and responder module.
 * Designed for embedding in any web application without external dependencies.
 *
 * CORE PRINCIPLES:
 * - No direct fetch() calls - all API communication via callbacks
 * - No direct localStorage access - persistence handled externally
 * - Pure rendering logic - host application controls data flow
 * - Self-contained CSS with 'survey-' prefix
 *
 * @version 1.0.0
 * @license MIT
 */

(function(global) {
    'use strict';

    // ========================================================
    // QUESTION TYPES CONFIGURATION
    // ========================================================
    const QUESTION_TYPES = {
        'short-text': { label: '단답형', icon: 'text' },
        'long-text': { label: '장문형', icon: 'textarea' },
        'multiple-choice': { label: '객관식', icon: 'radio' },
        'checkbox': { label: '체크박스', icon: 'checkbox' },
        'dropdown': { label: '드롭다운', icon: 'dropdown' },
        'file-upload': { label: '파일 업로드', icon: 'file' },
        'linear-scale': { label: '선형 배율', icon: 'scale' },
        'date': { label: '날짜', icon: 'calendar' }
    };

    // Types that require options
    const OPTION_BASED_TYPES = ['multiple-choice', 'checkbox', 'dropdown'];

    // ========================================================
    // UTILITY FUNCTIONS
    // ========================================================

    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} text - Raw text to escape
     * @returns {string} Escaped HTML string
     */
    function escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const str = String(text);
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return str.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * Generate a unique identifier
     * @returns {string} UUID-like unique string
     */
    function generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Deep clone an object
     * @param {Object} obj - Object to clone
     * @returns {Object} Cloned object
     */
    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
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
     * Format file size for display
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Check if file is an image by extension
     * @param {string} filename - File name
     * @returns {boolean} True if image file
     */
    function isImageFile(filename) {
        if (!filename) return false;
        const ext = filename.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
    }

    // ========================================================
    // VALIDATION LOGIC
    // ========================================================

    /**
     * Validation rules and error messages
     */
    const VALIDATION_RULES = {
        required: {
            message: '이 질문은 필수입니다.',
            validate: (value, question) => {
                if (!question.required) return true;
                if (Array.isArray(value)) return value.length > 0;
                if (typeof value === 'string') return value.trim() !== '';
                if (typeof value === 'object' && value !== null) {
                    // File upload check
                    if (value.files) return value.files.length > 0;
                }
                return value !== null && value !== undefined;
            }
        },
        email: {
            message: '유효한 이메일 주소를 입력하세요.',
            validate: (value) => {
                if (!value || value.trim() === '') return true; // Empty is handled by required
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            }
        },
        minLength: {
            message: (min) => `최소 ${min}자 이상 입력하세요.`,
            validate: (value, question, min) => {
                if (!value || typeof value !== 'string') return true;
                return value.length >= min;
            }
        },
        maxLength: {
            message: (max) => `최대 ${max}자까지 입력 가능합니다.`,
            validate: (value, question, max) => {
                if (!value || typeof value !== 'string') return true;
                return value.length <= max;
            }
        },
        minSelection: {
            message: (min) => `최소 ${min}개를 선택하세요.`,
            validate: (value, question, min) => {
                if (!Array.isArray(value)) return true;
                return value.length >= min;
            }
        },
        maxSelection: {
            message: (max) => `최대 ${max}개까지 선택 가능합니다.`,
            validate: (value, question, max) => {
                if (!Array.isArray(value)) return true;
                return value.length <= max;
            }
        },
        fileSize: {
            message: (maxMB) => `파일 크기가 너무 큽니다 (최대: ${maxMB}MB)`,
            validate: (value, question, maxBytes) => {
                if (!value || !value.files) return true;
                return value.files.every(file => file.size <= maxBytes);
            }
        },
        fileType: {
            message: (types) => `허용되지 않는 파일 형식입니다. (허용: ${types.join(', ')})`,
            validate: (value, question, allowedTypes) => {
                if (!value || !value.files || allowedTypes.length === 0) return true;
                return value.files.every(file => {
                    const ext = '.' + file.name.split('.').pop().toLowerCase();
                    return allowedTypes.some(type =>
                        type.toLowerCase() === ext ||
                        type.toLowerCase() === ext.substring(1)
                    );
                });
            }
        }
    };

    /**
     * Validate a single response value against a question
     * @param {Object} question - Question definition
     * @param {*} value - Response value
     * @returns {Object} Validation result { valid: boolean, errors: string[] }
     */
    function validateQuestionResponse(question, value) {
        const errors = [];

        // Required validation
        if (!VALIDATION_RULES.required.validate(value, question)) {
            errors.push(VALIDATION_RULES.required.message);
        }

        // Type-specific validations
        if (question.type === 'short-text' || question.type === 'long-text') {
            // Text length validations from config
            const config = question.config || {};
            if (config.minLength && !VALIDATION_RULES.minLength.validate(value, question, config.minLength)) {
                errors.push(VALIDATION_RULES.minLength.message(config.minLength));
            }
            if (config.maxLength && !VALIDATION_RULES.maxLength.validate(value, question, config.maxLength)) {
                errors.push(VALIDATION_RULES.maxLength.message(config.maxLength));
            }
        }

        if (question.type === 'checkbox') {
            // Selection count validations
            const config = question.config || {};
            if (config.minSelection && !VALIDATION_RULES.minSelection.validate(value, question, config.minSelection)) {
                errors.push(VALIDATION_RULES.minSelection.message(config.minSelection));
            }
            if (config.maxSelection && !VALIDATION_RULES.maxSelection.validate(value, question, config.maxSelection)) {
                errors.push(VALIDATION_RULES.maxSelection.message(config.maxSelection));
            }
        }

        if (question.type === 'file-upload') {
            // File validations
            const config = question.config || {};
            const maxSize = config.maxFileSize || 10 * 1024 * 1024; // 10MB default
            if (!VALIDATION_RULES.fileSize.validate(value, question, maxSize)) {
                errors.push(VALIDATION_RULES.fileSize.message(Math.round(maxSize / (1024 * 1024))));
            }
            if (config.allowedExtensions && config.allowedExtensions.length > 0) {
                if (!VALIDATION_RULES.fileType.validate(value, question, config.allowedExtensions)) {
                    errors.push(VALIDATION_RULES.fileType.message(config.allowedExtensions));
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Validate entire form response
     * @param {Object} form - Form definition with questions
     * @param {Object} response - Response object with answers
     * @returns {Object} Validation result
     */
    function validateResponse(form, response) {
        const results = {
            valid: true,
            errors: {},
            questionErrors: {}
        };

        // Validate email if collected
        if (form.settings && form.settings.collectEmail) {
            const email = response.respondentEmail || '';
            if (!email.trim()) {
                results.valid = false;
                results.errors.email = ['이메일은 필수입니다.'];
            } else if (!VALIDATION_RULES.email.validate(email)) {
                results.valid = false;
                results.errors.email = [VALIDATION_RULES.email.message];
            }
        }

        // Validate each question
        const questions = form.questions || [];
        const answers = response.answers || {};

        questions.forEach(question => {
            const value = answers[question.id];
            const questionResult = validateQuestionResponse(question, value);

            if (!questionResult.valid) {
                results.valid = false;
                results.questionErrors[question.id] = questionResult.errors;
            }
        });

        return results;
    }

    // ========================================================
    // EMPTY RESPONSE FACTORY
    // ========================================================

    /**
     * Create an empty response object for a form
     * @param {Object} form - Form definition
     * @returns {Object} Empty response object
     */
    function createEmptyResponse(form) {
        const response = {
            formId: form.id,
            respondentEmail: '',
            answers: {},
            submittedAt: null,
            metadata: {}
        };

        // Initialize answers for each question
        const questions = form.questions || [];
        questions.forEach(question => {
            switch (question.type) {
                case 'checkbox':
                    response.answers[question.id] = [];
                    break;
                case 'file-upload':
                    response.answers[question.id] = { files: [], uploadedMetadata: [] };
                    break;
                default:
                    response.answers[question.id] = '';
            }
        });

        return response;
    }

    // ========================================================
    // DEFAULT SCHEMAS
    // ========================================================

    /**
     * Create a default empty form
     * @returns {Object} Default form structure
     */
    function createDefaultForm() {
        return {
            id: generateId(),
            title: '새 설문지',
            description: '',
            questions: [],
            settings: {
                collectEmail: false,
                allowResponseEdit: false,
                showProgressBar: true
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    /**
     * Create a default question
     * @param {string} type - Question type
     * @param {number} order - Display order
     * @returns {Object} Default question structure
     */
    function createDefaultQuestion(type = 'short-text', order = 0) {
        const question = {
            id: generateId(),
            type: type,
            title: '',
            description: '',
            required: false,
            orderIndex: order,
            config: {}
        };

        // Add default options for choice-based questions
        if (OPTION_BASED_TYPES.includes(type)) {
            question.config.options = [createDefaultOption(0)];
        }

        // Add linear scale config
        if (type === 'linear-scale') {
            question.config = {
                min: 1,
                max: 5,
                minLabel: '',
                maxLabel: ''
            };
        }

        // Add file upload config
        if (type === 'file-upload') {
            question.config = {
                allowedExtensions: [],
                maxFileSize: 10 * 1024 * 1024, // 10MB
                allowMultiple: false
            };
        }

        return question;
    }

    /**
     * Create a default option for choice-based questions
     * @param {number} order - Display order
     * @returns {Object} Default option structure
     */
    function createDefaultOption(order = 0) {
        return {
            id: generateId(),
            label: `옵션 ${order + 1}`,
            order: order
        };
    }

    // ========================================================
    // BUILDER MODULE
    // ========================================================

    /**
     * Initialize the Survey Builder
     * @param {string} rootSelector - CSS selector for root element
     * @param {Object} options - Configuration options
     * @returns {Object} Builder instance
     */
    function initBuilder(rootSelector, options = {}) {
        const rootElement = document.querySelector(rootSelector);
        if (!rootElement) {
            console.error('[SurveyCore] Root element not found:', rootSelector);
            return null;
        }

        // Default options
        const config = {
            form: options.form || createDefaultForm(),
            onChange: options.onChange || function() {},
            onQuestionAdd: options.onQuestionAdd || function() {},
            onQuestionRemove: options.onQuestionRemove || function() {},
            onQuestionUpdate: options.onQuestionUpdate || function() {},
            onSave: options.onSave || function() {},
            readOnly: options.readOnly || false,
            autoSave: options.autoSave !== false,
            autoSaveDebounce: options.autoSaveDebounce || 500,
            ...options
        };

        // Internal state
        let form = deepClone(config.form);
        let activeQuestionId = null;
        let isDestroyed = false;

        // Debounced save callback
        const debouncedSave = debounce(() => {
            if (config.autoSave && !isDestroyed) {
                config.onSave(deepClone(form));
            }
        }, config.autoSaveDebounce);

        // Notify change
        function notifyChange() {
            form.updatedAt = new Date().toISOString();
            config.onChange(deepClone(form));
            debouncedSave();
        }

        // ========================================================
        // BUILDER: RENDERING
        // ========================================================

        /**
         * Render the complete builder UI
         */
        function render() {
            if (isDestroyed) return;

            rootElement.innerHTML = '';
            rootElement.className = 'survey-builder';

            // Form title card
            const titleCard = renderTitleCard();
            rootElement.appendChild(titleCard);

            // Questions container
            const questionsContainer = document.createElement('div');
            questionsContainer.className = 'survey-questions-container';
            questionsContainer.id = 'survey-questions-list';

            // Render each question
            const questions = form.questions || [];
            questions.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

            if (questions.length === 0) {
                questionsContainer.appendChild(renderEmptyState());
            } else {
                questions.forEach((question, index) => {
                    const card = renderQuestionCard(question, index);
                    questionsContainer.appendChild(card);
                });
            }

            rootElement.appendChild(questionsContainer);

            // Add question button
            if (!config.readOnly) {
                const addButton = renderAddButton();
                rootElement.appendChild(addButton);
            }

            // Setup drag and drop
            if (!config.readOnly) {
                setupDragAndDrop(questionsContainer);
            }
        }

        /**
         * Render the form title card
         */
        function renderTitleCard() {
            const card = document.createElement('div');
            card.className = 'survey-title-card';

            card.innerHTML = `
                <input type="text"
                       class="survey-title-input"
                       placeholder="설문지 제목"
                       value="${escapeHtml(form.title)}"
                       ${config.readOnly ? 'readonly' : ''}>
                <textarea class="survey-description-input"
                          placeholder="설문지 설명 (선택사항)"
                          ${config.readOnly ? 'readonly' : ''}>${escapeHtml(form.description)}</textarea>
            `;

            // Event listeners
            const titleInput = card.querySelector('.survey-title-input');
            const descInput = card.querySelector('.survey-description-input');

            titleInput.addEventListener('input', (e) => {
                form.title = e.target.value;
                notifyChange();
            });

            descInput.addEventListener('input', (e) => {
                form.description = e.target.value;
                notifyChange();
            });

            return card;
        }

        /**
         * Render empty state
         */
        function renderEmptyState() {
            const empty = document.createElement('div');
            empty.className = 'survey-empty-state';
            empty.innerHTML = `
                <div class="survey-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                </div>
                <h3>질문을 추가하세요</h3>
                <p>아래 버튼을 클릭하여 첫 번째 질문을 추가하세요.</p>
            `;
            return empty;
        }

        /**
         * Render add question button
         */
        function renderAddButton() {
            const container = document.createElement('div');
            container.className = 'survey-add-question-container';

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'survey-btn-add-question';
            button.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span>질문 추가</span>
            `;

            button.addEventListener('click', () => {
                addQuestion('short-text');
            });

            container.appendChild(button);
            return container;
        }

        /**
         * Render a question card
         */
        function renderQuestionCard(question, index) {
            const card = document.createElement('div');
            card.className = 'survey-question-card';
            card.setAttribute('data-question-id', question.id);
            card.setAttribute('draggable', config.readOnly ? 'false' : 'true');

            if (activeQuestionId === question.id) {
                card.classList.add('active');
            }

            // Header
            const header = document.createElement('div');
            header.className = 'survey-question-header';

            header.innerHTML = `
                <span class="survey-question-number">${index + 1}.</span>
                <div class="survey-question-content">
                    <input type="text"
                           class="survey-question-input"
                           placeholder="질문 입력"
                           value="${escapeHtml(question.title)}"
                           data-field="title"
                           ${config.readOnly ? 'readonly' : ''}>
                    <input type="text"
                           class="survey-description-field"
                           placeholder="설명 (선택사항)"
                           value="${escapeHtml(question.description)}"
                           data-field="description"
                           ${config.readOnly ? 'readonly' : ''}>
                </div>
            `;

            card.appendChild(header);

            // Question type specific content
            const content = document.createElement('div');
            content.className = 'survey-question-body';
            content.appendChild(renderQuestionTypeContent(question));
            card.appendChild(content);

            // Footer with options
            if (!config.readOnly) {
                const footer = renderQuestionFooter(question);
                card.appendChild(footer);
            }

            // Event listeners
            setupQuestionCardEvents(card, question);

            return card;
        }

        /**
         * Render question type specific content
         */
        function renderQuestionTypeContent(question) {
            const container = document.createElement('div');
            container.className = 'survey-question-type-content';

            switch (question.type) {
                case 'short-text':
                    container.innerHTML = `
                        <div class="survey-answer-preview">
                            <span class="survey-answer-placeholder">단답형 텍스트</span>
                        </div>
                    `;
                    break;

                case 'long-text':
                    container.innerHTML = `
                        <div class="survey-answer-preview">
                            <span class="survey-answer-placeholder">장문형 텍스트</span>
                        </div>
                    `;
                    break;

                case 'multiple-choice':
                case 'checkbox':
                case 'dropdown':
                    container.appendChild(renderOptionsEditor(question));
                    break;

                case 'linear-scale':
                    container.appendChild(renderScaleEditor(question));
                    break;

                case 'file-upload':
                    container.innerHTML = `
                        <div class="survey-file-upload-preview">
                            <button type="button" class="survey-file-btn" disabled>파일 선택</button>
                        </div>
                    `;
                    break;

                case 'date':
                    container.innerHTML = `
                        <div class="survey-answer-preview">
                            <input type="date" class="survey-date-preview" disabled>
                        </div>
                    `;
                    break;
            }

            return container;
        }

        /**
         * Render options editor for choice-based questions
         */
        function renderOptionsEditor(question) {
            const container = document.createElement('div');
            container.className = 'survey-options-list';

            const options = getQuestionOptions(question);
            const indicatorType = question.type === 'checkbox' ? 'checkbox' :
                                  question.type === 'dropdown' ? 'dropdown' : 'radio';

            options.forEach((option, idx) => {
                const item = document.createElement('div');
                item.className = 'survey-option-item';
                item.setAttribute('data-option-id', option.id);

                item.innerHTML = `
                    <span class="survey-option-indicator ${indicatorType}">
                        ${indicatorType === 'checkbox' ? '&#9744;' :
                          indicatorType === 'dropdown' ? `${idx + 1}.` : '&#9675;'}
                    </span>
                    <input type="text"
                           class="survey-option-input"
                           placeholder="옵션 ${idx + 1}"
                           value="${escapeHtml(option.label)}"
                           ${config.readOnly ? 'readonly' : ''}>
                    ${!config.readOnly ? `
                        <button type="button" class="survey-btn-delete-option" title="옵션 삭제">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    ` : ''}
                `;

                // Option input change
                const input = item.querySelector('.survey-option-input');
                input.addEventListener('input', (e) => {
                    updateOptionLabel(question.id, option.id, e.target.value);
                });

                // Delete option
                const deleteBtn = item.querySelector('.survey-btn-delete-option');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => {
                        removeOption(question.id, option.id);
                    });
                }

                container.appendChild(item);
            });

            // Add option button
            if (!config.readOnly) {
                const addRow = document.createElement('div');
                addRow.className = 'survey-add-option-row';
                addRow.innerHTML = `
                    <button type="button" class="survey-btn-add-option">+ 옵션 추가</button>
                `;

                addRow.querySelector('.survey-btn-add-option').addEventListener('click', () => {
                    addOption(question.id);
                });

                container.appendChild(addRow);
            }

            return container;
        }

        /**
         * Render linear scale editor
         */
        function renderScaleEditor(question) {
            const container = document.createElement('div');
            container.className = 'survey-scale-config';

            const config = question.config || { min: 1, max: 5, minLabel: '', maxLabel: '' };

            container.innerHTML = `
                <div class="survey-scale-range">
                    <select class="survey-scale-select" data-field="min" ${config.readOnly ? 'disabled' : ''}>
                        ${[0, 1].map(v => `<option value="${v}" ${config.min === v ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                    <span>부터</span>
                    <select class="survey-scale-select" data-field="max" ${config.readOnly ? 'disabled' : ''}>
                        ${[2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => `<option value="${v}" ${config.max === v ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                    <span>까지</span>
                </div>
                <div class="survey-scale-labels">
                    <input type="text"
                           class="survey-scale-label-input"
                           placeholder="최소값 라벨 (선택)"
                           value="${escapeHtml(config.minLabel)}"
                           data-field="minLabel"
                           ${config.readOnly ? 'readonly' : ''}>
                    <input type="text"
                           class="survey-scale-label-input"
                           placeholder="최대값 라벨 (선택)"
                           value="${escapeHtml(config.maxLabel)}"
                           data-field="maxLabel"
                           ${config.readOnly ? 'readonly' : ''}>
                </div>
                <div class="survey-scale-preview">
                    ${renderScalePreview(config.min, config.max)}
                </div>
            `;

            // Event listeners for scale config
            container.querySelectorAll('.survey-scale-select, .survey-scale-label-input').forEach(el => {
                el.addEventListener('change', (e) => {
                    const field = e.target.dataset.field;
                    let value = e.target.value;
                    if (field === 'min' || field === 'max') {
                        value = parseInt(value, 10);
                    }
                    updateQuestionConfig(question.id, field, value);
                });
            });

            return container;
        }

        /**
         * Render scale preview
         */
        function renderScalePreview(min, max) {
            let html = '';
            for (let i = min; i <= max; i++) {
                html += `<span class="survey-scale-item">${i}</span>`;
            }
            return html;
        }

        /**
         * Render question footer with actions
         */
        function renderQuestionFooter(question) {
            const footer = document.createElement('div');
            footer.className = 'survey-question-footer';

            footer.innerHTML = `
                <div class="survey-question-options">
                    <select class="survey-type-dropdown">
                        ${Object.entries(QUESTION_TYPES).map(([type, info]) =>
                            `<option value="${type}" ${question.type === type ? 'selected' : ''}>${info.label}</option>`
                        ).join('')}
                    </select>
                    <label class="survey-toggle-required">
                        <input type="checkbox" class="survey-required-checkbox" ${question.required ? 'checked' : ''}>
                        <span>필수</span>
                    </label>
                </div>
                <div class="survey-question-actions">
                    <button type="button" class="survey-icon-btn duplicate" title="복제">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    </button>
                    <button type="button" class="survey-icon-btn delete" title="삭제">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            `;

            // Type change
            footer.querySelector('.survey-type-dropdown').addEventListener('change', (e) => {
                changeQuestionType(question.id, e.target.value);
            });

            // Required toggle
            footer.querySelector('.survey-required-checkbox').addEventListener('change', (e) => {
                updateQuestion(question.id, { required: e.target.checked });
            });

            // Duplicate
            footer.querySelector('.survey-icon-btn.duplicate').addEventListener('click', () => {
                duplicateQuestion(question.id);
            });

            // Delete
            footer.querySelector('.survey-icon-btn.delete').addEventListener('click', () => {
                removeQuestion(question.id);
            });

            return footer;
        }

        /**
         * Setup events for question card
         */
        function setupQuestionCardEvents(card, question) {
            // Title and description input
            card.querySelectorAll('.survey-question-input, .survey-description-field').forEach(input => {
                input.addEventListener('input', (e) => {
                    const field = e.target.dataset.field;
                    updateQuestion(question.id, { [field]: e.target.value });
                });
            });

            // Card click to activate
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.survey-question-actions')) {
                    setActiveQuestion(question.id);
                }
            });
        }

        /**
         * Setup drag and drop for question reordering
         */
        function setupDragAndDrop(container) {
            let draggedItem = null;

            container.addEventListener('dragstart', (e) => {
                const card = e.target.closest('.survey-question-card');
                if (card) {
                    draggedItem = card;
                    card.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                }
            });

            container.addEventListener('dragend', (e) => {
                const card = e.target.closest('.survey-question-card');
                if (card) {
                    card.classList.remove('dragging');
                    draggedItem = null;
                }
            });

            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';

                const card = e.target.closest('.survey-question-card');
                if (card && card !== draggedItem) {
                    const rect = card.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;

                    // Remove all drag-over classes
                    container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
                    card.classList.add('drag-over');
                }
            });

            container.addEventListener('drop', (e) => {
                e.preventDefault();
                const targetCard = e.target.closest('.survey-question-card');

                if (targetCard && draggedItem && targetCard !== draggedItem) {
                    const draggedId = draggedItem.dataset.questionId;
                    const targetId = targetCard.dataset.questionId;
                    reorderQuestions(draggedId, targetId);
                }

                container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            });
        }

        // ========================================================
        // BUILDER: DATA OPERATIONS
        // ========================================================

        /**
         * Get options from question config
         */
        function getQuestionOptions(question) {
            if (question.options && question.options.length > 0) {
                return question.options;
            }
            if (question.config && question.config.options) {
                return question.config.options;
            }
            return [];
        }

        /**
         * Add a new question
         */
        function addQuestion(type = 'short-text') {
            const order = (form.questions || []).length;
            const question = createDefaultQuestion(type, order);

            form.questions = form.questions || [];
            form.questions.push(question);

            notifyChange();
            config.onQuestionAdd(question, order);
            render();
            setActiveQuestion(question.id);
        }

        /**
         * Remove a question
         */
        function removeQuestion(questionId) {
            const index = form.questions.findIndex(q => q.id === questionId);
            if (index === -1) return;

            const removed = form.questions.splice(index, 1)[0];

            // Re-order remaining questions
            form.questions.forEach((q, i) => {
                q.orderIndex = i;
            });

            notifyChange();
            config.onQuestionRemove(removed, index);
            render();
        }

        /**
         * Update a question
         */
        function updateQuestion(questionId, updates) {
            const question = form.questions.find(q => q.id === questionId);
            if (!question) return;

            Object.assign(question, updates);
            notifyChange();
            config.onQuestionUpdate(question);
        }

        /**
         * Change question type
         */
        function changeQuestionType(questionId, newType) {
            const question = form.questions.find(q => q.id === questionId);
            if (!question) return;

            const oldType = question.type;
            question.type = newType;

            // Add options if changing to option-based type
            if (OPTION_BASED_TYPES.includes(newType) && !OPTION_BASED_TYPES.includes(oldType)) {
                question.config = question.config || {};
                question.config.options = [createDefaultOption(0)];
            }

            // Add scale config if changing to linear scale
            if (newType === 'linear-scale') {
                question.config = { min: 1, max: 5, minLabel: '', maxLabel: '' };
            }

            notifyChange();
            render();
        }

        /**
         * Duplicate a question
         */
        function duplicateQuestion(questionId) {
            const original = form.questions.find(q => q.id === questionId);
            if (!original) return;

            const duplicate = deepClone(original);
            duplicate.id = generateId();
            duplicate.title = original.title + ' (복사본)';
            duplicate.orderIndex = form.questions.length;

            // Generate new IDs for options
            if (duplicate.config && duplicate.config.options) {
                duplicate.config.options = duplicate.config.options.map(opt => ({
                    ...opt,
                    id: generateId()
                }));
            }

            form.questions.push(duplicate);
            notifyChange();
            render();
            setActiveQuestion(duplicate.id);
        }

        /**
         * Reorder questions
         */
        function reorderQuestions(draggedId, targetId) {
            const draggedIndex = form.questions.findIndex(q => q.id === draggedId);
            const targetIndex = form.questions.findIndex(q => q.id === targetId);

            if (draggedIndex === -1 || targetIndex === -1) return;

            const [removed] = form.questions.splice(draggedIndex, 1);
            form.questions.splice(targetIndex, 0, removed);

            // Update order indices
            form.questions.forEach((q, i) => {
                q.orderIndex = i;
            });

            notifyChange();
            render();
        }

        /**
         * Add option to question
         */
        function addOption(questionId) {
            const question = form.questions.find(q => q.id === questionId);
            if (!question) return;

            question.config = question.config || {};
            question.config.options = question.config.options || [];

            const order = question.config.options.length;
            question.config.options.push(createDefaultOption(order));

            notifyChange();
            render();
        }

        /**
         * Remove option from question
         */
        function removeOption(questionId, optionId) {
            const question = form.questions.find(q => q.id === questionId);
            if (!question || !question.config || !question.config.options) return;

            // Keep at least one option
            if (question.config.options.length <= 1) return;

            question.config.options = question.config.options.filter(o => o.id !== optionId);

            notifyChange();
            render();
        }

        /**
         * Update option label
         */
        function updateOptionLabel(questionId, optionId, label) {
            const question = form.questions.find(q => q.id === questionId);
            if (!question || !question.config || !question.config.options) return;

            const option = question.config.options.find(o => o.id === optionId);
            if (option) {
                option.label = label;
                notifyChange();
            }
        }

        /**
         * Update question config field
         */
        function updateQuestionConfig(questionId, field, value) {
            const question = form.questions.find(q => q.id === questionId);
            if (!question) return;

            question.config = question.config || {};
            question.config[field] = value;

            notifyChange();
            render();
        }

        /**
         * Set active question
         */
        function setActiveQuestion(questionId) {
            activeQuestionId = questionId;

            document.querySelectorAll('.survey-question-card').forEach(card => {
                if (card.dataset.questionId === questionId) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });
        }

        // ========================================================
        // BUILDER: PUBLIC API
        // ========================================================

        // Initial render
        render();

        // Return public API
        return {
            getForm: () => deepClone(form),
            setForm: (newForm) => {
                form = deepClone(newForm);
                render();
            },
            addQuestion,
            removeQuestion,
            updateQuestion,
            duplicateQuestion,
            render,
            destroy: () => {
                isDestroyed = true;
                rootElement.innerHTML = '';
            }
        };
    }

    // ========================================================
    // RESPONDER MODULE
    // ========================================================

    /**
     * Initialize the Survey Responder
     * @param {string} rootSelector - CSS selector for root element
     * @param {Object} options - Configuration options
     * @returns {Object} Responder instance
     */
    function initResponder(rootSelector, options = {}) {
        const rootElement = document.querySelector(rootSelector);
        if (!rootElement) {
            console.error('[SurveyCore] Root element not found:', rootSelector);
            return null;
        }

        // Default options
        const config = {
            form: options.form || createDefaultForm(),
            onSubmit: options.onSubmit || function() {},
            onChange: options.onChange || function() {},
            onValidationError: options.onValidationError || function() {},
            onFileUpload: options.onFileUpload || function() { return Promise.resolve([]); },
            readOnly: options.readOnly || false,
            ...options
        };

        // Internal state
        let form = deepClone(config.form);
        let response = createEmptyResponse(form);
        let isDestroyed = false;
        let isSubmitting = false;

        // ========================================================
        // RESPONDER: RENDERING
        // ========================================================

        /**
         * Render the complete responder UI
         */
        function render() {
            if (isDestroyed) return;

            rootElement.innerHTML = '';
            rootElement.className = 'survey-responder';

            // Progress bar
            if (form.settings && form.settings.showProgressBar) {
                rootElement.appendChild(renderProgressBar());
            }

            // Form container
            const formContainer = document.createElement('div');
            formContainer.className = 'survey-respond-container';

            // Form header
            formContainer.appendChild(renderFormHeader());

            // Email field if collecting
            if (form.settings && form.settings.collectEmail) {
                formContainer.appendChild(renderEmailField());
            }

            // Questions
            const questionsContainer = document.createElement('div');
            questionsContainer.className = 'survey-respond-questions';

            const questions = form.questions || [];
            questions.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

            questions.forEach((question, index) => {
                questionsContainer.appendChild(renderRespondQuestion(question, index));
            });

            formContainer.appendChild(questionsContainer);

            // Submit button
            if (!config.readOnly) {
                formContainer.appendChild(renderSubmitButton());
            } else {
                // In readOnly mode, show a notice
                const notice = document.createElement('div');
                notice.className = 'survey-readonly-notice';
                notice.innerHTML = '<p>응답 보기 모드</p>';
                formContainer.appendChild(notice);
            }

            rootElement.appendChild(formContainer);
            updateProgress();
        }

        /**
         * Render progress bar
         */
        function renderProgressBar() {
            const container = document.createElement('div');
            container.className = 'survey-progress-bar';
            container.innerHTML = '<div class="survey-progress-fill" id="survey-progress-fill"></div>';
            return container;
        }

        /**
         * Render form header
         */
        function renderFormHeader() {
            const header = document.createElement('div');
            header.className = 'survey-respond-header';
            header.innerHTML = `
                <h1 class="survey-respond-title">${escapeHtml(form.title)}</h1>
                ${form.description ? `<p class="survey-respond-description">${escapeHtml(form.description)}</p>` : ''}
            `;
            return header;
        }

        /**
         * Render email field
         */
        function renderEmailField() {
            const container = document.createElement('div');
            container.className = 'survey-email-container';
            container.id = 'survey-email-container';
            container.innerHTML = `
                <div class="survey-email-field">
                    <label class="survey-email-label">
                        이메일 <span class="survey-required-asterisk">*</span>
                    </label>
                    <input type="email"
                           class="survey-email-input"
                           id="survey-respondent-email"
                           placeholder="your@email.com"
                           value="${escapeHtml(response.respondentEmail)}"
                           ${config.readOnly ? 'disabled' : ''}>
                </div>
            `;

            if (!config.readOnly) {
                container.querySelector('.survey-email-input').addEventListener('input', (e) => {
                    response.respondentEmail = e.target.value;
                    clearFieldError('email');
                    updateProgress();
                    config.onChange(deepClone(response));
                });
            }

            return container;
        }

        /**
         * Render respond question
         */
        function renderRespondQuestion(question, index) {
            const card = document.createElement('div');
            card.className = 'survey-respond-card';
            card.setAttribute('data-question-id', question.id);

            // Header
            const header = document.createElement('div');
            header.className = 'survey-respond-question-header';
            header.innerHTML = `
                <h3 class="survey-respond-question-title">
                    ${escapeHtml(question.title || `질문 ${index + 1}`)}
                    ${question.required ? '<span class="survey-required-asterisk">*</span>' : ''}
                </h3>
                ${question.description ? `<p class="survey-respond-question-description">${escapeHtml(question.description)}</p>` : ''}
            `;
            card.appendChild(header);

            // Question content
            const content = document.createElement('div');
            content.className = 'survey-respond-question-content';
            content.appendChild(renderRespondInput(question));
            card.appendChild(content);

            return card;
        }

        /**
         * Render respond input based on question type
         */
        function renderRespondInput(question) {
            const container = document.createElement('div');
            container.className = 'survey-respond-input-container';

            switch (question.type) {
                case 'short-text':
                    container.appendChild(createTextInput(question));
                    break;
                case 'long-text':
                    container.appendChild(createTextareaInput(question));
                    break;
                case 'multiple-choice':
                    container.appendChild(createRadioOptions(question));
                    break;
                case 'checkbox':
                    container.appendChild(createCheckboxOptions(question));
                    break;
                case 'dropdown':
                    container.appendChild(createSelectInput(question));
                    break;
                case 'file-upload':
                    container.appendChild(createFileUploadInput(question));
                    break;
                case 'linear-scale':
                    container.appendChild(createLinearScale(question));
                    break;
                case 'date':
                    container.appendChild(createDateInput(question));
                    break;
                default:
                    container.appendChild(createTextInput(question));
            }

            return container;
        }

        /**
         * Create text input
         */
        function createTextInput(question) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'survey-respond-text-input';
            input.name = `q_${question.id}`;
            input.placeholder = '응답 입력...';
            input.value = response.answers[question.id] || '';

            if (config.readOnly) {
                input.disabled = true;
            } else {
                input.addEventListener('input', (e) => {
                    response.answers[question.id] = e.target.value;
                    clearQuestionError(question.id);
                    updateProgress();
                    config.onChange(deepClone(response));
                });
            }

            return input;
        }

        /**
         * Create textarea input
         */
        function createTextareaInput(question) {
            const textarea = document.createElement('textarea');
            textarea.className = 'survey-respond-textarea';
            textarea.name = `q_${question.id}`;
            textarea.placeholder = '응답 입력...';
            textarea.value = response.answers[question.id] || '';

            if (config.readOnly) {
                textarea.disabled = true;
            } else {
                textarea.addEventListener('input', (e) => {
                    response.answers[question.id] = e.target.value;
                    clearQuestionError(question.id);
                    updateProgress();
                    config.onChange(deepClone(response));
                });
            }

            return textarea;
        }

        /**
         * Create radio options
         */
        function createRadioOptions(question) {
            const container = document.createElement('div');
            container.className = 'survey-respond-options';

            const options = getQuestionOptions(question);
            options.forEach(option => {
                const label = document.createElement('label');
                label.className = 'survey-respond-option-item';
                label.innerHTML = `
                    <input type="radio"
                           class="survey-respond-option-input"
                           name="q_${question.id}"
                           value="${escapeHtml(option.id)}"
                           ${response.answers[question.id] === option.id ? 'checked' : ''}
                           ${config.readOnly ? 'disabled' : ''}>
                    <span class="survey-respond-option-label">${escapeHtml(option.label)}</span>
                `;

                if (!config.readOnly) {
                    label.querySelector('input').addEventListener('change', (e) => {
                        if (e.target.checked) {
                            response.answers[question.id] = option.id;
                            clearQuestionError(question.id);
                            updateProgress();
                            config.onChange(deepClone(response));
                        }
                    });
                }

                container.appendChild(label);
            });

            return container;
        }

        /**
         * Create checkbox options
         */
        function createCheckboxOptions(question) {
            const container = document.createElement('div');
            container.className = 'survey-respond-options';

            const options = getQuestionOptions(question);
            const currentValues = response.answers[question.id] || [];

            options.forEach(option => {
                const label = document.createElement('label');
                label.className = 'survey-respond-option-item';
                label.innerHTML = `
                    <input type="checkbox"
                           class="survey-respond-option-input"
                           name="q_${question.id}"
                           value="${escapeHtml(option.id)}"
                           ${currentValues.includes(option.id) ? 'checked' : ''}
                           ${config.readOnly ? 'disabled' : ''}>
                    <span class="survey-respond-option-label">${escapeHtml(option.label)}</span>
                `;

                if (!config.readOnly) {
                    label.querySelector('input').addEventListener('change', () => {
                        const checked = container.querySelectorAll('input:checked');
                        response.answers[question.id] = Array.from(checked).map(cb => cb.value);
                        clearQuestionError(question.id);
                        updateProgress();
                        config.onChange(deepClone(response));
                    });
                }

                container.appendChild(label);
            });

            return container;
        }

        /**
         * Create select input
         */
        function createSelectInput(question) {
            const select = document.createElement('select');
            select.className = 'survey-respond-select';
            select.name = `q_${question.id}`;

            if (config.readOnly) {
                select.disabled = true;
            }

            let html = '<option value="">선택해주세요</option>';
            const options = getQuestionOptions(question);
            options.forEach(option => {
                html += `<option value="${escapeHtml(option.id)}" ${response.answers[question.id] === option.id ? 'selected' : ''}>${escapeHtml(option.label)}</option>`;
            });
            select.innerHTML = html;

            if (!config.readOnly) {
                select.addEventListener('change', (e) => {
                    response.answers[question.id] = e.target.value;
                    clearQuestionError(question.id);
                    updateProgress();
                    config.onChange(deepClone(response));
                });
            }

            return select;
        }

        /**
         * Create file upload input
         */
        function createFileUploadInput(question) {
            const container = document.createElement('div');
            container.className = 'survey-respond-file-upload';

            const input = document.createElement('input');
            input.type = 'file';
            input.className = 'survey-respond-file-input';
            input.id = `file-${question.id}`;

            const qConfig = question.config || {};
            if (config.readOnly) {
                input.disabled = true;
            }
            if (qConfig.allowMultiple) {
                input.multiple = true;
            }
            if (qConfig.allowedExtensions && qConfig.allowedExtensions.length > 0) {
                input.accept = qConfig.allowedExtensions.join(',');
            }

            const label = document.createElement('label');
            label.className = 'survey-respond-file-label';
            label.htmlFor = `file-${question.id}`;
            label.textContent = '파일 선택';

            const fileList = document.createElement('div');
            fileList.className = 'survey-respond-file-list';
            fileList.id = `file-list-${question.id}`;

            if (!config.readOnly) {
                input.addEventListener('change', (e) => {
                    const files = Array.from(e.target.files);
                    response.answers[question.id] = { files: files, uploadedMetadata: [] };

                    // Update file list display
                    fileList.innerHTML = '';
                    if (files.length > 0) {
                        const ul = document.createElement('ul');
                        files.forEach(file => {
                            const li = document.createElement('li');
                            li.className = 'survey-respond-file-item';
                            li.innerHTML = `
                                <span class="survey-respond-file-name">${escapeHtml(file.name)}</span>
                                <span class="survey-respond-file-size">${formatFileSize(file.size)}</span>
                            `;
                            ul.appendChild(li);
                        });
                        fileList.appendChild(ul);
                    }

                    clearQuestionError(question.id);
                    updateProgress();
                    config.onChange(deepClone(response));
                });
            }

            container.appendChild(label);
            container.appendChild(input);
            container.appendChild(fileList);

            return container;
        }

        /**
         * Create linear scale
         */
        function createLinearScale(question) {
            const container = document.createElement('div');
            container.className = 'survey-respond-scale';

            const qConfig = question.config || { min: 1, max: 5, minLabel: '', maxLabel: '' };
            const min = qConfig.min || 1;
            const max = qConfig.max || 5;

            // Labels row
            if (qConfig.minLabel || qConfig.maxLabel) {
                const labelsRow = document.createElement('div');
                labelsRow.className = 'survey-respond-scale-labels';
                labelsRow.innerHTML = `
                    <span class="survey-respond-scale-min-label">${escapeHtml(qConfig.minLabel)}</span>
                    <span class="survey-respond-scale-max-label">${escapeHtml(qConfig.maxLabel)}</span>
                `;
                container.appendChild(labelsRow);
            }

            // Scale buttons
            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'survey-respond-scale-buttons';

            for (let i = min; i <= max; i++) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'survey-respond-scale-btn';
                button.textContent = String(i);
                button.value = String(i);

                if (response.answers[question.id] === String(i)) {
                    button.classList.add('selected');
                }

                if (config.readOnly) {
                    button.disabled = true;
                } else {
                    button.addEventListener('click', () => {
                        buttonsContainer.querySelectorAll('.survey-respond-scale-btn').forEach(btn => {
                            btn.classList.remove('selected');
                        });
                        button.classList.add('selected');
                        response.answers[question.id] = String(i);
                        clearQuestionError(question.id);
                        updateProgress();
                        config.onChange(deepClone(response));
                    });
                }

                buttonsContainer.appendChild(button);
            }

            container.appendChild(buttonsContainer);
            return container;
        }

        /**
         * Create date input
         */
        function createDateInput(question) {
            const input = document.createElement('input');
            input.type = 'date';
            input.className = 'survey-respond-date-input';
            input.name = `q_${question.id}`;
            input.value = response.answers[question.id] || '';

            if (config.readOnly) {
                input.disabled = true;
            } else {
                input.addEventListener('change', (e) => {
                    response.answers[question.id] = e.target.value;
                    clearQuestionError(question.id);
                    updateProgress();
                    config.onChange(deepClone(response));
                });
            }

            return input;
        }

        /**
         * Render submit button
         */
        function renderSubmitButton() {
            const container = document.createElement('div');
            container.className = 'survey-respond-actions';

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'survey-respond-submit-btn';
            button.id = 'survey-submit-btn';
            button.innerHTML = '<span class="survey-submit-text">제출</span>';

            button.addEventListener('click', handleSubmit);

            container.appendChild(button);
            return container;
        }

        // ========================================================
        // RESPONDER: DATA OPERATIONS
        // ========================================================

        /**
         * Get options from question
         */
        function getQuestionOptions(question) {
            if (question.options && question.options.length > 0) {
                return question.options;
            }
            if (question.config && question.config.options) {
                return question.config.options;
            }
            return [];
        }

        /**
         * Update progress bar
         */
        function updateProgress() {
            const progressFill = document.getElementById('survey-progress-fill');
            if (!progressFill) return;

            const questions = form.questions || [];
            const settings = form.settings || {};
            const requiredQuestions = questions.filter(q => q.required);

            let totalRequired = requiredQuestions.length;
            if (settings.collectEmail) {
                totalRequired += 1;
            }

            if (totalRequired === 0) {
                progressFill.style.width = '100%';
                return;
            }

            let answered = 0;

            // Email check
            if (settings.collectEmail && response.respondentEmail.trim()) {
                answered += 1;
            }

            // Question answers check
            answered += requiredQuestions.filter(q => {
                const value = response.answers[q.id];
                if (Array.isArray(value)) return value.length > 0;
                if (value && typeof value === 'object' && value.files) {
                    return value.files.length > 0;
                }
                return value && String(value).trim() !== '';
            }).length;

            const percentage = (answered / totalRequired) * 100;
            progressFill.style.width = `${percentage}%`;
        }

        /**
         * Handle form submit
         */
        async function handleSubmit() {
            if (isSubmitting) return;

            clearAllErrors();

            // Validate
            const validationResult = validateResponse(form, response);

            if (!validationResult.valid) {
                displayValidationErrors(validationResult);
                config.onValidationError(validationResult);
                return;
            }

            isSubmitting = true;
            updateSubmitButton(true);

            try {
                // Handle file uploads via callback
                const fileQuestions = form.questions.filter(q => q.type === 'file-upload');
                for (const question of fileQuestions) {
                    const answerValue = response.answers[question.id];
                    if (answerValue && answerValue.files && answerValue.files.length > 0) {
                        const uploadedMetadata = await config.onFileUpload(
                            question.id,
                            answerValue.files,
                            question.config || {}
                        );
                        response.answers[question.id].uploadedMetadata = uploadedMetadata;
                    }
                }

                // Set submission timestamp
                response.submittedAt = new Date().toISOString();

                // Call submit callback
                await config.onSubmit(deepClone(response));

            } catch (error) {
                console.error('[SurveyCore] Submit error:', error);
                showError(error.message || '제출에 실패했습니다.');
            } finally {
                isSubmitting = false;
                updateSubmitButton(false);
            }
        }

        /**
         * Update submit button state
         */
        function updateSubmitButton(loading) {
            const btn = document.getElementById('survey-submit-btn');
            if (!btn) return;

            if (loading) {
                btn.disabled = true;
                btn.querySelector('.survey-submit-text').textContent = '제출 중...';
            } else {
                btn.disabled = false;
                btn.querySelector('.survey-submit-text').textContent = '제출';
            }
        }

        /**
         * Display validation errors
         */
        function displayValidationErrors(result) {
            // Email errors
            if (result.errors.email) {
                const emailContainer = document.getElementById('survey-email-container');
                if (emailContainer) {
                    emailContainer.classList.add('has-error');
                    showFieldError(emailContainer, result.errors.email[0]);
                }
            }

            // Question errors
            Object.entries(result.questionErrors).forEach(([questionId, errors]) => {
                const card = document.querySelector(`[data-question-id="${questionId}"]`);
                if (card) {
                    card.classList.add('has-error');
                    showFieldError(card, errors[0]);
                }
            });

            // Scroll to first error
            const firstError = document.querySelector('.has-error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        /**
         * Show field error message
         */
        function showFieldError(container, message) {
            let errorEl = container.querySelector('.survey-error-message');
            if (!errorEl) {
                errorEl = document.createElement('div');
                errorEl.className = 'survey-error-message';
                container.appendChild(errorEl);
            }
            errorEl.textContent = message;
        }

        /**
         * Clear all errors
         */
        function clearAllErrors() {
            document.querySelectorAll('.has-error').forEach(el => {
                el.classList.remove('has-error');
            });
            document.querySelectorAll('.survey-error-message').forEach(el => {
                el.remove();
            });
        }

        /**
         * Clear question error
         */
        function clearQuestionError(questionId) {
            const card = document.querySelector(`[data-question-id="${questionId}"]`);
            if (card) {
                card.classList.remove('has-error');
                const errorEl = card.querySelector('.survey-error-message');
                if (errorEl) errorEl.remove();
            }
        }

        /**
         * Clear field error
         */
        function clearFieldError(fieldName) {
            if (fieldName === 'email') {
                const container = document.getElementById('survey-email-container');
                if (container) {
                    container.classList.remove('has-error');
                    const errorEl = container.querySelector('.survey-error-message');
                    if (errorEl) errorEl.remove();
                }
            }
        }

        /**
         * Show error banner
         */
        function showError(message) {
            let banner = document.querySelector('.survey-error-banner');
            if (!banner) {
                banner = document.createElement('div');
                banner.className = 'survey-error-banner';
                rootElement.insertBefore(banner, rootElement.firstChild);
            }
            banner.textContent = message;
            banner.style.display = 'block';

            setTimeout(() => {
                banner.style.display = 'none';
            }, 5000);
        }

        // ========================================================
        // RESPONDER: PUBLIC API
        // ========================================================

        // Initial render
        render();

        // Return public API
        return {
            getForm: () => deepClone(form),
            setForm: (newForm) => {
                form = deepClone(newForm);
                response = createEmptyResponse(form);
                render();
            },
            getResponse: () => deepClone(response),
            setResponse: (newResponse) => {
                response = deepClone(newResponse);
                render();
            },
            validate: () => validateResponse(form, response),
            submit: handleSubmit,
            render,
            destroy: () => {
                isDestroyed = true;
                rootElement.innerHTML = '';
            }
        };
    }

    // ========================================================
    // EXPOSE PUBLIC API
    // ========================================================

    const SurveyCore = {
        // Version
        version: '1.0.0',

        // Main APIs
        initBuilder,
        initResponder,
        createEmptyResponse,
        validateResponse,

        // Schema factories
        createDefaultForm,
        createDefaultQuestion,
        createDefaultOption,

        // Utilities
        utils: {
            escapeHtml,
            generateId,
            deepClone,
            debounce,
            formatFileSize,
            isImageFile
        },

        // Constants
        QUESTION_TYPES,
        OPTION_BASED_TYPES
    };

    // Expose to global scope
    if (typeof global.SurveyCore === 'undefined') {
        global.SurveyCore = SurveyCore;
    }

    // AMD support
    if (typeof define === 'function' && define.amd) {
        define('SurveyCore', [], function() { return SurveyCore; });
    }

    // CommonJS support
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = SurveyCore;
    }

})(typeof window !== 'undefined' ? window : this);
