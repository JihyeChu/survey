/**
 * Google Form Clone - Respondent View
 * Response form rendering and submission
 */

(function() {
    'use strict';

    const API_BASE_URL = '/api';

    // ========================================================
    // DOM ELEMENTS
    // ========================================================
    const elements = {
        loadingIndicator: document.getElementById('loading-indicator'),
        formContainer: document.getElementById('form-container'),
        formHeader: document.getElementById('form-header'),
        formTitle: document.getElementById('form-title'),
        formDescription: document.getElementById('form-description'),
        respondForm: document.getElementById('respond-form'),
        emailFieldContainer: document.getElementById('email-field-container'),
        respondentEmail: document.getElementById('respondent-email'),
        questionsContainer: document.getElementById('questions-container'),
        progressFill: document.getElementById('progress-fill'),
        submitBtn: document.getElementById('submit-btn'),
        submitBtnText: document.getElementById('submit-btn-text'),
        errorBanner: document.getElementById('error-banner'),
        errorMessage: document.getElementById('error-message'),
        errorCloseBtn: document.getElementById('error-close-btn'),
        successScreen: document.getElementById('success-screen')
    };

    // ========================================================
    // STATE MANAGEMENT
    // ========================================================
    let formData = null;
    let responses = {};  // questionId -> value
    let respondentEmail = '';  // 응답자 이메일
    let currentSectionIndex = 0;  // 현재 섹션 인덱스

    // ========================================================
    // HELPER FUNCTIONS
    // ========================================================
    /**
     * 모든 섹션의 질문을 병합하여 반환
     * 섹션이 있으면 섹션의 질문들을 모두 추출
     * 섹션이 없으면 form.questions 사용
     * order ASC 기준으로 정렬
     */
    function getAllQuestions(form) {
        let allQuestions = [];

        // 섹션이 있는 경우: 모든 섹션의 질문 병합
        if (form.sections && form.sections.length > 0) {
            form.sections.forEach(section => {
                if (section.questions && section.questions.length > 0) {
                    allQuestions = allQuestions.concat(section.questions);
                }
            });
        }

        // 섹션 없는 기존 폼: form.questions 사용
        if (allQuestions.length === 0 && form.questions) {
            allQuestions = form.questions;
        }

        // order 기준으로 정렬
        allQuestions.sort((a, b) => (a.order || a.orderIndex || 0) - (b.order || b.orderIndex || 0));

        return allQuestions;
    }

    // ========================================================
    // INITIALIZATION
    // ========================================================
    async function init() {
        try {
            const formId = getFormIdFromUrl();
            if (!formId) {
                showError('폼 ID가 유효하지 않습니다.');
                return;
            }

            showLoading(true);
            await loadForm(formId);
            renderForm();
            setupEventListeners();
        } catch (error) {
            console.error('Error initializing form:', error);
            showError('폼을 불러오는 데 실패했습니다. 다시 시도해주세요.');
        } finally {
            showLoading(false);
        }
    }

    // ========================================================
    // FORM LOADING
    // ========================================================
    function getFormIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get('formId');
    }

    async function loadForm(formId) {
        try {
            const response = await fetch(`${API_BASE_URL}/forms/${formId}/public`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            formData = await response.json();

            if (!formData) {
                throw new Error('폼 데이터가 없습니다.');
            }
        } catch (error) {
            console.error('Error loading form:', error);
            throw new Error('폼을 불러오지 못했습니다.');
        }
    }

    // ========================================================
    // FORM RENDERING
    // ========================================================
    function renderForm() {
        if (!formData) return;

        // 폼 헤더 렌더링
        renderFormHeader();

        // 이메일 필드 렌더링
        renderEmailField();

        // 섹션이 있는 경우 섹션별 렌더링, 없으면 기존 방식
        const hasSections = formData.sections && formData.sections.length > 0;
        if (hasSections) {
            renderSectionNavigation();
            renderCurrentSection();
        } else {
            renderQuestions();
        }

        // 초기 진행률 업데이트
        updateProgress();
    }

    function renderFormHeader() {
        elements.formTitle.textContent = formData.title || '제목 없음';
        elements.formDescription.textContent = formData.description || '';
    }

    function renderEmailField() {
        // formSettings에서 collectEmail 설정 확인
        const settings = formData.settings || {};
        const collectEmail = settings.collectEmail || false;

        if (collectEmail) {
            elements.emailFieldContainer.style.display = 'block';
            elements.respondentEmail.addEventListener('input', (e) => {
                respondentEmail = e.target.value;
                updateProgress();
            });
        } else {
            elements.emailFieldContainer.style.display = 'none';
            elements.respondentEmail.required = false;
        }
    }

    function renderQuestions(questions = null) {
        elements.questionsContainer.innerHTML = '';

        const questionList = questions || formData.questions || [];
        // order 또는 orderIndex 필드 기준으로 정렬 (order 우선)
        const sortedQuestions = [...questionList].sort((a, b) => {
            const aOrder = a.order !== undefined ? a.order : (a.orderIndex || 0);
            const bOrder = b.order !== undefined ? b.order : (b.orderIndex || 0);
            return aOrder - bOrder;
        });

        sortedQuestions.forEach((question, index) => {
            const questionCard = createQuestionCard(question, index);
            elements.questionsContainer.appendChild(questionCard);
        });

        // 제출 버튼 활성화
        elements.submitBtn.disabled = false;
    }

    // ========================================================
    // SECTION NAVIGATION
    // ========================================================
    function renderSectionNavigation() {
        const hasSections = formData.sections && formData.sections.length > 0;
        if (!hasSections) return;

        // 기존 네비게이션 제거
        const existingNav = elements.questionsContainer.parentElement.querySelector('.respond-section-nav');
        if (existingNav) {
            existingNav.remove();
        }

        // 진행률 표시 및 네비게이션 컨테이너
        const navContainer = document.createElement('div');
        navContainer.className = 'respond-section-nav';

        // 진행률 표시
        const progressDiv = document.createElement('div');
        progressDiv.className = 'respond-section-progress';
        progressDiv.textContent = `섹션 ${currentSectionIndex + 1} / ${formData.sections.length}`;

        // 버튼 컨테이너
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'respond-section-nav-buttons';

        // 이전 버튼
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'respond-nav-btn respond-nav-btn-prev';
        prevBtn.textContent = '이전';
        prevBtn.disabled = currentSectionIndex === 0;
        prevBtn.addEventListener('click', () => goToPreviousSection());

        // 다음 또는 제출 버튼
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'respond-nav-btn respond-nav-btn-next';
        const isLastSection = currentSectionIndex === formData.sections.length - 1;
        nextBtn.textContent = isLastSection ? '제출' : '다음';
        nextBtn.addEventListener('click', () => {
            if (isLastSection) {
                handleSubmit({ preventDefault: () => {} });
            } else {
                goToNextSection();
            }
        });

        buttonsDiv.appendChild(prevBtn);
        buttonsDiv.appendChild(nextBtn);

        navContainer.appendChild(progressDiv);
        navContainer.appendChild(buttonsDiv);

        elements.questionsContainer.parentElement.appendChild(navContainer);

        // 기본 제출 버튼 숨김
        elements.submitBtn.style.display = 'none';
    }

    function renderCurrentSection() {
        const hasSections = formData.sections && formData.sections.length > 0;
        if (!hasSections) return;

        const section = formData.sections[currentSectionIndex];
        if (!section) return;

        // 섹션 헤더 렌더링
        const sectionHeaderContainer = document.createElement('div');
        sectionHeaderContainer.className = 'respond-section-header';

        if (section.title) {
            const sectionTitle = document.createElement('h2');
            sectionTitle.className = 'respond-section-title';
            sectionTitle.textContent = section.title;
            sectionHeaderContainer.appendChild(sectionTitle);
        }

        if (section.description) {
            const sectionDesc = document.createElement('p');
            sectionDesc.className = 'respond-section-description';
            sectionDesc.textContent = section.description;
            sectionHeaderContainer.appendChild(sectionDesc);
        }

        // 섹션의 질문들을 정렬 (order 또는 orderIndex 기준)
        const sectionQuestions = section.questions || [];
        sectionQuestions.sort((a, b) => {
            const aOrder = a.order !== undefined ? a.order : (a.orderIndex || 0);
            const bOrder = b.order !== undefined ? b.order : (b.orderIndex || 0);
            return aOrder - bOrder;
        });

        // 질문 렌더링
        elements.questionsContainer.innerHTML = '';
        elements.questionsContainer.appendChild(sectionHeaderContainer);

        sectionQuestions.forEach((question, index) => {
            const questionCard = createQuestionCard(question, index);
            elements.questionsContainer.appendChild(questionCard);
        });
    }

    // 현재 DOM에서 입력값을 즉시 읽어 responses에 저장 (이벤트 누락 방어)
    function saveCurrentSectionValues() {
        elements.questionsContainer.querySelectorAll('.respond-question-card').forEach(card => {
            const questionId = card.dataset.questionId;
            if (!questionId) return;

            const textInput = card.querySelector('.respond-text-input');
            if (textInput) { responses[questionId] = textInput.value; return; }

            const textarea = card.querySelector('.respond-textarea-input');
            if (textarea) { responses[questionId] = textarea.value; return; }

            const checkedRadio = card.querySelector('input[type="radio"]:checked');
            if (checkedRadio) { responses[questionId] = checkedRadio.value; return; }

            const checkboxes = card.querySelectorAll('input[type="checkbox"]');
            if (checkboxes.length > 0) {
                responses[questionId] = Array.from(checkboxes)
                    .filter(cb => cb.checked)
                    .map(cb => cb.value);
                return;
            }

            const select = card.querySelector('.respond-select-input');
            if (select) { responses[questionId] = select.value; return; }

            const dateInput = card.querySelector('.respond-date-input');
            if (dateInput) { responses[questionId] = dateInput.value; return; }

            const selectedBtn = card.querySelector('.respond-scale-button.selected');
            if (selectedBtn) { responses[questionId] = selectedBtn.value; }
        });
    }

    function goToNextSection() {
        // 이동 전 현재 섹션 값 명시적 저장
        saveCurrentSectionValues();

        // 현재 섹션 검증
        const section = formData.sections[currentSectionIndex];
        const sectionQuestions = section.questions || [];

        const validation = validateSection(sectionQuestions);
        if (!validation.valid) {
            displayValidationErrors(validation.errors);
            return;
        }

        // 다음 섹션으로
        if (currentSectionIndex < formData.sections.length - 1) {
            currentSectionIndex++;
            renderCurrentSection();
            renderSectionNavigation();
            window.scrollTo(0, 0);
        }
    }

    function goToPreviousSection() {
        // 이동 전 현재 섹션 값 명시적 저장
        saveCurrentSectionValues();

        if (currentSectionIndex > 0) {
            currentSectionIndex--;
            renderCurrentSection();
            renderSectionNavigation();
            window.scrollTo(0, 0);
        }
    }

    function validateSection(sectionQuestions) {
        const errors = [];

        sectionQuestions.forEach((question) => {
            if (!question.required) return;

            const value = responses[question.id];
            let isEmpty = false;

            if (Array.isArray(value)) {
                isEmpty = value.length === 0;
            } else if (value && typeof value === 'object' && value.files) {
                isEmpty = !value.files || value.files.length === 0;
            } else if (typeof value === 'string') {
                isEmpty = value.trim() === '';
            } else {
                isEmpty = !value;
            }

            if (isEmpty) {
                errors.push({
                    questionId: question.id,
                    message: '이 질문은 필수입니다.'
                });
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    function createQuestionCard(question, index) {
        const card = document.createElement('div');
        card.className = 'respond-question-card';
        card.setAttribute('data-question-id', question.id);

        // 헤더
        const header = document.createElement('div');
        header.className = 'respond-question-header';

        const title = document.createElement('h3');
        title.className = 'respond-question-title';
        title.innerHTML = escapeHtml(question.title || `질문 ${index + 1}`);

        if (question.required) {
            const required = document.createElement('span');
            required.className = 'respond-question-required';
            required.textContent = '*';
            required.title = '필수 항목';
            title.appendChild(required);
        }

        header.appendChild(title);

        if (question.description) {
            const description = document.createElement('p');
            description.className = 'respond-question-description';
            description.textContent = question.description;
            header.appendChild(description);
        }

        card.appendChild(header);

        // 질문 첨부파일 표시 (attachmentFilename 또는 attachmentStoredName 필드 확인)
        if (question.attachmentFilename || question.attachmentStoredName) {
            const attachmentElement = createAttachmentElement(question);
            card.appendChild(attachmentElement);
        }

        // 입력 필드
        const content = document.createElement('div');
        content.className = 'respond-question-content';
        createQuestionInput(question, content);
        card.appendChild(content);

        return card;
    }

    /**
     * Create attachment display element (image or file download link)
     * 이미지 파일: <img> 태그로 표시
     * 다른 파일: 다운로드 링크로 표시
     */
    function createAttachmentElement(question) {
        const attachmentContainer = document.createElement('div');
        attachmentContainer.className = 'respond-question-attachment';

        // attachmentFilename 또는 attachmentStoredName 중 하나 확인
        const attachmentFilename = question.attachmentFilename || question.attachmentStoredName;
        if (!attachmentFilename) {
            return attachmentContainer;
        }

        const formId = getFormIdFromUrl();
        const fileUrl = `/api/forms/${formId}/questions/${question.id}/attachment`;
        // 원본 파일 이름에서 확장자 추출 (attachmentFilename 우선)
        const fileExtension = getFileExtension(question.attachmentFilename || attachmentFilename);
        const isImage = isImageFile(fileExtension);

        if (isImage) {
            // 이미지 파일: <img> 태그로 표시
            const img = document.createElement('img');
            img.className = 'respond-attachment-image';
            img.src = fileUrl;
            img.alt = question.title || 'Attachment image';
            img.onerror = () => {
                // 이미지 로드 실패 시 다운로드 링크로 폴백
                attachmentContainer.innerHTML = '';
                createDownloadLink(attachmentContainer, question, fileUrl, attachmentFilename);
            };
            attachmentContainer.appendChild(img);
        } else {
            // 다른 파일: 다운로드 링크로 표시
            createDownloadLink(attachmentContainer, question, fileUrl, attachmentFilename);
        }

        return attachmentContainer;
    }

    /**
     * Create download link for file attachments
     */
    function createDownloadLink(container, question, fileUrl, filename) {
        const linkWrapper = document.createElement('div');
        linkWrapper.className = 'respond-attachment-download';

        const link = document.createElement('a');
        link.className = 'respond-attachment-link';
        link.href = fileUrl;
        link.download = filename;
        link.target = '_blank';

        const icon = document.createElement('span');
        icon.className = 'respond-attachment-icon';
        icon.textContent = '📎';

        const text = document.createElement('span');
        text.className = 'respond-attachment-filename';
        text.textContent = filename;

        link.appendChild(icon);
        link.appendChild(text);
        linkWrapper.appendChild(link);
        container.appendChild(linkWrapper);
    }

    /**
     * Get file extension from filename
     */
    function getFileExtension(filename) {
        if (!filename) return '';
        const lastDot = filename.lastIndexOf('.');
        return lastDot > 0 ? filename.substring(lastDot + 1).toLowerCase() : '';
    }

    /**
     * Check if file is an image based on extension
     */
    function isImageFile(extension) {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
        return imageExtensions.includes(extension);
    }

    function createQuestionInput(question, container) {
        const questionId = question.id;

        switch (question.type) {
            case 'short-text':
                createTextInput(questionId, container);
                break;
            case 'long-text':
                createTextareaInput(questionId, container);
                break;
            case 'multiple-choice':
                createRadioOptions(question, container);
                break;
            case 'checkbox':
                createCheckboxOptions(question, container);
                break;
            case 'dropdown':
                createSelectInput(question, container);
                break;
            case 'file-upload':
                createFileUploadInput(question, container);
                break;
            case 'date':
                createDateInput(questionId, container);
                break;
            case 'linear-scale':
                createLinearScale(question, container);
                break;
            default:
                createTextInput(questionId, container);
        }
    }

    function createTextInput(questionId, container) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'respond-text-input';
        input.name = `q_${questionId}`;
        input.placeholder = '응답 입력...';
        if (responses[questionId]) {
            input.value = responses[questionId];
        }
        input.addEventListener('input', (e) => {
            responses[questionId] = e.target.value;
            updateProgress();
            clearQuestionError(questionId);
        });
        container.appendChild(input);
    }

    function createTextareaInput(questionId, container) {
        const textarea = document.createElement('textarea');
        textarea.className = 'respond-textarea-input';
        textarea.name = `q_${questionId}`;
        textarea.placeholder = '응답 입력...';
        if (responses[questionId]) {
            textarea.value = responses[questionId];
        }
        textarea.addEventListener('input', (e) => {
            responses[questionId] = e.target.value;
            updateProgress();
            clearQuestionError(questionId);
        });
        container.appendChild(textarea);
    }

    /**
     * config 필드에서 옵션 배열 추출
     */
    function getOptionsFromConfig(question) {
        // 먼저 question.options가 있으면 사용 (로컬 폼 데이터)
        if (question.options && question.options.length > 0) {
            return question.options;
        }

        // config에서 options 추출 (서버 데이터)
        if (question.config) {
            try {
                const config = typeof question.config === 'string'
                    ? JSON.parse(question.config)
                    : question.config;

                // config가 null이거나 options가 없는 경우 처리
                if (config && config.options) {
                    return config.options;
                }
            } catch (e) {
                console.warn('Failed to parse config for options:', e);
            }
        }
        return [];
    }

    /**
     * config 필드에서 스케일 설정 추출
     */
    function getScaleConfigFromQuestion(question) {
        const defaultConfig = { min: 1, max: 5, minLabel: '', maxLabel: '' };

        // 먼저 question.scaleConfig가 있으면 사용 (로컬 폼 데이터)
        if (question.scaleConfig) {
            try {
                const config = typeof question.scaleConfig === 'string'
                    ? JSON.parse(question.scaleConfig)
                    : question.scaleConfig;
                return { ...defaultConfig, ...config };
            } catch (e) {
                console.warn('Failed to parse scaleConfig:', e);
            }
        }

        // config에서 스케일 설정 추출 (서버 데이터)
        if (question.config) {
            try {
                const config = typeof question.config === 'string'
                    ? JSON.parse(question.config)
                    : question.config;
                if (config.min !== undefined || config.max !== undefined) {
                    return { ...defaultConfig, ...config };
                }
            } catch (e) {
                console.warn('Failed to parse config for scale:', e);
            }
        }

        return defaultConfig;
    }

    function createRadioOptions(question, container) {
        const options = getOptionsFromConfig(question);
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'respond-options';

        options.forEach((option) => {
            const label = document.createElement('label');
            label.className = 'respond-option-item';

            const input = document.createElement('input');
            input.type = 'radio';
            input.name = `q_${question.id}`;
            input.value = option.id;
            input.className = 'respond-option-input';
            if (String(responses[question.id]) === String(option.id)) {
                input.checked = true;
            }
            input.addEventListener('change', (e) => {
                if (e.target.checked) {
                    responses[question.id] = e.target.value;
                    updateProgress();
                    clearQuestionError(question.id);
                }
            });

            const optionLabel = document.createElement('span');
            optionLabel.className = 'respond-option-label';
            optionLabel.textContent = option.label || option.text;

            label.appendChild(input);
            label.appendChild(optionLabel);
            optionsDiv.appendChild(label);
        });

        container.appendChild(optionsDiv);
    }

    function createCheckboxOptions(question, container) {
        const options = getOptionsFromConfig(question);
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'respond-options';

        options.forEach((option) => {
            const label = document.createElement('label');
            label.className = 'respond-option-item';

            const input = document.createElement('input');
            input.type = 'checkbox';
            input.name = `q_${question.id}`;
            input.value = option.id;
            input.className = 'respond-option-input';
            if (Array.isArray(responses[question.id]) && responses[question.id].map(String).includes(String(option.id))) {
                input.checked = true;
            }
            input.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll(`input[name="q_${question.id}"]:checked`);
                responses[question.id] = Array.from(checkboxes).map(cb => cb.value);
                updateProgress();
                clearQuestionError(question.id);
            });

            const optionLabel = document.createElement('span');
            optionLabel.className = 'respond-option-label';
            optionLabel.textContent = option.label || option.text;

            label.appendChild(input);
            label.appendChild(optionLabel);
            optionsDiv.appendChild(label);
        });

        container.appendChild(optionsDiv);
    }

    function createSelectInput(question, container) {
        const select = document.createElement('select');
        select.className = 'respond-select-input';
        select.name = `q_${question.id}`;

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = '선택해주세요';
        select.appendChild(defaultOption);

        const options = getOptionsFromConfig(question);
        options.forEach((option) => {
            const optionEl = document.createElement('option');
            optionEl.value = option.id;
            optionEl.textContent = option.label || option.text;
            select.appendChild(optionEl);
        });

        select.addEventListener('change', (e) => {
            responses[question.id] = e.target.value;
            updateProgress();
            clearQuestionError(question.id);
        });
        if (responses[question.id]) {
            select.value = responses[question.id];
        }

        container.appendChild(select);
    }

    function createDateInput(questionId, container) {
        const input = document.createElement('input');
        input.type = 'date';
        input.className = 'respond-date-input';
        input.name = `q_${questionId}`;
        if (responses[questionId]) {
            input.value = responses[questionId];
        }
        input.addEventListener('change', (e) => {
            responses[questionId] = e.target.value;
            updateProgress();
            clearQuestionError(questionId);
        });
        container.appendChild(input);
    }

    /**
     * 파일 업로드 입력 생성 (file-upload 타입 질문에만 표시)
     */
    function createFileUploadInput(question, container) {
        const questionId = question.id;

        // config에서 파일 설정 추출
        let fileConfig = {
            allowedExtensions: [],
            maxFileSize: 10485760, // 10MB 기본값
            allowMultiple: false
        };

        if (question.config) {
            try {
                const config = typeof question.config === 'string'
                    ? JSON.parse(question.config)
                    : question.config;
                // config가 null이 아닌 경우에만 값 추출
                if (config && typeof config === 'object') {
                    fileConfig = {
                        allowedExtensions: config.allowedExtensions || [],
                        maxFileSize: config.maxFileSize || 10485760,
                        allowMultiple: config.allowMultiple || false
                    };
                }
            } catch (e) {
                console.warn('Failed to parse file config:', e);
            }
        }

        // 파일 입력 생성
        const inputWrapper = document.createElement('div');
        inputWrapper.className = 'respond-file-upload-wrapper';

        // input type="file" - file-upload 타입만 렌더링
        const input = document.createElement('input');
        input.type = 'file';
        input.className = 'respond-file-input';
        input.name = `q_${questionId}`;
        input.setAttribute('data-question-id', questionId);

        if (fileConfig.allowMultiple) {
            input.multiple = true;
        }

        if (fileConfig.allowedExtensions && fileConfig.allowedExtensions.length > 0) {
            input.accept = fileConfig.allowedExtensions.join(',');
        }

        // 파일 선택 라벨 (스타일된 버튼처럼 표시)
        const label = document.createElement('label');
        label.className = 'respond-file-input-label';
        label.htmlFor = `file-input-${questionId}`;
        label.textContent = '파일 선택'; // innerHTML 대신 textContent 사용 (XSS 방지)
        input.id = `file-input-${questionId}`;

        // 선택된 파일 표시 영역
        const fileList = document.createElement('div');
        fileList.className = 'respond-file-list';
        fileList.id = `file-list-${questionId}`;

        input.addEventListener('change', (e) => {
            const files = e.target.files;

            // 선택된 파일 목록 표시
            fileList.innerHTML = '';
            const fileArray = Array.from(files);

            if (fileArray.length > 0) {
                const ul = document.createElement('ul');
                fileArray.forEach((file) => {
                    const li = document.createElement('li');
                    li.className = 'respond-file-item';

                    const fileName = document.createElement('span');
                    fileName.className = 'respond-file-name';
                    fileName.textContent = file.name; // textContent 사용 (XSS 방지)
                    li.appendChild(fileName);

                    const fileSize = document.createElement('span');
                    fileSize.className = 'respond-file-size';
                    fileSize.textContent = formatFileSize(file.size);
                    li.appendChild(fileSize);

                    ul.appendChild(li);
                });
                fileList.appendChild(ul);
            }

            // 파일 메타데이터 저장 (나중에 업로드용)
            responses[questionId] = {
                files: fileArray,
                fileElements: files
            };

            updateProgress();
            clearQuestionError(questionId);
        });

        // 이전에 선택한 파일 목록 복원 표시 (input 값은 보안상 복원 불가)
        const savedFiles = responses[questionId] && responses[questionId].files;
        if (savedFiles && savedFiles.length > 0) {
            const ul = document.createElement('ul');
            savedFiles.forEach((file) => {
                const li = document.createElement('li');
                li.className = 'respond-file-item';
                const fileName = document.createElement('span');
                fileName.className = 'respond-file-name';
                fileName.textContent = file.name;
                li.appendChild(fileName);
                const fileSize = document.createElement('span');
                fileSize.className = 'respond-file-size';
                fileSize.textContent = formatFileSize(file.size);
                li.appendChild(fileSize);
                ul.appendChild(li);
            });
            fileList.appendChild(ul);
        }

        inputWrapper.appendChild(label);
        inputWrapper.appendChild(input);
        inputWrapper.appendChild(fileList);
        container.appendChild(inputWrapper);
    }

    function createLinearScale(question, container) {
        // scaleConfig에서 min/max 값 추출 (기본값: 1~5)
        const scaleConfig = getScaleConfigFromQuestion(question);
        const min = scaleConfig.min !== undefined ? scaleConfig.min : 1;
        const max = scaleConfig.max !== undefined ? scaleConfig.max : 5;

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'respond-scale-options';

        // 버튼 (설정된 min부터 max까지 렌더링)
        for (let i = min; i <= max; i++) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'respond-scale-button';
            button.textContent = String(i);
            button.value = String(i);
            if (responses[question.id] === String(i)) {
                button.classList.add('selected');
            }
            button.addEventListener('click', (e) => {
                e.preventDefault();
                // 이전 선택 제거
                optionsDiv.querySelectorAll('.respond-scale-button').forEach(btn => {
                    btn.classList.remove('selected');
                });
                // 현재 버튼 선택
                button.classList.add('selected');
                responses[question.id] = String(i);
                updateProgress();
                clearQuestionError(question.id);
            });
            optionsDiv.appendChild(button);
        }

        container.appendChild(optionsDiv);
    }

    // ========================================================
    // EVENT LISTENERS
    // ========================================================
    function setupEventListeners() {
        elements.submitBtn.addEventListener('click', handleSubmit);
        elements.errorCloseBtn.addEventListener('click', hideError);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        clearAllErrors();

        // 섹션이 있는 경우: 현재 섹션 검증 또는 전체 폼 검증
        const hasSections = formData.sections && formData.sections.length > 0;
        if (hasSections && currentSectionIndex < formData.sections.length - 1) {
            // 마지막 섹션이 아닌 경우 다음 섹션으로
            goToNextSection();
            return;
        }

        // 전체 폼 검증
        const validation = validateResponses();
        if (!validation.valid) {
            displayValidationErrors(validation.errors);
            return;
        }

        // 파일 크기 검증
        const fileSizeErrors = validateFileSizes();
        if (fileSizeErrors.length > 0) {
            displayValidationErrors(fileSizeErrors);
            return;
        }

        // 제출
        try {
            elements.submitBtn.disabled = true;
            elements.submitBtnText.textContent = '제출 중...';

            const formId = getFormIdFromUrl();

            // 파일 업로드 처리
            await uploadFiles(formId);

            // 응답 생성 (파일 메타데이터 포함)
            // questionId: dataset은 항상 string → parseInt로 Long 타입 보장
            const answers = Object.entries(responses).map(([questionId, value]) => ({
                questionId: parseInt(questionId, 10),
                value: typeof value === 'object' && value.files
                    ? value.uploadedMetadata || []
                    : value
            }));

            // 이메일이 설정되어 있으면 추가 (백엔드 ResponseRequest.email 필드명과 일치)
            const submitData = {
                answers
            };

            if (formData.settings && formData.settings.collectEmail && respondentEmail) {
                submitData.email = respondentEmail;
            }

            await submitResponses(formId, submitData);

            // 성공 화면 표시
            showSuccessScreen();
        } catch (error) {
            console.error('Error submitting responses:', error);
            showError('제출에 실패했습니다. 다시 시도해주세요.');
            elements.submitBtn.disabled = false;
            elements.submitBtnText.textContent = '제출';
        }
    }

    /**
     * 파일 업로드 (임시 업로드)
     * 모든 섹션의 질문 포함
     */
    async function uploadFiles(formId) {
        const questions = getAllQuestions(formData);

        for (const question of questions) {
            if (question.type !== 'file-upload') continue;

            const value = responses[question.id];
            if (!value || !value.files || value.files.length === 0) continue;

            const uploadedMetadata = [];

            for (const file of value.files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('formId', formId);
                formData.append('questionId', question.id);

                try {
                    const response = await fetch(`${API_BASE_URL}/files/upload`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const fileMetadata = await response.json();
                    uploadedMetadata.push(fileMetadata);
                } catch (error) {
                    console.error('File upload error:', error);
                    throw new Error(`파일 업로드에 실패했습니다`);
                }
            }

            // 업로드된 파일 메타데이터 저장
            responses[question.id].uploadedMetadata = uploadedMetadata;
        }
    }

    // ========================================================
    // VALIDATION
    // ========================================================
    function validateResponses() {
        const errors = [];
        const questions = getAllQuestions(formData);
        const settings = formData.settings || {};

        // 이메일 필드 검증
        if (settings.collectEmail && !respondentEmail.trim()) {
            elements.emailFieldContainer.classList.add('has-error');
            const errorEl = elements.emailFieldContainer.querySelector('.respond-error-message');
            if (!errorEl) {
                const emailError = document.createElement('div');
                emailError.className = 'respond-error-message';
                emailError.textContent = '이메일은 필수입니다.';
                elements.emailFieldContainer.appendChild(emailError);
            }
            return {
                valid: false,
                errors: [{ field: 'email', message: '이메일은 필수입니다.' }]
            };
        }

        // 이메일 형식 검증
        if (settings.collectEmail && respondentEmail.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(respondentEmail)) {
                elements.emailFieldContainer.classList.add('has-error');
                const errorEl = elements.emailFieldContainer.querySelector('.respond-error-message');
                if (!errorEl) {
                    const emailError = document.createElement('div');
                    emailError.className = 'respond-error-message';
                    emailError.textContent = '유효한 이메일 주소를 입력하세요.';
                    elements.emailFieldContainer.appendChild(emailError);
                }
                return {
                    valid: false,
                    errors: [{ field: 'email', message: '유효한 이메일 주소를 입력하세요.' }]
                };
            }
        }

        // 질문 검증 (모든 섹션 포함)
        questions.forEach((question) => {
            if (!question.required) return;

            const value = responses[question.id];
            let isEmpty = false;

            if (Array.isArray(value)) {
                isEmpty = value.length === 0;
            } else if (value && typeof value === 'object' && value.files) {
                // 파일 업로드 질문
                isEmpty = !value.files || value.files.length === 0;
            } else if (typeof value === 'string') {
                isEmpty = value.trim() === '';
            } else {
                isEmpty = !value;
            }

            if (isEmpty) {
                errors.push({
                    questionId: question.id,
                    message: '이 질문은 필수입니다.'
                });
            }
        });

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 파일 크기 검증 (모든 파일, 모든 섹션 포함)
     */
    function validateFileSizes() {
        const questions = getAllQuestions(formData);
        const errors = [];

        questions.forEach((question) => {
            if (question.type !== 'file-upload') return;

            const value = responses[question.id];
            if (!value || !value.files) return;

            let fileConfig = { maxFileSize: 10485760 };
            if (question.config) {
                try {
                    const config = typeof question.config === 'string'
                        ? JSON.parse(question.config)
                        : question.config;
                    fileConfig = { maxFileSize: config.maxFileSize || 10485760 };
                } catch (e) {
                    console.warn('Failed to parse config for file size:', e);
                }
            }

            value.files.forEach((file) => {
                if (file.size > fileConfig.maxFileSize) {
                    const maxSizeMB = Math.round(fileConfig.maxFileSize / (1024 * 1024));
                    errors.push({
                        questionId: question.id,
                        message: `파일 크기가 너무 큽니다 (최대: ${maxSizeMB} MB)`
                    });
                }
            });
        });

        return errors;
    }

    function displayValidationErrors(errors) {
        errors.forEach((error) => {
            const card = document.querySelector(`[data-question-id="${error.questionId}"]`);
            if (card) {
                card.classList.add('has-error');
                const content = card.querySelector('.respond-question-content');
                if (content) {
                    // 기존 에러 메시지 제거
                    const existingError = content.querySelector('.respond-error-message');
                    if (existingError) {
                        existingError.remove();
                    }

                    // 새 에러 메시지 추가
                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'respond-error-message';
                    errorMsg.textContent = error.message;
                    content.appendChild(errorMsg);
                }
            }
        });
    }

    function clearAllErrors() {
        // 이메일 필드 에러 초기화
        if (elements.emailFieldContainer) {
            elements.emailFieldContainer.classList.remove('has-error');
            const errorMsg = elements.emailFieldContainer.querySelector('.respond-error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        }

        // 질문 카드 에러 초기화
        elements.questionsContainer.querySelectorAll('.respond-question-card').forEach((card) => {
            card.classList.remove('has-error');
            const errorMsg = card.querySelector('.respond-error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        });
    }

    function clearQuestionError(questionId) {
        const card = document.querySelector(`[data-question-id="${questionId}"]`);
        if (card) {
            card.classList.remove('has-error');
            const errorMsg = card.querySelector('.respond-error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        }
    }

    // ========================================================
    // SUBMISSION
    // ========================================================
    async function submitResponses(formId, submitData) {
        const response = await fetch(`${API_BASE_URL}/forms/${formId}/responses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(submitData)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Submit failed');
        }

        return await response.json();
    }

    // ========================================================
    // UI UPDATES
    // ========================================================
    function updateProgress() {
        const questions = getAllQuestions(formData);
        const settings = formData.settings || {};
        const requiredQuestions = questions.filter(q => q.required);

        // 필수 항목 개수 계산 (이메일 필드 포함)
        let totalRequired = requiredQuestions.length;
        if (settings.collectEmail) {
            totalRequired += 1;
        }

        if (totalRequired === 0) {
            elements.progressFill.style.width = '100%';
            return;
        }

        // 답변된 항목 개수 계산
        let answered = 0;

        // 이메일 필드 확인
        if (settings.collectEmail && respondentEmail.trim()) {
            answered += 1;
        }

        // 질문 답변 확인 (모든 섹션 포함)
        answered += requiredQuestions.filter(q => {
            const value = responses[q.id];
            if (Array.isArray(value)) {
                return value.length > 0;
            } else if (value && typeof value === 'object' && value.files) {
                // 파일 업로드 질문
                return value.files.length > 0;
            }
            return value && String(value).trim() !== '';
        }).length;

        const percentage = (answered / totalRequired) * 100;
        elements.progressFill.style.width = `${percentage}%`;
    }

    function showSuccessScreen() {
        elements.formContainer.style.display = 'none';
        elements.successScreen.style.display = 'block';
    }

    function showLoading(show) {
        elements.loadingIndicator.style.display = show ? 'flex' : 'none';
    }

    function showError(message) {
        elements.errorMessage.textContent = message;
        elements.errorBanner.style.display = 'block';

        // 5초 후 자동 숨김
        setTimeout(() => {
            hideError();
        }, 5000);
    }

    function hideError() {
        elements.errorBanner.style.display = 'none';
    }

    // ========================================================
    // UTILITY FUNCTIONS
    // ========================================================
    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    // ========================================================
    // INITIALIZE ON LOAD
    // ========================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
