package com.forms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.forms.dto.QuestionRequest;
import com.forms.dto.QuestionResponse;
import com.forms.entity.Form;
import com.forms.entity.Question;
import com.forms.repository.FormRepository;
import com.forms.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final FormRepository formRepository;
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

        questionRepository.deleteById(id);
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
}
