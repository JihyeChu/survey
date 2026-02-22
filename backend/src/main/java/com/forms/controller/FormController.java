package com.forms.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.forms.dto.FormRequest;
import com.forms.dto.FormResponse;
import com.forms.dto.QuestionRequest;
import com.forms.dto.QuestionResponse;
import com.forms.dto.ReorderQuestionsRequest;
import com.forms.service.FormService;
import com.forms.service.QuestionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/forms")
@RequiredArgsConstructor
public class FormController {

    private final FormService formService;
    private final QuestionService questionService;
    private final ObjectMapper objectMapper;

    @PostMapping
    public ResponseEntity<FormResponse> createForm(@RequestBody JsonNode rawRequest) {
        log.info("Received form creation request: {}", rawRequest.toString());
        try {
            FormRequest request = objectMapper.treeToValue(rawRequest, FormRequest.class);
            FormResponse response = formService.createForm(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Error parsing form request: {}", e.getMessage());
            throw new RuntimeException("Failed to parse request: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<FormResponse> getForm(@PathVariable Long id) {
        FormResponse response = formService.getFormById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<FormResponse>> getAllForms() {
        List<FormResponse> responses = formService.getAllForms();
        return ResponseEntity.ok(responses);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FormResponse> updateForm(@PathVariable Long id, @RequestBody FormRequest request) {
        FormResponse response = formService.updateForm(id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteForm(@PathVariable Long id) {
        formService.deleteForm(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{formId}/questions")
    public ResponseEntity<QuestionResponse> addQuestion(@PathVariable Long formId, @RequestBody QuestionRequest request) {
        QuestionResponse response = questionService.createQuestion(formId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{formId}/questions/{questionId}")
    public ResponseEntity<QuestionResponse> getQuestion(@PathVariable Long formId, @PathVariable Long questionId) {
        QuestionResponse response = questionService.getQuestionById(questionId);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{formId}/questions/{questionId}")
    public ResponseEntity<QuestionResponse> updateQuestion(@PathVariable Long formId, @PathVariable Long questionId, @RequestBody QuestionRequest request) {
        QuestionResponse response = questionService.updateQuestion(questionId, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{formId}/questions/{questionId}")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Long formId, @PathVariable Long questionId) {
        questionService.deleteQuestion(questionId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{formId}/questions/{questionId}/attachment")
    public ResponseEntity<?> uploadQuestionAttachment(
            @PathVariable Long formId,
            @PathVariable Long questionId,
            @RequestParam("file") MultipartFile file) {
        try {
            log.info("Received attachment upload request for formId: {}, questionId: {}, fileName: {}",
                    formId, questionId, file.getOriginalFilename());

            QuestionResponse response = questionService.uploadAttachment(questionId, file);

            log.info("Attachment uploaded successfully for questionId: {}", questionId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            log.warn("Attachment validation failed for questionId: {}: {}", questionId, e.getMessage());
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        } catch (IOException e) {
            log.error("Failed to upload attachment for questionId: {}", questionId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("error", "Attachment upload failed: " + e.getMessage()));
        }
    }

    @GetMapping("/{formId}/questions/{questionId}/attachment")
    public ResponseEntity<byte[]> downloadQuestionAttachment(
            @PathVariable Long formId,
            @PathVariable Long questionId) {
        try {
            log.info("Received attachment download request for questionId: {}", questionId);

            QuestionResponse questionResponse = questionService.getQuestionById(questionId);
            byte[] fileContent = questionService.downloadAttachment(questionId);

            HttpHeaders headers = new HttpHeaders();
            String contentType = questionResponse.getAttachmentContentType();
            boolean isImage = contentType != null && contentType.startsWith("image/");
            ContentDisposition contentDisposition = (isImage ? ContentDisposition.inline() : ContentDisposition.attachment())
                    .filename(questionResponse.getAttachmentFilename(), StandardCharsets.UTF_8)
                    .build();
            headers.setContentDisposition(contentDisposition);
            headers.set(HttpHeaders.CONTENT_TYPE, contentType != null ? contentType : "application/octet-stream");
            headers.setContentLength(fileContent.length);

            log.info("Attachment downloaded successfully for questionId: {}", questionId);
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(fileContent);
        } catch (IllegalArgumentException e) {
            log.warn("Attachment not found for questionId: {}: {}", questionId, e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            log.error("Failed to download attachment for questionId: {}", questionId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/{formId}/questions/{questionId}/attachment")
    public ResponseEntity<?> deleteQuestionAttachment(
            @PathVariable Long formId,
            @PathVariable Long questionId) {
        try {
            log.info("Received attachment deletion request for questionId: {}", questionId);

            QuestionResponse response = questionService.deleteAttachment(questionId);

            log.info("Attachment deleted successfully for questionId: {}", questionId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.warn("Attachment deletion validation failed for questionId: {}: {}", questionId, e.getMessage());
            return ResponseEntity.badRequest().body(java.util.Map.of("error", e.getMessage()));
        } catch (IOException e) {
            log.error("Failed to delete attachment for questionId: {}", questionId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("error", "Attachment deletion failed: " + e.getMessage()));
        }
    }

    @PutMapping("/{formId}/questions/reorder")
    public ResponseEntity<Void> reorderQuestions(
            @PathVariable Long formId,
            @RequestBody ReorderQuestionsRequest request) {
        log.info("Received question reorder request for formId: {}", formId);
        try {
            questionService.reorderQuestions(request);
            log.info("Questions reordered successfully for formId: {}", formId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Failed to reorder questions for formId: {}", formId, e);
            throw new RuntimeException("Failed to reorder questions: " + e.getMessage(), e);
        }
    }

}
