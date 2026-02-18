package com.forms.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.forms.dto.FormRequest;
import com.forms.dto.FormResponse;
import com.forms.dto.QuestionRequest;
import com.forms.dto.QuestionResponse;
import com.forms.dto.SectionRequest;
import com.forms.entity.Form;
import com.forms.entity.Question;
import com.forms.entity.Section;
import com.forms.repository.FormRepository;
import com.forms.repository.QuestionRepository;
import com.forms.repository.SectionRepository;
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
    private final SectionRepository sectionRepository;
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
                        Question question = Question.builder()
                                .form(savedForm)
                                .section(savedSection)
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
            }
        }

        // 섹션 없는 질문 생성 (기본 동작)
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

        // 기존 섹션 삭제 후 새로 생성
        if (request.getSections() != null) {
            sectionRepository.deleteAll(form.getSections());
            form.getSections().clear();

            for (SectionRequest sReq : request.getSections()) {
                Section section = Section.builder()
                        .form(form)
                        .title(sReq.getTitle())
                        .description(sReq.getDescription())
                        .orderIndex(sReq.getOrderIndex() != null ? sReq.getOrderIndex() : 0)
                        .build();

                Section savedSection = sectionRepository.save(section);

                // 섹션 내 질문 생성
                if (sReq.getQuestions() != null && !sReq.getQuestions().isEmpty()) {
                    for (QuestionRequest qReq : sReq.getQuestions()) {
                        Question question = Question.builder()
                                .form(form)
                                .section(savedSection)
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
            }
        }

        // 기존 질문 삭제 후 새로 생성 (섹션 없는 질문)
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
