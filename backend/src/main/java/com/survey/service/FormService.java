package com.survey.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.survey.dto.FormRequest;
import com.survey.dto.FormResponse;
import com.survey.dto.QuestionRequest;
import com.survey.dto.QuestionResponse;
import com.survey.dto.SectionRequest;
import com.survey.entity.Form;
import com.survey.entity.Question;
import com.survey.entity.Section;
import com.survey.repository.FileMetadataRepository;
import com.survey.repository.FormRepository;
import com.survey.repository.QuestionRepository;
import com.survey.repository.ResponseRepository;
import com.survey.repository.SectionRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class FormService {

    private final FormRepository formRepository;
    private final QuestionRepository questionRepository;
    private final SectionRepository sectionRepository;
    private final ResponseRepository responseRepository;
    private final FileMetadataRepository fileMetadataRepository;
    private final ObjectMapper objectMapper;
    private final EntityManager entityManager;
    private final FileStorageService fileStorageService;

    private static final java.util.Set<String> DISABLED_QUESTION_TYPES = java.util.Set.of("file-upload", "linear-scale", "date");

    private void validateQuestionType(QuestionRequest qReq) {
        if (qReq.getType() != null && DISABLED_QUESTION_TYPES.contains(qReq.getType())) {
            throw new UnsupportedOperationException("'" + qReq.getType() + "' 질문 유형은 현재 지원하지 않습니다.");
        }
    }

    private String convertConfig(QuestionRequest qReq) {
        if (qReq.getConfig() == null) return null;
        try {
            return objectMapper.writeValueAsString(qReq.getConfig());
        } catch (Exception e) {
            return null;
        }
    }

    public FormResponse createForm(FormRequest request) {
        String settingsJson = null;
        if (request.getSettings() != null) {
            try {
                settingsJson = objectMapper.writeValueAsString(request.getSettings());
            } catch (Exception e) {
                settingsJson = null;
            }
        }

        Form form = Form.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .settings(settingsJson)
                .startAt(request.getStartAt())
                .endAt(request.getEndAt())
                .build();

        Form savedForm = formRepository.save(form);

        // 섹션 생성
        if (request.getSections() != null && !request.getSections().isEmpty()) {
            for (SectionRequest sReq : request.getSections()) {
                Section section = Section.builder()
                        .form(savedForm)
                        .title(sReq.getTitle())
                        .description(sReq.getDescription())
                        .orderIndex(sReq.getOrderIndex() != null ? sReq.getOrderIndex() : 0)
                        .build();

                Section savedSection = sectionRepository.save(section);

                // 섹션 내 질문 생성
                if (sReq.getQuestions() != null && !sReq.getQuestions().isEmpty()) {
                    for (QuestionRequest qReq : sReq.getQuestions()) {
                        validateQuestionType(qReq);
                        Question question = Question.builder()
                                .form(savedForm)
                                .section(savedSection)
                                .type(qReq.getType())
                                .title(qReq.getTitle())
                                .description(qReq.getDescription())
                                .required(qReq.getRequired() != null ? qReq.getRequired() : false)
                                .orderIndex(qReq.getOrderIndex() != null ? qReq.getOrderIndex() : 0)
                                .config(convertConfig(qReq))
                                .attachmentFilename(qReq.getAttachmentFilename())
                                .attachmentStoredName(qReq.getAttachmentStoredName())
                                .attachmentContentType(qReq.getAttachmentContentType())
                                .build();

                        questionRepository.save(question);
                    }
                }
            }
        }

        // 섹션 없는 질문 생성 (기본 동작)
        if (request.getQuestions() != null && !request.getQuestions().isEmpty()) {
            for (QuestionRequest qReq : request.getQuestions()) {
                validateQuestionType(qReq);
                Question question = Question.builder()
                        .form(savedForm)
                        .type(qReq.getType())
                        .title(qReq.getTitle())
                        .description(qReq.getDescription())
                        .required(qReq.getRequired() != null ? qReq.getRequired() : false)
                        .orderIndex(qReq.getOrderIndex() != null ? qReq.getOrderIndex() : 0)
                        .config(convertConfig(qReq))
                        .attachmentFilename(qReq.getAttachmentFilename())
                        .attachmentStoredName(qReq.getAttachmentStoredName())
                        .attachmentContentType(qReq.getAttachmentContentType())
                        .build();

                questionRepository.save(question);
            }
        }

        return getFormById(savedForm.getId());
    }

    @Transactional(readOnly = true)
    public FormResponse getFormById(Long id) {
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Form not found with id: " + id));

        // Lazy loading 강제 실행
        // sections과 각 section의 questions를 로드
        form.getSections().forEach(section -> {
            section.getQuestions().size(); // Lazy load 트리거
        });

        // Form 레벨의 questions 로드
        form.getQuestions().size(); // Lazy load 트리거

        FormResponse response = FormResponse.fromEntity(form);

        // Form 레벨의 section이 없는 질문들만 추가
        List<QuestionResponse> questions = questionRepository.findByFormIdAndSectionIsNullOrderByOrderIndex(id)
                .stream()
                .map(QuestionResponse::fromEntity)
                .collect(Collectors.toList());

        response.setQuestions(questions);
        return response;
    }

    @Transactional(readOnly = true)
    public List<FormResponse> getAllForms() {
        return formRepository.findAll()
                .stream()
                .map(FormResponse::fromEntity)
                .collect(Collectors.toList());
    }

    public FormResponse updateForm(Long id, FormRequest request) {
        // 폼 존재 확인
        if (!formRepository.existsById(id)) {
            throw new IllegalArgumentException("Form not found with id: " + id);
        }

        String settingsJson = null;
        if (request.getSettings() != null) {
            try {
                settingsJson = objectMapper.writeValueAsString(request.getSettings());
            } catch (Exception e) {
                settingsJson = null;
            }
        }

        // 기존 질문과 섹션 삭제 (JPQL @Modifying 쿼리 사용)
        // file_metadata.question_id FK 제약으로 인해 question 삭제 전에 먼저 삭제해야 함
        fileMetadataRepository.deleteAllByQuestionFormId(id);
        questionRepository.deleteAllByFormId(id);
        sectionRepository.deleteAllByFormId(id);

        // 영속성 컨텍스트 완전히 초기화
        entityManager.flush();
        entityManager.clear();

        // 폼 업데이트 (네이티브 쿼리로)
        formRepository.updateFormById(id, request.getTitle(), request.getDescription() != null ? request.getDescription() : "", settingsJson, request.getStartAt(), request.getEndAt());
        entityManager.flush();
        entityManager.clear();

        // 새 섹션 생성
        if (request.getSections() != null && !request.getSections().isEmpty()) {
            for (int sIdx = 0; sIdx < request.getSections().size(); sIdx++) {
                SectionRequest sReq = request.getSections().get(sIdx);

                Section section = new Section();
                section.setForm(formRepository.getReferenceById(id));
                section.setTitle(sReq.getTitle());
                section.setDescription(sReq.getDescription());
                section.setOrderIndex(sReq.getOrderIndex() != null ? sReq.getOrderIndex() : sIdx);

                Section savedSection = sectionRepository.saveAndFlush(section);

                // 섹션 내 질문 새로 생성
                if (sReq.getQuestions() != null && !sReq.getQuestions().isEmpty()) {
                    for (int qIdx = 0; qIdx < sReq.getQuestions().size(); qIdx++) {
                        QuestionRequest qReq = sReq.getQuestions().get(qIdx);
                        validateQuestionType(qReq);
                        Question question = new Question();
                        question.setForm(formRepository.getReferenceById(id));
                        question.setSection(savedSection);
                        question.setType(qReq.getType());
                        question.setTitle(qReq.getTitle());
                        question.setDescription(qReq.getDescription());
                        question.setRequired(qReq.getRequired() != null ? qReq.getRequired() : false);
                        question.setOrderIndex(qReq.getOrderIndex() != null ? qReq.getOrderIndex() : qIdx);
                        question.setConfig(convertConfig(qReq));
                        question.setAttachmentFilename(qReq.getAttachmentFilename());
                        question.setAttachmentStoredName(qReq.getAttachmentStoredName());
                        question.setAttachmentContentType(qReq.getAttachmentContentType());

                        questionRepository.saveAndFlush(question);
                    }
                }
            }
        }

        // 섹션 없는 질문 생성
        if (request.getQuestions() != null && !request.getQuestions().isEmpty()) {
            for (int qIdx = 0; qIdx < request.getQuestions().size(); qIdx++) {
                QuestionRequest qReq = request.getQuestions().get(qIdx);
                validateQuestionType(qReq);
                Question question = new Question();
                question.setForm(formRepository.getReferenceById(id));
                question.setType(qReq.getType());
                question.setTitle(qReq.getTitle());
                question.setDescription(qReq.getDescription());
                question.setRequired(qReq.getRequired() != null ? qReq.getRequired() : false);
                question.setOrderIndex(qReq.getOrderIndex() != null ? qReq.getOrderIndex() : qIdx);
                question.setConfig(convertConfig(qReq));
                question.setAttachmentFilename(qReq.getAttachmentFilename());
                question.setAttachmentStoredName(qReq.getAttachmentStoredName());
                question.setAttachmentContentType(qReq.getAttachmentContentType());

                questionRepository.saveAndFlush(question);
            }
        }

        entityManager.clear();
        return getFormById(id);
    }

    public void deleteForm(Long id) {
        if (!formRepository.existsById(id)) {
            throw new IllegalArgumentException("Form not found with id: " + id);
        }

        // 질문 첨부파일을 디스크에서 먼저 삭제 (JPQL @Modifying은 JPA cascade를 우회하므로 직접 처리)
        questionRepository.findByFormIdWithAttachment(id).forEach(question -> {
            try {
                fileStorageService.deleteFile(question.getAttachmentStoredName());
            } catch (IOException e) {
                log.warn("Failed to delete attachment for question {} during form {} deletion: {}",
                        question.getId(), id, e.getMessage());
            }
        });

        // 응답 삭제 (cascade로 answers, files도 삭제됨)
        responseRepository.deleteAll(responseRepository.findByFormId(id));

        // 질문, 섹션 삭제 (외래키 제약조건 순서 유지)
        // file_metadata.question_id FK 제약으로 인해 question 삭제 전에 먼저 삭제해야 함
        fileMetadataRepository.deleteAllByQuestionFormId(id);
        questionRepository.deleteAllByFormId(id);
        sectionRepository.deleteAllByFormId(id);

        entityManager.flush();

        formRepository.deleteById(id);
    }

}
