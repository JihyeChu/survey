package com.forms.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.forms.dto.ResponseDto;
import com.forms.dto.ResponseRequest;
import com.forms.entity.Answer;
import com.forms.entity.FileMetadata;
import com.forms.entity.Form;
import com.forms.entity.Question;
import com.forms.entity.Response;
import com.forms.repository.FileMetadataRepository;
import com.forms.repository.FormRepository;
import com.forms.repository.QuestionRepository;
import com.forms.repository.ResponseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ResponseService {

    private final ResponseRepository responseRepository;
    private final FormRepository formRepository;
    private final FileMetadataRepository fileMetadataRepository;
    private final QuestionRepository questionRepository;
    private final ObjectMapper objectMapper;

    private String convertValue(JsonNode value) {
        if (value == null) return null;
        if (value.isTextual()) return value.asText();
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            return value.toString();
        }
    }

    private boolean isEmailCollectionEnabled(Form form) {
        if (form.getSettings() == null || form.getSettings().isEmpty()) {
            return false;
        }
        try {
            JsonNode settings = objectMapper.readTree(form.getSettings());
            JsonNode collectEmail = settings.get("collectEmail");
            return collectEmail != null && collectEmail.asBoolean();
        } catch (Exception e) {
            return false;
        }
    }

    public ResponseDto submitResponse(Long formId, ResponseRequest request) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found with id: " + formId));

        Response response = Response.builder()
                .form(form)
                .build();

        // Email을 저장 (이메일 수집이 활성화된 경우에만 저장)
        if (isEmailCollectionEnabled(form) && request.getEmail() != null && !request.getEmail().isEmpty()) {
            response.setEmail(request.getEmail());
        }

        if (request.getAnswers() != null) {
            request.getAnswers().forEach(answerRequest -> {
                Answer answer = Answer.builder()
                        .response(response)
                        .questionId(answerRequest.getQuestionId())
                        .value(convertValue(answerRequest.getValue()))
                        .build();
                response.getAnswers().add(answer);
            });
        }

        Response savedResponse = responseRepository.save(response);

        // Link temp files to the response
        if (request.getAnswers() != null) {
            request.getAnswers().forEach(answerRequest -> {
                // Try to parse file metadata from answer value (for file-upload type)
                JsonNode value = answerRequest.getValue();
                if (value != null && value.isArray()) {
                    value.forEach(fileNode -> {
                        if (fileNode.has("id")) {
                            Long fileId = fileNode.get("id").asLong();
                            fileMetadataRepository.findById(fileId).ifPresent(fileMetadata -> {
                                fileMetadata.setResponse(savedResponse);
                                // Also set the real question from questionId
                                Long questionId = answerRequest.getQuestionId();
                                if (questionId != null) {
                                    questionRepository.findById(questionId).ifPresent(fileMetadata::setQuestion);
                                }
                                fileMetadataRepository.save(fileMetadata);
                                log.info("Linked file {} to response {} and question {}",
                                         fileId, savedResponse.getId(), questionId);
                            });
                        }
                    });
                }
            });
        }

        return ResponseDto.fromEntity(savedResponse);
    }

    @Transactional(readOnly = true)
    public ResponseDto getResponseById(Long id) {
        Response response = responseRepository.findByIdWithAnswers(id);
        if (response == null) {
            throw new IllegalArgumentException("Response not found with id: " + id);
        }
        return ResponseDto.fromEntity(response);
    }

    @Transactional(readOnly = true)
    public ResponseDto getResponseByIdAndFormId(Long formId, Long responseId) {
        formRepository.findById(formId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found with id: " + formId));

        Response response = responseRepository.findByIdWithAnswers(responseId);
        if (response == null) {
            throw new IllegalArgumentException("Response not found with id: " + responseId);
        }

        // Verify that the response belongs to the specified form
        if (!response.getForm().getId().equals(formId)) {
            throw new IllegalArgumentException("Response does not belong to the specified form");
        }

        return ResponseDto.fromEntity(response);
    }

    @Transactional(readOnly = true)
    public List<ResponseDto> getResponsesByFormId(Long formId) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found with id: " + formId));

        return responseRepository.findByFormWithAnswers(form)
                .stream()
                .map(ResponseDto::fromEntity)
                .collect(Collectors.toList());
    }

    private boolean isResponseEditAllowed(Form form) {
        if (form.getSettings() == null || form.getSettings().isEmpty()) {
            return false;
        }
        try {
            JsonNode settings = objectMapper.readTree(form.getSettings());
            JsonNode allowEdit = settings.get("allowResponseEdit");
            return allowEdit != null && allowEdit.asBoolean();
        } catch (Exception e) {
            return false;
        }
    }

    public ResponseDto updateResponse(Long formId, Long responseId, ResponseRequest request) {
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found with id: " + formId));

        if (!isResponseEditAllowed(form)) {
            throw new IllegalStateException("Response edit is not allowed for this form");
        }

        Response response = responseRepository.findByIdWithAnswers(responseId);
        if (response == null) {
            throw new IllegalArgumentException("Response not found with id: " + responseId);
        }

        // Verify that the response belongs to the specified form
        if (!response.getForm().getId().equals(formId)) {
            throw new IllegalArgumentException("Response does not belong to the specified form");
        }

        // Delete existing answers (orphanRemoval will handle deletion)
        response.getAnswers().clear();

        // Add new answers
        if (request.getAnswers() != null) {
            request.getAnswers().forEach(answerRequest -> {
                Answer answer = Answer.builder()
                        .response(response)
                        .questionId(answerRequest.getQuestionId())
                        .value(convertValue(answerRequest.getValue()))
                        .build();
                response.getAnswers().add(answer);
            });
        }

        Response updatedResponse = responseRepository.save(response);
        return ResponseDto.fromEntity(updatedResponse);
    }
}
