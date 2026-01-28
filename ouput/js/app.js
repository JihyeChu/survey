/**
 * Google Form Clone - Main Application
 * Header Navigation Controller & Builder UI
 */

(function() {
    'use strict';

    // DOM Elements
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

    // Question Types Configuration
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

    let isPreviewMode = false;

    /**
     * Initialize the application
     */
    function init() {
        setupTabNavigation();
        setupTitleEditing();
        setupBuilder();
        restoreState();
    }

    /**
     * Setup tab navigation click handlers
     */
    function setupTabNavigation() {
        tabButtons.forEach(button => {
            button.addEventListener('click', handleTabClick);
        });
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
        // Update tab buttons
        tabButtons.forEach(button => {
            if (button.dataset.tab === tabName) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
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

        // Save current tab to localStorage
        saveState({ currentTab: tabName });
    }

    /**
     * Setup title click for future editing functionality
     */
    function setupTitleEditing() {
        const titleContainer = document.getElementById('tab-title');
        if (titleContainer) {
            titleContainer.addEventListener('click', () => {
                // Placeholder for title editing functionality
                console.log('Title clicked - editing to be implemented');
            });
        }
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
     * Add a new question
     * @param {string} type - Question type (optional)
     */
    function addQuestion(type = 'short-text') {
        const questions = getQuestions();
        const newQuestion = {
            id: Date.now(),
            title: '',
            description: '',
            type: type,
            required: false,
            order: questions.length
        };

        questions.push(newQuestion);
        saveQuestions(questions);
        renderQuestions();
    }

    /**
     * Delete a question
     * @param {number} questionId - ID of the question to delete
     */
    function deleteQuestion(questionId) {
        const questions = getQuestions().filter(q => q.id !== questionId);
        saveQuestions(questions);
        renderQuestions();
    }

    /**
     * Duplicate a question
     * @param {number} questionId - ID of the question to duplicate
     */
    function duplicateQuestion(questionId) {
        const questions = getQuestions();
        const questionToDuplicate = questions.find(q => q.id === questionId);

        if (questionToDuplicate) {
            const duplicatedQuestion = {
                ...questionToDuplicate,
                id: Date.now(),
                order: questions.length
            };
            questions.push(duplicatedQuestion);
            saveQuestions(questions);
            renderQuestions();
        }
    }

    /**
     * Update a question
     * @param {number} questionId - ID of the question to update
     * @param {Object} updates - Object with fields to update
     */
    function updateQuestion(questionId, updates) {
        const questions = getQuestions();
        const question = questions.find(q => q.id === questionId);

        if (question) {
            Object.assign(question, updates);
            saveQuestions(questions);
            renderQuestions();
        }
    }

    /**
     * Render all questions
     */
    function renderQuestions() {
        const questions = getQuestions();

        if (questions.length === 0) {
            questionsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><h2>질문이 없습니다</h2><p>+ 버튼을 클릭하여 질문을 추가하세요.</p></div>';
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
                            value="${escapeHtml(question.title)}"
                            data-field="title"
                            data-question-id="${question.id}"
                        />
                        <textarea
                            class="description-input"
                            placeholder="설명 (선택사항)"
                            data-field="description"
                            data-question-id="${question.id}"
                        >${escapeHtml(question.description)}</textarea>
                    </div>
                    <div class="question-card-actions">
                        <button class="icon-button duplicate-btn" title="복제" data-question-id="${question.id}">
                            📋
                        </button>
                        <button class="icon-button delete delete-btn" title="삭제" data-question-id="${question.id}">
                            🗑️
                        </button>
                    </div>
                </div>

                <div class="question-card-options">
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
     * Attach event listeners to question elements
     */
    function attachQuestionEventListeners() {
        // Input and select handlers
        document.querySelectorAll('[data-field][data-question-id]').forEach(element => {
            element.addEventListener('change', handleFieldChange);
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.addEventListener('input', handleFieldChange);
            }
            if (element.tagName === 'TEXTAREA') {
                element.addEventListener('input', handleFieldChange);
            }
        });

        // Delete button handlers
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionId = parseInt(e.currentTarget.dataset.questionId);
                deleteQuestion(questionId);
            });
        });

        // Duplicate button handlers
        document.querySelectorAll('.duplicate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const questionId = parseInt(e.currentTarget.dataset.questionId);
                duplicateQuestion(questionId);
            });
        });
    }

    /**
     * Handle field changes
     * @param {Event} event - Change/input event
     */
    function handleFieldChange(event) {
        const field = event.target.dataset.field;
        const questionId = parseInt(event.target.dataset.questionId);
        let value = event.target.value;

        if (field === 'required') {
            value = event.target.checked;
        }

        updateQuestion(questionId, { [field]: value });
    }

    /**
     * Toggle Preview Mode
     */
    function togglePreview() {
        isPreviewMode = !isPreviewMode;

        if (isPreviewMode) {
            previewMode.classList.add('preview-mode-hidden');
            previewMode.classList.remove('preview-mode-hidden');
            previewContent.classList.remove('preview-content-hidden');
            previewToggle.textContent = '편집';
            renderPreview();
        } else {
            previewMode.classList.remove('preview-mode-hidden');
            previewContent.classList.add('preview-content-hidden');
            previewToggle.textContent = '미리보기';
        }

        saveState({ isPreviewMode });
    }

    /**
     * Render Preview
     */
    function renderPreview() {
        const questions = getQuestions();

        if (questions.length === 0) {
            previewContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div><h2>질문이 없습니다</h2><p>질문을 추가한 후 미리보기를 확인하세요.</p></div>';
            return;
        }

        previewContainer.innerHTML = questions.map((question, index) => `
            <div class="preview-question-card">
                <div class="preview-question-number">질문 ${index + 1}</div>
                <div class="preview-question-title">
                    ${escapeHtml(question.title)}
                    ${question.required ? '<span style="color: #f44336;"> *</span>' : ''}
                </div>
                ${question.description ? `<div class="preview-question-description">${escapeHtml(question.description)}</div>` : ''}
                ${renderPreviewInput(question)}
            </div>
        `).join('');
    }

    /**
     * Render preview input based on question type
     * @param {Object} question - Question object
     */
    function renderPreviewInput(question) {
        const type = question.type;

        switch (type) {
            case 'short-text':
                return '<input type="text" class="preview-input-field" placeholder="단답형 응답 입력" />';
            case 'long-text':
                return '<textarea class="preview-input-field" placeholder="장문형 응답 입력" style="min-height: 80px;"></textarea>';
            case 'multiple-choice':
                return '<div style="margin-top: 8px;"><div style="margin-bottom: 8px;"><label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="radio" name="q' + question.id + '" /> 옵션 1</label></div><div><label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="radio" name="q' + question.id + '" /> 옵션 2</label></div></div>';
            case 'checkbox':
                return '<div style="margin-top: 8px;"><div style="margin-bottom: 8px;"><label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" /> 옵션 1</label></div><div><label style="display: flex; align-items: center; gap: 8px; cursor: pointer;"><input type="checkbox" /> 옵션 2</label></div></div>';
            case 'dropdown':
                return '<select class="preview-input-field" style="border: 1px solid var(--border-color);"><option>선택</option><option>옵션 1</option><option>옵션 2</option></select>';
            case 'file-upload':
                return '<input type="file" style="padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;" />';
            case 'linear-scale':
                return '<div style="margin-top: 12px; display: flex; gap: 12px;"><span style="font-size: 12px; color: var(--text-secondary);">최소</span>' + Array.from({ length: 5 }, (_, i) => `<label style="cursor: pointer;"><input type="radio" name="q${question.id}" /> ${i + 1}</label>`).join('') + '<span style="font-size: 12px; color: var(--text-secondary);">최대</span></div>';
            case 'date':
                return '<input type="date" class="preview-input-field" />';
            default:
                return '<input type="text" class="preview-input-field" placeholder="응답 입력" />';
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

    /**
     * Save questions to localStorage
     * @param {Array} questions - Array of questions
     */
    function saveQuestions(questions) {
        try {
            const state = JSON.parse(localStorage.getItem('formAppState') || '{}');
            state.questions = questions;
            localStorage.setItem('formAppState', JSON.stringify(state));
        } catch (error) {
            console.error('Failed to save questions:', error);
        }
    }

    /**
     * Get questions from localStorage
     * @returns {Array} Array of questions
     */
    function getQuestions() {
        try {
            const state = JSON.parse(localStorage.getItem('formAppState') || '{}');
            return state.questions || [];
        } catch (error) {
            console.error('Failed to get questions:', error);
            return [];
        }
    }

    /**
     * Save application state to localStorage
     * @param {Object} state - State object to merge with existing state
     */
    function saveState(state) {
        try {
            const existingState = JSON.parse(localStorage.getItem('formAppState') || '{}');
            const newState = { ...existingState, ...state };
            localStorage.setItem('formAppState', JSON.stringify(newState));
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }

    /**
     * Restore application state from localStorage
     */
    function restoreState() {
        try {
            const state = JSON.parse(localStorage.getItem('formAppState') || '{}');

            // Restore current tab
            if (state.currentTab) {
                switchTab(state.currentTab);
            }

            // Restore form title
            if (state.formTitle && formTitleElement) {
                formTitleElement.textContent = state.formTitle;
            }

            // Restore preview mode
            if (state.isPreviewMode) {
                togglePreview();
            }
        } catch (error) {
            console.error('Failed to restore state:', error);
        }
    }

    /**
     * Get current application state
     * @returns {Object} Current state
     */
    function getState() {
        try {
            return JSON.parse(localStorage.getItem('formAppState') || '{}');
        } catch (error) {
            console.error('Failed to get state:', error);
            return {};
        }
    }

    // Expose public API for future extensions
    window.FormApp = {
        switchTab,
        saveState,
        getState,
        addQuestion,
        deleteQuestion,
        duplicateQuestion,
        updateQuestion,
        getQuestions,
        saveQuestions
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
