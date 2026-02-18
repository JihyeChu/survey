package com.forms.dto;

import com.forms.entity.Form;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
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

    public static PublicFormResponse fromEntity(Form form) {
        List<PublicSectionResponse> sectionResponses = form.getSections() != null
                ? form.getSections().stream()
                    .map(PublicSectionResponse::fromEntity)
                    .collect(Collectors.toList())
                : new ArrayList<>();

        List<PublicQuestionResponse> questionResponses = form.getQuestions() != null
                ? form.getQuestions().stream()
                    .map(PublicQuestionResponse::fromEntity)
                    .collect(Collectors.toList())
                : new ArrayList<>();

        return PublicFormResponse.builder()
                .id(form.getId())
                .title(form.getTitle())
                .description(form.getDescription())
                .sections(sectionResponses)
                .questions(questionResponses)
                .build();
    }
}
