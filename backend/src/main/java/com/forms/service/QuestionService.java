package com.forms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.forms.dto.QuestionRequest;
import com.forms.dto.QuestionResponse;
import com.forms.dto.ReorderQuestionsRequest;
import com.forms.entity.Form;
import com.forms.entity.Question;
import com.forms.entity.Section;
import com.forms.repository.FormRepository;
import com.forms.repository.QuestionRepository;
import com.forms.repository.SectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final FormRepository formRepository;
    private final SectionRepository sectionRepository;
    private final ObjectMapper objectMapper;
    private final FileStorageService fileStorageService;

    private String convertConfig(QuestionRequest request) {
        if (request.getConfig() == null) return null;
        try {
            return objectMapper.writeValueAsString(request.getConfig());
        } catch (Exception e) {
            return null;
        }
    }

    public QuestionResponse createQuestion(Long formId, QuestionRequest request) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found with id: " + formId));

        Question question = Question.builder()
                .form(form)
                .type(request.getType())
                .title(request.getTitle())
                .description(request.getDescription())
                .required(request.getRequired() != null ? request.getRequired() : false)
                .orderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0)
                .config(convertConfig(request))
                .build();

        Question savedQuestion = questionRepository.save(question);
        return QuestionResponse.fromEntity(savedQuestion);
    }

    @Transactional(readOnly = true)
    public QuestionResponse getQuestionById(Long id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Question not found with id: " + id));
        return QuestionResponse.fromEntity(question);
    }

    public QuestionResponse updateQuestion(Long id, QuestionRequest request) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Question not found with id: " + id));

        question.setType(request.getType());
        question.setTitle(request.getTitle());
        question.setDescription(request.getDescription());
        question.setRequired(request.getRequired() != null ? request.getRequired() : false);
        question.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
        question.setConfig(convertConfig(request));

        Question updatedQuestion = questionRepository.save(question);
        return QuestionResponse.fromEntity(updatedQuestion);
    }

    public void deleteQuestion(Long id) {
        Question question = questionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Question not found with id: " + id));

        // Delete attachment if it exists
        if (question.getAttachmentStoredName() != null) {
            try {
                fileStorageService.deleteFile(question.getAttachmentStoredName());
            } catch (IOException e) {
                log.warn("Failed to delete attachment file: {} for question: {}",
                        question.getAttachmentStoredName(), id, e);
            }
        }

        // Get the form ID and order index before deletion
        Long formId = question.getForm().getId();
        Long sectionId = question.getSection() != null ? question.getSection().getId() : null;
        Integer deletedOrder = question.getOrderIndex();

        // Delete the question
        questionRepository.deleteById(id);

        // Reorder remaining questions: decrement orderIndex for all questions with orderIndex > deletedOrder
        if (sectionId != null) {
            // Question was in a section
            log.debug("Reordering questions in section {} after deleting question with order {}", sectionId, deletedOrder);
            questionRepository.decrementOrderIndexAfterDeleteInSection(sectionId, deletedOrder);
        } else {
            // Question was at root level
            log.debug("Reordering questions in form {} after deleting question with order {}", formId, deletedOrder);
            questionRepository.decrementOrderIndexAfterDelete(formId, deletedOrder);
        }
    }

    public QuestionResponse uploadAttachment(Long questionId, MultipartFile file) throws IOException {
        log.info("Uploading attachment for question: {}, fileName: {}", questionId, file.getOriginalFilename());

        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found with id: " + questionId));

        // Delete existing attachment if present
        if (question.getAttachmentStoredName() != null) {
            try {
                fileStorageService.deleteFile(question.getAttachmentStoredName());
                log.info("Deleted previous attachment: {}", question.getAttachmentStoredName());
            } catch (IOException e) {
                log.warn("Failed to delete previous attachment: {}", question.getAttachmentStoredName(), e);
            }
        }

        // Save new attachment
        String storedFilename = fileStorageService.saveFile(file);

        question.setAttachmentFilename(file.getOriginalFilename());
        question.setAttachmentStoredName(storedFilename);
        question.setAttachmentContentType(file.getContentType());

        Question updatedQuestion = questionRepository.save(question);
        log.info("Attachment uploaded successfully for question: {}", questionId);

        return QuestionResponse.fromEntity(updatedQuestion);
    }

    public QuestionResponse deleteAttachment(Long questionId) throws IOException {
        log.info("Deleting attachment for question: {}", questionId);

        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found with id: " + questionId));

        if (question.getAttachmentStoredName() == null) {
            throw new IllegalArgumentException("No attachment found for question: " + questionId);
        }

        // Delete the file from storage
        fileStorageService.deleteFile(question.getAttachmentStoredName());

        // Clear attachment fields
        question.setAttachmentFilename(null);
        question.setAttachmentStoredName(null);
        question.setAttachmentContentType(null);

        Question updatedQuestion = questionRepository.save(question);
        log.info("Attachment deleted successfully for question: {}", questionId);

        return QuestionResponse.fromEntity(updatedQuestion);
    }

    @Transactional(readOnly = true)
    public byte[] downloadAttachment(Long questionId) throws IOException {
        log.info("Downloading attachment for question: {}", questionId);

        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found with id: " + questionId));

        if (question.getAttachmentStoredName() == null) {
            throw new IllegalArgumentException("No attachment found for question: " + questionId);
        }

        byte[] fileContent = fileStorageService.downloadFile(question.getAttachmentStoredName());
        log.info("Attachment downloaded successfully for question: {}", questionId);

        return fileContent;
    }

    public void reorderQuestions(ReorderQuestionsRequest request) {
        if (request.getQuestions() == null || request.getQuestions().isEmpty()) {
            log.warn("Empty questions list in reorder request");
            return;
        }

        log.info("Reordering {} questions", request.getQuestions().size());

        // 단일 SELECT로 모든 대상 질문을 한 번에 조회 (N+1 → 1 SELECT)
        List<Long> ids = request.getQuestions().stream()
                .map(ReorderQuestionsRequest.QuestionOrder::getId)
                .collect(java.util.stream.Collectors.toList());

        List<Question> questions = questionRepository.findAllById(ids);
        java.util.Map<Long, Question> questionMap = questions.stream()
                .collect(java.util.stream.Collectors.toMap(Question::getId, q -> q));

        // 필요한 섹션 ID 수집 후 한 번에 조회
        List<Long> sectionIds = request.getQuestions().stream()
                .map(ReorderQuestionsRequest.QuestionOrder::getSectionId)
                .filter(sid -> sid != null)
                .distinct()
                .collect(java.util.stream.Collectors.toList());

        java.util.Map<Long, Section> sectionMap = sectionIds.isEmpty()
                ? java.util.Collections.emptyMap()
                : sectionRepository.findAllById(sectionIds).stream()
                        .collect(java.util.stream.Collectors.toMap(Section::getId, s -> s));

        // 메모리에서 업데이트 후 saveAll로 배치 저장 (N UPDATE → 배치 처리)
        for (ReorderQuestionsRequest.QuestionOrder qOrder : request.getQuestions()) {
            Question question = questionMap.get(qOrder.getId());
            if (question == null) {
                throw new IllegalArgumentException("Question not found with id: " + qOrder.getId());
            }

            log.debug("Reordering question {} : {} → {}", question.getId(), question.getOrderIndex(), qOrder.getOrder());
            question.setOrderIndex(qOrder.getOrder());

            if (qOrder.getSectionId() != null) {
                Section section = sectionMap.get(qOrder.getSectionId());
                if (section == null) {
                    throw new IllegalArgumentException("Section not found with id: " + qOrder.getSectionId());
                }
                question.setSection(section);
            } else {
                // 섹션에서 루트 레벨로 이동 시 section 해제
                question.setSection(null);
            }
        }

        questionRepository.saveAll(questions);
        log.info("Questions reordered successfully");
    }
}
