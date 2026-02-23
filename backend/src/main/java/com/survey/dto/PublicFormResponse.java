package com.survey.dto;

import com.fasterxml.jackson.annotation.JsonRawValue;
import com.survey.entity.Form;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 응답자용 공개 폼 조회 DTO
 * 응답자는 읽기 전용으로 폼 정보와 질문을 조회한다.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicFormResponse {

    private Long id;
    private String title;
    private String description;
    private List<PublicSectionResponse> sections;
    private List<PublicQuestionResponse> questions;

    /**
     * @JsonRawValue: DB의 JSON 문자열을 JSON 객체로 직렬화
     * 프론트에서 formData.settings.collectEmail 등으로 바로 접근 가능
     */
    @JsonRawValue
    private String settings;

    public static PublicFormResponse fromEntity(Form form) {
        List<PublicSectionResponse> sectionResponses = form.getSections() != null
                ? form.getSections().stream()
                    .sorted(Comparator.comparingInt(s -> s.getOrderIndex() != null ? s.getOrderIndex() : 0))
                    .map(PublicSectionResponse::fromEntity)
                    .collect(Collectors.toList())
                : new ArrayList<>();

        List<PublicQuestionResponse> questionResponses = form.getQuestions() != null
                ? form.getQuestions().stream()
                    .sorted(Comparator.comparingInt(q -> q.getOrderIndex() != null ? q.getOrderIndex() : 0))
                    .map(PublicQuestionResponse::fromEntity)
                    .collect(Collectors.toList())
                : new ArrayList<>();

        // settings가 null이면 빈 객체 {} 반환 (프론트에서 settings.collectEmail 등 접근 안전)
        String settings = form.getSettings() != null ? form.getSettings() : "{}";

        return PublicFormResponse.builder()
                .id(form.getId())
                .title(form.getTitle())
                .description(form.getDescription())
                .sections(sectionResponses)
                .questions(questionResponses)
                .settings(settings)
                .build();
    }
}
