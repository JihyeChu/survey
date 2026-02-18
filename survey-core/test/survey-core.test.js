/**
 * SurveyCore Unit Tests
 */

// Load the survey-core module
const fs = require('fs');
const path = require('path');
const surveyCoreCode = fs.readFileSync(
    path.join(__dirname, '../src/survey-core.js'),
    'utf8'
);

// Execute in JSDOM environment
eval(surveyCoreCode);

describe('SurveyCore', () => {
    describe('Module Loading', () => {
        test('should expose SurveyCore on window', () => {
            expect(window.SurveyCore).toBeDefined();
        });

        test('should have all required methods', () => {
            expect(typeof window.SurveyCore.initBuilder).toBe('function');
            expect(typeof window.SurveyCore.initResponder).toBe('function');
            expect(typeof window.SurveyCore.createEmptyResponse).toBe('function');
            expect(typeof window.SurveyCore.validateResponse).toBe('function');
        });

        test('should expose utils', () => {
            expect(window.SurveyCore.utils).toBeDefined();
            expect(typeof window.SurveyCore.utils.escapeHtml).toBe('function');
            expect(typeof window.SurveyCore.utils.generateId).toBe('function');
            expect(typeof window.SurveyCore.utils.deepClone).toBe('function');
        });
    });

    describe('Utils - escapeHtml', () => {
        const { escapeHtml } = window.SurveyCore.utils;

        test('should escape HTML special characters', () => {
            expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
            expect(escapeHtml('a & b')).toBe('a &amp; b');
            expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
            expect(escapeHtml("'single'")).toBe('&#039;single&#039;');
        });

        test('should handle null and undefined', () => {
            expect(escapeHtml(null)).toBe('');
            expect(escapeHtml(undefined)).toBe('');
        });

        test('should convert numbers to string', () => {
            expect(escapeHtml(123)).toBe('123');
        });

        test('should handle empty string', () => {
            expect(escapeHtml('')).toBe('');
        });
    });

    describe('Utils - generateId', () => {
        const { generateId } = window.SurveyCore.utils;

        test('should generate unique IDs', () => {
            const id1 = generateId();
            const id2 = generateId();
            expect(id1).not.toBe(id2);
        });

        test('should generate UUID-like format', () => {
            const id = generateId();
            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        });
    });

    describe('Utils - deepClone', () => {
        const { deepClone } = window.SurveyCore.utils;

        test('should create a deep copy of object', () => {
            const original = { a: 1, b: { c: 2 } };
            const cloned = deepClone(original);

            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
            expect(cloned.b).not.toBe(original.b);
        });

        test('should handle arrays', () => {
            const original = [1, 2, { a: 3 }];
            const cloned = deepClone(original);

            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
            expect(cloned[2]).not.toBe(original[2]);
        });
    });

    describe('createEmptyResponse', () => {
        const { createEmptyResponse } = window.SurveyCore;

        test('should create empty response from form', () => {
            const form = {
                id: 'form-1',
                questions: [
                    { id: 'q1', type: 'short-text', required: true },
                    { id: 'q2', type: 'checkbox', required: false }
                ]
            };

            const response = createEmptyResponse(form);

            expect(response.formId).toBe('form-1');
            expect(response.respondentEmail).toBe('');
            // answers is an object keyed by question.id
            expect(response.answers['q1']).toBe('');
            expect(response.answers['q2']).toEqual([]);
        });

        test('should set empty array for checkbox type', () => {
            const form = {
                id: 'form-3',
                questions: [
                    { id: 'q1', type: 'checkbox' }
                ]
            };

            const response = createEmptyResponse(form);
            expect(response.answers['q1']).toEqual([]);
        });

        test('should set file upload structure for file-upload type', () => {
            const form = {
                id: 'form-4',
                questions: [
                    { id: 'q1', type: 'file-upload' }
                ]
            };

            const response = createEmptyResponse(form);
            expect(response.answers['q1']).toEqual({ files: [], uploadedMetadata: [] });
        });

        test('should set empty string for text types', () => {
            const form = {
                id: 'form-5',
                questions: [
                    { id: 'q1', type: 'short-text' },
                    { id: 'q2', type: 'long-text' }
                ]
            };

            const response = createEmptyResponse(form);
            expect(response.answers['q1']).toBe('');
            expect(response.answers['q2']).toBe('');
        });
    });

    describe('validateResponse', () => {
        const { validateResponse } = window.SurveyCore;

        test('should validate required short-text field', () => {
            const form = {
                questions: [
                    { id: 'q1', type: 'short-text', required: true }
                ]
            };

            const validResponse = {
                answers: { 'q1': 'answer' }
            };
            const invalidResponse = {
                answers: { 'q1': '' }
            };

            expect(validateResponse(form, validResponse).valid).toBe(true);
            expect(validateResponse(form, invalidResponse).valid).toBe(false);
        });

        test('should validate required multiple-choice field', () => {
            const form = {
                questions: [
                    { id: 'q1', type: 'multiple-choice', required: true }
                ]
            };

            const validResponse = {
                answers: { 'q1': 'option1' }
            };
            const invalidResponse = {
                answers: { 'q1': '' }
            };

            expect(validateResponse(form, validResponse).valid).toBe(true);
            expect(validateResponse(form, invalidResponse).valid).toBe(false);
        });

        test('should validate required checkbox field', () => {
            const form = {
                questions: [
                    { id: 'q1', type: 'checkbox', required: true }
                ]
            };

            const validResponse = {
                answers: { 'q1': ['opt1', 'opt2'] }
            };
            const invalidResponse = {
                answers: { 'q1': [] }
            };

            expect(validateResponse(form, validResponse).valid).toBe(true);
            expect(validateResponse(form, invalidResponse).valid).toBe(false);
        });

        test('should skip validation for non-required fields', () => {
            const form = {
                questions: [
                    { id: 'q1', type: 'short-text', required: false }
                ]
            };

            const emptyResponse = {
                answers: { 'q1': '' }
            };

            expect(validateResponse(form, emptyResponse).valid).toBe(true);
        });

        test('should return error object with questionErrors', () => {
            const form = {
                questions: [
                    { id: 'q1', type: 'short-text', required: true, title: '이름' }
                ]
            };

            const invalidResponse = {
                answers: { 'q1': '' }
            };

            const result = validateResponse(form, invalidResponse);
            expect(result.valid).toBe(false);
            expect(result.questionErrors).toBeDefined();
            expect(result.questionErrors['q1']).toBeDefined();
        });

        test('should validate email when collectEmail is true', () => {
            const form = {
                questions: [],
                settings: { collectEmail: true }
            };

            const validResponse = {
                respondentEmail: 'test@example.com',
                answers: {}
            };
            const invalidResponse = {
                respondentEmail: '',
                answers: {}
            };

            expect(validateResponse(form, validResponse).valid).toBe(true);
            expect(validateResponse(form, invalidResponse).valid).toBe(false);
        });

        test('should validate email format', () => {
            const form = {
                questions: [],
                settings: { collectEmail: true }
            };

            const invalidEmailResponse = {
                respondentEmail: 'invalid-email',
                answers: {}
            };

            const result = validateResponse(form, invalidEmailResponse);
            expect(result.valid).toBe(false);
            expect(result.errors.email).toBeDefined();
        });
    });

    describe('initBuilder', () => {
        beforeEach(() => {
            document.body.innerHTML = '<div id="builder-root"></div>';
        });

        test('should initialize builder in container', () => {
            const form = {
                id: 'form-1',
                title: 'Test Form',
                description: 'Test Description',
                questions: []
            };

            const builder = window.SurveyCore.initBuilder('#builder-root', {
                form,
                onChange: jest.fn()
            });

            expect(builder).toBeDefined();
            expect(document.querySelector('#builder-root').innerHTML).not.toBe('');
        });

        test('should return null for invalid selector', () => {
            const builder = window.SurveyCore.initBuilder('#nonexistent', { form: {} });
            expect(builder).toBeNull();
        });

        test('should render form title in input', () => {
            const form = {
                id: 'form-1',
                title: 'My Survey',
                questions: []
            };

            window.SurveyCore.initBuilder('#builder-root', {
                form,
                onChange: jest.fn()
            });

            const root = document.querySelector('#builder-root');
            const titleInput = root.querySelector('input[class*="title"]');
            expect(titleInput).toBeDefined();
            expect(titleInput.value).toBe('My Survey');
        });
    });

    describe('initResponder', () => {
        beforeEach(() => {
            document.body.innerHTML = '<div id="responder-root"></div>';
        });

        test('should initialize responder in container', () => {
            const form = {
                id: 'form-1',
                title: 'Test Form',
                description: 'Test Description',
                questions: [
                    { id: 'q1', type: 'short-text', title: 'Name', required: true }
                ]
            };

            const responder = window.SurveyCore.initResponder('#responder-root', {
                form,
                onSubmit: jest.fn()
            });

            expect(responder).toBeDefined();
            expect(document.querySelector('#responder-root').innerHTML).not.toBe('');
        });

        test('should render form title', () => {
            const form = {
                id: 'form-1',
                title: 'Customer Survey',
                questions: []
            };

            window.SurveyCore.initResponder('#responder-root', {
                form,
                onSubmit: jest.fn()
            });

            const root = document.querySelector('#responder-root');
            expect(root.textContent).toContain('Customer Survey');
        });

        test('should render questions', () => {
            const form = {
                id: 'form-1',
                title: 'Survey',
                questions: [
                    { id: 'q1', type: 'short-text', title: 'Your Name', required: true }
                ]
            };

            window.SurveyCore.initResponder('#responder-root', {
                form,
                onSubmit: jest.fn()
            });

            const root = document.querySelector('#responder-root');
            expect(root.textContent).toContain('Your Name');
        });

        test('should return null for invalid selector', () => {
            const responder = window.SurveyCore.initResponder('#nonexistent', {
                form: {},
                onSubmit: jest.fn()
            });
            expect(responder).toBeNull();
        });
    });

    describe('Question Type Support', () => {
        beforeEach(() => {
            document.body.innerHTML = '<div id="responder-root"></div>';
        });

        const questionTypes = [
            'short-text',
            'long-text',
            'multiple-choice',
            'checkbox',
            'dropdown',
            'date',
            'linear-scale',
            'file-upload'
        ];

        questionTypes.forEach(type => {
            test(`should support ${type} question type`, () => {
                const form = {
                    id: 'form-1',
                    title: 'Survey',
                    questions: [
                        {
                            id: 'q1',
                            type: type,
                            title: `Test ${type}`,
                            required: false,
                            config: type === 'linear-scale' ? { min: 1, max: 5 } :
                                   ['multiple-choice', 'checkbox', 'dropdown'].includes(type) ?
                                   { options: [{ id: 'o1', label: 'Option 1' }] } : null
                        }
                    ]
                };

                const responder = window.SurveyCore.initResponder('#responder-root', {
                    form,
                    onSubmit: jest.fn()
                });

                expect(responder).toBeDefined();
                const root = document.querySelector('#responder-root');
                expect(root.textContent).toContain(`Test ${type}`);
            });
        });
    });
});
