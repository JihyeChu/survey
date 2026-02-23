package com.survey.service;

import com.survey.dto.PublicFormResponse;
import com.survey.dto.PublicQuestionResponse;
import com.survey.entity.Form;
import com.survey.repository.FormRepository;
import com.survey.repository.QuestionRepository;
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
     * 응답자용으로 폼 제목, 설명, 섹션과 질문 목록을 orderIndex 순서로 반환한다.
     *
     * @param formId 조회할 폼 ID
     * @return 응답자용 공개 폼 정보
     */
    public PublicFormResponse getPublicForm(Long formId) {
        // 폼 존재 여부 확인
        Form form = formRepository.findById(formId)
                .orElseThrow(() -> new IllegalArgumentException("Form not found with id: " + formId));

        // Lazy loading 강제 실행
        // sections과 각 section의 questions를 로드
        form.getSections().forEach(section -> {
            section.getQuestions().size(); // Lazy load 트리거
        });

        // Form 레벨의 questions 로드
        form.getQuestions().size(); // Lazy load 트리거

        // 공개 폼 응답 생성
        PublicFormResponse response = PublicFormResponse.fromEntity(form);

        // Form 레벨의 section이 없는 질문들만 추가
        List<PublicQuestionResponse> questions = questionRepository.findByFormIdAndSectionIsNullOrderByOrderIndex(formId)
                .stream()
                .map(PublicQuestionResponse::fromEntity)
                .collect(Collectors.toList());

        response.setQuestions(questions);
        return response;
    }
}
