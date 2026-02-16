package com.forms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.forms.dto.FormRequest;
import com.forms.dto.FormResponse;
import com.forms.dto.QuestionRequest;
import com.forms.dto.QuestionResponse;
import com.forms.entity.Form;
import com.forms.entity.Question;
import com.forms.repository.FormRepository;
import com.forms.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FormService {

    private final FormRepository formRepository;
    private final QuestionRepository questionRepository;
    private final ObjectMapper objectMapper;

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
                .build();

        Form savedForm = formRepository.save(form);

        // 질문 생성
        if (request.getQuestions() != null && !request.getQuestions().isEmpty()) {
            for (QuestionRequest qReq : request.getQuestions()) {
                Question question = Question.builder()
                        .form(savedForm)
                        .type(qReq.getType())
                        .title(qReq.getTitle())
                        .description(qReq.getDescription())
                        .required(qReq.getRequired() != null ? qReq.getRequired() : false)
                        .orderIndex(qReq.getOrderIndex() != null ? qReq.getOrderIndex() : 0)
                        .config(convertConfig(qReq))
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

        FormResponse response = FormResponse.fromEntity(form);

        List<QuestionResponse> questions = questionRepository.findByFormIdOrderByOrderIndex(id)
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
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Form not found with id: " + id));

        String settingsJson = null;
        if (request.getSettings() != null) {
            try {
                settingsJson = objectMapper.writeValueAsString(request.getSettings());
            } catch (Exception e) {
                settingsJson = null;
            }
        }

        form.setTitle(request.getTitle());
        form.setDescription(request.getDescription());
        form.setSettings(settingsJson);

        // 기존 질문 삭제 후 새로 생성
        if (request.getQuestions() != null) {
            questionRepository.deleteByFormId(id);

            for (QuestionRequest qReq : request.getQuestions()) {
                Question question = Question.builder()
                        .form(form)
                        .type(qReq.getType())
                        .title(qReq.getTitle())
                        .description(qReq.getDescription())
                        .required(qReq.getRequired() != null ? qReq.getRequired() : false)
                        .orderIndex(qReq.getOrderIndex() != null ? qReq.getOrderIndex() : 0)
                        .config(convertConfig(qReq))
                        .build();

                questionRepository.save(question);
            }
        }

        Form updatedForm = formRepository.save(form);
        return getFormById(updatedForm.getId());
    }

    public void deleteForm(Long id) {
        if (!formRepository.existsById(id)) {
            throw new IllegalArgumentException("Form not found with id: " + id);
        }
        formRepository.deleteById(id);
    }

}
