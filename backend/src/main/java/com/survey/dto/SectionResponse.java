package com.survey.dto;

import com.survey.entity.Section;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SectionResponse {

    private Long id;
    private String title;
    private String description;
    private Integer orderIndex;
    private List<QuestionResponse> questions;

    public static SectionResponse fromEntity(Section section) {
        List<QuestionResponse> questionResponses = section.getQuestions() != null
                ? section.getQuestions().stream()
                    .sorted(Comparator.comparingInt(q -> q.getOrderIndex() != null ? q.getOrderIndex() : 0))
                    .map(QuestionResponse::fromEntity)
                    .collect(Collectors.toList())
                : new ArrayList<>();

        return SectionResponse.builder()
                .id(section.getId())
                .title(section.getTitle())
                .description(section.getDescription())
                .orderIndex(section.getOrderIndex())
                .questions(questionResponses)
                .build();
    }

}
