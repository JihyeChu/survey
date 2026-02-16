package com.forms.service;

import com.forms.dto.PublicFormResponse;
import com.forms.dto.PublicQuestionResponse;
import com.forms.entity.Form;
import com.forms.repository.FormRepository;
import com.forms.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 응답자용 공개 폼 조회 서비스
 * 응답자가 설문에 참여할 때 필요한 폼 정보를 제공한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicFormService {

    private final FormRepository formRepository;
    private final QuestionRepository questionRepository;

    /**
     * 공개 폼 조회
     * 응답자용으로 폼 제목, 설명, 질문 목록을 orderIndex 순서로 반환한다.
     *
     * @param formId 조회할 폼 ID
     * @return 응답자용 공개 폼 정보
     */
    public PublicFormResponse getPublicForm(Long formId) {
        // 폼 존재 여부 확인
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found with id: " + formId));

        // 공개 폼 응답 생성
        PublicFormResponse response = PublicFormResponse.fromEntity(form);

        // orderIndex 순서로 질문 조회
        List<PublicQuestionResponse> questions = questionRepository.findByFormIdOrderByOrderIndex(formId)
                .stream()
                .map(PublicQuestionResponse::fromEntity)
                .collect(Collectors.toList());

        response.setQuestions(questions);
        return response;
    }
}
