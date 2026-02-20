/**
 * Google Form Clone - API Service
 * Backend 통신을 위한 API 레이어
 */

(function() {
    'use strict';

    const API_BASE_URL = '/api';

    /**
     * API 요청 헬퍼
     */
    async function request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
            },
            ...options,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            // 204 No Content 또는 빈 응답 처리
            if (response.status === 204 || response.headers.get('content-length') === '0') {
                return null;
            }

            // Content-Type 확인 후 JSON 파싱
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return null;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    /**
     * Form API
     */
    const FormAPI = {
        /**
         * 새 폼 생성 (게시)
         * @param {Object} formData - 폼 데이터
         * @returns {Promise<Object>} 생성된 폼
         */
        async create(formData) {
            return request('/forms', {
                method: 'POST',
                body: JSON.stringify(formData),
            });
        },

        /**
         * 모든 폼 목록 조회
         * @returns {Promise<Array>} 폼 목록
         */
        async list() {
            return request('/forms');
        },

        /**
         * 폼 상세 조회
         * @param {string} formId - 폼 ID
         * @returns {Promise<Object>} 폼 데이터
         */
        async get(formId) {
            return request(`/forms/${formId}`);
        },

        /**
         * 폼 수정
         * @param {string} formId - 폼 ID
         * @param {Object} formData - 수정할 데이터
         * @returns {Promise<Object>} 수정된 폼
         */
        async update(formId, formData) {
            return request(`/forms/${formId}`, {
                method: 'PUT',
                body: JSON.stringify(formData),
            });
        },

        /**
         * 폼 삭제
         * @param {string} formId - 폼 ID
         * @returns {Promise<Object>} 삭제 결과
         */
        async delete(formId) {
            return request(`/forms/${formId}`, {
                method: 'DELETE',
            });
        },
    };

    /**
     * Question API
     */
    const QuestionAPI = {
        /**
         * 질문 추가
         * @param {string} formId - 폼 ID
         * @param {Object} questionData - 질문 데이터
         * @returns {Promise<Object>} 생성된 질문
         */
        async add(formId, questionData) {
            return request(`/forms/${formId}/questions`, {
                method: 'POST',
                body: JSON.stringify(questionData),
            });
        },

        /**
         * 질문 수정
         * @param {string} formId - 폼 ID
         * @param {string} questionId - 질문 ID
         * @param {Object} questionData - 수정할 데이터
         * @returns {Promise<Object>} 수정된 질문
         */
        async update(formId, questionId, questionData) {
            return request(`/forms/${formId}/questions/${questionId}`, {
                method: 'PUT',
                body: JSON.stringify(questionData),
            });
        },

        /**
         * 질문 삭제
         * @param {string} formId - 폼 ID
         * @param {string} questionId - 질문 ID
         * @returns {Promise<Object>} 삭제 결과
         */
        async delete(formId, questionId) {
            return request(`/forms/${formId}/questions/${questionId}`, {
                method: 'DELETE',
            });
        },

    };

    /**
     * Response API
     */
    const ResponseAPI = {
        /**
         * 응답 제출
         * @param {string} formId - 폼 ID
         * @param {Array} answers - 응답 데이터
         * @returns {Promise<Object>} 생성된 응답
         */
        async submit(formId, answers) {
            return request(`/forms/${formId}/responses`, {
                method: 'POST',
                body: JSON.stringify({ answers }),
            });
        },

        /**
         * 응답 목록 조회
         * @param {string} formId - 폼 ID
         * @returns {Promise<Array>} 응답 목록
         */
        async list(formId) {
            return request(`/forms/${formId}/responses`);
        },
    };

    /**
     * Persistence Manager
     * Draft(localStorage)와 Published(Backend) 상태 관리
     */
    const PersistenceManager = {
        /**
         * 현재 폼이 게시됨 상태인지 확인
         * @returns {boolean}
         */
        isPublished() {
            const form = window.FormApp?.getForm();
            return form && form.publishedId ? true : false;
        },

        /**
         * 폼 게시 (서버에 저장)
         * @returns {Promise<Object>} 게시된 폼
         */
        async publish() {
            const form = window.FormApp?.getForm();
            if (!form) throw new Error('폼 데이터가 없습니다.');

            // 서버용 데이터 변환
            const formData = this._transformFormForServer(form);

            let result;
            if (form.publishedId) {
                try {
                    // 기존 게시된 폼 업데이트
                    result = await FormAPI.update(form.publishedId, formData);
                } catch (error) {
                    // 404 에러 시 새로 생성
                    if (error.message.includes('404') || error.message.includes('not found')) {
                        form.publishedId = null;
                        result = await FormAPI.create(formData);
                    } else {
                        throw error;
                    }
                }
            } else {
                // 새로 게시
                result = await FormAPI.create(formData);
            }

            // publishedId 저장
            form.publishedId = result.id;
            form.publishedAt = new Date().toISOString();

            // 서버에서 반환된 질문 ID를 serverId로 저장 (첨부파일 업로드에 필요)
            // 섹션 구조가 있는 경우
            if (result.sections && result.sections.length > 0 && form.sections && form.sections.length > 0) {
                form.sections = form.sections.map((localSection, sectionIdx) => {
                    const serverSection = result.sections[sectionIdx];
                    if (serverSection && serverSection.questions) {
                        return {
                            ...localSection,
                            questions: (localSection.questions || []).map((localQ, qIdx) => {
                                const serverQ = serverSection.questions[qIdx];
                                if (serverQ) {
                                    return {
                                        ...localQ,
                                        serverId: serverQ.id,
                                        attachmentFilename: serverQ.attachmentFilename || localQ.attachmentFilename,
                                        attachmentStoredName: serverQ.attachmentStoredName || localQ.attachmentStoredName,
                                        attachmentContentType: serverQ.attachmentContentType || localQ.attachmentContentType
                                    };
                                }
                                return localQ;
                            })
                        };
                    }
                    return localSection;
                });
            }
            // 루트 questions 구조 (하위 호환성)
            else if (result.questions && result.questions.length > 0) {
                form.questions = form.questions.map((localQ, idx) => {
                    const serverQ = result.questions[idx];
                    if (serverQ) {
                        return {
                            ...localQ,
                            serverId: serverQ.id,  // 서버의 Long ID를 별도 필드에 저장
                            attachmentFilename: serverQ.attachmentFilename || localQ.attachmentFilename,
                            attachmentStoredName: serverQ.attachmentStoredName || localQ.attachmentStoredName,
                            attachmentContentType: serverQ.attachmentContentType || localQ.attachmentContentType
                        };
                    }
                    return localQ;
                });
            }

            window.FormApp?.saveForm(form);

            // 대기 중인 첨부파일 업로드
            await this._uploadPendingAttachments(form);

            return result;
        },

        /**
         * 대기 중인 첨부파일 서버에 업로드
         * 섹션 구조 및 루트 questions 구조 모두 지원
         * @param {Object} form - 폼 데이터
         */
        async _uploadPendingAttachments(form) {
            // 섹션에서 pending attachment가 있는 질문 수집
            let questionsWithPending = [];

            if (form.sections && form.sections.length > 0) {
                // 섹션 구조
                form.sections.forEach(section => {
                    if (section.questions) {
                        section.questions.forEach(q => {
                            if (q.pendingAttachment) {
                                questionsWithPending.push({ ...q, _sectionId: section.id });
                            }
                        });
                    }
                });
            } else {
                // 루트 questions 구조
                questionsWithPending = (form.questions || []).filter(q => q.pendingAttachment);
            }

            if (questionsWithPending.length === 0) {
                return;
            }

            for (const question of questionsWithPending) {
                if (!question.serverId) {
                    continue;
                }

                try {
                    // Base64를 Blob으로 변환
                    const base64Data = question.pendingAttachment.base64Data;
                    const blob = await this._base64ToBlob(base64Data);
                    const file = new File([blob], question.pendingAttachment.filename, {
                        type: question.pendingAttachment.contentType
                    });

                    // 서버에 업로드
                    const formData = new FormData();
                    formData.append('file', file);

                    const response = await fetch(`/api/forms/${form.publishedId}/questions/${question.serverId}/attachment`, {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const updatedQuestion = await response.json();

                    // 상태 업데이트 (섹션 또는 루트 questions)
                    if (question._sectionId) {
                        // 섹션 내 질문 업데이트
                        const section = form.sections.find(s => s.id === question._sectionId);
                        if (section) {
                            const qIdx = section.questions.findIndex(q => q.id === question.id);
                            if (qIdx >= 0) {
                                section.questions[qIdx] = {
                                    ...section.questions[qIdx],
                                    pendingAttachment: null,
                                    attachmentFilename: updatedQuestion.attachmentFilename,
                                    attachmentStoredName: updatedQuestion.attachmentStoredName,
                                    attachmentContentType: updatedQuestion.attachmentContentType,
                                    attachmentPreviewUrl: null
                                };
                            }
                        }
                    } else {
                        // 루트 questions 업데이트
                        const qIdx = form.questions.findIndex(q => q.id === question.id);
                        if (qIdx >= 0) {
                            form.questions[qIdx] = {
                                ...form.questions[qIdx],
                                pendingAttachment: null,
                                attachmentFilename: updatedQuestion.attachmentFilename,
                                attachmentStoredName: updatedQuestion.attachmentStoredName,
                                attachmentContentType: updatedQuestion.attachmentContentType,
                                attachmentPreviewUrl: null
                            };
                        }
                    }

                } catch (error) {
                    console.error('Failed to upload attachment for question:', question.id, error);
                }
            }

            // 최종 상태 저장
            window.FormApp?.saveForm(form);
            // UI 갱신
            if (window.FormApp?.renderQuestions) {
                window.FormApp.renderQuestions();
            }
        },

        /**
         * Base64 데이터 URL을 Blob으로 변환
         * @param {string} base64 - Base64 데이터 URL
         * @returns {Promise<Blob>} Blob 객체
         */
        async _base64ToBlob(base64) {
            const response = await fetch(base64);
            return response.blob();
        },

        /**
         * 서버에서 폼 불러오기
         * @param {string} formId - 서버 폼 ID
         * @returns {Promise<Object>} 로드된 폼
         */
        async load(formId) {
            const serverForm = await FormAPI.get(formId);
            const localForm = this._transformFormFromServer(serverForm);

            window.FormApp?.saveForm(localForm);
            return localForm;
        },

        /**
         * 로컬 폼을 서버 형식으로 변환
         * config 필드에 옵션(RADIO/CHECKBOX)과 스케일 설정(LINEAR) 통합 저장
         * sections 배열과 각 section의 questions 포함
         */
        _transformFormForServer(form) {
            // 헬퍼 함수: 질문 객체를 서버 형식으로 변환
            const transformQuestion = (q, idx) => {
                let config = null;

                // LINEAR 타입: scaleConfig 사용
                if (q.type === 'linear-scale' && q.scaleConfig) {
                    config = q.scaleConfig;
                }
                // RADIO/CHECKBOX/DROPDOWN 타입: options 배열을 config.options로 변환
                else if ((q.type === 'multiple-choice' || q.type === 'checkbox' || q.type === 'dropdown') && q.options && q.options.length > 0) {
                    config = {
                        options: q.options.map((opt, optIdx) => ({
                            id: opt.id || `opt_${optIdx}`,
                            label: opt.label,
                        })),
                    };
                }

                const result = {
                    type: q.type,
                    title: q.title,
                    description: q.description || '',
                    required: q.required || false,
                    orderIndex: idx,
                    config: config,
                };
                return result;
            };

            return {
                title: form.title,
                description: form.description || '',
                settings: form.settings || {},
                // 섹션이 있으면 섹션 구조로 전송
                ...(form.sections && form.sections.length > 0 && {
                    sections: form.sections.map((section, sectionIdx) => ({
                        title: section.title,
                        description: section.description || '',
                        orderIndex: sectionIdx,
                        questions: (section.questions || []).map((q, qIdx) =>
                            transformQuestion(q, qIdx)
                        ),
                    })),
                }),
                // 섹션이 없으면 루트 questions 배열로 전송 (하위 호환성)
                ...(!form.sections || form.sections.length === 0) && {
                    questions: (form.questions || []).map((q, idx) =>
                        transformQuestion(q, idx)
                    ),
                },
            };
        },

        /**
         * 서버 폼을 로컬 형식으로 변환
         * config 필드에서 옵션과 스케일 설정 분리
         * sections 구조 지원
         */
        _transformFormFromServer(serverForm) {
            // 헬퍼 함수: 질문 객체를 로컬 형식으로 변환
            const transformQuestion = (q) => {
                let parsedConfig = null;
                if (q.config) {
                    try {
                        parsedConfig = typeof q.config === 'string' ? JSON.parse(q.config) : q.config;
                    } catch (e) {
                        console.warn('Failed to parse config:', e);
                    }
                }

                // config에서 옵션과 스케일 설정 분리
                let options = [];
                let scaleConfig = null;

                if (parsedConfig) {
                    if (parsedConfig.options) {
                        // RADIO/CHECKBOX/DROPDOWN 타입
                        options = parsedConfig.options.map((opt, idx) => ({
                            id: opt.id || `opt_${idx}`,
                            label: opt.label,
                            order: idx,
                        }));
                    } else if (parsedConfig.min !== undefined || parsedConfig.max !== undefined) {
                        // LINEAR 타입
                        scaleConfig = parsedConfig;
                    }
                }

                return {
                    id: q.id,
                    type: q.type,
                    title: q.title,
                    description: q.description || '',
                    required: q.required,
                    order: q.orderIndex,
                    scaleConfig: scaleConfig,
                    options: options,
                    // Question Attachment fields (read-only for respondents)
                    attachmentFilename: q.attachmentFilename,
                    attachmentStoredName: q.attachmentStoredName,
                    attachmentContentType: q.attachmentContentType,
                };
            };

            const result = {
                id: window.FormApp?.getForm()?.id || serverForm.id,
                publishedId: serverForm.id,
                title: serverForm.title,
                description: serverForm.description || '',
                createdAt: serverForm.createdAt,
                updatedAt: serverForm.updatedAt,
                publishedAt: new Date().toISOString(),
                settings: serverForm.settings || {},
                responses: [],
                questions: [],
                sections: [],
            };

            // 섹션 구조 처리
            if (serverForm.sections && serverForm.sections.length > 0) {
                result.sections = serverForm.sections.map((section) => ({
                    id: section.id,
                    title: section.title,
                    description: section.description || '',
                    orderIndex: section.orderIndex,
                    questions: (section.questions || []).map(transformQuestion),
                }));
            }
            // 루트 questions 구조 (하위 호환성)
            else if (serverForm.questions && serverForm.questions.length > 0) {
                result.questions = serverForm.questions.map(transformQuestion);
            }

            return result;
        },
    };

    // Public API 노출
    window.FormAPI = FormAPI;
    window.QuestionAPI = QuestionAPI;
    window.ResponseAPI = ResponseAPI;
    window.PersistenceManager = PersistenceManager;

})();
