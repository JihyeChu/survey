package com.forms.dto;

import com.forms.entity.Section;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 응답자용 공개 섹션 DTO
 * 응답자는 섹션 정보와 섹션 내 질문들을 조회한다.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PublicSectionResponse {

    private Long id;
    private String title;
    private String description;
    private Integer orderIndex;
    private List<PublicQuestionResponse> questions;

    public static PublicSectionResponse fromEntity(Section section) {
        List<PublicQuestionResponse> questionResponses = section.getQuestions() != null
                ? section.getQuestions().stream()
                    .sorted((q1, q2) -> Integer.compare(q1.getOrderIndex(), q2.getOrderIndex()))
                    .map(PublicQuestionResponse::fromEntity)
                    .collect(Collectors.toList())
                : new ArrayList<>();

        return PublicSectionResponse.builder()
                .id(section.getId())
                .title(section.getTitle())
                .description(section.getDescription())
                .orderIndex(section.getOrderIndex())
                .questions(questionResponses)
                .build();
    }
}
